package com.mdjstack.plaintext

import android.content.Context
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.os.Build
import android.text.Layout
import android.text.Spannable
import android.text.SpannableString
import android.text.TextUtils
import android.text.style.LineHeightSpan
import android.util.AttributeSet
import android.util.LruCache
import android.util.TypedValue
import android.view.Gravity
import androidx.appcompat.widget.AppCompatTextView
import com.facebook.common.logging.FLog
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.common.ReactConstants
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.views.text.ReactTypefaceUtils
import java.text.BreakIterator
import java.util.Locale
import kotlin.math.ceil
import kotlin.math.floor

// Extends AppCompatTextView, like RN's ReactTextView, since a raw TextView's glyph
// metrics drift out of alignment with <Text>.
class PlainTextView : AppCompatTextView {
  constructor(context: Context) : super(context)
  constructor(context: Context, attrs: AttributeSet?) : super(context, attrs)
  constructor(context: Context, attrs: AttributeSet?, defStyleAttr: Int) : super(
    context,
    attrs,
    defStyleAttr
  )

  // All fields must live above init, since Kotlin initializes fields in declaration order.
  //
  // SYNC: toEffectivePixel/calculateLetterSpacing below are pure top-level functions
  // because Kotlin's init-order check doesn't see through method calls. See
  // docs/agent/sync-points.md.

  private var fontSizeSp: Float = 14f
  // Mirrors RN's <Text> (TextAttributes): sp sizes track the OS text-size setting
  // unless allowFontScaling is off, clamped by maxFontSizeMultiplier (0 = no cap).
  private var allowFontScaling: Boolean = true
  private var maxFontSizeMultiplier: Float = 0f
  // NaN means unset, as in RN's TextAttributes.
  private var letterSpacingDip: Float = Float.NaN

  private var rawText: CharSequence? = null
  // NaN means unset, as in RN's TextAttributes.
  private var lineHeightSp: Float = Float.NaN
  // null/"none" means unset. Applied inside applyText, since it transforms rawText
  // before it reaches TextView.
  private var textTransform: String? = null

  private var fontFamily: String? = null
  private var fontWeight: Int = ReactConstants.UNSET
  private var fontStyle: Int = ReactConstants.UNSET

  // Named for the value, not TextView.setFontVariationSettings, to avoid colliding
  // with the synthetic property Kotlin derives from that method pair.
  private var variationSettings: String? = null
  // Last value handed to TextView, so an unchanged flush is a no-op (can't be read
  // back, since getFontVariationSettings() returns the paint's string, which outlives
  // the typeface it was applied to).
  private var appliedVariationSettings: String? = null

  // Never the live typeface: applyStyles derives from whatever is passed when
  // fontFamily is null, so chaining would leak a should-be-cleared font between nodes
  // through the reused measuring view.
  private val baseTypeface: Typeface? = typeface

  // The un-varied typeface applyTypeface last resolved: guards against re-setting an
  // unchanged typeface, and is what applyVariationSettings restores before clearing
  // axes. Seeded with baseTypeface so the restore is correct even if applyTypeface
  // never ran.
  //
  // SYNC: only assigned from applyTypeface and the restore in applyVariationSettings.
  // See docs/agent/sync-points.md.
  //
  // Known quirk: the OS "Bold text" setting reapplies the typeface via
  // onConfigurationChanged (API 31+) without invalidating this field, silently
  // resetting a variable font's axes, benign, self-heals on the next font/axis change.
  private var appliedBaseTypeface: Typeface? = baseTypeface

  // Reused by PlainTextViewManager for measurement. Never attached to a window, so
  // posting measureAndLayout would queue forever.
  internal var isMeasureOnly: Boolean = false

  // Whether measureAndLayout is already queued, so requestLayout() can coalesce
  // without removeCallbacks on every setter that requests layout per transaction. UI
  // thread only.
  private var relayoutPosted = false

  // Fabric assigns this view's frame directly and skips Android's measure/layout pass,
  // but TextView builds the text Layout it draws during onMeasure.
  private val measureAndLayout = Runnable {
    // Cleared before, not after, the pass so a requestLayout() from measure()/layout()
    // below queues a fresh runnable instead of being swallowed.
    relayoutPosted = false

    // True here means Fabric didn't already redo this via updateLayout in the same
    // mount batch, a prop change with no size change, which Fabric never re-lays-out.
    if (!isLayoutRequested) return@Runnable

    measure(
      MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
    )
    layout(left, top, right, bottom)
  }

  // Pixels-per-sp when sp-derived values were last applied, the probe ReactHostImpl
  // uses to detect a font-scale or density change.
  private var scaledPixelsPerSp: Float = PixelUtil.toPixelFromSP(1f)

  // Re-derives sp-derived pixel values after an OS text-size change (mirrors iOS's
  // traitCollectionDidChange). Posted, not run inline, because PixelUtil's snapshot is
  // still stale during onConfigurationChanged itself.
  private val reapplyScaledSizes = Runnable {
    val current = PixelUtil.toPixelFromSP(1f)
    if (current == scaledPixelsPerSp) return@Runnable
    scaledPixelsPerSp = current
    markScaledSizesDirty()
    flushPendingUpdates()
  }

  private var dirtyFontSize = false
  private var dirtyLetterSpacing = false
  private var dirtyTypeface = false
  private var dirtyText = false

  // @ReactProp setters mark a dirty flag instead of repeating expensive work per call.
  // This applies each once per transaction, like <Text>'s single ReactTextUpdate.
  // Never call from init: its apply* helpers read state past where Kotlin's
  // init-order check looks.
  //
  // SYNC: a new prop feeding shared work must set its own dirty flag, and flags must
  // be applied here in dependency order, or it silently does nothing.
  fun flushPendingUpdates() {
    if (dirtyFontSize) {
      dirtyFontSize = false
      // Ceil to a whole pixel as RN's TextAttributeProps.setFontSize does: a
      // fractional textSize shifts the paint's metrics and drifts per line.
      setTextSize(
        TypedValue.COMPLEX_UNIT_PX,
        ceil(toEffectivePixel(fontSizeSp, allowFontScaling, maxFontSizeMultiplier))
      )
      dirtyLetterSpacing = true // letterSpacing is relative to font size.
    }
    if (dirtyLetterSpacing) {
      dirtyLetterSpacing = false
      letterSpacing =
        calculateLetterSpacing(letterSpacingDip, textSize, allowFontScaling, maxFontSizeMultiplier)
    }
    if (dirtyTypeface) {
      dirtyTypeface = false
      applyTypeface()
    }
    // SYNC: must run after applyTypeface, since axes are baked into a derived Typeface, so
    // a new base typeface arrives with none. Reordering silently drops the axes
    // whenever a font prop changes in the same transaction. See
    // docs/agent/sync-points.md#deferred-prop-application.
    applyVariationSettings()
    if (dirtyText) {
      dirtyText = false
      applyText()
    }
  }

  init {
    setTextColor(Color.BLACK) // Matches iOS's UILabel; the theme's TextView gray would differ.
    // Fabric skips setters for props at default, so seed textSize/letterSpacing here or
    // the view keeps the theme's values, mismatching what the shadow node measured.
    setTextSize(
      TypedValue.COMPLEX_UNIT_PX,
      ceil(toEffectivePixel(fontSizeSp, allowFontScaling, maxFontSizeMultiplier))
    )
    letterSpacing = // After setTextSize: the em conversion divides by textSize.
      calculateLetterSpacing(letterSpacingDip, textSize, allowFontScaling, maxFontSizeMultiplier)
    // <Text> sets these explicitly rather than trusting the theme, so text wraps the same.
    breakStrategy = Layout.BREAK_STRATEGY_HIGH_QUALITY
    hyphenationFrequency = Layout.HYPHENATION_FREQUENCY_NONE
  }

  // Mirrors <Text> (TextAttributeProps#getEffectiveColor): null resets to black, not
  // the theme's gray.
  fun setColor(color: Int?) {
    setTextColor(color ?: Color.BLACK)
  }

  fun setFontSizeSp(sp: Float) {
    fontSizeSp = sp
    dirtyFontSize = true
  }

  fun setAllowFontScaling(value: Boolean) {
    if (allowFontScaling == value) return
    allowFontScaling = value
    markScaledSizesDirty()
  }

  fun setMaxFontSizeMultiplier(value: Float) {
    if (maxFontSizeMultiplier == value) return
    maxFontSizeMultiplier = value
    markScaledSizesDirty()
  }

  // SYNC: everything derived from the OS text-size setting must be reachable from
  // here, iOS's traitCollectionDidChange must cover the same set. See
  // docs/agent/sync-points.md.
  private fun markScaledSizesDirty() {
    dirtyFontSize = true
    dirtyText = true // lineHeight span is scaled too.
  }

  fun setPlainText(value: String?) {
    rawText = value
    dirtyText = true
  }

  // Mirrors <Text> (TextAttributeProps#lineHeight): DIP, scaled with font scaling on.
  // 0/unset keeps the font's natural line height.
  fun setLineHeight(lineHeight: Float) {
    lineHeightSp = if (lineHeight <= 0f) Float.NaN else lineHeight
    dirtyText = true
  }

  // Mirrors <Text> (TextTransform.kt). null/"none" leaves the text untouched.
  fun setTextTransform(value: String?) {
    textTransform = value
    dirtyText = true
  }

  // The single place text reaches TextView, since a lineHeight span must be layered on.
  private fun applyText() {
    val value = applyTextTransform(rawText?.toString() ?: "", textTransform)
    if (lineHeightSp.isNaN()) {
      setText(value)
      return
    }
    val spannable = SpannableString(value)
    spannable.setSpan(
      CustomLineHeightSpan(
        toEffectivePixel(lineHeightSp, allowFontScaling, maxFontSizeMultiplier)
      ),
      0,
      spannable.length,
      Spannable.SPAN_INCLUSIVE_INCLUSIVE
    )
    setText(spannable)
  }

  fun setLetterSpacingDip(letterSpacing: Float) {
    letterSpacingDip = letterSpacing
    dirtyLetterSpacing = true
  }

  // Mirrors <Text> (ReactBaseTextShadowNode): both values can appear in one
  // space-joined string. Paint flags rather than spans, since this view always
  // renders a single uniform run.
  fun setTextDecorationLine(value: String?) {
    paintFlags = if (value?.contains("underline") == true) {
      paintFlags or Paint.UNDERLINE_TEXT_FLAG
    } else {
      paintFlags and Paint.UNDERLINE_TEXT_FLAG.inv()
    }
    paintFlags = if (value?.contains("line-through") == true) {
      paintFlags or Paint.STRIKE_THRU_TEXT_FLAG
    } else {
      paintFlags and Paint.STRIKE_THRU_TEXT_FLAG.inv()
    }
  }

  // Mirrors <Text> (TextAttributeProps#fontFamily): resolved via ReactFontManager, so
  // fonts bundled the RN way (assets/fonts, or registered natively) work here too.
  fun setFontFamily(fontFamily: String?) {
    this.fontFamily = fontFamily
    dirtyTypeface = true
  }

  // Mirrors <Text> (TextAttributeProps#fontWeight): a raw weight, so it composes with
  // a custom fontFamily via ReactFontManager.TypefaceStyle.
  fun setFontWeight(fontWeight: String?) {
    this.fontWeight = ReactTypefaceUtils.parseFontWeight(fontWeight)
    dirtyTypeface = true
  }

  fun setFontStyle(fontStyle: String?) {
    this.fontStyle = ReactTypefaceUtils.parseFontStyle(fontStyle)
    dirtyTypeface = true
  }

  // Mirrors <Text> (TextAttributeProps#setFontVariant): an OpenType feature-settings
  // string on the paint, not the typeface. Deliberately unguarded: Paint early-outs
  // on an equal string, and the invalidation is redundant with setText anyway. See
  // docs/agent/performance.md before adding a guard.
  fun setFontVariant(fontVariant: ReadableArray?) {
    fontFeatureSettings = ReactTypefaceUtils.parseFontVariant(fontVariant)
  }

  // Variable-font axis values, in the `"wght" 700, "wdth" 87.5` form TextView takes
  // directly (API 26+). Derives a new Typeface, so it must apply after the typeface.
  // Named setVariationSettings, not setFontVariationSettings, to avoid overriding
  // TextView's own same-named Boolean-returning method.
  //
  // Trimmed before the emptiness check: an untrimmed whitespace-only string bypasses
  // Paint's "" short-circuit and NPEs in FontVariationAxis.fromFontVariationSettings.
  // "normal" (CSS for "no axes") is special-cased ahead of the parser, since Android's
  // grammar doesn't know that keyword.
  fun setVariationSettings(fontVariationSettings: String?) {
    val trimmed = fontVariationSettings?.trim()
    variationSettings = if (trimmed.isNullOrEmpty() || trimmed.equals("normal", ignoreCase = true)) {
      null
    } else {
      trimmed
    }
  }

  private fun applyVariationSettings() {
    // API 26 is where variable fonts arrived. Below it the prop is inert.
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val settings = variationSettings
    if (settings == appliedVariationSettings) return

    // Cross-view cache: appliedVariationSettings and applyTypeface's identity check
    // only catch one view redoing its own work. N mounted views at the same font +
    // axes each start uncached, so each pays for its own native derivation. See
    // docs/agent/performance.md.
    val base = appliedBaseTypeface
    if (settings != null && base != null) {
      val cached = variationTypefaceCache.get(VariationCacheKey(base, settings))
      if (cached != null) {
        // One setTypeface instead of the clear-then-derive dance below.
        //
        // EXPENSIVE, same as the block below: clears the text Layout and requests a
        // new one (TextView.java:4851).
        //
        // Accepted divergence: this goes through TextView.setTypeface, which (unlike
        // the derive-it-yourself path) updates the base getTypeface() reports. Only
        // shows on the OS Bold-text toggle: a cache-missed view drops its axes, a
        // cache-hit view keeps them. Not worth a field to keep the two in sync.
        typeface = cached
        appliedVariationSettings = settings
        return
      }
    }

    // Paint.setFontVariationSettings(null) doesn't undo axes on API 26-35: minikin
    // reuses the varied typeface's collection despite the cleared string, so the
    // base typeface must be restored manually. API 36 fixes this via
    // Typeface.mDerivedFrom. Nothing to restore if applyTypeface just ran (it
    // already reset this to null).
    if (appliedVariationSettings != null) {
      // EXPENSIVE: TextView.setTypeface, always a real change here, clears the text
      // Layout and requests a new one (TextView.java:4851).
      typeface = appliedBaseTypeface
    }

    // Cleared unconditionally: Paint's string survives setTypeface and early-outs on
    // equal values, so passing null first guarantees the next call isn't dropped.
    //
    // EXPENSIVE: clearing (unless it's the early-out) derives a new Typeface via
    // minikin, uncached until API 36's Flags.typefaceCacheForVarSettings.
    super.setFontVariationSettings(null)
    appliedVariationSettings = settings
    if (settings == null) return

    try {
      // EXPENSIVE: a second native Typeface derivation, same uncached path as the
      // clear above. applyTypeface's identity guard keeps this pair off the
      // per-node measuring path.
      super.setFontVariationSettings(settings)
      // Read off `paint`, not `typeface`: setFontVariationSettings only writes
      // mTextPaint, so `paint.typeface` is the only place the derived, axis-carrying
      // Typeface is observable.
      if (base != null) {
        variationTypefaceCache.put(VariationCacheKey(base, settings), paint.typeface)
      }
    } catch (e: IllegalArgumentException) {
      // A malformed prop string, not a broken font. Recording it as applied means a
      // stable bad value logs once, not every flush.
      FLog.w(ReactConstants.TAG, "PlainText: invalid fontVariationSettings: ${e.message}")
    }
  }

  private fun applyTypeface() {
    // Not expensive despite appearances: every applyStyles path is interned, via
    // ReactFontManager's or Typeface's own caches.
    val resolved = ReactTypefaceUtils.applyStyles(
      baseTypeface,
      if (fontStyle == Typeface.ITALIC) Typeface.ITALIC else Typeface.NORMAL,
      fontWeight,
      fontFamily,
      context.assets
    )
    // Guarded on identity, not just the dirty flag, since measure() sets all three
    // font props per node. This skips re-running applyVariationSettings' two EXPENSIVE
    // derivations for every node.
    if (resolved === appliedBaseTypeface) return
    appliedBaseTypeface = resolved
    // EXPENSIVE: TextView.setTypeface clears the text Layout and requests a new one
    // (TextView.java:4851), reached per node when axes are set, since the live
    // axis-derived typeface never equals what applyStyles resolved.
    typeface = resolved
    // Resetting to null forces applyVariationSettings to re-clear Paint's string and
    // signals there's nothing left to restore.
    appliedVariationSettings = null
  }

  // Mirrors <Text> (TextAttributeProps#getTextAlign): Gravity rather than
  // TEXT_ALIGNMENT_*, with left/right resolved against layout direction for RTL.
  fun setTextAlign(textAlign: String?) {
    val isRTL = layoutDirection == LAYOUT_DIRECTION_RTL
    val horizontal = when (textAlign) {
      "justify" -> Gravity.LEFT
      "auto", null -> Gravity.NO_GRAVITY
      "left" -> if (isRTL) Gravity.RIGHT else Gravity.LEFT
      "right" -> if (isRTL) Gravity.LEFT else Gravity.RIGHT
      "center" -> Gravity.CENTER_HORIZONTAL
      else -> Gravity.NO_GRAVITY
    }
    // Horizontal bits only, so textAlignVertical set in either order survives. Both
    // masks must be cleared since the default START is a relative gravity whose flag
    // lives outside HORIZONTAL_GRAVITY_MASK.
    gravity = (gravity and
      Gravity.HORIZONTAL_GRAVITY_MASK.inv() and
      Gravity.RELATIVE_HORIZONTAL_GRAVITY_MASK.inv()) or horizontal

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      justificationMode =
        if (textAlign == "justify") Layout.JUSTIFICATION_MODE_INTER_WORD
        else Layout.JUSTIFICATION_MODE_NONE
    }
  }

  // Mirrors <Text> (ReactTextView#setGravityVertical): vertical bits only, moves text
  // only when the view is taller than it. Android-only, like RN.
  fun setTextAlignVertical(textAlignVertical: String?) {
    val vertical = when (textAlignVertical) {
      "top" -> Gravity.TOP
      "bottom" -> Gravity.BOTTOM
      "center" -> Gravity.CENTER_VERTICAL
      else -> Gravity.TOP
    }
    gravity = (gravity and Gravity.VERTICAL_GRAVITY_MASK.inv()) or vertical
  }

  // 0 means unlimited, matching <Text>. It also bounds the off-screen measure pass.
  fun setNumberOfLines(numberOfLines: Int) {
    maxLines = if (numberOfLines <= 0) Integer.MAX_VALUE else numberOfLines
  }

  // Mirrors <Text> (ReactTextView#setEllipsizeMode): "clip" hard-cuts at maxLines.
  fun setEllipsizeMode(ellipsizeMode: String?) {
    ellipsize = when (ellipsizeMode) {
      "head" -> TextUtils.TruncateAt.START
      "middle" -> TextUtils.TruncateAt.MIDDLE
      "clip" -> null
      else -> TextUtils.TruncateAt.END
    }
  }

  // A text-size change touches no prop, so Fabric's diff never fires and
  // textSize/letterSpacing/lineHeight stay stale in pixels. Re-derive them here since
  // Android calls this on every attached view regardless of Fabric.
  //
  // Only reached when the host Activity declares fontScale in android:configChanges
  // (otherwise the Activity gets recreated). The super call also reapplies "Bold text"
  // to the typeface, unrelated to scale (see appliedBaseTypeface for the cost).
  override fun onConfigurationChanged(newConfig: Configuration?) {
    super.onConfigurationChanged(newConfig)
    // The measuring instance never gets here in practice, but is guarded anyway since
    // a post on an unattached view queues forever.
    if (isMeasureOnly) return
    removeCallbacks(reapplyScaledSizes)
    post(reapplyScaledSizes)
  }

  override fun requestLayout() {
    super.requestLayout()
    if (isMeasureOnly) return // Needs the invalidation but has no frame to lay out.
    // Zero size means initial mount or construction, not the case this hack is for: a
    // prop change with no size change, where Fabric emits no updateLayout.
    if (width == 0 || height == 0) return
    if (relayoutPosted) return // Already queued; the pending runnable covers this call too.
    relayoutPosted = true
    post(measureAndLayout)
  }
}

// Mirrors <Text> (TextAttributes#getEffective*): sp -> px through the OS setting,
// clamped by maxFontSizeMultiplier; raw DIP when scaling is off. Pure and top-level
// since init seeds textSize through it. See docs/agent/sync-points.md.
private fun toEffectivePixel(
  sp: Float,
  allowFontScaling: Boolean,
  maxFontSizeMultiplier: Float,
): Float {
  return if (allowFontScaling) {
    PixelUtil.toPixelFromSP(sp, maxFontSizeMultiplier)
  } else {
    PixelUtil.toPixelFromDIP(sp)
  }
}

// Mirrors <Text> (com.facebook.react.views.text.TextTransform, reimplemented here
// since that one is internal to RN's own module). Capitalize already matches CSS
// here; see ios/PlainTextTextTransform.h for why iOS needs its own implementation.
private fun applyTextTransform(text: String, textTransform: String?): String {
  // EXPENSIVE: allocates a transformed copy per call (docs/agent/performance.md).
  return when (textTransform) {
    "uppercase" -> text.uppercase(Locale.getDefault())
    "lowercase" -> text.lowercase(Locale.getDefault())
    "capitalize" -> {
      val wordIterator = BreakIterator.getWordInstance()
      wordIterator.setText(text)
      val result = StringBuilder(text.length)
      var start = wordIterator.first()
      var end = wordIterator.next()
      while (end != BreakIterator.DONE) {
        result.append(text.substring(start, end).replaceFirstChar { it.uppercaseChar() })
        start = end
        end = wordIterator.next()
      }
      result.toString()
    }
    else -> text
  }
}

// Key for variationTypefaceCache. Typeface has no equals override, so identity on
// baseTypeface is a reference compare, fine, since applyStyles already interns it.
// Structural equality on settings, which arrives fresh off the bridge per node.
private data class VariationCacheKey(val baseTypeface: Typeface, val settings: String)

// Shared across every PlainTextView, including the measuring view. Bounded since
// settings is a continuous value an animating screen could grow without limit, same
// reasoning as the iOS font cache's countLimit
// (docs/agent/performance.md#share-and-cache-ios-font-resolution).
//
// LruCache synchronizes internally, needed since measure() runs on the layout thread
// and mount on the UI thread, and both reach this.
private val variationTypefaceCache = LruCache<VariationCacheKey, Typeface>(64)

// Mirrors <Text> (TextAttributeProps#letterSpacing): px divided by the font size,
// because TextView.letterSpacing is in em unlike iOS's absolute kerning. Pure and
// top-level for the same reason as toEffectivePixel.
private fun calculateLetterSpacing(
  letterSpacingDip: Float,
  fontSizePx: Float,
  allowFontScaling: Boolean,
  maxFontSizeMultiplier: Float,
): Float {
  return if (letterSpacingDip.isNaN() || letterSpacingDip == 0f) {
    0f
  } else {
    toEffectivePixel(letterSpacingDip, allowFontScaling, maxFontSizeMultiplier) / fontSizePx
  }
}

// A copy of RN's CustomLineHeightSpan (internal to RN, can't be reused). Splits extra
// leading evenly above/below and pads the first/last line, matching <Text> vertically.
private class CustomLineHeightSpan(height: Float) : LineHeightSpan {
  private val lineHeight: Int = ceil(height.toDouble()).toInt()

  override fun chooseHeight(
    text: CharSequence,
    start: Int,
    end: Int,
    spanstartv: Int,
    v: Int,
    fm: Paint.FontMetricsInt,
  ) {
    val leading = lineHeight - ((-fm.ascent) + fm.descent)
    fm.ascent -= ceil(leading / 2.0f).toInt()
    fm.descent += floor(leading / 2.0f).toInt()
    if (start == 0) {
      fm.top = fm.ascent
    }
    if (end == text.length) {
      fm.bottom = fm.descent
    }
  }
}

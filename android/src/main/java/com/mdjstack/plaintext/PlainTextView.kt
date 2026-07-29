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
import android.util.TypedValue
import android.view.Gravity
import androidx.appcompat.widget.AppCompatTextView
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.common.ReactConstants
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.views.text.ReactTypefaceUtils
import kotlin.math.ceil
import kotlin.math.floor

// Extends AppCompatTextView because RN's ReactTextView does: its compat font/paint
// resolution shifts glyph metrics slightly, so a raw TextView drifted out of alignment
// with <Text>.
class PlainTextView : AppCompatTextView {
  constructor(context: Context) : super(context)
  constructor(context: Context, attrs: AttributeSet?) : super(context, attrs)
  constructor(context: Context, attrs: AttributeSet?, defStyleAttr: Int) : super(
    context,
    attrs,
    defStyleAttr
  )

  // --- State ------------------------------------------------------------------
  //
  // All fields live above init: Kotlin runs initializers in declaration order, so a
  // field below init still holds its zero-default while init runs — the wrong value,
  // silently.
  //
  // SYNC: that is a compile error only for the fields init reads directly, since
  // Kotlin's check does not follow a call — hence the pure top-level conversions at
  // the bottom of this file. See docs/agent/sync-points.md.

  // Mirrors the codegen fontSize default.
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

  private var fontFamily: String? = null
  private var fontWeight: Int = ReactConstants.UNSET
  private var fontStyle: Int = ReactConstants.UNSET

  // Never the live typeface: applyStyles derives from whatever it is passed when
  // fontFamily is null, so chaining lets a font that should have been cleared survive
  // — and leak between nodes through the reused measuring view.
  private val baseTypeface: Typeface? = typeface

  // The instance PlainTextViewManager reuses for measurement. Never attached to a
  // window, so measureAndLayout would queue forever, once per prop set.
  internal var isMeasureOnly: Boolean = false

  // Whether measureAndLayout is already queued, so requestLayout() can coalesce without
  // removeCallbacks — which walks the whole MessageQueue under its lock, and again the
  // HandlerActionQueue, on every one of the ~18 setters that requestLayout per
  // transaction. Read and written on the UI thread only.
  private var relayoutPosted = false

  // Fabric assigns this view's frame directly and never runs Android's measure/layout
  // pass, but TextView builds the text Layout it draws during onMeasure.
  private val measureAndLayout = Runnable {
    // Cleared before the pass, not after: measure()/layout() can requestLayout() again,
    // and that has to be able to queue a fresh runnable rather than be swallowed. It
    // can't spin — the layout() below clears PFLAG_FORCE_LAYOUT, so the re-posted
    // runnable falls out at the check underneath.
    relayoutPosted = false

    // Only the case requestLayout() below can't tell apart at post time: whether Fabric
    // will re-lay-out this view later in the same mount batch. It does its own measure()
    // + layout() in SurfaceMountingManager.updateLayout, which rebuilds the same Layout
    // — and whose layout() clears the PFLAG_FORCE_LAYOUT this reads, so a still-set flag
    // means no updateLayout arrived. Nothing else can clear it behind Fabric's back:
    // ReactRootView.requestLayout() is a no-op, so no ancestor drives a layout pass over
    // these views.
    //
    // What survives the check is exactly what the hack is for: a prop change on a
    // laid-out view whose size doesn't change, where Fabric emits no updateLayout.
    if (!isLayoutRequested) return@Runnable

    measure(
      MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
    )
    layout(left, top, right, bottom)
  }

  // What one sp was worth in pixels when the sp-derived values below were last applied,
  // i.e. density * the OS text-size setting. The same probe ReactHostImpl uses to spot a
  // font scale change, and it catches a density change too. Read by
  // reapplyScaledSizes; see onConfigurationChanged.
  private var scaledPixelsPerSp: Float = PixelUtil.toPixelFromSP(1f)

  // Every value derived from the OS text-size setting is applied as raw pixels, so a
  // change to that setting leaves them all stale. Re-derives them from the current
  // props, mirroring iOS's traitCollectionDidChange.
  //
  // Posted rather than run inline because PixelUtil reads a snapshot,
  // DisplayMetricsHolder, that is refreshed by ReactHostImpl.onConfigurationChanged —
  // and ReactActivity gets there only *after* super.onConfigurationChanged has walked
  // the view hierarchy, so the snapshot is still stale while our callback runs. Posting
  // lands us after the whole Activity callback, whichever message the hierarchy walk
  // arrived on.
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

  // --- Batched prop application ---------------------------------------------
  //
  // Fabric applies props one setter at a time and several feed the same expensive
  // work: every font prop re-resolved the typeface, and text/lineHeight each called
  // setText, dragging a requestLayout along. Those setters only mark state dirty; this
  // does the work once, like <Text>'s single prebuilt ReactTextUpdate.
  //
  // Batched means shared work — typeface resolution, setText, anything derived from the
  // scaled font size. The rest are one cheap independent write and apply inline; the
  // unconditional requestLayout() a couple of them trigger (maxLines,
  // justificationMode) is collapsed by the removeCallbacks/post at the bottom of the
  // class.
  //
  // Never call it from init — its apply* helpers read state one call deep, which is
  // where Kotlin's initialization check stops looking.
  //
  // SYNC: a new prop feeding that shared work must mark its flag, and this must apply
  // it in dependency order. Set but never flushed silently does nothing.
  fun flushPendingUpdates() {
    if (dirtyFontSize) {
      dirtyFontSize = false
      // Ceil to a whole pixel as RN's TextAttributeProps.setFontSize does: a
      // fractional textSize shifts the paint's metrics and drifts per line.
      setTextSize(
        TypedValue.COMPLEX_UNIT_PX,
        ceil(toEffectivePixel(fontSizeSp, allowFontScaling, maxFontSizeMultiplier))
      )
      // letterSpacing is relative to the font size.
      dirtyLetterSpacing = true
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
    if (dirtyText) {
      dirtyText = false
      applyText()
    }
  }

  init {
    // Black, matching iOS's UILabel; the theme's TextView gray would differ.
    setTextColor(Color.BLACK)
    // Fabric skips setters for props still at their default, so seed textSize and
    // letterSpacing or a defaulted view keeps the theme's values and mismatches what
    // the shadow node measured. The fields are read here, not inside a helper, to keep
    // the ordering above compiler-enforced.
    setTextSize(
      TypedValue.COMPLEX_UNIT_PX,
      ceil(toEffectivePixel(fontSizeSp, allowFontScaling, maxFontSizeMultiplier))
    )
    // After setTextSize: the em conversion divides by textSize.
    letterSpacing =
      calculateLetterSpacing(letterSpacingDip, textSize, allowFontScaling, maxFontSizeMultiplier)
    // <Text> sets these explicitly (TextAttributeProps' DEFAULT_*) rather than
    // trusting the theme, which can differ — match it so text wraps the same.
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

  // dirtyText too, because the lineHeight span is scaled as well.
  //
  // SYNC: everything derived from the OS text-size setting has to be reachable from
  // here, since this is also how onConfigurationChanged re-derives it — and iOS's
  // traitCollectionDidChange has to cover the same set. See docs/agent/sync-points.md.
  private fun markScaledSizesDirty() {
    dirtyFontSize = true
    dirtyText = true
  }

  fun setPlainText(value: String?) {
    rawText = value
    dirtyText = true
  }

  // Mirrors <Text> (TextAttributeProps#lineHeight): DIP, scaled with font scaling on;
  // 0/unset keeps the font's natural line height.
  fun setLineHeight(lineHeight: Float) {
    lineHeightSp = if (lineHeight <= 0f) Float.NaN else lineHeight
    dirtyText = true
  }

  // The single place text reaches TextView, because a lineHeight span has to be
  // layered on — hence both setters above marking dirtyText. Span flags match RN's for
  // a span anchored at index 0.
  private fun applyText() {
    val value = rawText ?: ""
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

  // Mirrors <Text> (ReactBaseTextShadowNode): the two values can appear together in
  // one space-joined string. Paint flags rather than spans, since this view always
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

  // Mirrors <Text> (TextAttributeProps#setFontVariant): the variant names become an
  // OpenType feature-settings string on the paint, which is where Android expresses
  // them — not on the typeface, so this doesn't feed applyTypeface. One cheap
  // independent write, hence inline rather than a dirty flag. Null clears the
  // features, which is what the measuring view needs when the prop is absent.
  fun setFontVariant(fontVariant: ReadableArray?) {
    fontFeatureSettings = ReactTypefaceUtils.parseFontVariant(fontVariant)
  }

  private fun applyTypeface() {
    typeface = ReactTypefaceUtils.applyStyles(
      baseTypeface,
      if (fontStyle == Typeface.ITALIC) Typeface.ITALIC else Typeface.NORMAL,
      fontWeight,
      fontFamily,
      context.assets
    )
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
    // Horizontal bits only, so a textAlignVertical set in either order survives. Both
    // masks must be cleared: the default START is a *relative* gravity whose flag
    // lives outside HORIZONTAL_GRAVITY_MASK, so clearing only the absolute bits
    // resolves "center" back to start.
    gravity = (gravity and
      Gravity.HORIZONTAL_GRAVITY_MASK.inv() and
      Gravity.RELATIVE_HORIZONTAL_GRAVITY_MASK.inv()) or horizontal

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      justificationMode =
        if (textAlign == "justify") Layout.JUSTIFICATION_MODE_INTER_WORD
        else Layout.JUSTIFICATION_MODE_NONE
    }
  }

  // Mirrors <Text> (ReactTextView#setGravityVertical): vertical bits only. Only moves
  // the text when the view is taller than it. Android-only, like RN.
  fun setTextAlignVertical(textAlignVertical: String?) {
    val vertical = when (textAlignVertical) {
      "top" -> Gravity.TOP
      "bottom" -> Gravity.BOTTOM
      "center" -> Gravity.CENTER_VERTICAL
      else -> Gravity.TOP
    }
    gravity = (gravity and Gravity.VERTICAL_GRAVITY_MASK.inv()) or vertical
  }

  // 0 means unlimited, matching <Text>; also bounds the off-screen measure pass.
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

  // A text-size setting change alone doesn't touch any prop — the scale is read
  // ambiently through PixelUtil inside toEffectivePixel — so Fabric's props diff never
  // fires and textSize, letterSpacing and the lineHeight span stay at their old pixel
  // values. Android calls this on every attached view when the configuration changes,
  // independent of Fabric, so re-derive from the current props here.
  //
  // Only reached when the host Activity declares fontScale in android:configChanges;
  // otherwise Android recreates the Activity and the views are rebuilt from scratch.
  // Re-measurement is RN's job either way: it dirties every MeasurableYogaNode when the
  // surface's fontSizeMultiplier changes, which is what re-runs
  // PlainTextViewManager.measure and gives this view its new frame.
  override fun onConfigurationChanged(newConfig: Configuration?) {
    super.onConfigurationChanged(newConfig)
    // The measuring instance is never attached, so it never gets here — and it re-reads
    // the scale on every measure() anyway. Guarded regardless: a post on an unattached
    // view queues forever.
    if (isMeasureOnly) return
    removeCallbacks(reapplyScaledSizes)
    post(reapplyScaledSizes)
  }

  override fun requestLayout() {
    super.requestLayout()
    // The measuring instance needs the invalidation but has no frame to lay out.
    if (isMeasureOnly) return
    // Zero size is either the initial mount, where Fabric calls measure() + layout()
    // itself, or construction, where TextView's constructor reaches here before
    // measureAndLayout exists. What this hack covers is neither: a prop change on a
    // laid-out view whose size doesn't change, where Fabric emits no updateLayout.
    if (width == 0 || height == 0) return
    // Already queued: the pending runnable will see the state this call is part of, so
    // re-posting would only do the same work twice.
    if (relayoutPosted) return
    relayoutPosted = true
    post(measureAndLayout)
  }
}

// Mirrors <Text> (TextAttributes#getEffective*): sp -> px through the OS setting,
// clamped by maxFontSizeMultiplier; raw DIP when scaling is off.
//
// Keep it pure and top-level — init seeds textSize through it, and Kotlin only checks a
// field read written inside init. See docs/agent/sync-points.md.
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

// A copy of RN's own CustomLineHeightSpan, which is `internal` to RN and so can't be
// reused — same name on purpose, to keep the counterpart findable. Unlike
// LineHeightSpan.Standard it splits the extra leading evenly above and below the text
// and also pads before the first line and after the last, matching <Text> vertically.
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

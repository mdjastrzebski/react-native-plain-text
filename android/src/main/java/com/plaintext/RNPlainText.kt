package com.plaintext

import android.content.Context
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
import com.facebook.react.common.ReactConstants
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.views.text.ReactTypefaceUtils
import kotlin.math.ceil
import kotlin.math.floor

// Extends AppCompatTextView (not the plain platform TextView) because that's
// what RN's own <Text> is backed by (ReactTextView extends AppCompatTextView).
// AppCompatTextView's compat font/paint resolution shifts glyph metrics
// slightly from a raw TextView; using a different base class than <Text>
// made PlainText's rendering drift out of alignment with it.
class RNPlainText : AppCompatTextView {
  constructor(context: Context) : super(context)
  constructor(context: Context, attrs: AttributeSet?) : super(context, attrs)
  constructor(context: Context, attrs: AttributeSet?, defStyleAttr: Int) : super(
    context,
    attrs,
    defStyleAttr
  )

  // Declared before the init block below because init calls setFontSizeSp, which
  // reads all three; a property whose initializer runs after init would still be
  // at its zero-default (notably allowFontScaling would be false, not true).
  private var fontSizeSp: Float = 14f
  // Font scaling knobs, mirroring RN's <Text> (TextAttributes): allowFontScaling
  // (default true) toggles whether sizes track the OS accessibility text-size
  // setting, and maxFontSizeMultiplier (0 = no cap) clamps that scale. Both feed
  // toEffectivePixel below, which every sp-based size (font/line height/letter
  // spacing) routes through.
  private var allowFontScaling: Boolean = true
  private var maxFontSizeMultiplier: Float = 0f

  // --- Batched prop application ---------------------------------------------
  //
  // Fabric applies props one setter at a time and several of ours feed the same
  // expensive work — three font props each re-resolved the typeface, and
  // text/lineHeight/the scaling knobs each called setText, every one dragging a
  // requestLayout behind it. So setters only mark state dirty and
  // flushPendingUpdates() does the work once, the way RN's <Text> applies a
  // single prebuilt ReactTextUpdate.
  //
  // Flushed from onAfterUpdateTransaction, from init, and before the off-screen
  // measure.
  //
  // SYNC: a new prop's setter must mark the flag its work belongs to, and
  // flushPendingUpdates must apply it in dependency order. A prop that is set
  // but never flushed silently does nothing; a new read path that doesn't flush
  // first sees stale state.
  private var dirtyFontSize = false
  private var dirtyLetterSpacing = false
  private var dirtyTypeface = false
  private var dirtyText = false

  fun flushPendingUpdates() {
    if (dirtyFontSize) {
      dirtyFontSize = false
      // Match RN's <Text> (TextAttributeProps.setFontSize) exactly: it converts
      // sp to px itself and ceils to a whole pixel, where setTextSize(SP, ...)
      // would leave a fractional value. The difference shifts the paint's font
      // metrics and compounds into per-line drift over a multiline block.
      setTextSize(TypedValue.COMPLEX_UNIT_PX, ceil(toEffectivePixel(fontSizeSp)))
      // letterSpacing is relative to the font size.
      dirtyLetterSpacing = true
    }
    if (dirtyLetterSpacing) {
      dirtyLetterSpacing = false
      applyLetterSpacing()
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
    // Default to black so text color matches iOS's UILabel default. The theme's
    // default TextView color is a gray, which would differ across platforms.
    setTextColor(Color.BLACK)
    // Seed textSize to the codegen fontSize default (14sp). Fabric only calls
    // setFontSize when the prop differs from that default, so a view using the
    // default would otherwise keep the theme's TextView size and mismatch the
    // 14sp the shadow node measures with — truncating the text.
    setFontSizeSp(14f)
    // RN's <Text> explicitly sets these (TextAttributeProps' DEFAULT_BREAK_STRATEGY /
    // DEFAULT_HYPHENATION_FREQUENCY) rather than relying on the platform/theme default,
    // which can differ (e.g. some widget styles default breakStrategy to "simple").
    // Match them so identical text wraps onto the same lines as <Text>.
    breakStrategy = Layout.BREAK_STRATEGY_HIGH_QUALITY
    hyphenationFrequency = Layout.HYPHENATION_FREQUENCY_NONE
    // A view whose props are never set still has to be self-consistent.
    flushPendingUpdates()
  }

  // Mirrors RN's <Text> (TextAttributeProps#getEffectiveColor): a null value
  // resets to the black default rather than falling through to the theme's
  // gray, keeping the two platforms' unset-color rendering identical.
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

  // Every size derived from an sp value has to be recomputed after a scaling
  // knob changes — including the text, whose lineHeight span is scaled too.
  private fun markScaledSizesDirty() {
    dirtyFontSize = true
    dirtyText = true
  }

  // Mirrors RN's <Text> (TextAttributes#getEffective*): when font scaling is on,
  // scale sp -> px through the OS setting, clamped by maxFontSizeMultiplier
  // (PixelUtil ignores the cap unless it's >= 1); when off, treat the value as
  // raw DIP so it renders at its literal size.
  private fun toEffectivePixel(sp: Float): Float {
    return if (allowFontScaling) {
      PixelUtil.toPixelFromSP(sp, maxFontSizeMultiplier)
    } else {
      PixelUtil.toPixelFromDIP(sp)
    }
  }

  private var rawText: CharSequence? = null
  private var lineHeightSp: Float = Float.NaN
  private var letterSpacingDip: Float = Float.NaN

  // Text is routed through here (rather than TextView.setText directly) so a
  // lineHeight span can be layered on when needed. Re-applied whenever the text
  // or the line height changes.
  fun setPlainText(value: String?) {
    rawText = value
    dirtyText = true
  }

  // Mirrors RN's <Text> (TextAttributeProps#lineHeight): the value is in DIP and
  // scaled to px with font scaling on (RN's allowFontScaling default). 0/unset
  // keeps the font's natural line height.
  fun setLineHeight(lineHeight: Float) {
    lineHeightSp = if (lineHeight <= 0f) Float.NaN else lineHeight
    dirtyText = true
  }

  private fun applyText() {
    val value = rawText ?: ""
    if (lineHeightSp.isNaN()) {
      setText(value)
      return
    }
    // Reimplements RN's (internal) CustomLineHeightSpan so line spacing matches
    // <Text> exactly. Applied over the whole string with the same span flags RN
    // uses for a span anchored at index 0. The height is scaled through the same
    // font-scaling path as the font size.
    val spannable = SpannableString(value)
    spannable.setSpan(
      RNLineHeightSpan(toEffectivePixel(lineHeightSp)),
      0,
      spannable.length,
      Spannable.SPAN_INCLUSIVE_INCLUSIVE
    )
    setText(spannable)
  }

  // Mirrors RN's <Text> (TextAttributeProps#letterSpacing + ReactTextView): the
  // DIP input is scaled to px and divided by the font size, because Android's
  // TextView.letterSpacing is in em units (relative to the font size), unlike
  // iOS's absolute point kerning.
  fun setLetterSpacingDip(letterSpacing: Float) {
    letterSpacingDip = letterSpacing
    dirtyLetterSpacing = true
  }

  private fun applyLetterSpacing() {
    letterSpacing = if (letterSpacingDip.isNaN() || letterSpacingDip == 0f) {
      0f
    } else {
      toEffectivePixel(letterSpacingDip) / textSize
    }
  }

  // Mirrors RN's <Text> (ReactBaseTextShadowNode's UnderlineSpan/
  // StrikethroughSpan): "underline"/"line-through" can appear together in a
  // space-joined string, and each toggles independently. Applied via the
  // paint's flags (which cover the whole view) rather than spans, since this
  // TextView always renders a single uniform run. The decoration line color
  // follows the text color, matching <Text>.
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

  private var fontFamily: String? = null
  private var fontWeight: Int = ReactConstants.UNSET
  private var fontStyle: Int = ReactConstants.UNSET

  // A fixed base for applyTypeface, never the view's current typeface: with no
  // fontFamily, ReactTypefaceUtils.applyStyles derives from whatever it is
  // passed, so chaining off the live value lets an earlier family/weight survive
  // a change that should have cleared it — and lets one node's font leak into
  // the next through the reused measuring view.
  private val baseTypeface: Typeface? = typeface

  // Mirrors RN's <Text> (TextAttributeProps#fontFamily): resolves against
  // ReactFontManager so custom fonts bundled the RN way (assets/fonts, or
  // registered natively) work here too, falling back to the platform default
  // when unset.
  fun setFontFamily(fontFamily: String?) {
    this.fontFamily = fontFamily
    dirtyTypeface = true
  }

  // Mirrors RN's <Text> (TextAttributeProps#fontWeight): parses the numeric
  // ("100".."900") / "normal" / "bold" values into a raw weight so it composes
  // correctly with a custom fontFamily via ReactFontManager.TypefaceStyle.
  fun setFontWeight(fontWeight: String?) {
    this.fontWeight = ReactTypefaceUtils.parseFontWeight(fontWeight)
    dirtyTypeface = true
  }

  fun setFontStyle(fontStyle: String?) {
    this.fontStyle = ReactTypefaceUtils.parseFontStyle(fontStyle)
    dirtyTypeface = true
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

  // Mirrors RN's <Text> (TextAttributeProps#getTextAlign): textAlign maps onto
  // Gravity rather than View.TEXT_ALIGNMENT_*, and "start"/"left"/"right"/"end"
  // are resolved against the view's layout direction so they match <Text> in
  // RTL locales too. "justify" alone is just left-aligned Gravity — actual
  // justification is a separate Layout.justificationMode (API 26+, see below).
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
    // Set only the horizontal bits so a textAlignVertical set in either order
    // survives (mirrors RN's ReactTextView#setGravityHorizontal). Both the
    // absolute and the relative horizontal masks must be cleared: the view's
    // default gravity is START, a *relative* gravity whose flag lives outside
    // HORIZONTAL_GRAVITY_MASK, so clearing only the absolute bits would leave it
    // set and resolve "center" (which sets no pull direction) back to start.
    gravity = (gravity and
      Gravity.HORIZONTAL_GRAVITY_MASK.inv() and
      Gravity.RELATIVE_HORIZONTAL_GRAVITY_MASK.inv()) or horizontal

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      justificationMode =
        if (textAlign == "justify") Layout.JUSTIFICATION_MODE_INTER_WORD
        else Layout.JUSTIFICATION_MODE_NONE
    }
  }

  // Mirrors RN's <Text> (ReactTextViewManager#setTextAlignVertical +
  // ReactTextView#setGravityVertical): maps onto the vertical component of
  // Gravity, touching only the vertical bits so it composes with textAlign's
  // horizontal gravity. "auto" falls back to the default top alignment. Only
  // affects the text's position when the view is taller than the text (e.g. an
  // explicit height); Android-only, matching RN (iOS <Text> ignores it).
  fun setTextAlignVertical(textAlignVertical: String?) {
    val vertical = when (textAlignVertical) {
      "top" -> Gravity.TOP
      "bottom" -> Gravity.BOTTOM
      "center" -> Gravity.CENTER_VERTICAL
      // "auto", null and any unknown value fall back to the default (top).
      else -> Gravity.TOP
    }
    gravity = (gravity and Gravity.VERTICAL_GRAVITY_MASK.inv()) or vertical
  }

  // Mirrors RN's <Text> (ReactTextView#setNumberOfLines): 0 means unlimited,
  // so map it onto TextView's Integer.MAX_VALUE maxLines. This also bounds the
  // off-screen measure pass in the ViewManager, matching the intrinsic height.
  fun setNumberOfLines(numberOfLines: Int) {
    maxLines = if (numberOfLines <= 0) Integer.MAX_VALUE else numberOfLines
  }

  // Mirrors RN's <Text> (ReactTextView#setEllipsizeMode): "clip" removes the
  // ellipsis (text is hard-cut at maxLines); the rest map onto TruncateAt.
  fun setEllipsizeMode(ellipsizeMode: String?) {
    ellipsize = when (ellipsizeMode) {
      "head" -> TextUtils.TruncateAt.START
      "middle" -> TextUtils.TruncateAt.MIDDLE
      "clip" -> null
      // "tail", null and any unknown value fall back to the RN default.
      else -> TextUtils.TruncateAt.END
    }
  }

  // Marks the off-screen instance RNPlainTextManager reuses for measurement. It
  // is never attached to a window, so the Runnable below would never run — it
  // would just pile up in the pending-action queue, once per prop set, forever.
  internal var isMeasureOnly: Boolean = false

  // React Native's Fabric layout system assigns this view's frame directly and
  // never triggers Android's normal measure/layout pass. TextView builds the
  // text Layout it draws during onMeasure, so without this the text is never
  // rendered. Re-run measure + layout ourselves whenever a layout is requested.
  private val measureAndLayout = Runnable {
    measure(
      MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
    )
    layout(left, top, right, bottom)
  }

  override fun requestLayout() {
    super.requestLayout()
    // The ViewManager calls measure() on the measuring instance itself; it needs
    // the invalidation above but has no frame to lay out into.
    if (isMeasureOnly) return
    // No frame yet means the initial mount, where Fabric calls measure() +
    // layout() itself after applying props (SurfaceMountingManager.updateLayout)
    // — posting here would measure at 0x0, once per prop setter. What this hack
    // actually covers is the other case: a prop change on a laid-out view whose
    // size doesn't change, where Fabric emits no updateLayout.
    if (width == 0 || height == 0) return
    // Several setters can request a layout within one transaction.
    removeCallbacks(measureAndLayout)
    post(measureAndLayout)
  }
}

// A reimplementation of RN's internal CustomLineHeightSpan (which isn't part of
// the public API). Unlike LineHeightSpan.Standard it uses web-like line-box
// behavior: the extra leading is split evenly above and below the text, and it
// also affects the space before the first line and after the last, so text
// vertically matches RN's own <Text>.
private class RNLineHeightSpan(height: Float) : LineHeightSpan {
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

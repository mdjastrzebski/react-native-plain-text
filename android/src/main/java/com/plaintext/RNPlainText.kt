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

// Extends AppCompatTextView because RN's ReactTextView does: its compat font/paint
// resolution shifts glyph metrics slightly from a raw TextView, which drifted
// PlainText out of alignment with <Text>.
class RNPlainText : AppCompatTextView {
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
  // silently (allowFontScaling false, letterSpacingDip 0f, fontWeight 0).
  //
  // SYNC: that is a compile error only for the fields init reads directly, because
  // Kotlin's check does not follow a call. Hence the pure top-level conversions at the
  // bottom of this file. See docs/agent/sync-points.md.

  // 14f mirrors the codegen fontSize default.
  private var fontSizeSp: Float = 14f
  // Mirrors RN's <Text> (TextAttributes): sp sizes track the OS text-size setting
  // unless allowFontScaling is off, clamped by maxFontSizeMultiplier (0 = no cap).
  private var allowFontScaling: Boolean = true
  private var maxFontSizeMultiplier: Float = 0f
  // NaN, not 0f, means unset.
  private var letterSpacingDip: Float = Float.NaN

  private var rawText: CharSequence? = null
  // NaN means unset — the font's natural line height.
  private var lineHeightSp: Float = Float.NaN

  private var fontFamily: String? = null
  private var fontWeight: Int = ReactConstants.UNSET
  private var fontStyle: Int = ReactConstants.UNSET

  // A fixed base for applyTypeface, never the live typeface: applyStyles derives from
  // whatever it is passed when fontFamily is null, so chaining off the live value lets
  // a font that should have been cleared survive — and leak between nodes through the
  // reused measuring view.
  private val baseTypeface: Typeface? = typeface

  // The off-screen instance RNPlainTextManager reuses. Never attached to a window, so
  // measureAndLayout would never run — it would queue forever, once per prop set.
  internal var isMeasureOnly: Boolean = false

  // Fabric assigns this view's frame directly and never runs Android's measure/layout
  // pass, but TextView builds the text Layout it draws during onMeasure — so re-run
  // both ourselves whenever a layout is requested.
  private val measureAndLayout = Runnable {
    measure(
      MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
    )
    layout(left, top, right, bottom)
  }

  // Marked by the prop setters, applied by flushPendingUpdates.
  private var dirtyFontSize = false
  private var dirtyLetterSpacing = false
  private var dirtyTypeface = false
  private var dirtyText = false

  // --- Batched prop application ---------------------------------------------
  //
  // Fabric applies props one setter at a time and several feed the same expensive
  // work: every font prop re-resolved the typeface, and text/lineHeight each called
  // setText, dragging a requestLayout along. Setters only mark state dirty; this does
  // the work once, the way <Text> applies a single prebuilt ReactTextUpdate.
  //
  // Never call it from init — its apply* helpers read state one call deep, which is
  // where Kotlin's initialization check stops looking.
  //
  // SYNC: a new prop's setter must mark its flag, and the flush must apply it in
  // dependency order. Set but never flushed silently does nothing.
  fun flushPendingUpdates() {
    if (dirtyFontSize) {
      dirtyFontSize = false
      // Ceil to a whole pixel, as RN's TextAttributeProps.setFontSize does: a
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
    // letterSpacing here or a defaulted view keeps the theme's values and mismatches
    // what the shadow node measured. The fields are read here rather than inside a
    // helper to keep the declaration order above compiler-enforced.
    setTextSize(
      TypedValue.COMPLEX_UNIT_PX,
      ceil(toEffectivePixel(fontSizeSp, allowFontScaling, maxFontSizeMultiplier))
    )
    // Must follow setTextSize: the em conversion divides by textSize. <Text> has no
    // equivalent seed (ReactTextView#setLetterSpacing early-returns on NaN), so this
    // is about agreeing with our own measure pass, not <Text> parity.
    letterSpacing =
      calculateLetterSpacing(letterSpacingDip, textSize, allowFontScaling, maxFontSizeMultiplier)
    // <Text> sets these explicitly (TextAttributeProps' DEFAULT_BREAK_STRATEGY /
    // DEFAULT_HYPHENATION_FREQUENCY) rather than trusting the theme, which can differ.
    // Match it so identical text wraps onto the same lines.
    breakStrategy = Layout.BREAK_STRATEGY_HIGH_QUALITY
    hyphenationFrequency = Layout.HYPHENATION_FREQUENCY_NONE
  }

  // Mirrors <Text> (TextAttributeProps#getEffectiveColor): null resets to black rather
  // than falling through to the theme's gray, so both platforms match when unset.
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

  // Every sp-derived size has to be recomputed, including the text's lineHeight span.
  private fun markScaledSizesDirty() {
    dirtyFontSize = true
    dirtyText = true
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

  // The single place text reaches TextView, because a lineHeight span has to be
  // layered on — so both setPlainText and setLineHeight mark dirtyText.
  private fun applyText() {
    val value = rawText ?: ""
    if (lineHeightSp.isNaN()) {
      setText(value)
      return
    }
    // Same span flags RN uses for a span anchored at index 0.
    val spannable = SpannableString(value)
    spannable.setSpan(
      RNLineHeightSpan(
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

  // Mirrors <Text> (ReactBaseTextShadowNode): both values can appear together in one
  // space-joined string and toggle independently. Applied via the paint's flags rather
  // than spans, since this view always renders a single uniform run.
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

  // Mirrors <Text> (TextAttributeProps#fontWeight): parsed to a raw weight so it
  // composes with a custom fontFamily via ReactFontManager.TypefaceStyle.
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

  // Mirrors <Text> (TextAttributeProps#getTextAlign): maps onto Gravity rather than
  // TEXT_ALIGNMENT_*, resolving left/right against layout direction so RTL matches.
  // "justify" is left Gravity plus justificationMode below (API 26+).
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
    // Horizontal bits only, so a textAlignVertical set in either order survives (as
    // RN's setGravityHorizontal). Both masks must be cleared: the default START is a
    // *relative* gravity whose flag lives outside HORIZONTAL_GRAVITY_MASK, so clearing
    // only the absolute bits resolves "center" back to start.
    gravity = (gravity and
      Gravity.HORIZONTAL_GRAVITY_MASK.inv() and
      Gravity.RELATIVE_HORIZONTAL_GRAVITY_MASK.inv()) or horizontal

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      justificationMode =
        if (textAlign == "justify") Layout.JUSTIFICATION_MODE_INTER_WORD
        else Layout.JUSTIFICATION_MODE_NONE
    }
  }

  // Mirrors <Text> (ReactTextView#setGravityVertical): vertical bits only, so it
  // composes with textAlign's horizontal gravity. Only affects the text's position
  // when the view is taller than its text. Android-only, matching RN.
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

  // Mirrors <Text> (ReactTextView#setNumberOfLines): 0 means unlimited. Also bounds
  // the off-screen measure pass, matching the intrinsic height.
  fun setNumberOfLines(numberOfLines: Int) {
    maxLines = if (numberOfLines <= 0) Integer.MAX_VALUE else numberOfLines
  }

  // Mirrors <Text> (ReactTextView#setEllipsizeMode): "clip" hard-cuts at maxLines.
  fun setEllipsizeMode(ellipsizeMode: String?) {
    ellipsize = when (ellipsizeMode) {
      "head" -> TextUtils.TruncateAt.START
      "middle" -> TextUtils.TruncateAt.MIDDLE
      "clip" -> null
      // "tail", null and any unknown value fall back to the RN default.
      else -> TextUtils.TruncateAt.END
    }
  }

  override fun requestLayout() {
    super.requestLayout()
    // The measuring instance needs the invalidation above but has no frame to lay out.
    if (isMeasureOnly) return
    // Zero size means either the initial mount, where Fabric calls measure() +
    // layout() itself and posting would measure at 0x0 once per setter, or
    // construction, where TextView's constructor reaches here before any initializer
    // has run and measureAndLayout is still null. What this hack covers is neither: a
    // prop change on a laid-out view whose size doesn't change, where Fabric emits no
    // updateLayout.
    if (width == 0 || height == 0) return
    // Several setters can request a layout within one transaction.
    removeCallbacks(measureAndLayout)
    post(measureAndLayout)
  }
}

// Mirrors <Text> (TextAttributes#getEffective*): sp -> px through the OS setting,
// clamped by maxFontSizeMultiplier (PixelUtil ignores a cap below 1); raw DIP when
// scaling is off, so the value renders at its literal size.
//
// Keep it pure and top-level: init seeds textSize through it, and Kotlin only checks a
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
// because TextView.letterSpacing is in em units unlike iOS's absolute kerning. NaN or
// 0 means unset. fontSizePx is the view's applied textSize, not one of our fields.
//
// Pure and top-level for the same reason as toEffectivePixel.
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

// RN's CustomLineHeightSpan isn't public, so reimplemented here. Unlike
// LineHeightSpan.Standard it splits the extra leading evenly above and below the text
// and also pads before the first line and after the last, matching <Text> vertically.
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

package com.margelo.nitro.plaintext

import android.content.Context
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.os.Build
import android.os.LocaleList
import android.text.Layout
import android.text.Spannable
import android.text.SpannableString
import android.text.TextUtils
import android.text.style.LineHeightSpan
import android.util.TypedValue
import android.view.Gravity
import android.view.ViewGroup
import androidx.appcompat.widget.AppCompatTextView
import com.facebook.react.common.ReactConstants
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.views.text.ReactTypefaceUtils
import java.text.BreakIterator
import java.util.Locale
import kotlin.math.ceil
import kotlin.math.floor

// Port of PlainText's android/.../PlainTextView.kt, minus the props the Nitro spec
// lacks (fontVariant, fontVariationSettings, textAlignVertical/verticalAlign,
// textBreakStrategy, android_hyphenationFrequency, includeFontPadding). Same
// deferred-application shape: setters record state and mark dirty flags,
// flushPendingUpdates() applies them once.
//
// Used both as the mounted view (HybridNitroPlainText) and, with isMeasureOnly, as
// the reused off-screen measuring view (NitroPlainTextMeasureManager), so measured
// and drawn text go through the same code.
class NitroPlainTextView(context: Context) : AppCompatTextView(context) {
  private var fontSizeSp: Float = 14f
  private var allowFontScaling: Boolean = true
  private var maxFontSizeMultiplier: Float = 0f
  private var letterSpacingDip: Float = Float.NaN

  private var rawText: String? = null
  private var lineHeightSp: Float = Float.NaN
  private var textTransform: String? = null

  private var textShadowColor: Int = DEFAULT_TEXT_SHADOW_COLOR
  private var textShadowOffsetDx: Float = 0f
  private var textShadowOffsetDy: Float = 0f
  private var textShadowRadius: Float = 0f

  private var fontFamily: String? = null
  private var fontWeight: Int = ReactConstants.UNSET
  private var fontStyle: Int = ReactConstants.UNSET

  private var appliedHasCustomStyleSpan: Boolean = false
  private val baseTypeface: Typeface? = typeface
  private var appliedBaseTypeface: Typeface? = baseTypeface

  private var appliedLang: String? = null

  // The reused off-screen measuring view: never attached, so never posts.
  internal var isMeasureOnly: Boolean = false

  private var relayoutPosted = false

  // Fabric assigns the frame directly and skips Android's measure/layout pass, but
  // TextView builds the Layout it draws in onMeasure. See PlainTextView.kt.
  private val measureAndLayout = Runnable {
    relayoutPosted = false
    if (!isLayoutRequested) return@Runnable
    measure(
      MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
    )
    layout(left, top, right, bottom)
  }

  private var dirtyFontSize = false
  private var dirtyLetterSpacing = false
  private var dirtyTypeface = false
  private var dirtyText = false

  fun flushPendingUpdates() {
    if (dirtyFontSize) {
      dirtyFontSize = false
      setTextSize(
        TypedValue.COMPLEX_UNIT_PX,
        ceil(toEffectivePixel(fontSizeSp, allowFontScaling, maxFontSizeMultiplier))
      )
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
    layoutParams = ViewGroup.LayoutParams(
      ViewGroup.LayoutParams.WRAP_CONTENT,
      ViewGroup.LayoutParams.WRAP_CONTENT
    )
    setTextColor(Color.BLACK)
    setTextSize(
      TypedValue.COMPLEX_UNIT_PX,
      ceil(toEffectivePixel(fontSizeSp, allowFontScaling, maxFontSizeMultiplier))
    )
    letterSpacing =
      calculateLetterSpacing(letterSpacingDip, textSize, allowFontScaling, maxFontSizeMultiplier)
    breakStrategy = Layout.BREAK_STRATEGY_HIGH_QUALITY
    hyphenationFrequency = Layout.HYPHENATION_FREQUENCY_NONE
  }

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

  private fun markScaledSizesDirty() {
    dirtyFontSize = true
    dirtyText = true
  }

  fun setPlainText(value: String?) {
    rawText = value
    dirtyText = true
  }

  fun setLineHeight(lineHeight: Float) {
    lineHeightSp = if (lineHeight <= 0f) Float.NaN else lineHeight
    dirtyText = true
  }

  fun setTextTransform(value: String?) {
    textTransform = value
    dirtyText = true
  }

  private fun applyText() {
    val value = applyTextTransform(rawText ?: "", textTransform)
    if (lineHeightSp.isNaN()) {
      setText(value)
      return
    }
    val spannable = SpannableString(value)
    spannable.setSpan(
      CustomLineHeightSpan(toEffectivePixel(lineHeightSp, allowFontScaling, maxFontSizeMultiplier)),
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

  private fun applyTextShadow() {
    if ((textShadowOffsetDx != 0f || textShadowOffsetDy != 0f || textShadowRadius != 0f) &&
      Color.alpha(textShadowColor) != 0
    ) {
      paint.setShadowLayer(textShadowRadius, textShadowOffsetDx, textShadowOffsetDy, textShadowColor)
    } else {
      paint.clearShadowLayer()
    }
    invalidate()
  }

  fun setTextShadowColor(color: Int?) {
    textShadowColor = color ?: DEFAULT_TEXT_SHADOW_COLOR
    applyTextShadow()
  }

  fun setTextShadowOffsetWidth(width: Float) {
    textShadowOffsetDx = PixelUtil.toPixelFromDIP(width)
    applyTextShadow()
  }

  fun setTextShadowOffsetHeight(height: Float) {
    textShadowOffsetDy = PixelUtil.toPixelFromDIP(height)
    applyTextShadow()
  }

  fun setTextShadowRadius(radius: Float) {
    textShadowRadius = radius
    applyTextShadow()
  }

  fun setFontFamily(fontFamily: String?) {
    this.fontFamily = fontFamily
    dirtyTypeface = true
  }

  fun setFontWeight(fontWeight: String?) {
    this.fontWeight = ReactTypefaceUtils.parseFontWeight(fontWeight)
    dirtyTypeface = true
  }

  fun setFontStyle(fontStyle: String?) {
    this.fontStyle = ReactTypefaceUtils.parseFontStyle(fontStyle)
    dirtyTypeface = true
  }

  private fun applyTypeface() {
    val hasCustomStyleSpan =
      fontStyle != ReactConstants.UNSET || fontWeight != ReactConstants.UNSET || fontFamily != null
    paint.isSubpixelText = hasCustomStyleSpan
    paint.isLinearText = hasCustomStyleSpan
    if (hasCustomStyleSpan != appliedHasCustomStyleSpan) {
      appliedHasCustomStyleSpan = hasCustomStyleSpan
      // Paint flags don't self-invalidate, see PlainTextView.kt.
      requestLayout()
      invalidate()
    }

    val resolved = ReactTypefaceUtils.applyStyles(
      baseTypeface,
      if (fontStyle == Typeface.ITALIC) Typeface.ITALIC else Typeface.NORMAL,
      fontWeight,
      fontFamily,
      context.assets
    )
    // Identity guard: the measuring view gets all three font props per node.
    if (resolved === appliedBaseTypeface) return
    appliedBaseTypeface = resolved
    typeface = resolved
  }

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
    gravity = (gravity and
      Gravity.HORIZONTAL_GRAVITY_MASK.inv() and
      Gravity.RELATIVE_HORIZONTAL_GRAVITY_MASK.inv()) or horizontal

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      justificationMode =
        if (textAlign == "justify") Layout.JUSTIFICATION_MODE_INTER_WORD
        else Layout.JUSTIFICATION_MODE_NONE
    }
  }

  fun setLang(lang: String?) {
    val normalized = if (lang.isNullOrEmpty()) null else lang
    if (normalized == appliedLang) return
    appliedLang = normalized

    textLocales = if (normalized == null) {
      LocaleList.getAdjustedDefault()
    } else {
      LocaleList(Locale.forLanguageTag(normalized))
    }
  }

  // PlainTextView's applyHyphenationFrequency with android_hyphenationFrequency
  // always unset: only 'auto' hyphenates.
  fun setHyphens(value: String?) {
    val frequency =
      if (value == "auto") {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) Layout.HYPHENATION_FREQUENCY_FULL_FAST
        else Layout.HYPHENATION_FREQUENCY_FULL
      } else {
        Layout.HYPHENATION_FREQUENCY_NONE
      }
    if (hyphenationFrequency == frequency) return
    hyphenationFrequency = frequency
  }

  fun setNumberOfLines(numberOfLines: Int) {
    maxLines = if (numberOfLines <= 0) Integer.MAX_VALUE else numberOfLines
  }

  fun setEllipsizeMode(ellipsizeMode: String?) {
    ellipsize = when (ellipsizeMode) {
      "head" -> TextUtils.TruncateAt.START
      "middle" -> TextUtils.TruncateAt.MIDDLE
      "clip" -> null
      else -> TextUtils.TruncateAt.END
    }
  }

  override fun requestLayout() {
    super.requestLayout()
    if (isMeasureOnly) return
    if (width == 0 || height == 0) return
    if (relayoutPosted) return
    relayoutPosted = true
    post(measureAndLayout)
  }

  companion object {
    // Mirrors <Text> (TextAttributeProps.DEFAULT_TEXT_SHADOW_COLOR).
    private const val DEFAULT_TEXT_SHADOW_COLOR = 0x55000000
  }
}

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

private fun applyTextTransform(text: String, textTransform: String?): String {
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

// Copy of PlainTextView.kt's CustomLineHeightSpan (mirrors RN <Text>).
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

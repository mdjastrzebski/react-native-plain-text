package com.margelo.nitro.plaintext

import android.annotation.SuppressLint
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
import androidx.annotation.Keep
import androidx.appcompat.widget.AppCompatTextView
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.common.ReactConstants
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.views.text.ReactTypefaceUtils
import java.util.Locale
import kotlin.math.ceil
import kotlin.math.floor

// Nitro Views port of PlainTextView.kt, kept to the same shape for a fair benchmark:
// setters only record values, afterUpdate() applies them once per prop transaction.
//
// Sized by cpp/NitroPlainTextShadowNode, which must mirror every size-affecting
// prop applied here.
@DoNotStrip
@Keep
class HybridNitroPlainText(context: ThemedReactContext) : HybridNitroPlainTextSpec() {
  override val view = NitroPlainTextView(context)

  override var text: String? = null
    set(value) { field = value; dirtyText = true }
  override var color: Double? = null
    set(value) { field = value; dirtyColor = true }
  override var fontSize: Double? = null
    set(value) { field = value; dirtyFontSize = true }
  override var fontFamily: String? = null
    set(value) { field = value; dirtyTypeface = true }
  override var fontWeight: String? = null
    set(value) { field = value; dirtyTypeface = true }
  override var fontStyle: String? = null
    set(value) { field = value; dirtyTypeface = true }
  override var lineHeight: Double? = null
    set(value) { field = value; dirtyText = true }
  override var letterSpacing: Double? = null
    set(value) { field = value; dirtyFontSize = true }
  override var textAlign: NitroTextAlign? = null
    set(value) { field = value; dirtyParagraph = true }
  override var textDecorationLine: String? = null
    set(value) { field = value; dirtyPaint = true }
  override var textTransform: NitroTextTransform? = null
    set(value) { field = value; dirtyText = true }
  override var textShadowColor: Double? = null
    set(value) { field = value; dirtyPaint = true }
  override var textShadowOffsetWidth: Double? = null
    set(value) { field = value; dirtyPaint = true }
  override var textShadowOffsetHeight: Double? = null
    set(value) { field = value; dirtyPaint = true }
  override var textShadowRadius: Double? = null
    set(value) { field = value; dirtyPaint = true }
  override var hyphens: NitroHyphens? = null
    set(value) { field = value; dirtyParagraph = true }
  override var lang: String? = null
    set(value) { field = value; dirtyParagraph = true }
  override var numberOfLines: Double? = null
    set(value) { field = value; dirtyParagraph = true }
  override var ellipsizeMode: NitroEllipsizeMode? = null
    set(value) { field = value; dirtyParagraph = true }
  override var allowFontScaling: Boolean? = null
    set(value) { field = value; dirtyFontSize = true; dirtyText = true }
  override var maxFontSizeMultiplier: Double? = null
    set(value) { field = value; dirtyFontSize = true; dirtyText = true }

  private var dirtyText = false
  private var dirtyColor = false
  private var dirtyFontSize = false
  private var dirtyTypeface = false
  private var dirtyPaint = false
  private var dirtyParagraph = false

  private val scaling get() = allowFontScaling ?: true
  private val maxMultiplier get() = (maxFontSizeMultiplier ?: 0.0).toFloat()

  override fun afterUpdate() {
    if (dirtyColor) {
      dirtyColor = false
      view.setTextColor(color?.toArgb() ?: Color.BLACK)
    }
    if (dirtyFontSize) {
      dirtyFontSize = false
      val sizePx = ceil(toEffectivePixel((fontSize ?: DEFAULT_FONT_SIZE).toFloat()))
      view.setTextSize(TypedValue.COMPLEX_UNIT_PX, sizePx)
      val spacing = letterSpacing?.toFloat() ?: 0f
      view.letterSpacing = if (spacing == 0f) 0f else toEffectivePixel(spacing) / sizePx
    }
    if (dirtyTypeface) {
      dirtyTypeface = false
      val weight = ReactTypefaceUtils.parseFontWeight(fontWeight)
      val style = ReactTypefaceUtils.parseFontStyle(fontStyle)
      val custom = weight != ReactConstants.UNSET || style != ReactConstants.UNSET || fontFamily != null
      view.paint.isSubpixelText = custom
      view.paint.isLinearText = custom
      view.typeface = ReactTypefaceUtils.applyStyles(
        null,
        if (style == Typeface.ITALIC) Typeface.ITALIC else Typeface.NORMAL,
        weight,
        fontFamily,
        view.context.assets
      )
    }
    if (dirtyPaint) {
      dirtyPaint = false
      applyPaint()
    }
    if (dirtyParagraph) {
      dirtyParagraph = false
      applyParagraph()
    }
    if (dirtyText) {
      dirtyText = false
      applyText()
    }
  }

  private fun applyPaint() {
    val decoration = textDecorationLine
    var flags = view.paintFlags and (Paint.UNDERLINE_TEXT_FLAG or Paint.STRIKE_THRU_TEXT_FLAG).inv()
    if (decoration?.contains("underline") == true) flags = flags or Paint.UNDERLINE_TEXT_FLAG
    if (decoration?.contains("line-through") == true) flags = flags or Paint.STRIKE_THRU_TEXT_FLAG
    view.paintFlags = flags

    val dx = PixelUtil.toPixelFromDIP((textShadowOffsetWidth ?: 0.0).toFloat())
    val dy = PixelUtil.toPixelFromDIP((textShadowOffsetHeight ?: 0.0).toFloat())
    val radius = (textShadowRadius ?: 0.0).toFloat()
    val shadowColor = textShadowColor?.toArgb() ?: DEFAULT_TEXT_SHADOW_COLOR
    if ((dx != 0f || dy != 0f || radius != 0f) && Color.alpha(shadowColor) != 0) {
      view.paint.setShadowLayer(radius, dx, dy, shadowColor)
    } else {
      view.paint.clearShadowLayer()
    }
    view.invalidate()
  }

  @SuppressLint("WrongConstant")
  private fun applyParagraph() {
    val gravity = when (textAlign) {
      NitroTextAlign.LEFT -> Gravity.LEFT
      NitroTextAlign.RIGHT -> Gravity.RIGHT
      NitroTextAlign.CENTER -> Gravity.CENTER_HORIZONTAL
      else -> Gravity.START
    }
    view.gravity = gravity or Gravity.TOP
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      view.justificationMode =
        if (textAlign == NitroTextAlign.JUSTIFY) Layout.JUSTIFICATION_MODE_INTER_WORD
        else Layout.JUSTIFICATION_MODE_NONE
    }

    view.hyphenationFrequency =
      if (hyphens == NitroHyphens.AUTO) Layout.HYPHENATION_FREQUENCY_FULL
      else Layout.HYPHENATION_FREQUENCY_NONE

    val tag = lang
    if (!tag.isNullOrEmpty()) {
      view.textLocales = LocaleList(Locale.forLanguageTag(tag))
    }

    val lines = (numberOfLines ?: 0.0).toInt()
    view.maxLines = if (lines > 0) lines else Int.MAX_VALUE
    view.ellipsize = if (lines <= 0) {
      null
    } else {
      when (ellipsizeMode) {
        NitroEllipsizeMode.HEAD -> TextUtils.TruncateAt.START
        NitroEllipsizeMode.MIDDLE -> TextUtils.TruncateAt.MIDDLE
        NitroEllipsizeMode.CLIP -> null
        else -> TextUtils.TruncateAt.END
      }
    }
  }

  private fun applyText() {
    val raw = text ?: ""
    val value = when (textTransform) {
      NitroTextTransform.UPPERCASE -> raw.uppercase()
      NitroTextTransform.LOWERCASE -> raw.lowercase()
      NitroTextTransform.CAPITALIZE -> raw.split(" ").joinToString(" ") { word ->
        word.replaceFirstChar { it.titlecase() }
      }
      else -> raw
    }
    val height = lineHeight?.toFloat() ?: 0f
    if (height <= 0f) {
      view.text = value
      return
    }
    val spannable = SpannableString(value)
    spannable.setSpan(
      CustomLineHeightSpan(toEffectivePixel(height)),
      0,
      spannable.length,
      Spannable.SPAN_INCLUSIVE_INCLUSIVE
    )
    view.text = spannable
  }

  private fun toEffectivePixel(sp: Float): Float =
    if (scaling) PixelUtil.toPixelFromSP(sp, maxMultiplier) else PixelUtil.toPixelFromDIP(sp)

  companion object {
    private const val DEFAULT_FONT_SIZE = 14.0
    private const val DEFAULT_TEXT_SHADOW_COLOR = 0x55000000
  }
}

// processColor's ARGB, as a JS number.
private fun Double.toArgb(): Int = toLong().toInt()

// Same Fabric workaround as PlainTextView: Fabric assigns the frame directly and skips
// Android's measure/layout pass, but TextView builds the Layout it draws in onMeasure.
class NitroPlainTextView(context: ThemedReactContext) : AppCompatTextView(context) {
  private var relayoutPosted = false

  private val measureAndLayout = Runnable {
    relayoutPosted = false
    if (!isLayoutRequested) return@Runnable
    measure(
      MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
    )
    layout(left, top, right, bottom)
  }

  init {
    layoutParams = ViewGroup.LayoutParams(
      ViewGroup.LayoutParams.WRAP_CONTENT,
      ViewGroup.LayoutParams.WRAP_CONTENT
    )
    setTextColor(Color.BLACK)
    setTextSize(TypedValue.COMPLEX_UNIT_PX, ceil(PixelUtil.toPixelFromSP(14f)))
    includeFontPadding = true
    breakStrategy = Layout.BREAK_STRATEGY_HIGH_QUALITY
    hyphenationFrequency = Layout.HYPHENATION_FREQUENCY_NONE
    gravity = Gravity.START or Gravity.TOP
  }

  override fun requestLayout() {
    super.requestLayout()
    if (width == 0 || height == 0) return
    if (relayoutPosted) return
    relayoutPosted = true
    post(measureAndLayout)
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

package com.margelo.nitro.plaintext

import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.uimanager.ThemedReactContext

// Nitro Views port of PlainTextViewManager.kt's prop setters: each forwards to the
// view, which only records it, and afterUpdate() applies them once per prop
// transaction (PlainTextViewManager.onAfterUpdateTransaction).
//
// SYNC: sized by NitroPlainTextMeasureManager.kt, which configures an off-screen
// NitroPlainTextView through the same setters.
@DoNotStrip
@Keep
class HybridNitroPlainText(context: ThemedReactContext) : HybridNitroPlainTextSpec() {
  override val view = NitroPlainTextView(context)

  override var text: String? = null
    set(value) { field = value; view.setPlainText(value) }
  override var color: Double? = null
    set(value) { field = value; view.setColor(value?.toArgb()) }
  override var fontSize: Double? = null
    set(value) { field = value; view.setFontSizeSp(value?.toFloat() ?: DEFAULT_FONT_SIZE) }
  override var fontFamily: String? = null
    set(value) { field = value; view.setFontFamily(value) }
  override var fontWeight: String? = null
    set(value) { field = value; view.setFontWeight(value) }
  override var fontStyle: String? = null
    set(value) { field = value; view.setFontStyle(value) }
  override var lineHeight: Double? = null
    set(value) { field = value; view.setLineHeight(value?.toFloat() ?: 0f) }
  override var letterSpacing: Double? = null
    set(value) { field = value; view.setLetterSpacingDip(value?.toFloat() ?: 0f) }
  override var textAlign: NitroTextAlign? = null
    set(value) { field = value; view.setTextAlign(value?.toProp()) }
  override var textDecorationLine: String? = null
    set(value) { field = value; view.setTextDecorationLine(value) }
  override var textTransform: NitroTextTransform? = null
    set(value) { field = value; view.setTextTransform(value?.toProp()) }
  override var textShadowColor: Double? = null
    set(value) { field = value; view.setTextShadowColor(value?.toArgb()) }
  override var textShadowOffsetWidth: Double? = null
    set(value) { field = value; view.setTextShadowOffsetWidth(value?.toFloat() ?: 0f) }
  override var textShadowOffsetHeight: Double? = null
    set(value) { field = value; view.setTextShadowOffsetHeight(value?.toFloat() ?: 0f) }
  override var textShadowRadius: Double? = null
    set(value) { field = value; view.setTextShadowRadius(value?.toFloat() ?: 0f) }
  override var hyphens: NitroHyphens? = null
    set(value) { field = value; view.setHyphens(value?.toProp()) }
  override var lang: String? = null
    set(value) { field = value; view.setLang(value) }
  override var numberOfLines: Double? = null
    set(value) { field = value; view.setNumberOfLines(value?.toInt() ?: 0) }
  override var ellipsizeMode: NitroEllipsizeMode? = null
    set(value) { field = value; view.setEllipsizeMode(value?.toProp()) }
  override var allowFontScaling: Boolean? = null
    set(value) { field = value; view.setAllowFontScaling(value ?: true) }
  override var maxFontSizeMultiplier: Double? = null
    set(value) { field = value; view.setMaxFontSizeMultiplier(value?.toFloat() ?: 0f) }

  override fun afterUpdate() {
    view.flushPendingUpdates()
  }

  companion object {
    private const val DEFAULT_FONT_SIZE = 14f
  }
}

// processColor's ARGB, as a JS number.
private fun Double.toArgb(): Int = toLong().toInt()

// Enum → the string prop value PlainTextView's setters take (and the C++ measuring
// side serializes), without allocating.
private fun NitroTextAlign.toProp(): String = when (this) {
  NitroTextAlign.AUTO -> "auto"
  NitroTextAlign.LEFT -> "left"
  NitroTextAlign.RIGHT -> "right"
  NitroTextAlign.CENTER -> "center"
  NitroTextAlign.JUSTIFY -> "justify"
}

private fun NitroTextTransform.toProp(): String = when (this) {
  NitroTextTransform.NONE -> "none"
  NitroTextTransform.UPPERCASE -> "uppercase"
  NitroTextTransform.LOWERCASE -> "lowercase"
  NitroTextTransform.CAPITALIZE -> "capitalize"
}

private fun NitroHyphens.toProp(): String = when (this) {
  NitroHyphens.NONE -> "none"
  NitroHyphens.AUTO -> "auto"
}

private fun NitroEllipsizeMode.toProp(): String = when (this) {
  NitroEllipsizeMode.HEAD -> "head"
  NitroEllipsizeMode.MIDDLE -> "middle"
  NitroEllipsizeMode.TAIL -> "tail"
  NitroEllipsizeMode.CLIP -> "clip"
}

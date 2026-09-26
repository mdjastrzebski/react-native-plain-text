package com.margelo.nitro.plaintext

import android.content.Context
import android.text.Layout
import android.view.View
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.yoga.YogaMeasureMode
import com.facebook.yoga.YogaMeasureOutput
import java.lang.ref.WeakReference
import kotlin.math.ceil

// Measure-only ViewManager: nothing renders it. Nitro generates the NitroPlainText
// ViewManager (final, and with no measure()), so C++ measuring
// (NitroPlainTextMeasurementsManager.cpp) reaches this one by name through
// FabricUIManager.measure instead. A port of PlainTextViewManager.measure().
//
// SYNC: every fallback must match the C++ side's omitted-key default, and every prop
// must be set on every call, since the off-screen view is reused across nodes.
class NitroPlainTextMeasureManager : SimpleViewManager<View>() {
  override fun getName(): String = NAME

  override fun createViewInstance(context: ThemedReactContext): View = View(context)

  private fun ReadableMap?.getBooleanOr(name: String, default: Boolean): Boolean =
    if (this?.hasKey(name) == true) getBoolean(name) else default

  private fun ReadableMap?.getIntOr(name: String, default: Int): Int =
    if (this?.hasKey(name) == true) getInt(name) else default

  private fun ReadableMap?.getFloatOr(name: String, default: Float): Float =
    if (this?.hasKey(name) == true) getDouble(name).toFloat() else default

  // Called from C++ on the Fabric layout thread.
  override fun measure(
    context: Context,
    localData: ReadableMap?,
    props: ReadableMap?,
    state: ReadableMap?,
    width: Float,
    widthMode: YogaMeasureMode,
    height: Float,
    heightMode: YogaMeasureMode,
    attachmentsPositions: FloatArray?
  ): Long {
    val view = measureView(context)
    view.setAllowFontScaling(props.getBooleanOr("allowFontScaling", true))
    view.setMaxFontSizeMultiplier(props.getFloatOr("maxFontSizeMultiplier", 0f))
    view.setFontSizeSp(props.getFloatOr("fontSize", 14f))
    view.setFontFamily(props?.getString("fontFamily"))
    view.setFontWeight(props?.getString("fontWeight"))
    view.setFontStyle(props?.getString("fontStyle"))
    view.setLetterSpacingDip(props.getFloatOr("letterSpacing", 0f))
    view.setLineHeight(props.getFloatOr("lineHeight", 0f))
    view.setHyphens(props?.getString("hyphens"))
    view.setLang(props?.getString("lang"))
    view.setTextTransform(props?.getString("textTransform"))
    view.setNumberOfLines(props.getIntOr("numberOfLines", 0))
    view.setEllipsizeMode(props?.getString("ellipsizeMode"))
    view.setPlainText(props?.getString("text") ?: "")
    view.flushPendingUpdates()

    view.measure(
      toMeasureSpec(width, widthMode),
      toMeasureSpec(height, heightMode)
    )

    // SYNC: matches the "__baseline" marker NitroPlainTextMeasurementsManager.cpp's
    // baseline() sets; the baseline comes back in the height slot.
    if (props?.hasKey(BASELINE_QUERY_PROP) == true) {
      return YogaMeasureOutput.make(0f, PixelUtil.toDIPFromPixel(view.baseline.toFloat()))
    }

    // See PlainTextViewManager.measure(): intrinsic width from Layout.getDesiredWidth,
    // height from getLineBottom() when "clip" leaves hidden lines in the Layout.
    val rawDesiredWidth =
      if (widthMode != YogaMeasureMode.EXACTLY) {
        ceil(Layout.getDesiredWidth(view.text, view.paint).toDouble()).toInt()
      } else null
    val measuredWidth =
      if (rawDesiredWidth != null) {
        if (widthMode == YogaMeasureMode.AT_MOST) minOf(rawDesiredWidth, width.toInt())
        else rawDesiredWidth
      } else {
        view.measuredWidth
      }

    val layout = view.layout
    val measuredHeight =
      if (layout != null && view.maxLines < layout.lineCount) {
        layout.getLineBottom(view.maxLines - 1)
      } else {
        view.measuredHeight
      }

    return YogaMeasureOutput.make(
      PixelUtil.toDIPFromPixel(measuredWidth.toFloat()),
      PixelUtil.toDIPFromPixel(measuredHeight.toFloat())
    )
  }

  // See PlainTextViewManager.measureViews: reused per thread, weakly held.
  private val measureViews = ThreadLocal<WeakReference<NitroPlainTextView>>()

  private fun measureView(context: Context): NitroPlainTextView {
    measureViews.get()?.get()?.let { if (it.context === context) return it }
    val view = NitroPlainTextView(context)
    view.isMeasureOnly = true
    measureViews.set(WeakReference(view))
    return view
  }

  private fun toMeasureSpec(size: Float, mode: YogaMeasureMode): Int {
    return when (mode) {
      YogaMeasureMode.EXACTLY -> View.MeasureSpec.makeMeasureSpec(size.toInt(), View.MeasureSpec.EXACTLY)
      YogaMeasureMode.AT_MOST -> View.MeasureSpec.makeMeasureSpec(size.toInt(), View.MeasureSpec.AT_MOST)
      else -> View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
    }
  }

  companion object {
    // SYNC: the component name NitroPlainTextMeasurementsManager.cpp passes.
    const val NAME = "NitroPlainTextMeasure"

    private const val BASELINE_QUERY_PROP = "__baseline"
  }
}

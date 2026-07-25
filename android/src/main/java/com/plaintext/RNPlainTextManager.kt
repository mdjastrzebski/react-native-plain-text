package com.plaintext

import android.content.Context
import android.view.View
import android.view.ViewGroup
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.RNPlainTextManagerInterface
import com.facebook.react.viewmanagers.RNPlainTextManagerDelegate
import com.facebook.yoga.YogaMeasureMode
import com.facebook.yoga.YogaMeasureOutput

@ReactModule(name = RNPlainTextManager.NAME)
class RNPlainTextManager : SimpleViewManager<RNPlainText>(),
  RNPlainTextManagerInterface<RNPlainText> {
  private val mDelegate: ViewManagerDelegate<RNPlainText>

  init {
    mDelegate = RNPlainTextManagerDelegate(this)
  }

  override fun getDelegate(): ViewManagerDelegate<RNPlainText>? {
    return mDelegate
  }

  override fun getName(): String {
    return NAME
  }

  public override fun createViewInstance(context: ThemedReactContext): RNPlainText {
    return RNPlainText(context)
  }

  @ReactProp(name = "text")
  override fun setText(view: RNPlainText?, text: String?) {
    view?.setPlainText(text)
  }

  @ReactProp(name = "color", customType = "Color")
  override fun setColor(view: RNPlainText?, color: Int?) {
    view?.setColor(color)
  }

  // TextView.textSize uses SP units, which matches React Native's default of
  // scaling font sizes with the user's accessibility font settings.
  @ReactProp(name = "fontSize")
  override fun setFontSize(view: RNPlainText?, fontSize: Float) {
    view?.setFontSizeSp(fontSize)
  }

  @ReactProp(name = "fontFamily")
  override fun setFontFamily(view: RNPlainText?, fontFamily: String?) {
    view?.setFontFamily(fontFamily)
  }

  @ReactProp(name = "fontWeight")
  override fun setFontWeight(view: RNPlainText?, fontWeight: String?) {
    view?.setFontWeight(fontWeight)
  }

  @ReactProp(name = "fontStyle")
  override fun setFontStyle(view: RNPlainText?, fontStyle: String?) {
    view?.setFontStyle(fontStyle)
  }

  @ReactProp(name = "textAlign")
  override fun setTextAlign(view: RNPlainText?, textAlign: String?) {
    view?.setTextAlign(textAlign)
  }

  @ReactProp(name = "textAlignVertical")
  override fun setTextAlignVertical(view: RNPlainText?, textAlignVertical: String?) {
    view?.setTextAlignVertical(textAlignVertical)
  }

  @ReactProp(name = "textDecorationLine")
  override fun setTextDecorationLine(view: RNPlainText?, textDecorationLine: String?) {
    view?.setTextDecorationLine(textDecorationLine)
  }

  @ReactProp(name = "lineHeight")
  override fun setLineHeight(view: RNPlainText?, lineHeight: Float) {
    view?.setLineHeight(lineHeight)
  }

  @ReactProp(name = "letterSpacing")
  override fun setLetterSpacing(view: RNPlainText?, letterSpacing: Float) {
    view?.setLetterSpacingDip(letterSpacing)
  }

  @ReactProp(name = "numberOfLines")
  override fun setNumberOfLines(view: RNPlainText?, numberOfLines: Int) {
    view?.setNumberOfLines(numberOfLines)
  }

  @ReactProp(name = "ellipsizeMode")
  override fun setEllipsizeMode(view: RNPlainText?, ellipsizeMode: String?) {
    view?.setEllipsizeMode(ellipsizeMode)
  }

  @ReactProp(name = "allowFontScaling", defaultBoolean = true)
  override fun setAllowFontScaling(view: RNPlainText?, allowFontScaling: Boolean) {
    view?.setAllowFontScaling(allowFontScaling)
  }

  @ReactProp(name = "maxFontSizeMultiplier")
  override fun setMaxFontSizeMultiplier(view: RNPlainText?, maxFontSizeMultiplier: Float) {
    view?.setMaxFontSizeMultiplier(maxFontSizeMultiplier)
  }

  // Called from C++ (PlainTextMeasurementsManager, via FabricUIManager.measure)
  // on the Fabric layout thread to compute the view's intrinsic size. Fabric
  // never runs Android's normal onMeasure for our view, so this is where the
  // text is actually measured. `props` carries the "text"/"fontSize" serialized
  // by the C++ side; we size an off-screen TextView exactly as it will render.
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
    // Apply the font-scaling knobs first: fontSize/lineHeight/letterSpacing are
    // all converted through them, so they must be in place before those are set
    // (matches the ordering the RNPlainText view itself relies on).
    view.setAllowFontScaling(
      if (props?.hasKey("allowFontScaling") == true) props.getBoolean("allowFontScaling") else true
    )
    view.setMaxFontSizeMultiplier(
      if (props?.hasKey("maxFontSizeMultiplier") == true) props.getDouble("maxFontSizeMultiplier").toFloat() else 0f
    )
    // fontSize is in SP, matching the setFontSize prop setter above. Set it
    // before letterSpacing, which is computed relative to the font size.
    val fontSize = if (props?.hasKey("fontSize") == true) props.getDouble("fontSize") else 14.0
    view.setFontSizeSp(fontSize.toFloat())
    // props serializes an unset fontFamily as "" (the C++ std::string default),
    // not null — normalize so this matches the setFontFamily prop setter path.
    view.setFontFamily(props?.getString("fontFamily")?.ifEmpty { null })
    view.setFontWeight(props?.getString("fontWeight")?.ifEmpty { null })
    view.setFontStyle(props?.getString("fontStyle")?.ifEmpty { null })
    // letterSpacing widens the text (width) and lineHeight grows each line
    // (height), so both must be applied for the measured size to match.
    view.setLetterSpacingDip(if (props?.hasKey("letterSpacing") == true) props.getDouble("letterSpacing").toFloat() else 0f)
    view.setLineHeight(if (props?.hasKey("lineHeight") == true) props.getDouble("lineHeight").toFloat() else 0f)
    // numberOfLines caps the measured height; ellipsizeMode doesn't change the
    // size (only where the ellipsis lands), so it isn't serialized for measure.
    view.setNumberOfLines(if (props?.hasKey("numberOfLines") == true) props.getInt("numberOfLines") else 0)
    // Set text last so the lineHeight span (applied on text set) is in place.
    view.setPlainText(props?.getString("text") ?: "")

    view.measure(
      toMeasureSpec(width, widthMode),
      toMeasureSpec(height, heightMode)
    )

    return YogaMeasureOutput.make(
      PixelUtil.toDIPFromPixel(view.measuredWidth.toFloat()),
      PixelUtil.toDIPFromPixel(view.measuredHeight.toFloat())
    )
  }

  // The off-screen view measure() sizes is reused across calls rather than
  // allocated per node: constructing an AppCompatTextView is expensive (theme
  // attribute resolution for the text style, AppCompat's tint/emoji helpers),
  // and it dominated Fabric's layout pass on screens mounting many PlainTexts.
  // Reuse is safe because measure() re-applies every size-affecting prop on
  // each call. RN's own <Text> goes further and measures without a View at all
  // (TextLayoutManager), off a ThreadLocal scratch TextPaint — the ThreadLocal
  // here is for the same reason: measure() runs on whichever thread commits a
  // Fabric transaction, and Views are not thread-safe.
  private val measureViews = ThreadLocal<RNPlainText>()

  private fun measureView(context: Context): RNPlainText {
    // The Context is the surface's ThemedReactContext, so it changes when the
    // surface does; a cached view would otherwise resolve fonts and metrics
    // against a torn-down theme (and keep it alive).
    measureViews.get()?.let { if (it.context === context) return it }

    val view = RNPlainText(context)
    view.isMeasureOnly = true
    // TextView.setText() reaches checkForRelayout() once the view has a text
    // Layout — i.e. from the second measurement onwards — and that dereferences
    // the LayoutParams, crashing when they are null. RN hits the same thing in
    // ReactTextView.setText (see its EMPTY_LAYOUT_PARAMS). The view is never
    // attached to a parent, so the values themselves don't matter.
    view.layoutParams = ViewGroup.LayoutParams(
      ViewGroup.LayoutParams.WRAP_CONTENT,
      ViewGroup.LayoutParams.WRAP_CONTENT
    )
    measureViews.set(view)
    return view
  }

  // The size constraints already arrive in pixels — FabricUIManager's
  // getYogaSize() converts the C++ (point-based) LayoutConstraints to px before
  // this is called — so they map straight onto an Android MeasureSpec without
  // any further dp->px scaling. (The output above is converted back to DIP.)
  private fun toMeasureSpec(size: Float, mode: YogaMeasureMode): Int {
    return when (mode) {
      YogaMeasureMode.EXACTLY -> View.MeasureSpec.makeMeasureSpec(size.toInt(), View.MeasureSpec.EXACTLY)
      YogaMeasureMode.AT_MOST -> View.MeasureSpec.makeMeasureSpec(size.toInt(), View.MeasureSpec.AT_MOST)
      else -> View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
    }
  }

  companion object {
    const val NAME = "RNPlainText"
  }
}

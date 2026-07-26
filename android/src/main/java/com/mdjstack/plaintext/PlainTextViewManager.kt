package com.mdjstack.plaintext

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
import java.lang.ref.WeakReference

@ReactModule(name = PlainTextViewManager.NAME)
class PlainTextViewManager : SimpleViewManager<PlainTextView>(),
  RNPlainTextManagerInterface<PlainTextView> {
  private val mDelegate: ViewManagerDelegate<PlainTextView>

  init {
    mDelegate = RNPlainTextManagerDelegate(this)
  }

  override fun getDelegate(): ViewManagerDelegate<PlainTextView>? {
    return mDelegate
  }

  override fun getName(): String {
    return NAME
  }

  public override fun createViewInstance(context: ThemedReactContext): PlainTextView {
    return PlainTextView(context)
  }

  // The @ReactProp setters below only record state (see the batching block in
  // PlainTextView); updateProperties calls this once the whole transaction is
  // applied, so the recomputation runs once per view rather than once per prop.
  override fun onAfterUpdateTransaction(view: PlainTextView) {
    super.onAfterUpdateTransaction(view)
    view.flushPendingUpdates()
  }

  @ReactProp(name = "text")
  override fun setText(view: PlainTextView?, text: String?) {
    view?.setPlainText(text)
  }

  @ReactProp(name = "color", customType = "Color")
  override fun setColor(view: PlainTextView?, color: Int?) {
    view?.setColor(color)
  }

  // TextView.textSize uses SP units, which matches React Native's default of
  // scaling font sizes with the user's accessibility font settings.
  @ReactProp(name = "fontSize")
  override fun setFontSize(view: PlainTextView?, fontSize: Float) {
    view?.setFontSizeSp(fontSize)
  }

  @ReactProp(name = "fontFamily")
  override fun setFontFamily(view: PlainTextView?, fontFamily: String?) {
    view?.setFontFamily(fontFamily)
  }

  @ReactProp(name = "fontWeight")
  override fun setFontWeight(view: PlainTextView?, fontWeight: String?) {
    view?.setFontWeight(fontWeight)
  }

  @ReactProp(name = "fontStyle")
  override fun setFontStyle(view: PlainTextView?, fontStyle: String?) {
    view?.setFontStyle(fontStyle)
  }

  @ReactProp(name = "textAlign")
  override fun setTextAlign(view: PlainTextView?, textAlign: String?) {
    view?.setTextAlign(textAlign)
  }

  @ReactProp(name = "textAlignVertical")
  override fun setTextAlignVertical(view: PlainTextView?, textAlignVertical: String?) {
    view?.setTextAlignVertical(textAlignVertical)
  }

  @ReactProp(name = "textDecorationLine")
  override fun setTextDecorationLine(view: PlainTextView?, textDecorationLine: String?) {
    view?.setTextDecorationLine(textDecorationLine)
  }

  @ReactProp(name = "lineHeight")
  override fun setLineHeight(view: PlainTextView?, lineHeight: Float) {
    view?.setLineHeight(lineHeight)
  }

  @ReactProp(name = "letterSpacing")
  override fun setLetterSpacing(view: PlainTextView?, letterSpacing: Float) {
    view?.setLetterSpacingDip(letterSpacing)
  }

  @ReactProp(name = "numberOfLines")
  override fun setNumberOfLines(view: PlainTextView?, numberOfLines: Int) {
    view?.setNumberOfLines(numberOfLines)
  }

  @ReactProp(name = "ellipsizeMode")
  override fun setEllipsizeMode(view: PlainTextView?, ellipsizeMode: String?) {
    view?.setEllipsizeMode(ellipsizeMode)
  }

  @ReactProp(name = "allowFontScaling", defaultBoolean = true)
  override fun setAllowFontScaling(view: PlainTextView?, allowFontScaling: Boolean) {
    view?.setAllowFontScaling(allowFontScaling)
  }

  @ReactProp(name = "maxFontSizeMultiplier")
  override fun setMaxFontSizeMultiplier(view: PlainTextView?, maxFontSizeMultiplier: Float) {
    view?.setMaxFontSizeMultiplier(maxFontSizeMultiplier)
  }

  // Called from C++ (PlainTextMeasurementsManager, via FabricUIManager.measure)
  // on the Fabric layout thread to compute the view's intrinsic size. Fabric
  // never runs Android's normal onMeasure for our view, so this is where the
  // text is actually measured. `props` carries the size-affecting props
  // serialized by the C++ side; we size an off-screen TextView exactly as it
  // will render.
  //
  // SYNC: two invariants, neither checked by anything. The C++ side omits props
  // still at their default, so every fallback below must match the default in
  // the generated Props.h; and since the off-screen view is reused across nodes,
  // every prop must be set on every call, not only when its key is present.
  // This must also apply props the same way the mounted view does, or the
  // measured size won't match what is drawn.
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
    view.setAllowFontScaling(
      if (props?.hasKey("allowFontScaling") == true) props.getBoolean("allowFontScaling") else true
    )
    view.setMaxFontSizeMultiplier(
      if (props?.hasKey("maxFontSizeMultiplier") == true) props.getDouble("maxFontSizeMultiplier").toFloat() else 0f
    )
    // fontSize is in SP, matching the setFontSize prop setter above.
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
    view.setPlainText(props?.getString("text") ?: "")
    // Applies the state the setters above marked dirty, in dependency order —
    // so their call order here doesn't matter.
    view.flushPendingUpdates()

    view.measure(
      toMeasureSpec(width, widthMode),
      toMeasureSpec(height, heightMode)
    )

    return YogaMeasureOutput.make(
      PixelUtil.toDIPFromPixel(view.measuredWidth.toFloat()),
      PixelUtil.toDIPFromPixel(view.measuredHeight.toFloat())
    )
  }

  // The view measure() sizes is reused rather than allocated per node:
  // constructing an AppCompatTextView (theme attribute resolution, AppCompat's
  // tint/emoji helpers) dominated Fabric's layout pass on text-heavy screens.
  //
  // ThreadLocal because measure() runs on whichever thread commits the Fabric
  // transaction, and Views are not thread-safe.
  //
  // WeakReference because the view holds the surface's ThemedReactContext, whose
  // base is the Activity, and nothing here learns that a surface stopped:
  // ViewManager.onSurfaceStopped only fires under enableViewRecycling (false by
  // default) and trimMemory() is package-private to RN, so neither hook is
  // available to us. Held strongly, this ThreadLocal outlives the surface — it
  // lives as long as the ReactInstance and the layout thread — so the last
  // measured surface's Activity would stay reachable until some other surface
  // measured, i.e. for the rest of the session in an app whose ReactHost
  // outlives its Activity. Weakly, the view is a GC root only inside a single
  // measure() call, so a collection mid-pass costs one rebuild, not one per node.
  private val measureViews = ThreadLocal<WeakReference<PlainTextView>>()

  private fun measureView(context: Context): PlainTextView {
    // The Context is the surface's ThemedReactContext, so it dies with the
    // surface; a cached view would resolve fonts against a torn-down theme.
    // Two live surfaces alternate through this check — but per commit, not per
    // node: Fabric serializes layout per thread, so every measure() call within
    // one pass shares a surface. One extra construction per surface switch.
    measureViews.get()?.get()?.let { if (it.context === context) return it }

    val view = PlainTextView(context)
    view.isMeasureOnly = true
    // From the second measurement on, setText() reaches checkForRelayout(),
    // which dereferences the LayoutParams and crashes when they are null — the
    // same crash RN works around in ReactTextView (EMPTY_LAYOUT_PARAMS). The
    // view is never attached, so the values don't matter.
    view.layoutParams = ViewGroup.LayoutParams(
      ViewGroup.LayoutParams.WRAP_CONTENT,
      ViewGroup.LayoutParams.WRAP_CONTENT
    )
    measureViews.set(WeakReference(view))
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

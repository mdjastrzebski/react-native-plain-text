package com.mdjstack.plaintext

import android.content.Context
import android.text.Layout
import android.view.View
import kotlin.math.ceil
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.RNPlainTextManagerInterface
import com.facebook.yoga.YogaMeasureMode
import com.facebook.yoga.YogaMeasureOutput
import java.lang.ref.WeakReference

@ReactModule(name = PlainTextViewManager.NAME)
class PlainTextViewManager : SimpleViewManager<PlainTextView>(),
  RNPlainTextManagerInterface<PlainTextView> {
  private val mDelegate: ViewManagerDelegate<PlainTextView>

  init {
    // A subclass of the generated delegate, handling border-style props Fabric sends
    // that our codegen spec doesn't declare. See PlainTextViewManagerDelegate.
    mDelegate = PlainTextViewManagerDelegate(this)
  }

  override fun getDelegate(): ViewManagerDelegate<PlainTextView>? {
    return mDelegate
  }

  override fun getName(): String {
    return NAME
  }

  // SYNC: does not reset a reused view, so recycling stays off. Android pools views per
  // view manager, only for one that calls ViewManager.setupViewRecycling(), which this one
  // never does, so every mount lands here. Calling it would hand this a previously-used
  // PlainTextView carrying stale text/font/color, which is what RN's own
  // ReactTextViewManager answers with recycleView(). See
  // docs/agent/sync-points.md#recycled-view-state, the same failure as the iOS fix in
  // RNPlainText.mm, not ported here.
  public override fun createViewInstance(context: ThemedReactContext): PlainTextView {
    return PlainTextView(context)
  }

  // The @ReactProp setters below only record state (see the batching block in
  // PlainTextView). This runs once per transaction rather than once per prop.
  override fun onAfterUpdateTransaction(view: PlainTextView) {
    super.onAfterUpdateTransaction(view)
    view.flushPendingUpdates()
  }

  // Padding (and border width) never arrives as a prop: Yoga resolves it into the
  // shadow view's contentInsets and Fabric delivers it as a separate UpdatePadding
  // mount item via ViewManager.setPadding, whose base implementation is a no-op. RN's
  // own ReactTextViewManager overrides it the same way. No counterpart is needed in
  // the measure pass, since Yoga hands the measure callback the content box already
  // minus padding/border.
  //
  // SYNC: iOS gets this for free: RCTViewComponentView lays the contentView out at
  // layoutMetrics.getContentFrame(), already inset by the same contentInsets.
  override fun setPadding(view: PlainTextView, left: Int, top: Int, right: Int, bottom: Int) {
    view.setPadding(left, top, right, bottom)
  }

  @ReactProp(name = "text")
  override fun setText(view: PlainTextView?, text: String?) {
    view?.setPlainText(text)
  }

  @ReactProp(name = "color", customType = "Color")
  override fun setColor(view: PlainTextView?, color: Int?) {
    view?.setColor(color)
  }

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

  @ReactProp(name = "fontVariant")
  override fun setFontVariant(view: PlainTextView?, fontVariant: ReadableArray?) {
    view?.setFontVariant(fontVariant)
  }

  @ReactProp(name = "fontVariationSettings")
  override fun setFontVariationSettings(view: PlainTextView?, fontVariationSettings: String?) {
    view?.setVariationSettings(fontVariationSettings)
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

  @ReactProp(name = "textShadowColor", customType = "Color")
  override fun setTextShadowColor(view: PlainTextView?, textShadowColor: Int?) {
    view?.setTextShadowColor(textShadowColor)
  }

  @ReactProp(name = "textShadowOffsetWidth")
  override fun setTextShadowOffsetWidth(view: PlainTextView?, textShadowOffsetWidth: Float) {
    view?.setTextShadowOffsetWidth(textShadowOffsetWidth)
  }

  @ReactProp(name = "textShadowOffsetHeight")
  override fun setTextShadowOffsetHeight(view: PlainTextView?, textShadowOffsetHeight: Float) {
    view?.setTextShadowOffsetHeight(textShadowOffsetHeight)
  }

  // iOS-only concern (see PlainTextViewNativeComponent.ts). No-op here, same as
  // `hasLetterSpacing`.
  @ReactProp(name = "hasTextShadow", defaultBoolean = false)
  override fun setHasTextShadow(view: PlainTextView?, hasTextShadow: Boolean) {
  }

  @ReactProp(name = "textShadowRadius")
  override fun setTextShadowRadius(view: PlainTextView?, textShadowRadius: Float) {
    view?.setTextShadowRadius(textShadowRadius)
  }

  @ReactProp(name = "textTransform")
  override fun setTextTransform(view: PlainTextView?, textTransform: String?) {
    view?.setTextTransform(textTransform)
  }

  @ReactProp(name = "lineHeight")
  override fun setLineHeight(view: PlainTextView?, lineHeight: Float) {
    view?.setLineHeight(lineHeight)
  }

  @ReactProp(name = "letterSpacing")
  override fun setLetterSpacing(view: PlainTextView?, letterSpacing: Float) {
    view?.setLetterSpacingDip(letterSpacing)
  }

  // iOS-only concern (see PlainTextViewNativeComponent.ts). No-op here, same as
  // `lineHeightClippingIos` below.
  @ReactProp(name = "hasLetterSpacing", defaultBoolean = false)
  override fun setHasLetterSpacing(view: PlainTextView?, hasLetterSpacing: Boolean) {
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

  // Android-only, matching RN <Text>.
  @ReactProp(name = "includeFontPadding", defaultBoolean = true)
  override fun setIncludeFontPadding(view: PlainTextView?, includeFontPadding: Boolean) {
    view?.includeFontPadding = includeFontPadding
  }

  // Unread: no experiment is currently using it. See docs/agent/perf-experiments.md.
  @ReactProp(name = "experiment", defaultBoolean = false)
  override fun setExperiment(view: PlainTextView?, experiment: Boolean) {
  }

  // iOS-only concern (see PlainTextViewNativeComponent.ts). No-op here, same as
  // `hasLetterSpacing`: Android's TextView never had the ascent-clipping bug
  // this reverts to on iOS.
  @ReactProp(name = "lineHeightClippingIos", defaultBoolean = false)
  override fun setLineHeightClippingIos(view: PlainTextView?, lineHeightClippingIos: Boolean) {
  }

  private fun ReadableMap?.getBooleanOr(name: String, default: Boolean): Boolean =
    if (this?.hasKey(name) == true) getBoolean(name) else default

  private fun ReadableMap?.getIntOr(name: String, default: Int): Int =
    if (this?.hasKey(name) == true) getInt(name) else default

  private fun ReadableMap?.getFloatOr(name: String, default: Float): Float =
    if (this?.hasKey(name) == true) getDouble(name).toFloat() else default

  // Called from C++ (PlainTextMeasurementsManager, via FabricUIManager.measure) on the
  // Fabric layout thread. This is where text is actually measured, since Fabric never
  // runs Android's normal onMeasure for our view. `props` carries the size-affecting
  // props serialized by the C++ side.
  //
  // SYNC: two invariants, neither checked by anything: every fallback above must match
  // the default in the generated Props.h (the C++ side omits props at default), and
  // every prop must be set on every call, not only when its key is present (the
  // off-screen view is reused across nodes).
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
    // props serializes an unset fontFamily as "" (the C++ std::string default),
    // not null. Normalize so this matches the setFontFamily prop setter path.
    view.setFontFamily(props?.getString("fontFamily")?.ifEmpty { null })
    view.setFontWeight(props?.getString("fontWeight")?.ifEmpty { null })
    view.setFontStyle(props?.getString("fontStyle")?.ifEmpty { null })
    // fontVariant and fontVariationSettings both change glyph shapes/advances, so the
    // measured size depends on them.
    view.setFontVariant(props?.getArray("fontVariant"))
    view.setVariationSettings(props?.getString("fontVariationSettings")?.ifEmpty { null })
    // letterSpacing widens the text and lineHeight grows each line, so both must be
    // applied for the measured size to match.
    view.setLetterSpacingDip(props.getFloatOr("letterSpacing", 0f))
    view.setLineHeight(props.getFloatOr("lineHeight", 0f))
    // Transforms the measured string itself (case changes can change width), so it
    // must be applied before setPlainText below.
    view.setTextTransform(props?.getString("textTransform"))
    // numberOfLines caps the measured height. ellipsizeMode only changes where the
    // ellipsis lands, so it isn't serialized for measure.
    view.setNumberOfLines(props.getIntOr("numberOfLines", 0))
    // Adds extra ascent/descent padding per line, so it affects the measured height.
    view.includeFontPadding = props.getBooleanOr("includeFontPadding", true)
    view.setPlainText(props?.getString("text") ?: "")
    // Applies the state the setters above marked dirty, in dependency order, so their
    // call order here doesn't matter.
    view.flushPendingUpdates()

    view.measure(
      toMeasureSpec(width, widthMode),
      toMeasureSpec(height, heightMode)
    )

    // SYNC: matches the "__baseline" marker PlainTextMeasurementsManager.cpp's
    // baseline() sets. Not a real prop: it tells this call, made with `width`/
    // `height` pinned to the node's final layout size, to report where the
    // first line's baseline falls instead of the measured size, so
    // `alignItems: "baseline"` can align on it (Yoga's baseline fn calls
    // through to here via PlainTextShadowNode::baseline). Packed into the
    // height slot since a baseline query never needs the width back.
    if (props?.hasKey(BASELINE_QUERY_PROP) == true) {
      return YogaMeasureOutput.make(0f, PixelUtil.toDIPFromPixel(view.baseline.toFloat()))
    }

    // Intrinsic width straight from Layout.getDesiredWidth, RN's own
    // TextLayoutManager.createLayout entry point, instead of TextView.onMeasure's
    // private getDesiredWidth() (compound drawables, mMaxWidth/mMinWidth, gravity,
    // autosize). The two agree for most strings but drift apart by typeface, only
    // visible when width isn't EXACTLY (an EXACTLY box takes its width from Yoga on
    // both sides, never from either engine's own measurement).
    //
    // EXPENSIVE for custom-styled text (docs/agent/performance.md): the paint's
    // isSubpixelText/isLinearText push this onto Android's unhinted glyph path.
    // ~2.5% extra mount cost measured; see docs/agent/perf-experiments.md.
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

    return YogaMeasureOutput.make(
      PixelUtil.toDIPFromPixel(measuredWidth.toFloat()),
      PixelUtil.toDIPFromPixel(view.measuredHeight.toFloat())
    )
  }

  // Reused rather than allocated per node: constructing an AppCompatTextView (theme
  // attribute resolution, AppCompat's tint/emoji helpers) dominated Fabric's layout
  // pass on text-heavy screens. ThreadLocal because measure() runs on whichever thread
  // commits the Fabric transaction, and Views aren't thread-safe.
  //
  // WeakReference because the view holds the surface's ThemedReactContext (whose base
  // is the Activity) and we have no hook to learn a surface stopped. Held strongly,
  // this ThreadLocal would keep the last measured surface's Activity reachable for the
  // rest of the session, whereas weakly a mid-pass collection costs one rebuild, not
  // one per node.
  private val measureViews = ThreadLocal<WeakReference<PlainTextView>>()

  private fun measureView(context: Context): PlainTextView {
    // The Context is the surface's ThemedReactContext, so it dies with the surface. A
    // cached view would resolve fonts against a torn-down theme. Two live surfaces can
    // alternate through this check, but per commit, not per node.
    measureViews.get()?.get()?.let { if (it.context === context) return it }

    // EXPENSIVE: constructing an AppCompatTextView (theme attribute resolution, tint/emoji
    // helpers), only reached on a cache miss (Context change or GC of the weak reference).
    val view = PlainTextView(context)
    view.isMeasureOnly = true
    measureViews.set(WeakReference(view))
    return view
  }

  // Size constraints already arrive in pixels: FabricUIManager's getYogaSize()
  // converts the C++ LayoutConstraints to px before this is called, so they map
  // straight onto a MeasureSpec (the output above is converted back to DIP).
  private fun toMeasureSpec(size: Float, mode: YogaMeasureMode): Int {
    return when (mode) {
      YogaMeasureMode.EXACTLY -> View.MeasureSpec.makeMeasureSpec(size.toInt(), View.MeasureSpec.EXACTLY)
      YogaMeasureMode.AT_MOST -> View.MeasureSpec.makeMeasureSpec(size.toInt(), View.MeasureSpec.AT_MOST)
      else -> View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
    }
  }

  companion object {
    const val NAME = "RNPlainText"

    // SYNC: matches the literal in PlainTextMeasurementsManager.cpp's baseline().
    private const val BASELINE_QUERY_PROP = "__baseline"
  }
}

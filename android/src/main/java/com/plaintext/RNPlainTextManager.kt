package com.plaintext

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import android.view.View
import android.view.ViewGroup
import java.util.concurrent.atomic.AtomicInteger
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

  // The @ReactProp setters below only record state — see the batching block in
  // RNPlainText. ViewManager.updateProperties calls this once it has applied
  // every prop in the transaction, which is where the recomputation happens: one
  // setText, one typeface resolution, one text-size pass per view instead of one
  // per prop.
  override fun onAfterUpdateTransaction(view: RNPlainText) {
    super.onAfterUpdateTransaction(view)
    view.flushPendingUpdates()
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
  // text is actually measured. `props` carries the size-affecting props
  // serialized by the C++ side; we size an off-screen TextView exactly as it
  // will render.
  //
  // The C++ side omits any prop still at its default, so a missing key means
  // "default" — every fallback below must match the default in the generated
  // Props.h. And because the off-screen view is reused across nodes, every prop
  // has to be set on every call, not only when its key is present.
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
    val startNanos = if (LOG_MEASURE_BATCHES) System.nanoTime() else 0L

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
    // The setters above only marked state dirty; this is what applies it. It
    // also enforces the ordering the sizes depend on (font size before letter
    // spacing, which is relative to it), so the calls above no longer need to be
    // in any particular order.
    view.flushPendingUpdates()

    view.measure(
      toMeasureSpec(width, widthMode),
      toMeasureSpec(height, heightMode)
    )

    val result = YogaMeasureOutput.make(
      PixelUtil.toDIPFromPixel(view.measuredWidth.toFloat()),
      PixelUtil.toDIPFromPixel(view.measuredHeight.toFloat())
    )

    if (LOG_MEASURE_BATCHES) recordMeasureCall(startNanos)
    return result
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

  // Diagnostic: groups measure() calls into layout batches and logs one line per
  // batch, to answer three questions the earlier numbers left open — how many
  // times Yoga measures each node per commit (its per-node measure cache should
  // make it once), which thread the layout pass runs on, and where the batch
  // sits relative to the JS render window (the 🚨 logs in PerformanceScreen).
  //
  // Everything reported is timestamped at the calls themselves, never at the
  // flush: the flush runs on the main looper, so if measurement is on the main
  // thread it cannot run until the whole pass (and whatever follows it) is done.
  // Deriving the span from flush time is what made a batch look like 418ms.
  // `flushLate` reports that delay explicitly instead, as a read on how backed
  // up the main thread was.
  private val measureCalls = AtomicInteger(0)
  @Volatile private var batchFirstCallMs = 0L
  @Volatile private var batchLastCallMs = 0L
  @Volatile private var batchBusyNanos = 0L
  @Volatile private var batchThread: String? = null
  @Volatile private var batchMixedThreads = false
  private val measureLogHandler by lazy { Handler(Looper.getMainLooper()) }

  // `busy` is the summed duration of the measure() calls themselves; `span` is
  // wall-clock from the first call to the last. busy << span means the pass is
  // interleaved with other work rather than measure-bound.
  private val flushMeasureLog = object : Runnable {
    override fun run() {
      val idleMs = SystemClock.uptimeMillis() - batchLastCallMs
      // A call landed while this was queued — the batch is still running.
      if (idleMs < MEASURE_LOG_QUIET_MS) {
        measureLogHandler.postDelayed(this, MEASURE_LOG_QUIET_MS - idleMs)
        return
      }
      val count = measureCalls.getAndSet(0)
      if (count == 0) return

      val busyMs = batchBusyNanos / 1_000_000.0
      val spanMs = batchLastCallMs - batchFirstCallMs
      val flushLateMs = idleMs - MEASURE_LOG_QUIET_MS
      Log.d(
        NAME,
        "🚨 measure batch: $count calls · busy ${"%.1f".format(busyMs)}ms " +
          "(${"%.0f".format(busyMs * 1000 / count)}µs/call) · span ${spanMs}ms · " +
          "uptime $batchFirstCallMs→$batchLastCallMs · thread=$batchThread" +
          (if (batchMixedThreads) "(+others)" else "") +
          " · flushLate ${flushLateMs}ms"
      )
    }
  }

  private fun recordMeasureCall(startNanos: Long) {
    val endNanos = System.nanoTime()
    val nowMs = SystemClock.uptimeMillis()
    val thread = Thread.currentThread().name

    if (measureCalls.getAndIncrement() == 0) {
      batchFirstCallMs = nowMs - (endNanos - startNanos) / 1_000_000
      batchBusyNanos = 0L
      batchThread = thread
      batchMixedThreads = false
      // Armed once per batch rather than re-armed per call: 1000 handler
      // post/remove pairs would themselves show up in what we are measuring.
      // The Runnable re-posts itself while calls are still arriving.
      measureLogHandler.postDelayed(flushMeasureLog, MEASURE_LOG_QUIET_MS)
    } else if (thread != batchThread) {
      batchMixedThreads = true
    }

    batchBusyNanos += endNanos - startNanos
    batchLastCallMs = nowMs
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

    // Flip off to remove the per-batch measure() logging above.
    private const val LOG_MEASURE_BATCHES = true
    // How long without a measure() call ends a batch. Long enough to not split
    // one layout pass in two, short enough to keep two passes apart — the gap
    // between the mount pass and the settle re-render is ~1.9s.
    private const val MEASURE_LOG_QUIET_MS = 200L
  }
}

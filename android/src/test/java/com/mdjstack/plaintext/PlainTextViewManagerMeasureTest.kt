package com.mdjstack.plaintext

import android.content.Context
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.uimanager.DisplayMetricsHolder
import com.facebook.react.uimanager.PixelUtil
import com.facebook.yoga.YogaMeasureMode
import com.facebook.yoga.YogaMeasureOutput
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
// Robolectric has no image for compileSdkVersion 36, so run on the newest it ships.
@Config(sdk = [Config.NEWEST_SDK])
// Line breaking needs real glyph advances.
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class PlainTextViewManagerMeasureTest {
  private val context: Context
    get() = RuntimeEnvironment.getApplication()

  @Before
  fun setUp() {
    DisplayMetricsHolder.initDisplayMetricsIfNotInitialized(context)
  }

  private fun measure(width: Float, widthMode: YogaMeasureMode): Long =
    PlainTextViewManager().measure(
      context,
      null,
      JavaOnlyMap.of("text", "Hello world"),
      null,
      width,
      widthMode,
      0f,
      YogaMeasureMode.UNDEFINED,
      null
    )

  // A parent that shrink-wraps the text passes its width back as the constraint, and
  // the px to DIP to px round trip can turn 122px into 121.99999px.
  @Test
  fun keepsOneLineAtItsOwnWidthMinusFloatError() {
    val intrinsic = measure(0f, YogaMeasureMode.UNDEFINED)
    val widthPx = Math.round(PixelUtil.toPixelFromDIP(YogaMeasureOutput.getWidth(intrinsic)))

    val constrained = measure(Math.nextDown(widthPx.toFloat()), YogaMeasureMode.AT_MOST)

    assertEquals(YogaMeasureOutput.getWidth(intrinsic), YogaMeasureOutput.getWidth(constrained), 0f)
    assertEquals(YogaMeasureOutput.getHeight(intrinsic), YogaMeasureOutput.getHeight(constrained), 0f)
  }
}

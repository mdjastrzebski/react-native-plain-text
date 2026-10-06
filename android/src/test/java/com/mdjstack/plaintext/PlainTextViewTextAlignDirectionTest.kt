package com.mdjstack.plaintext

import android.content.Context
import android.content.pm.ApplicationInfo
import android.text.Layout
import android.view.Gravity
import android.view.View
import com.facebook.react.uimanager.DisplayMetricsHolder
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertSame
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

// SYNC: the iOS counterpart is RNPlainText's updateLayoutMetrics override. See
// docs/contributing/sync-points.md#set-18--paragraph-direction-and-text-alignment.
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [Config.NEWEST_SDK])
class PlainTextViewTextAlignDirectionTest {
  private val context: Context
    get() = RuntimeEnvironment.getApplication()

  @Before
  fun setUp() {
    DisplayMetricsHolder.initDisplayMetricsIfNotInitialized(context)
    // Without FLAG_SUPPORTS_RTL, View#resolveLayoutDirection ignores RTL. The library
    // manifest doesn't set it; a real app's manifest sets supportsRtl="true".
    context.applicationInfo.flags = context.applicationInfo.flags or
      ApplicationInfo.FLAG_SUPPORTS_RTL
  }

  private fun horizontalGravityOf(view: PlainTextView) =
    view.gravity and Gravity.RELATIVE_HORIZONTAL_GRAVITY_MASK

  @Test
  fun resolvesLeftAgainstTheCurrentDirection() {
    val view = PlainTextView(context)
    view.setTextAlign("left")
    assertEquals(Gravity.LEFT, horizontalGravityOf(view))
  }

  @Test
  fun resolvesRightAgainstTheCurrentDirection() {
    val view = PlainTextView(context)
    view.setTextAlign("right")
    assertEquals(Gravity.RIGHT, horizontalGravityOf(view))
  }

  @Test
  fun resolvesAgainstADirectionAlreadySetBeforeTheProp() {
    val view = PlainTextView(context)
    view.setLayoutDirection(View.LAYOUT_DIRECTION_RTL)
    view.setTextAlign("left")
    assertEquals(Gravity.RIGHT, horizontalGravityOf(view))
  }

  @Test
  fun reResolvesLeftWhenTheDirectionArrivesAfterTheProp() {
    val view = PlainTextView(context)
    view.setTextAlign("left")
    view.setLayoutDirection(View.LAYOUT_DIRECTION_RTL)
    assertEquals(Gravity.RIGHT, horizontalGravityOf(view))
  }

  @Test
  fun reResolvesRightWhenTheDirectionArrivesAfterTheProp() {
    val view = PlainTextView(context)
    view.setTextAlign("right")
    view.setLayoutDirection(View.LAYOUT_DIRECTION_RTL)
    assertEquals(Gravity.LEFT, horizontalGravityOf(view))
  }

  @Test
  fun reResolvesJustifyWhenTheDirectionArrivesAfterTheProp() {
    val view = PlainTextView(context)
    view.setTextAlign("justify")
    assertEquals(Gravity.LEFT, horizontalGravityOf(view))
    assertEquals(
      Layout.JUSTIFICATION_MODE_INTER_WORD,
      view.justificationMode,
    )

    view.setLayoutDirection(View.LAYOUT_DIRECTION_RTL)

    // Like Fabric <Text> (TextLayoutManager#getTextGravity): justify swaps sides like
    // left; only the inter-word justification is unconditional.
    assertEquals(Gravity.RIGHT, horizontalGravityOf(view))
    assertEquals(
      Layout.JUSTIFICATION_MODE_INTER_WORD,
      view.justificationMode,
    )
  }

  @Test
  fun keepsCenterIndependentOfDirection() {
    val center = PlainTextView(context)
    center.setTextAlign("center")

    center.setLayoutDirection(View.LAYOUT_DIRECTION_RTL)

    assertEquals(Gravity.CENTER_HORIZONTAL, horizontalGravityOf(center))
  }

  @Test
  fun reResolvesAutoWhenTheDirectionArrivesAfterTheProp() {
    // Like Fabric <Text>: auto takes the paragraph's start edge, not NO_GRAVITY.
    val auto = PlainTextView(context)
    auto.setTextAlign("auto")
    assertEquals(Gravity.LEFT, horizontalGravityOf(auto))

    auto.setLayoutDirection(View.LAYOUT_DIRECTION_RTL)

    assertEquals(Gravity.RIGHT, horizontalGravityOf(auto))
    assertEquals(Layout.JUSTIFICATION_MODE_NONE, auto.justificationMode)
  }

  @Test
  fun resolvesAbsentAlignLikeAuto() {
    // Codegen's 'auto' default means null never arrives, but it must still mean the start edge.
    val view = PlainTextView(context)
    view.setTextAlign(null)
    assertEquals(Gravity.LEFT, horizontalGravityOf(view))

    view.setLayoutDirection(View.LAYOUT_DIRECTION_RTL)
    assertEquals(Gravity.RIGHT, horizontalGravityOf(view))
  }

  @Test
  fun keepsTheBuiltLayoutWhenReResolvingAnUnchangedAlign() {
    // setJustificationMode drops the Layout even when unchanged, and View fires
    // onRtlPropertiesChanged more than once per resolve.
    val view = PlainTextView(context)
    view.setText("Hello")
    view.setTextAlign("justify")
    view.measure(
      View.MeasureSpec.makeMeasureSpec(200, View.MeasureSpec.EXACTLY),
      View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED),
    )
    val layout = view.layout
    assertNotNull(layout)

    view.onRtlPropertiesChanged(view.layoutDirection)

    assertSame(layout, view.layout)
  }
}

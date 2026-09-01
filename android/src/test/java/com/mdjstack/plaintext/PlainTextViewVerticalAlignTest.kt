package com.mdjstack.plaintext

import android.content.Context
import android.view.Gravity
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

// Covers the verticalAlign/textAlignVertical merge moved out of JS
// (PlainText.tsx's former resolveTextAlignVertical) into applyVerticalAlignGravity,
// per docs/contributing/performance.md#prop-cost-policy.
// SYNC: mirrors RNPlainText.mm's RNPlainTextResolveVerticalAlign.
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [Config.NEWEST_SDK])
class PlainTextViewVerticalAlignTest {
  private val context: Context
    get() = RuntimeEnvironment.getApplication()

  private fun verticalGravityOf(view: PlainTextView) = view.gravity and Gravity.VERTICAL_GRAVITY_MASK

  @Test
  fun usesTextAlignVerticalWhenVerticalAlignIsUnset() {
    val view = PlainTextView(context)
    view.setTextAlignVertical("bottom")
    assertEquals(Gravity.BOTTOM, verticalGravityOf(view))
  }

  @Test
  fun usesVerticalAlignWhenOnlyItIsSet() {
    val view = PlainTextView(context)
    view.setVerticalAlign("top")
    assertEquals(Gravity.TOP, verticalGravityOf(view))
  }

  @Test
  fun mapsVerticalAlignMiddleToCenter() {
    val view = PlainTextView(context)
    view.setVerticalAlign("middle")
    assertEquals(Gravity.CENTER_VERTICAL, verticalGravityOf(view))
  }

  @Test
  fun letsVerticalAlignWinWhenBothAreSet() {
    val view = PlainTextView(context)
    view.setTextAlignVertical("bottom")
    view.setVerticalAlign("top")
    assertEquals(Gravity.TOP, verticalGravityOf(view))
  }

  @Test
  fun letsVerticalAlignWinRegardlessOfSetOrder() {
    val view = PlainTextView(context)
    view.setVerticalAlign("top")
    view.setTextAlignVertical("bottom")
    assertEquals(Gravity.TOP, verticalGravityOf(view))
  }

  @Test
  fun fallsBackToTextAlignVerticalWhenVerticalAlignIsClearedBackToNull() {
    val view = PlainTextView(context)
    view.setVerticalAlign("top")
    view.setTextAlignVertical("bottom")
    view.setVerticalAlign(null)
    assertEquals(Gravity.BOTTOM, verticalGravityOf(view))
  }
}

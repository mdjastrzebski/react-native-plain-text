package com.mdjstack.plaintext

import android.content.Context
import android.view.View.MeasureSpec
import com.facebook.react.uimanager.DisplayMetricsHolder
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

// A view that was measured but never added to a parent reaches checkForRelayout() from
// setText(), which dereferences layoutParams.width. See docs/contributing/sync-points.md.
@RunWith(RobolectricTestRunner::class)
// Robolectric has no image for compileSdkVersion 36, so run on the newest it ships.
@Config(sdk = [Config.NEWEST_SDK])
class PlainTextViewLayoutParamsTest {
  private val context: Context
    get() = RuntimeEnvironment.getApplication()

  @Before
  fun setUp() {
    DisplayMetricsHolder.initDisplayMetricsIfNotInitialized(context)
  }

  // TextView builds its text Layout during measure, and measure needs no parent.
  private fun measuredParentlessView(): PlainTextView {
    val view = PlainTextView(context)
    view.measure(
      MeasureSpec.makeMeasureSpec(200, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(100, MeasureSpec.EXACTLY)
    )
    assertNotNull("precondition: measure must have built the text Layout", view.layout)
    return view
  }

  @Test
  fun seedsLayoutParamsAtConstruction() {
    assertNotNull(PlainTextView(context).layoutParams)
  }

  @Test
  fun setsTextOnAMeasuredParentlessView() {
    val view = measuredParentlessView()

    view.setPlainText("hello")
    view.flushPendingUpdates()

    assertEquals("hello", view.text.toString())
  }

  // Passes with or without the seeding: setText guards checkForRelayout on mLayout.
  @Test
  fun setsTextOnAnUnmeasuredParentlessViewWithoutReachingCheckForRelayout() {
    val view = PlainTextView(context)
    assertEquals(null, view.layout)

    view.setPlainText("hello")
    view.flushPendingUpdates()

    assertEquals("hello", view.text.toString())
  }

  // The reported trace crashed on applyText's spannable branch.
  @Test
  fun setsTextWithLineHeightOnAMeasuredParentlessView() {
    val view = measuredParentlessView()

    view.setLineHeight(24f)
    view.setPlainText("hello")
    view.flushPendingUpdates()

    assertEquals("hello", view.text.toString())
  }
}

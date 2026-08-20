package com.mdjstack.plaintext

import android.content.Context
import android.view.View.MeasureSpec
import androidx.test.core.app.ApplicationProvider
import com.facebook.react.uimanager.DisplayMetricsHolder
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// Regression test for the Fabric mount NPE: TextView.setText() reaches
// checkForRelayout(), which dereferences layoutParams.width unconditionally
// (AOSP TextView.java), and a PlainTextView that was never added to a parent has
// no LayoutParams unless the constructor seeds them.
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class PlainTextViewLayoutParamsTest {
  private val context: Context
    get() = ApplicationProvider.getApplicationContext()

  @Before
  fun setUp() {
    DisplayMetricsHolder.initDisplayMetricsIfNotInitialized(context)
  }

  // TextView builds the text Layout it draws during measure, and measure works on a
  // parentless view. That is the whole crash precondition: from the first measure on,
  // setText() stops being a no-op relayout and calls checkForRelayout().
  private fun measuredParentlessView(): PlainTextView {
    val view = PlainTextView(context)
    view.measure(
      MeasureSpec.makeMeasureSpec(200, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(100, MeasureSpec.EXACTLY)
    )
    assertNotNull("precondition: measure must have built the text Layout", view.layout)
    assertEquals("precondition: the view must have no parent", null, view.parent)
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

  // Pins the precondition the two tests above rely on, and rules out the mechanism the
  // crash was first attributed to: setText() only reaches checkForRelayout() once a text
  // Layout exists (TextView.setText guards the call on mLayout != null), so the *first*
  // setText on a never-measured view cannot NPE, seeded LayoutParams or not. Anything
  // claiming a freshly-created view crashes on its first applyText() is wrong.
  @Test
  fun setsTextOnAnUnmeasuredParentlessViewWithoutReachingCheckForRelayout() {
    val view = PlainTextView(context)
    assertEquals("precondition: no text Layout before the first measure", null, view.layout)

    view.setPlainText("hello")
    view.flushPendingUpdates()

    assertEquals("hello", view.text.toString())
  }

  // The reported stack trace crashed on the spannable branch of applyText, which is
  // only taken when lineHeight is set, so cover it explicitly.
  @Test
  fun setsTextWithLineHeightOnAMeasuredParentlessView() {
    val view = measuredParentlessView()

    view.setLineHeight(24f)
    view.setPlainText("hello")
    view.flushPendingUpdates()

    assertEquals("hello", view.text.toString())
  }
}

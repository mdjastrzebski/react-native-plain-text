package com.mdjstack.plaintext

import android.content.Context
import android.text.Spanned
import android.text.style.LocaleSpan
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

// Covers lang's LocaleSpan, the only language hint TalkBack reads.
// SYNC: the Android side of RNPlainText.mm's lang-based accessibilityLanguage. See
// docs/contributing/sync-points.md#set-19--lang-as-the-screen-reader-language.
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [Config.NEWEST_SDK])
class PlainTextViewLocaleSpanTest {
  private val context: Context
    get() = RuntimeEnvironment.getApplication()

  private fun localeSpanTagOf(view: PlainTextView): String? {
    val text = view.text as? Spanned ?: return null
    val spans = text.getSpans(0, text.length, LocaleSpan::class.java)
    if (spans.isEmpty()) return null
    assertEquals(1, spans.size)
    return spans[0].locale?.toLanguageTag()
  }

  private fun viewWith(lang: String? = null): PlainTextView {
    val view = PlainTextView(context)
    view.setPlainText("Hello")
    view.setLang(lang)
    view.flushPendingUpdates()
    return view
  }

  @Test
  fun addsNoLocaleSpanWhenLangIsUnset() {
    assertNull(localeSpanTagOf(viewWith()))
  }

  @Test
  fun usesLangForTheLocaleSpan() {
    assertEquals("de", localeSpanTagOf(viewWith(lang = "de")))
  }

  @Test
  fun treatsEmptyLangAsUnset() {
    assertNull(localeSpanTagOf(viewWith(lang = "")))
  }

  @Test
  fun keepsTheLocaleSpanAlongsideLineHeight() {
    val view = PlainTextView(context)
    view.setPlainText("Hello")
    view.setLineHeight(30f)
    view.setLang("de")
    view.flushPendingUpdates()
    assertEquals("de", localeSpanTagOf(view))
  }

  @Test
  fun dropsTheLocaleSpanWhenLangIsCleared() {
    val view = viewWith(lang = "de")
    view.setLang(null)
    view.flushPendingUpdates()
    assertNull(localeSpanTagOf(view))
  }
}

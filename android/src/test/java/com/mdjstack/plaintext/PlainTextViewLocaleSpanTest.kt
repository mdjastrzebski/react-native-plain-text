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

// Covers the lang/accessibilityLanguage fallback resolved in applyText rather than JS,
// per docs/contributing/performance.md#prop-cost-policy.
// SYNC: mirrors PlainTextProps.mm's accessibilityLanguageFromProps. See
// docs/contributing/sync-points.md#set-18--the-lang-and-accessibilitylanguage-fallback.
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

  private fun viewWith(lang: String? = null, accessibilityLanguage: String? = null): PlainTextView {
    val view = PlainTextView(context)
    view.setPlainText("Hello")
    view.setLang(lang)
    view.setAccessibilityLanguage(accessibilityLanguage)
    view.flushPendingUpdates()
    return view
  }

  @Test
  fun addsNoLocaleSpanWhenNeitherIsSet() {
    assertNull(localeSpanTagOf(viewWith()))
  }

  @Test
  fun usesLangForTheLocaleSpan() {
    assertEquals("de", localeSpanTagOf(viewWith(lang = "de")))
  }

  @Test
  fun usesAccessibilityLanguageForTheLocaleSpan() {
    assertEquals("fr", localeSpanTagOf(viewWith(accessibilityLanguage = "fr")))
  }

  @Test
  fun letsAccessibilityLanguageWinOverLang() {
    assertEquals("fr", localeSpanTagOf(viewWith(lang = "de", accessibilityLanguage = "fr")))
  }

  @Test
  fun treatsEmptyAccessibilityLanguageAsUnset() {
    assertEquals("de", localeSpanTagOf(viewWith(lang = "de", accessibilityLanguage = "")))
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

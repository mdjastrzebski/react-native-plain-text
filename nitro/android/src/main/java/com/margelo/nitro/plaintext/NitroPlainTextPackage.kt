package com.margelo.nitro.plaintext

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager
import com.margelo.nitro.plaintext.views.HybridNitroPlainTextManager

class NitroPlainTextPackage : BaseReactPackage() {
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    // The measure-only manager is looked up by name from C++, see NitroPlainTextMeasureManager.
    return listOf(HybridNitroPlainTextManager(), NitroPlainTextMeasureManager())
  }

  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? = null

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider { emptyMap() }

  companion object {
    init {
      NitroPlainTextOnLoad.initializeNative()
    }
  }
}

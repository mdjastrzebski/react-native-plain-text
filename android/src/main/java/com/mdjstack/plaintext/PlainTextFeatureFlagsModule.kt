package com.mdjstack.plaintext

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = PlainTextFeatureFlagsModule.NAME)
class PlainTextFeatureFlagsModule(context: ReactApplicationContext) :
  NativePlainTextFeatureFlagsSpec(context) {

  override fun overrideFlag(name: String, value: Boolean) {
    when (name) {
      "androidSharedMeasuringInstance" -> PlainTextFeatureFlags.sharedMeasuringInstance = value
    }
  }

  override fun getName(): String {
    return NAME
  }

  companion object {
    const val NAME = "PlainTextFeatureFlags"
  }
}

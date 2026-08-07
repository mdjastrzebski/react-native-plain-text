package com.mdjstack.plaintext

// Dedicated fields, not a map: PlainTextViewManager.measureView() reads
// sharedMeasuringInstance on every measure() call, so it must be a plain field
// read, not a string-keyed lookup. Set from JS via PlainTextFeatureFlagsModule,
// for perf-suite experiments only — see docs/agent/sync-points.md.
object PlainTextFeatureFlags {
  @Volatile
  var sharedMeasuringInstance: Boolean = true
}

# react-native-plain-text-nitro (temporary)

A [Nitro Views](https://nitro.margelo.com/docs/view-components) port of `PlainText`,
living in this repo only so the example app's Performance screen can benchmark it
against the Fabric component in a single build. Private workspace, never published.

- `NitroPlainText`: JS wrapper taking PlainText-style props (`style`, `children`),
  mirroring `src/PlainText.tsx`'s prop mapping.
- `NativeNitroPlainText`: the bare host component, props in native shape (colors
  pre-processed with `processColor`). Counterpart of `unstable_NativePlainText`.

Native code: `ios/HybridNitroPlainText.swift` (UILabel, one `attributedText` write
per prop transaction) and `android/.../HybridNitroPlainText.kt` (AppCompatTextView,
dirty flags flushed in `afterUpdate`), each kept to the shape of the Fabric view.

## In the example app

- **Performance screen:** the NitroPlainText and NativeNitroPlainText variant chips,
  next to PlainText and NativePlainText. Each chip names its implementation, and
  this screen ignores the toggle below.
- **Features and Examples screens:** a "Fabric"/"Nitro" header button
  (`example/src/components/TextImplementation.tsx`) switches every specimen,
  including the animated ones, between the two. It's session-persisted like the
  other header toggles. Labels and other screen chrome stay on Fabric.

## Measuring

Nitro Views get a stock, non-measuring shadow node, so on its own the view would
collapse to zero height. `cpp/` replaces it with a measuring one; the swap itself
follows [react-native-nitro-text](https://github.com/patrickkabwe/react-native-nitro-text):

- `NitroPlainTextShadowNode`: same name, props and state as the generated node,
  plus the leaf/measurable/baseline Yoga traits, `measureContent`,
  and PlainText's "only re-measure when a size-affecting prop changed" check
  (`measurementInputsEqual`, ported from `cpp/PlainTextMeasurementHelpers.cpp`).
- `NitroPlainTextComponentDescriptor`: creates those nodes, and on Android hands
  them the measurements manager and keeps the generated descriptor's
  props-into-state step.
- Registration swap: RN's provider registry keeps the first provider registered
  per component. iOS overrides the generated component class's
  `+componentDescriptorProvider` in a category (`ios/NitroPlainTextShadowOverride.mm`);
  Android registers the custom provider in `JNI_OnLoad` just before the generated
  `registerAllNatives()` (`android/src/main/cpp/cpp-adapter.cpp`).

Both platforms port PlainText's own measuring:

- **iOS.** `ios/NitroPlainTextShadowNode+iOS.mm` ports
  `ios/PlainTextShadowNode.mm`'s `measureContent` and `baseline`. Fonts come from
  `ios/NitroPlainTextFont.mm`, a port of `ios/PlainTextFont.mm` (same face
  selection and caches, minus `fontVariant`/`fontVariationSettings`), which the
  Swift view also calls, so measured and drawn fonts agree. The Swift view mirrors
  `RNPlainText.mm`'s rendering (paragraph style, line-break strategy, the
  `verticalTextShift` lineHeight centering).
- **Android.** `android/src/main/cpp/NitroPlainTextMeasurementsManager`
  ports `PlainTextMeasurementsManager`: it serializes the size-affecting props and
  calls `FabricUIManager.measure(...)` over JNI. Nitro's generated view manager is
  final and can't measure, so the call is routed by name to a measure-only
  `NitroPlainTextMeasureManager.kt`, a port of `PlainTextViewManager.measure()`
  (reused off-screen view, `Layout.getDesiredWidth`, the `clip` line-bottom fix,
  the `__baseline` query). `NitroPlainTextView.kt` ports `PlainTextView.kt` and is
  both the mounted view and the off-screen measuring view, so measured and drawn
  text go through the same setters.

Measurement and drawing are separate code paths, so every size-affecting prop has
to be handled in `measureContent`, `measurementInputsEqual` and the native view.

## Limitations

- A subset of props (see `src/specs/NitroPlainText.nitro.ts`). Missing:
  `fontVariant`, `fontVariationSettings`, `textAlignVertical`, `writingDirection`,
  `includeFontPadding`, `android_hyphenationFrequency`, `textBreakStrategy`,
  `lineBreakStrategyIOS`, `ref`, and `PlatformColor` colors.
- No reaction to OS text-size changes while mounted.

## Regenerating bindings

After editing the spec, run `yarn workspace react-native-plain-text-nitro specs`
and commit `nitrogen/generated/` (un-ignored in the root `.gitignore`). Then
rebuild the example app's native code.

## Nitro version

On `react-native-nitro-modules`/`nitrogen` 0.37.1 (also the example app's, for
`react-native-mmkv`). As of 0.37.1, Nitro Views still generate a plain,
non-measuring `ConcreteViewShadowNode` with no hook for a custom one, so
`cpp/` stays necessary. (Upstream has only an unmerged experiment, the
`test/layouting` branch.) What 0.37 did add, and `cpp/` now uses:

- `ReactProp<T>` (was `CachedProp<T>`): immutable prop entries, so
  `measurementInputsEqual` compares them by identity (`hasSameValue`).
- `nitro::ViewComponentDescriptor<T>`, a generic descriptor with Android's
  props-into-state step, which also keeps the State identity when no Nitro prop
  changed. It's `final`, so `NitroPlainTextComponentDescriptor` copies its
  `adopt` rather than extending it.

## Removing

Delete `nitro/`, drop `"nitro"` from the root `workspaces`, `tsconfig.build.json`,
`.oxfmtrc.json` and `.gitignore`, drop the dependency from `example/package.json`, remove the
Nitro variants from `example/src/screens/PerformanceScreen.tsx` and the toggle
(`TextImplementation.tsx`, its uses in `CompareText.tsx`, `App.tsx`,
`Specimen.tsx`, `AnimatingTextSection.tsx` and three CompareBox sections), then `yarn`.

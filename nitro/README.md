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

## Measuring

Nitro Views get a stock, non-measuring shadow node, so on its own the view would
collapse to zero height. `cpp/` replaces it with a measuring one; the swap itself
follows [react-native-nitro-text](https://github.com/patrickkabwe/react-native-nitro-text):

- `NitroPlainTextShadowNode`: same name, props and state as the generated node,
  plus the leaf/measurable (and on iOS, baseline) Yoga traits, `measureContent`,
  and PlainText's "only re-measure when a size-affecting prop changed" check
  (`measurementInputsEqual`, ported from `cpp/PlainTextMeasurementHelpers.cpp`).
- `NitroPlainTextComponentDescriptor`: creates those nodes, and on Android keeps
  the generated descriptor's props-into-state step.
- Registration swap: RN's provider registry keeps the first provider registered
  per component. iOS overrides the generated component class's
  `+componentDescriptorProvider` in a category (`ios/NitroPlainTextShadowOverride.mm`);
  Android registers the custom provider in `JNI_OnLoad` just before the generated
  `registerAllNatives()` (`android/src/main/cpp/cpp-adapter.cpp`).

What `measureContent` does differs per platform:

- **iOS: PlainText's own algorithm.** `ios/NitroPlainTextShadowNode+iOS.mm` ports
  `ios/PlainTextShadowNode.mm`'s `measureContent` and `baseline`. Fonts come from
  `ios/NitroPlainTextFont.mm`, a port of `ios/PlainTextFont.mm` (same face
  selection and caches, minus `fontVariant`/`fontVariationSettings`), which the
  Swift view also calls, so measured and drawn fonts agree. The Swift view mirrors
  `RNPlainText.mm`'s rendering (paragraph style, line-break strategy, the
  `verticalTextShift` lineHeight centering).
- **Android: RN's `TextLayoutManager`**, the one `<Text>` uses, shared through the
  `ContextContainer`. So Android Nitro rows pay `<Text>`'s measuring cost, not
  PlainText's (`PlainTextMeasurementsManager`), and compare accordingly.

Measurement and drawing are separate code paths, so every size-affecting prop has
to be handled in `measureContent`, `measurementInputsEqual` and the native view.

## Limitations

- A subset of props (see `src/specs/NitroPlainText.nitro.ts`). Missing:
  `fontVariant`, `fontVariationSettings`, `textAlignVertical`, `writingDirection`,
  `includeFontPadding`, `android_hyphenationFrequency`, `textBreakStrategy`,
  `lineBreakStrategyIOS`, `ref`, and `PlatformColor` colors.
- No baseline on Android: `alignItems: 'baseline'` falls back to the bottom edge.
- No reaction to OS text-size changes while mounted.

## Regenerating bindings

After editing the spec, run `yarn workspace react-native-plain-text-nitro specs`
and commit `nitrogen/generated/`. Then rebuild the example app's native code.

## Removing

Delete `nitro/`, drop `"nitro"` from the root `workspaces`, `tsconfig.build.json`
and `.oxfmtrc.json`, drop the dependency from `example/package.json`, remove the
Nitro variants from `example/src/screens/PerformanceScreen.tsx`, then `yarn`.

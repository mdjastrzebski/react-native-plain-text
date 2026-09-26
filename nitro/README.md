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

## Limitations

- **No intrinsic size.** Nitro Views get a stock `ConcreteViewShadowNode`, with no
  custom `measureContent`, so the text isn't measured and a view without an
  explicit height collapses to zero. The Performance screen gives Nitro rows a
  height estimated from the config (see `nitroRowHeight`). This also means Nitro
  rows skip the shadow-node measuring work that PlainText and `<Text>` pay for, so
  compare numbers with that in mind.
- A subset of props (see `src/specs/NitroPlainText.nitro.ts`). Missing:
  `fontVariant`, `fontVariationSettings`, `textAlignVertical`, `writingDirection`,
  `includeFontPadding`, `android_hyphenationFrequency`, `textBreakStrategy`,
  `lineBreakStrategyIOS`, `ref`, and `PlatformColor` colors.
- No reaction to OS text-size changes while mounted.

## Regenerating bindings

After editing the spec, run `yarn workspace react-native-plain-text-nitro specs`
and commit `nitrogen/generated/`. Then rebuild the example app's native code.

## Removing

Delete `nitro/`, drop `"nitro"` from the root `workspaces`, `tsconfig.build.json`
and `.oxfmtrc.json`, drop the dependency from `example/package.json`, remove the
Nitro variants from `example/src/screens/PerformanceScreen.tsx`, then `yarn`.

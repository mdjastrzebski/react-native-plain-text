# Architecture

## The four-layer prop flow

Every native prop passes through four files. Adding or changing a prop means
editing all four (and, if it affects measured size, five more,
see [sync-points.md](sync-points.md)).

1. **Codegen spec**: `src/PlainTextViewNativeComponent.ts`. The `NativeProps`
   interface is the source of truth. Codegen turns it into the C++/Kotlin
   interfaces the native code implements.
2. **JS wrapper**: `src/PlainText.tsx`. `src/index.tsx` re-exports `PlainText`
   and its types from `./PlainText`, plus `unstable_NativePlainText` (the bare
   codegen host component). The library is Android/iOS only, with no web
   fallback.
3. **iOS**: `ios/RNPlainText.mm` (+ `.h`): an `RCTViewComponentView` subclass
   hosting a `UILabel`, applying props in `updateProps:` by diffing
   `oldViewProps`/`newViewProps`.
4. **Android**: `android/src/main/java/com/mdjstack/plaintext/`:
   `PlainTextView.kt` (the `TextView` subclass), `PlainTextViewManager.kt`
   (`@ReactProp` setters implementing the codegen `...ManagerInterface`),
   `PlainTextPackage.kt` (registration).

Intrinsic sizing adds a custom `ShadowNode` on each platform. See
[intrinsic-sizing.md](intrinsic-sizing.md).

**Naming split:** the `RN` prefix is reserved for names that share a global
namespace: the native component name, the codegen spec, the pod and the iOS
Objective-C classes are all `RNPlainText` (`package.json` → `codegenConfig`,
name `RNPlainTextSpec`, podspec `RNPlainText.podspec`). The public JS API is
`PlainText`, and the Android classes drop the prefix too: `PlainTextView`,
`PlainTextViewManager`, `PlainTextPackage`. That follows react-native-screens and
react-native-safe-area-context (`ScreenViewManager`, `SafeAreaViewManager`), and
react-native-pager-view, whose unprefixed `PagerViewViewManager` implements the
prefixed `RNCViewPagerManagerInterface` exactly as ours does. On Android the only
prefixed names left are the generated ones we implement:
`RNPlainTextManagerInterface` and `RNPlainTextManagerDelegate`.

## Prop conventions

- **Text-style props (e.g. `fontSize`) are not part of RN `ViewProps`**, so they
  don't reach the native view through `style`. The pattern (see
  `PlainText.tsx`): accept a `TextStyle` `style`, `StyleSheet.flatten`
  it, destructure the text-style keys out, pass them as explicit codegen props,
  and forward the remaining layout styles as `style`.
- **A prop nobody sets must cost a check.** No allocation, no font resolution,
  no extra pass when it is at its default. A prop that is set gets a
  light/medium/heavy rating, and medium or heavy is recorded beside it in the
  spec. Both rules, and the current ratings, are in
  [performance.md](performance.md#prop-cost-policy).
- Codegen types come from the **`CodegenTypes` namespace exported by
  `react-native`** (e.g. `CodegenTypes.WithDefault<CodegenTypes.Float, 14>`).
  Do **not** import `react-native/Libraries/Types/CodegenTypes`, this project
  uses the strict API (`customConditions` in `tsconfig.json`), which blocks
  `react-native/Libraries/*` subpaths.
- The native component enables `generateOptionalProperties`, so an optional
  prop without a default becomes `std::optional` in generated C++. Codegen
  currently gives a plain optional `Float` a synthetic `0` default
  ([RN#55315](https://github.com/facebook/react-native/issues/55315)), so use
  `WithDefault<Float, null>` when native code needs to distinguish unset from
  an explicit zero.

## Example app

`example/` is an Expo dev-client app (see `example/AGENTS.md`, and check the
versioned Expo docs before touching Expo config). It consumes the library from
source via `example/react-native.config.js`, which points the dependency at the
repo root.

Three screens, sharing the specimen furniture in `src/components/Specimen.tsx`
(cover, section headings, the row that overlays RN's `<Text>` in red), the
palette in `src/theme.ts`, and the "Compare Text" flag in
`src/components/CompareText.tsx`, one state above the tab navigator, so the
toggle is the same setting on every screen that offers it.

- **Features** (`src/screens/FeaturesScreen.tsx`): per-prop coverage, one prop
  per section and one value per row. Every new feature must add a section here.
- **Use Cases** (`src/screens/UseCasesScreen.tsx`): rows that stack three to six
  props at once. Realistic UI shapes first, one section per kind
  (`USE_CASE_GROUPS`, commonest shape first: headings, body copy, labels, buttons
  and links, code, numerals, badges, status and feedback), then
  `RANDOM_USE_CASES`: arbitrary combinations that catch interactions the
  realistic rows avoid.
- **Performance** (`src/screens/PerformanceScreen.tsx`): the benchmark harness.
  See [measuring.md](measuring.md).

## Platform versions

Android: `minSdkVersion 24` (Android 7.0), `compileSdkVersion 36`, set in
`android/build.gradle`. **API 24 is the floor for every `@RequiresApi` /
`Build.VERSION.SDK_INT` decision**: anything at or below 24 needs no guard,
anything above does.

This matches RN itself, which has been on `minSdk 24` since 0.77
(`references/react-native/packages/react-native/gradle/libs.versions.toml`).
Check that file rather than assuming when the question comes up again. RN's
`targetSdk`/`compileSdk` move roughly once per Android release.

iOS: the podspec sets no version of its own, it uses RN's
`min_ios_version_supported`, currently **iOS 15.1** (minimum Xcode 16.1). So
**15.1 is the floor for every `@available` / `if (@available(iOS N, *))`
check**: anything at or below 15.1 needs no guard, anything above does.

The value lives in
`references/react-native/packages/react-native/scripts/cocoapods/helpers.rb`
(`Helpers::Constants.min_ios_version_supported`). Check it there rather than
assuming.

Note the example app is higher: `example/ios/Podfile` pins `16.4` (Expo's
default). That's the app's floor, not the library's, so never use it to justify
dropping an `@available` guard.

## React Native sources

The full RN source tree is a shallow submodule at `references/react-native`.
Use it to check native implementation details, codegen internals, Fabric layout,
and RN's own `<Text>`/`UILabel`/`TextView` handling instead of guessing.
**Reference only, never edit it.** Populate with:

```sh
git submodule update --init --depth 1 references/react-native
```

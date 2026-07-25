# AGENTS.md

This file provides guidance to coding agents when working with code in this repository.

## What this is

A React Native library exposing a `PlainText` component: a lightweight static-text view backed directly by the platform's native text widget — `UILabel` on iOS, `TextView` on Android — rather than by RN's own `<Text>`. It is a **Fabric (New Architecture) native component**, scaffolded with `create-react-native-library` (`fabric-view`, `kotlin-objc`).

It is a Yarn (v4, workspaces) monorepo: the library lives in the root, and `example/` is an Expo dev-client app used to run and test changes. Do not use `npm`.

## React Native sources

The full React Native source tree is checked out as a shallow git submodule at `references/react-native` (github.com/facebook/react-native). Use it to look up native implementation details, codegen internals, `CodegenTypes`, `RCTViewComponentView`, Fabric layout, and RN's own `<Text>`/`UILabel`/`TextView` handling instead of guessing. It is reference-only — never edit it. Run `git submodule update --init --depth 1 references/react-native` to populate it if missing.

## Commands

Run from the repo root:

- `yarn typecheck` — TypeScript (`tsc`)
- `yarn lint` / `yarn lint --fix` — ESLint (+ Prettier)
- `yarn test` — Jest
- `yarn test path/to/file.test.tsx` — single test file; add `-t "name"` for a single case
- `yarn example ios` / `yarn example android` — build & run the example app (`expo run:*`)
- `yarn example start` — Metro only (JS reload; does **not** rebuild native)
- `yarn prepare` — build the shippable library with `react-native-builder-bob` (outputs to `lib/`)

Always run `yarn typecheck` and `yarn lint` after changes.

## Architecture: the four-layer prop flow

Every native prop passes through four files that must stay in sync. Adding or changing a prop means editing all four:

1. **Codegen spec** — `src/PlainTextViewNativeComponent.ts`. The `NativeProps` interface here is the source of truth; codegen turns it into the C++/Kotlin interfaces the native code implements. `codegenNativeComponent('RNPlainText')` is the native component name.
2. **JS wrapper** — `src/PlainText.native.tsx` (native) and `src/PlainText.tsx` (web/fallback, uses `<Text>`). Metro picks `.native.tsx` on device. `src/index.tsx` re-exports from `./PlainText`.
3. **iOS** — `ios/RNPlainText.mm` (+ `.h`). A `RCTViewComponentView` subclass hosting a `UILabel`; props are applied in `updateProps:` by diffing `oldViewProps`/`newViewProps`. (Intrinsic sizing adds two more iOS files — see the measurement section below.)
4. **Android** — `android/src/main/java/com/plaintext/`: `RNPlainText.kt` (the `TextView` subclass), `RNPlainTextManager.kt` (`@ReactProp` setters implementing the codegen `...ManagerInterface`), `RNPlainTextPackage.kt` (registration).

Note the naming split: the **public JS API is `PlainText`**, but the **native component / codegen spec / pod is `RNPlainText`** (config in `package.json` → `codegenConfig`, name `RNPlainTextSpec`; podspec `RNPlainText.podspec`).

### Prop conventions established here

- **Text-style props (e.g. `fontSize`) are NOT part of RN `ViewProps`**, so they don't flow through the native view's `style` automatically. The pattern (see `PlainText.native.tsx`): accept a `TextStyle` `style`, `StyleSheet.flatten` it, destructure the text-style keys out, pass them as **explicit codegen props**, and forward the remaining layout styles as `style`.
- Codegen types come from the **`CodegenTypes` namespace exported by `react-native`** (e.g. `CodegenTypes.WithDefault<CodegenTypes.Float, 14>`). Do **not** import from `react-native/Libraries/Types/CodegenTypes` — this project uses the strict API (`customConditions` in `tsconfig.json`), which blocks `react-native/Libraries/*` subpaths.

## Feature implementation policy

Unless told otherwise, any request to implement a new feature (e.g. a new prop) implies all three of the following:

- **API parity with RN `Text`**: match the shape/semantics of the equivalent prop or behavior on React Native's own `<Text>` component, rather than inventing a new API.
- **Both platforms**: implement it for iOS and Android — not one platform first "for now". See the four-layer prop flow above for what touching both platforms means in practice.
- **Example coverage**: add a dedicated section for it on the Features tab (`example/src/screens/FeaturesScreen.tsx`) so it's visible and testable in the example app.

Work in this order:

1. **Add usage/test cases to the Features screen first** (`example/src/screens/FeaturesScreen.tsx`).
2. **Implement iOS, then Android** across the four-layer prop flow.
3. **Run all checks last** — `yarn typecheck`, `yarn lint`, `yarn test`.

**Do not build the native binaries yourself** (`yarn example ios|android`) unless explicitly asked to.

## Native gotchas (learned the hard way)

- **Native code changes require a full rebuild** (`yarn example ios|android`). Metro reload / Fast Refresh only picks up JS. A stale native build is the first thing to suspect when a native change "does nothing".
- **Android `TextView` needs a manual measure pass.** RN's Fabric layout assigns the view's frame directly and never calls Android's `onMeasure`, where `TextView` builds the text `Layout` it draws — so text won't render. `RNPlainText.kt` works around this by re-running `measure`+`layout` inside an overridden `requestLayout()`. Keep this.
- **Do not run `./gradlew clean`** in `example/android`. It re-runs CMake configure against the library's generated codegen dir before regenerating it, and fails. To force a clean native build instead delete the build caches by hand — `example/android/app/.cxx`, `example/android/app/build`, and `android/build` — then run `yarn example android` (the build regenerates codegen).
- Text color is hardcoded to black on both platforms (Android's theme default is gray) so the two platforms match; it is not yet theme-aware or exposed as a prop.
- **Known iOS limitation: wrapped text can break one word earlier than RN `<Text>` at the same width.** `UILabel` needs slightly more horizontal space per character than RN's TextKit-based `<Text>`, so near a box's width limit, a word can land on the next line for `PlainText` where RN keeps it on the current one. This is an inherent difference between `UILabel` and TextKit, not a sizing bug — the box itself already gets the correct full width. There's no workaround; fixing it would mean rendering through TextKit instead of `UILabel`, defeating the point of this library. Treat it as accepted.
- **Related iOS quirk: a bare hyphen (`-`) is a wrap point for `UILabel` but not for RN `<Text>`**, so `"text-size"` can split into `"text-"` / `"size"` on iOS where RN keeps it together. Use a non-breaking hyphen (U+2011, `‑`) in the source string wherever that split is unwanted — see the "Non-breaking hyphen" row in the Features screen's Font Scaling section.

## Intrinsic sizing (autosizing from the native text)

In Fabric, layout runs in C++ on the shadow thread — the mounted view can never push its size back into Yoga. Intrinsic sizing is therefore done on a **custom `ShadowNode` + `ComponentDescriptor`**, not on the view. Codegen only emits non-measuring `ConcreteViewShadowNode`/`ConcreteComponentDescriptor` aliases, so we hand-write our own and override the registration.

**iOS (implemented).** Three pieces in `ios/`:
- `PlainTextShadowNode.h/.mm` — subclasses `ConcreteViewShadowNode` (reusing the generated `RNPlainTextComponentName`, but named differently to avoid clashing with the generated `RNPlainTextShadowNode` alias). It sets `LeafYogaNode + MeasurableYogaNode` in `BaseTraits()` — the `MeasurableYogaNode` trait is what makes Yoga call the measure fn — and overrides `measureContent`, which reads the props (`getConcreteProps()`), measures the string with `-[NSString boundingRectWithSize:...]` (same CoreText engine as the `UILabel`, thread-safe off-main), and returns the size `clamp`ed to Yoga's `LayoutConstraints`.
- `PlainTextComponentDescriptor.h` — `ConcreteComponentDescriptor<PlainTextShadowNode>`. Because the shadow node reuses `RNPlainTextComponentName`, its handle/name match the generated descriptor, so registering it overrides the default.
- `RNPlainText.mm` — `+componentDescriptorProvider` returns `concreteComponentDescriptorProvider<PlainTextComponentDescriptor>()` instead of the generated one, and no longer imports the generated `ComponentDescriptors.h`.
- Gotcha: `measureContent` accesses `LayoutConstraints` members, so `.mm` must `#include <react/renderer/core/LayoutConstraints.h>` (the generated shadow-node headers only forward-declare it). New `ios/*.mm` files are only compiled after a `pod install` re-scans the podspec glob.

**Android (implemented).** Android has no thread-safe pure-C++ text measurement, so measurement hops back over JNI into a Kotlin `ViewManager.measure()` that sizes an off-screen `TextView` — the `AndroidSwitch`/`AndroidProgressBar` pattern. This is the project's only C++/CMake/JNI, under `android/src/main/jni/`:
- `react/renderer/components/RNPlainTextSpec/PlainTextShadowNode.{h,cpp}` — subclasses `ConcreteViewShadowNode` (reusing the generated `RNPlainTextComponentName`, named differently from the generated `RNPlainTextShadowNode` alias), sets `LeafYogaNode + MeasurableYogaNode` in `BaseTraits()`, and `measureContent` delegates to a `PlainTextMeasurementsManager`.
- `.../PlainTextMeasurementsManager.{h,cpp}` — calls `FabricUIManager.measure(...)` over JNI (`findClassStatic`), serializing the size-affecting props from `getConcreteProps()` into a `ReadableNativeMap` passed as the `props` arg (`AndroidSwitch` passes `null` because its size is prop-independent; ours isn't). The `FabricUIManager` `global_ref` and the `"RNPlainText"` component-name `jstring` are resolved once in the constructor / a function-local static rather than per call, unlike RN's own managers. Needs `<react/jni/ReadableNativeMap.h>` + `<folly/dynamic.h>`; the size math uses `yogaMeassureToSize` from `<react/renderer/core/conversions.h>`.
- `.../ComponentDescriptors.h` — **an override of the generated header of the same include path**, defining a measuring `RNPlainTextComponentDescriptor` (with an `adopt()` that wires the manager onto the shadow node).
- `RNPlainTextManager.kt` — overrides `measure(...)`: reads `text`/`fontSize` from the props `ReadableMap`, measures an off-screen `RNPlainText`, returns `YogaMeasureOutput.make(...)`.

The off-screen view is **reused** (a `ThreadLocal`, since `measure` runs on whichever thread commits) rather than allocated per node — constructing an `AppCompatTextView` is expensive enough to dominate Fabric's layout pass on a screen with many `PlainText`s. Three invariants keep reuse safe, all easy to break when adding a size-affecting prop:
- `measure` must set **every** size-affecting prop unconditionally (with its default when absent), or the previous node's value leaks into this one.
- The default it falls back to must be **exactly** the one in the generated `Props.h`. `PlainTextMeasurementsManager` only serializes props that differ from their default (an omitted key is the common case — it saves a `folly::dynamic` insert and a map slot per node per layout pass), so an absent key means "default", not "unset". A mismatch between the two sides silently measures at the wrong size.
- Nothing in `RNPlainText` may derive new state from its own current state. `updateTypeface()` resolves against a fixed `baseTypeface` for exactly this reason: `ReactTypefaceUtils.applyStyles` derives from the typeface passed in when `fontFamily` is null, so chaining off the live value would let one node's font survive into the next.
- Prop setters on `RNPlainText` are **deferred**: they record state and set a dirty flag, and `flushPendingUpdates()` does the work. Fabric applies props one at a time and several feed the same expensive operation (three font props → one typeface resolution; `text`/`lineHeight`/the scaling knobs → one `setText`), so applying eagerly ran `setText` two or three times per mounted view. Flushing happens in `RNPlainTextManager.onAfterUpdateTransaction` (which `ViewManager.updateProperties` calls once the whole transaction is applied), at the end of the view's `init`, and before the off-screen `measure`. A new read path must flush first, or it sees stale state.
- The measuring view is flagged `isMeasureOnly` (skips the `requestLayout` re-layout post, which would otherwise queue forever on a never-attached view) and is given non-null `LayoutParams` (`TextView.checkForRelayout()`, reached from `setText` once a text `Layout` exists, dereferences them — the crash RN works around in `ReactTextView.setText`).

**Measurement invalidation (both platforms).** Both `PlainTextShadowNode`s override `shouldNewRevisionDirtyMeasurement`. The base `YogaLayoutableShadowNode` implementation returns `true` unconditionally, and that is costly: when an ancestor re-renders, Fabric clones *every* child of the changed parent purely to re-own its Yoga node (`YogaLayoutableShadowNode::adoptYogaChild` — a Yoga node can only have one owner), so with the default every `PlainText` on screen re-measures on any ancestor state change. RN's `ParagraphShadowNode` overrides it to `fragment.props != nullptr`, which skips those re-own clones; ours goes further and compares the props measurement actually reads, so a revision that only changes e.g. `color` keeps the cached size too. **The prop list in `measurementInputsEqual` must stay in sync with `measureContent`** (and, on Android, with what `PlainTextMeasurementsManager` serializes) — a prop measurement reads but the comparison ignores would keep a stale size. Yoga *style* props are deliberately absent: `updateYogaProps` dirties the node on style changes independently.

Wiring gotchas (this is the fiddly part):
- **Registration is by include-shadowing, driven from `react-native.config.js`.** Autolinking generates `providerRegistry->add(concreteComponentDescriptorProvider<RNPlainTextComponentDescriptor>())` and `#include <react/renderer/components/RNPlainTextSpec/ComponentDescriptors.h>`. The root `react-native.config.js` sets the android `cmakeListsPath` to `src/main/jni/CMakeLists.txt` (replacing the default generated one). That CMakeLists compiles the generated codegen sources **plus** our custom sources into the `react_codegen_RNPlainTextSpec` target, and lists our jni dir on the include path **before** the generated dir — so `ComponentDescriptors.h` resolves to our measuring override. No app-side C++/OnLoad edits needed. `ComponentDescriptorProviderRegistry::add` is first-wins, but there's only one provider per handle here because the shadowed header is the only `RNPlainTextComponentDescriptor` the app ever sees.
- **Units:** the `width`/`height` passed to `ViewManager.measure` are already in **pixels** (`FabricUIManager.getYogaSize()` runs `dpToPx()` on the point-based C++ constraints), so build the Android `MeasureSpec` from them directly — do **not** `PixelUtil.toPixelFromDIP` again — and convert the measured result **back** to DIP with `toDIPFromPixel` for `YogaMeasureOutput`. Double-scaling the input width was what cropped width-constrained wrapping text to too few lines.
- The `requestLayout()` re-measure hack in `RNPlainText.kt` is still needed: intrinsic sizing gives Yoga the size, but the mounted `TextView` still has to build its draw `Layout`. It is **scoped to views that already have a frame** (`width`/`height` non-zero), though: on the initial mount Fabric itself calls `measure()` + `layout()` after applying props (`SurfaceMountingManager.updateLayout`), so posting there would only measure the view at 0×0 — once per prop setter, thousands of runnables per screen. What the hack actually covers is a prop change on a laid-out view whose size doesn't change, where Fabric emits no `updateLayout`.
- After editing/adding `android/src/main/jni/**` or the config, autolinking output can go stale — the generated `autolinking.json`/`autolinking.cpp` aren't reliably invalidated. Delete `example/android/build/generated/autolinking` (plus `example/android/app/.cxx`, `example/android/app/build`, `android/build`) and rebuild.

## Example app

`example/` targets Expo (see `example/AGENTS.md` — check the versioned Expo docs before touching Expo config). It consumes the library via the local source through `example/react-native.config.js`, which points the dependency at the repo root.

# Architecture

## The four-layer prop flow

Every native prop passes through four files. Adding or changing a prop means
editing all four — and, if it affects measured size, five more
([sync-points.md](sync-points.md)).

1. **Codegen spec** — `src/PlainTextViewNativeComponent.ts`. The `NativeProps`
   interface is the source of truth; codegen turns it into the C++/Kotlin
   interfaces the native code implements.
2. **JS wrapper** — `src/PlainText.native.tsx` (native) and `src/PlainText.tsx`
   (web fallback, renders RN `<Text>`). `src/index.tsx` re-exports from
   `./PlainText`.
3. **iOS** — `ios/RNPlainText.mm` (+ `.h`): an `RCTViewComponentView` subclass
   hosting a `UILabel`, applying props in `updateProps:` by diffing
   `oldViewProps`/`newViewProps`.
4. **Android** — `android/src/main/java/com/plaintext/`: `RNPlainText.kt` (the
   `TextView` subclass), `RNPlainTextManager.kt` (`@ReactProp` setters
   implementing the codegen `...ManagerInterface`), `RNPlainTextPackage.kt`
   (registration).

Intrinsic sizing adds a custom `ShadowNode` on each platform — see
[intrinsic-sizing.md](intrinsic-sizing.md).

**Naming split:** the public JS API is `PlainText`, but the native component,
codegen spec and pod are all `RNPlainText` (`package.json` → `codegenConfig`,
name `RNPlainTextSpec`; podspec `RNPlainText.podspec`).

## Prop conventions

- **Text-style props (e.g. `fontSize`) are not part of RN `ViewProps`**, so they
  don't reach the native view through `style`. The pattern (see
  `PlainText.native.tsx`): accept a `TextStyle` `style`, `StyleSheet.flatten`
  it, destructure the text-style keys out, pass them as explicit codegen props,
  and forward the remaining layout styles as `style`.
- Codegen types come from the **`CodegenTypes` namespace exported by
  `react-native`** (e.g. `CodegenTypes.WithDefault<CodegenTypes.Float, 14>`).
  Do **not** import `react-native/Libraries/Types/CodegenTypes` — this project
  uses the strict API (`customConditions` in `tsconfig.json`), which blocks
  `react-native/Libraries/*` subpaths.

## Example app

`example/` is an Expo dev-client app (see `example/AGENTS.md` — check the
versioned Expo docs before touching Expo config). It consumes the library from
source via `example/react-native.config.js`, which points the dependency at the
repo root.

Two screens:

- **Features** (`src/screens/FeaturesScreen.tsx`) — per-prop coverage. Every new
  feature must add a section here.
- **Performance** (`src/screens/PerformanceScreen.tsx`) — the benchmark harness.
  See [measuring.md](measuring.md).

## React Native sources

The full RN source tree is a shallow submodule at `references/react-native`.
Use it to check native implementation details, codegen internals, Fabric layout,
and RN's own `<Text>`/`UILabel`/`TextView` handling instead of guessing.
**Reference only — never edit it.** Populate with:

```sh
git submodule update --init --depth 1 references/react-native
```

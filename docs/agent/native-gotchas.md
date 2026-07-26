# Native gotchas

Learned the hard way. Most of these cost an afternoon the first time.

## Builds

- **Native changes require a full rebuild** (`yarn example ios|android`). Metro
  reload and Fast Refresh only pick up JS. A stale native build is the first
  thing to suspect when a native change "does nothing". (Don't run these
  yourself unless asked — see [workflow.md](workflow.md).)
- **Do not run `./gradlew clean`** in `example/android`. It re-runs CMake
  configure against the library's generated codegen dir before regenerating it,
  and fails. To force a clean native build, delete the caches by hand:
  `example/android/app/.cxx`, `example/android/app/build`, `android/build` —
  then run `yarn example android`, which regenerates codegen.
- **After editing `android/src/main/jni/**` or `react-native.config.js`**,
  autolinking output can go stale — the generated `autolinking.json` /
  `autolinking.cpp` aren't reliably invalidated. Also delete
  `example/android/build/generated/autolinking`.
- **New `ios/*.mm` files are only compiled after `pod install`** re-scans the
  podspec glob.

## Android

- **`TextView` needs a manual measure pass for prop changes that don't resize
  it.** Fabric's mount transaction calls `measure()` + `layout()` after applying
  props (`SurfaceMountingManager.updateLayout`), which covers mounting — but a
  prop change on an already-laid-out view whose size doesn't change emits no
  `updateLayout`, and nothing else rebuilds the `Layout` that `TextView` draws.
  `RNPlainText.kt` handles that in an overridden `requestLayout()`, scoped to
  views that already have a frame. Keep it, and keep the scoping: unscoped, it
  posted thousands of redundant runnables per screen.
- Text color is hardcoded black on both platforms (Android's theme default is
  gray) so the platforms match. Not theme-aware, not exposed as a prop.

## iOS

- **Accepted limitation: wrapped text can break one word earlier than RN
  `<Text>` at the same width.** `UILabel` needs slightly more horizontal space
  per character than RN's TextKit-based `<Text>`, so near a width limit a word
  can land on the next line where RN keeps it. This is inherent to `UILabel` vs
  TextKit, not a sizing bug — the box already gets the correct full width.
  Fixing it would mean rendering through TextKit, defeating the point of the
  library.
- **A bare hyphen (`-`) is a wrap point for `UILabel` but not for RN `<Text>`**,
  so `"text-size"` can split as `"text-"` / `"size"` on iOS. Use a non-breaking
  hyphen (U+2011, `‑`) where that split is unwanted — see the "Non-breaking
  hyphen" row in the Features screen's Font Scaling section.

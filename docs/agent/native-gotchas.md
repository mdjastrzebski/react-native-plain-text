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

## Cross-platform

- **Trailing whitespace widens the measured box on Android always, on iOS
  almost always.** iOS drops it in exactly one shape: when it sits at the very
  end of a string that contains at least one line break. Measured with
  `boundingRectWithSize:` at 18pt, three trailing spaces (13.68pt):

  |                                              |             |
  | -------------------------------------------- | ----------- |
  | `"one line   "`                              | counted     |
  | `"one line   \n"`                            | counted     |
  | `"longest   \nX"` (spaces on first line)     | counted     |
  | `"X\nlongest   "` (spaces on last line)      | **dropped** |
  | `"X\nlongest   \nY"` (spaces mid-string)     | counted     |
  | `"X\nlongest   \n"` (trailing newline after) | counted     |

  Note the first and fourth rows: both end in spaces, and they disagree. A
  single-line string never drops them.

  The cause is that the platforms measure different things. Android's width is
  `Layout.getDesiredWidth`, an advance sum per paragraph with no line breaking
  involved, so nothing can be trimmed. iOS's is the used rect of a real layout,
  where the final line fragment of a multi-fragment layout has its trailing
  whitespace trimmed — and a single-line string never enters that path.

  **On Android, RN `<Text>` does exactly the same thing** (both go through
  `Layout.getDesiredWidth`) — verified on device with the Features screen's
  _Wrap Detection_ rows and the Compare Text overlay.

  **On iOS, RN `<Text>` does NOT drop it.** The row above only holds for
  `-boundingRectWithSize:options:context:`, the API `measureContent` calls
  (`PlainTextShadowNode.mm:75`) because it matches what `UILabel`/CoreText
  will actually render. RN's `RCTTextLayoutManager` measures differently
  (`_measureTextStorage`, `RCTTextLayoutManager.mm:527-570`): it builds its own
  `NSLayoutManager`/`NSTextContainer` and reads `usedRectForTextContainer:`,
  which does **not** trim the trailing whitespace in this shape. Confirmed
  directly (AppKit, 18pt, `lineFragmentPadding = 0`, `usesFontLeading = NO`, no
  wrap) — `"Short\nthis line is longest   "`:

  |                                     |          |
  | ----------------------------------- | -------- |
  | `boundingRectWithSize:` (PlainText) | 142.93pt |
  | `usedRectForTextContainer:` (RN)    | 156.61pt |

  13.68pt apart — exactly the three trailing spaces. So on iOS this is a real,
  visible parity gap in the _Wrap Detection_ section (row 2: `PlainText`'s grey
  box is narrower than `<Text>`'s red overlay by the trailing-space width),
  not a harness bug and not something Android's numbers can be used to excuse.

  Deliberately not "fixed" by switching `measureContent` to the
  `NSLayoutManager` approach: that was tried and rejected on performance
  grounds, and for a different reason too — `PlainText` renders through
  `UILabel` (CoreText), so `boundingRectWithSize:` is the measurement that
  matches what actually gets drawn; matching `NSLayoutManager`/TextKit instead
  would fix this one shape while risking disagreement with the mounted label
  everywhere else. See
  [performance.md](performance.md#L459-468) for the rejected alternative.

## Android

- **`TextView` needs a manual measure pass for prop changes that don't resize
  it.** Fabric's mount transaction calls `measure()` + `layout()` after applying
  props (`SurfaceMountingManager.updateLayout`), which covers mounting — but a
  prop change on an already-laid-out view whose size doesn't change emits no
  `updateLayout`, and nothing else rebuilds the `Layout` that `TextView` draws.
  `PlainTextView.kt` handles that in an overridden `requestLayout()`, scoped to
  views that already have a frame and, in the posted runnable, to views Fabric
  did not re-lay-out after all (`isLayoutRequested`). Keep it, and keep both
  scopes: unscoped, it posted thousands of redundant runnables per screen, each
  rebuilding a `Layout` Fabric had just rebuilt.
- **A bare `TextView` inherits the theme's text color; RN `<Text>` does not.**
  With `color` unset, RN's Fabric text path adds no `ForegroundColorSpan`
  (`ReactBaseTextShadowNode`, gated on `isColorSet`) and never sets
  `paint.color` (`TextLayoutManager.updateTextPaint`), so the text draws with
  `TextPaint`'s default — black — regardless of theme. `PlainTextView.kt`
  therefore hardcodes `Color.BLACK` both at construction and as the reset value
  in `setColor(null)`. Don't "fix" this to `?android:attr/textColor`: it would
  make `PlainText` turn white in dark mode where a swapped-out `<Text>` stayed
  black. iOS matches for the same reason — RN's `RCTAttributedTextUtils.mm`
  falls back to `[UIColor blackColor]`, not `labelColor`.

- **RN `<Text>` under-supports `fontVariant` on Android, and `PlainText`
  deliberately does not match it.** Two independent gaps in RN core, both read
  from 0.83:
  1. `fontFeatureSettings` reaches the paint only through `CustomStyleSpan`, and
     both sites that attach that span (`TextLayoutManager`, in the two span
     builders) are gated on
     `fontStyle != UNSET || fontWeight != UNSET || fontFamily != null`. So
     `fontVariant` set on its own does nothing, while setting any other font prop
     next to it makes it work. There is no second path:
     `TextLayoutManager.updateTextPaint`, the other place a paint gets font
     attributes, never touches `fontFeatureSettings`. The span itself is fine —
     it takes the value and applies it in both `updateDrawState` and
     `updateMeasureState`; only the condition deciding whether it exists was
     never extended.
  2. `TextAttributeProps` maps the variant names twice.
     `setFontVariant(ReadableArray)` delegates to
     `ReactTypefaceUtils.parseFontVariant`, which covers the ligature and
     contextual values; `setFontVariant(MapBuffer)` — the Fabric path —
     reimplements the table inline and omits them, mapping only `small-caps`, the
     figure styles and `ss01`–`ss20`. Fabric Android `<Text>` therefore supports
     fewer values than iOS or RN's own legacy Android path.

  `PlainTextView.kt` sets `fontFeatureSettings` unconditionally and goes through
  `parseFontVariant`, so it has neither gap: `fontVariant` works on its own and
  the ligature values work. This is the one place `PlainText` is knowingly _more_
  capable than `<Text>` — the inverse of the usual parity risk, so expect rows in
  the Features screen's Font Variant section where the `PlainText` box changes and
  the `<Text>` overlay does not. Don't "fix" that by reproducing the gate.

## iOS

- **Accepted limitation: wrapped text can break one word earlier than RN
  `<Text>` at the same width.** `UILabel` needs slightly more horizontal space
  per character than RN's TextKit-based `<Text>`, so near a width limit a word
  can land on the next line where RN keeps it. This is inherent to `UILabel` vs
  TextKit, not a sizing bug — the box already gets the correct full width.
  Fixing it would mean rendering through TextKit, defeating the point of the
  library.
- **`UILabel` defaults to `NSLineBreakStrategyStandard`, which can push a word
  (or several) to the next line for last-line balance even when it would fit.**
  `RNPlainText.mm` sets `_label.lineBreakStrategy = NSLineBreakStrategyNone` at
  construction to disable it, matching `measureContent`'s
  `boundingRectWithSize:` — `NSParagraphStyle`'s own default is `.none`, so
  without this the mounted label and the measured size can wrap differently
  even though the box width is correct.
- **A bare hyphen (`-`) is a wrap point for `UILabel` but not for RN `<Text>`**,
  so `"text-size"` can split as `"text-"` / `"size"` on iOS. Use a non-breaking
  hyphen (U+2011, `‑`) where that split is unwanted — see the "Non-breaking
  hyphen" row in the Features screen's Font Scaling section.

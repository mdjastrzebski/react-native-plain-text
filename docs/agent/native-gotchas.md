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

- **Under the New Architecture, RN `<Text>` supports a narrower `fontVariant` set
  than its own types advertise — on both platforms.** The C++ `FontVariant` enum
  (`attributedstring/primitives.h`) has members only for `small-caps`, the four
  figure styles and `ss01`–`ss20`. The ligature and contextual values RN's types
  list (`common-ligatures`, `no-common-ligatures`, `discretionary-ligatures`,
  `historical-ligatures`, `contextual`, and their negations) have nowhere to live
  in that bitmask, so they are dropped at the props layer before either platform
  sees them. Both input forms lose them: the array form
  (`parseProcessedFontVariant`) is an if/else-if chain that simply doesn't match
  the names, and the CSS string form parses them and then discards them outright —
  `fontVariantFromCSSFontVariant` ends in a `return std::nullopt` covering exactly
  those eight cases. Both Fabric consumers mirror the same subset: `toMapBuffer`
  for Android, `RCTFontFeatures` (`RCTFontUtils.mm`) for iOS. The complete table
  including ligatures is in `RCTFont.mm`, which is the legacy non-Fabric path —
  easy to mistake for the live one, and the reason to check `RCTFontUtils.mm`
  instead when asking what Fabric iOS actually does.

  **`no-common-ligatures` is the only one of the eight you can observe**, so it is
  the row that carries this comparison. The rest are no-ops whichever font is in
  play, whether or not RN drops them: `liga`/`clig`/`calt` are already on by
  default, so `common-ligatures` and `contextual` ask for what is already there, and
  `dlig`/`hlig` are off by default and largely absent, so
  `discretionary-`/`historical-ligatures` change nothing either. Only turning a
  default-on feature off is visible. Don't read the other rows agreeing as coverage.

  **Whether even that row is observable depends on the font, and SF isn't good
  enough for it.** SF forms no `ff`/`ffi`/`ffl` ligatures and ships no oldstyle
  figures, so under SF `PlainText` applying the feature and RN dropping it produce
  the same glyphs. Observed: the Features screen's ligature rows rendered
  pixel-identical on both sides on iOS, which reads as parity when it is really a
  font with nothing to switch off. Don't cite an all-matching iOS run as parity
  without first checking the font carries the feature.

  The section's feature rows therefore run in `Baskerville` on iOS
  (`FONT_VARIANT_FEATURE_FAMILY`). **Verified on iOS with Baskerville:** small caps,
  `oldstyle-nums` and the figure spacings all render, `PlainText` applies
  `no-common-ligatures`, and the `<Text>` overlay ignores it. The bitmask gap is
  finally visible on iOS.

  Android needs no override, and `Roboto` is better equipped than SF here: it carries
  the `ff`/`ffi`/`ffl` ligatures **and** `onum`, so `oldstyle-nums` renders there too
  (observed). Naming a family on Android would be harmless rather than forbidden, so
  don't justify leaving it alone by the `CustomStyleSpan` gate below. That gate is
  already satisfied by the `fontStyle: 'normal'` those rows carry.

  `lining-nums` stays flat on both platforms. Only the row asking for the shape the
  face does not already use can move, and Baskerville and Roboto both default to
  lining.

  **The override is scoped to the feature rows. The figure-spacing rows are
  deliberately left on the system font.** SF gets `tnum`/`pnum` right. A serif need
  not: Hoefler Text was the first pick and had to be dropped for exactly that, since
  its `tabular-nums` row rendered proportional and its `proportional-nums` row
  tabular, which turns a working demo into a misleading one. Feature coverage is
  per-face, so if a row goes flat after a font change, try the next candidate
  (Palatino, Iowan Old Style, Charter, Didot) before suspecting the prop.

  `PlainText` doesn't go through that bitmask — `fontVariant` is its own codegen
  prop (`std::vector<std::string>`), mapped per platform in `PlainTextFont.mm` and
  through `ReactTypefaceUtils.parseFontVariant` — so the ligature values do work.
  Together with the Android gate below, that makes `fontVariant` the one prop where
  `PlainText` is knowingly _more_ capable than `<Text>`, the inverse of the usual
  parity risk. Expect Font Variant rows where the `PlainText` box changes and the
  `<Text>` overlay does not.

  Already fixed upstream, and worth knowing if the RN floor ever drops:
  `toMapBuffer` also omitted `ss01`–`ss20`, making the stylistic sets
  Android-only-broken (react/react-native#55183, landed as
  facebook/react-native@9353eb5). 0.83.10 includes it.

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

- **RN `<Text>` on Android ignores `fontVariant` unless another font prop is set
  alongside it, and `PlainText` deliberately does not match that.**
  `fontFeatureSettings` reaches the paint only through `CustomStyleSpan`, and both
  sites that attach that span (`TextLayoutManager`, in its two span builders) are
  gated on `fontStyle != UNSET || fontWeight != UNSET || fontFamily != null`. So a
  style of `fontVariant` alone renders unchanged, while adding any other font prop
  — even `fontStyle: 'normal'` — makes it work. There is no second path:
  `TextLayoutManager.updateTextPaint`, the other place a paint gets font
  attributes, never touches `fontFeatureSettings`. The span itself is fine, taking
  the value and applying it in both `updateDrawState` and `updateMeasureState`;
  only the condition deciding whether it exists was never extended. Still present
  in 0.83.

  `PlainTextView.kt` sets `fontFeatureSettings` unconditionally, so `fontVariant`
  works on its own. That is deliberate — don't "fix" it by reproducing the gate.
  The Features screen's Font Variant rows carry a `fontStyle: 'normal'` purely to
  trip the gate, so that the `<Text>` overlay is comparable at all.

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

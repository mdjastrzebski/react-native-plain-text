# `adjustsFontSizeToFit` / `minimumFontScale`

Why the README calls this the most expensive planned item, what RN actually does,
and the two ways it could be built here. Written before any implementation
attempt. Nothing described below is built.

Line numbers cite the installed **RN 0.83.10** (`node_modules/react-native`).
`references/react-native` is `main` and has moved. Where the two differ in
substance it is called out.

## The reason it is not a prop

Every other prop is a pure function of props, applied twice independently: once
in `measureContent` (or the Kotlin `measure()`) to produce a size, once on the
mounted view to produce pixels. Nothing is passed between them. That is the
basis of [intrinsic-sizing.md](intrinsic-sizing.md), and of the numbers in
[performance.md](performance.md).

`adjustsFontSizeToFit` inverts the dependency:

- the box comes from the text: that is what measurement is for.
- the text size comes from the box: that is what this prop means.

The measurer only ever sees `LayoutConstraints`, never the final frame. Yoga
decides the frame after measuring, and it can differ: `flexShrink`, `stretch`, a
percentage size, a later re-layout. With an explicit `width` **and** `height`
Yoga skips the measure fn altogether, so the shadow node never runs at all and
only the view can shrink.

Every existing prop degrades gracefully when frame ≠ measured size: text
truncates, or leaves whitespace. This one does not degrade: a 2pt frame
difference flips a line break, which flips the chosen size by a whole step, which
changes the height by a full line. The failure is visible, non-monotone, and
reproduces only in particular layouts.

## What RN does: runs it twice and lets the view win

Two findings that change how to think about the problem.

**Neither platform uses the native widget's autoshrink.** `UILabel`'s
`adjustsFontSizeToFitWidth` / `minimumScaleFactor` is never touched. RN bisects a
scale ratio over an `NSTextStorage` in
`Libraries/Text/Text/NSTextStorage+FontScaling.m:18-62`, with
`NSLayoutManager`'s `truncatedGlyphRangeInLineFragmentForGlyphAtIndex:` as the
fit predicate. Android bisects integer pt in
`TextLayoutManager.adjustSpannableFontToFit` (`TextLayoutManager.kt:889`),
mutating `ReactAbsoluteSizeSpan`s and `paint.textSize` in place.

So "no native Android equivalent" is not the blocker. iOS has no usable
one either. Android in fact _has_ one (`TextView`'s
`setAutoSizeTextTypeUniformWithConfiguration`, API 26+) and it is the wrong tool
for the same reason UIKit's is: both work off the view's assigned bounds, which
is the one input measurement does not have, and neither reports the size it
picked, so the shadow node cannot predict it. See
[Why Android's native autosize is unusable](#why-androids-native-autosize-is-unusable).

**The shrink runs at two sites against different boxes, and the draw-time run
wins.**

| Platform | Measure pass                                                      | Draw pass                                                                     |
| -------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| iOS      | `RCTTextLayoutManager.mm:50-51`: size = `{maxWidth, CGFLOAT_MAX}` | `:69-75` (`drawAttributedString`): size = `frame.size`                        |
| Android  | `TextLayoutManager.kt:804-807`, width forced to `EXACTLY`         | `ReactTextView.java:339-348`: in `onDraw`, against `getWidth()`/`getHeight()` |

Note the **unbounded height** in the iOS measure pass. With no height limit the
fit predicate can only fail via `truncatedGlyphRange`, which only fires when
`maximumNumberOfLines > 0`. Android says the same thing explicitly: its
`exceedsHeight` term is guarded on `heightYogaMeasureMode != UNDEFINED`
(`TextLayoutManager.kt:938`). So on both platforms, **during measurement,
autoshrink does nothing unless `numberOfLines` is set.** Everything else is
decided at draw time against a frame the measurer never saw.

RN tolerates the resulting mismatch because the shrunk artifact rides on state
(`ParagraphState`, and on Android now `PreparedLayout`), so the two runs at least
start from the same text. In 0.83.10 the draw-time re-shrink is armed only by
prop setters (`ReactTextView.java:609,627,633,639,645,710`). `main` added an
`onSizeChanged` override that also arms it on a pure frame change.

## Why we cannot copy that answer

1. **There is no state channel.** The only code shared between the two sides is
   `cpp/PlainTextMeasurementHelpers.{h,cpp}`, and it carries a `bool`, not an
   artifact. Adding real state means a codegen state type, descriptor wiring,
   `updateState:oldState:` on the view, and a state commit per node originating
   in the layout pass, an extra commit round-trip, which is part of what the
   `PlainText`-vs-`Text` margin comes from not paying.

2. **Without it the search must run at three sites and agree exactly**:
   `ios/PlainTextShadowNode.mm`, `PlainTextViewManager.measure()`'s scratch view,
   and the mounted `PlainTextView`. Every sync point in
   [sync-points.md](sync-points.md) today compares _inputs_. This one has to
   agree on the _output of an iterative search_, including iteration order,
   tie-breaking and rounding: Android truncates to int px (`.toInt()`), iOS
   bisects a continuous ratio to a 0.005 threshold. Same silent failure mode as
   the existing ones, with a discontinuous output.

3. **iOS has no fit predicate in the engine we use.** `measureContent` uses
   `-boundingRectWithSize:` (NSStringDrawing), which returns a rect: no line
   count, no truncation signal. The `numberOfLines` handling fakes it with
   `min(h, N * perLineHeight)`, which is sound as a _clamp_ and useless as a
   _predicate_: deriving `lineCount = h / perLineHeight` breaks under font
   fallback (a taller fallback line), under a pinned `lineHeight`, and under
   `usesFontLeading` differences. Doing it correctly means
   `NSTextStorage` + `NSLayoutManager` + `NSTextContainer` per attempt, i.e. a
   **second measurement engine that must also agree with the first on the
   non-shrunk case**, or the same text measures differently depending on whether
   the prop is on. That is a larger change than the prop.

4. **It collides with machinery already here.**
   - A pinned `lineHeight` sets min/max paragraph line height, which does not
     scale with the shrunk font: shrink the text and the height does not move.
     The two props contradict each other.
   - `RNPlainTextLabel`'s `textRectForBounds:` override (vertical centering) is
     exactly what UIKit's own autoshrink interacts badly with, closing off the
     "just let `UILabel` do it" shortcut a second time.
   - On Android the loop derives `textSize` from the current `textSize`: RN's is
     literally `ratio = current / previous` mutating `paint.textSize`, which is
     the pattern the shared-scratch-view rule in
     [sync-points.md](sync-points.md#the-reused-measuring-view) exists to forbid.
     The result must also not leak into the state `markScaledSizesDirty()`
     re-derives from, or a Dynamic Type change compounds shrink on shrink.

5. **Invalidation gains an axis it cannot see.**
   `shouldRevisionDirtyMeasurement` is sound because measurement is pure in
   (props, constraints). Yoga caches on constraints itself. With autoshrink the
   _mounted_ font size also depends on the final frame, and a frame change with
   unchanged props produces no new revision and no re-measure, yet the view must
   re-shrink. `adjustsFontSizeToFit` and `minimumFontScale` also have to enter
   `measurementInputsEqual`, where `minimumFontScale`'s unset value is NaN, so
   it needs `floatEquality`-style handling, since `NaN != NaN` would report every
   revision as changed.

6. **Cost.** Measurement goes from 1–2 layouts to 1 + k: k ≈ 6–8 on Android
   (bisect `[4, fontSize]` in pt), k ≈ 8–11 on iOS (0.005 ratio threshold,
   rebuilding the attributed string each iteration via `replaceCharactersInRange:`).
   Each iOS iteration is a text-storage/layout-manager construction, not a
   `boundingRect`. Each Android iteration is a `StaticLayout` inside the
   already-JNI-hopping measure. Plus the draw-time re-run on the main thread.
   Because `<Text>` pays the loop once and ships the result via state while
   `PlainText` would pay it in measure _and_ at draw, autoshrink nodes could
   plausibly land behind `<Text>`.

### Why Android's native autosize is unusable

`TextView.setAutoSizeTextTypeUniformWithConfiguration` exists from API 26, so the
README's "no native Android equivalent" is directionally right but not the actual
reason:

- stepped in px (min/max/granularity), so it cannot express `minimumFontScale`.
- mutually exclusive with `setTextSize`, which `PlainTextView` needs for
  `allowFontScaling` / `maxFontSizeMultiplier` and `toEffectivePixel`.
- documented as incompatible with `WRAP_CONTENT`, which is exactly what the
  off-screen scratch measuring view is.
- driven by the view's own bounds during `onMeasure`, which the scratch view does
  not have.
- the chosen size is not queryable in a form the shadow node could pre-compute.

## `minimumFontScale` is dead under Fabric

Verified in 0.83.10. The prop is a _scale_ (0.01–1.0). The shrink loop needs a
_point size_. Something has to multiply, and under the New Architecture nothing
does.

| Step               | Site                                                                                                         | What happens                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| JS sends           | `Libraries/Text/TextNativeComponent.js:44`                                                                   | `minimumFontScale` only, never `minimumFontSize`   |
| C++ parses         | `conversions.h:924` (scale), `:930` (size)                                                                   | `minimumFontSize` has no source prop → `quiet_NaN` |
| iOS loop reads     | `RCTTextLayoutManager.mm:246`                                                                                | `!isnan(minimumFontSize) ? … : 4.0` → always `4.0` |
| Android loop reads | `TextLayoutManager.kt` (`minimumFontSizeAttr.isNaN()` → `4.dpToPx()`), fed via `ReactTextViewManager.kt:150` | always `4.dpToPx()`                                |

`minimumFontScale` itself is referenced in exactly two places in the tree: an
`operator==` (`ParagraphAttributes.cpp:36`) and `getDiffProps`, a debug/interop
props map (`HostPlatformParagraphProps.cpp:132`). Neither feeds the text
pipeline. The value travels from JS into native, is compared for equality, and is
dropped. The floor is a hardcoded 4pt on both platforms whatever you pass. The
`isnan` fallbacks are why this fails silently rather than crashing.

The multiplication does exist in RN, only in the **legacy** paths:

- iOS `Libraries/Text/Text/RCTTextShadowView.mm:236`:
  `MAX(_minimumFontScale * effectiveFont.pointSize, 4.0)`
- Android `ReactBaseTextShadowNode.kt:485`: the old shadow-node `@ReactProp`

Two consequences:

- **"API parity with RN `<Text>`" is not a meaningful target for this prop.** A
  correct implementation here honors `minimumFontScale` and RN's `<Text>` does
  not. That is a deliberate divergence from the parity rule in
  [workflow.md](workflow.md), and it should be stated in the README rather than
  implied away.
- **The formula to copy is the legacy one**, `max(minimumFontScale × fontSize, 4pt)`.
  It is a two-line detail: the cost of this prop is `adjustsFontSizeToFit`
  needing the final frame, not `minimumFontScale`.

Worth an upstream issue. The fix is roughly one line per platform.

## Two ways to build it

**Constrained-only: small and self-contained.** Support it only when the caller
gives the label a definite size. With both axes definite Yoga never calls the
measure fn, so the shadow node does not participate, no new sync point appears,
no measurement regression, and there is no box-vs-text disagreement to have
because the box is caller-specified. iOS hands it to
`adjustsFontSizeToFitWidth` + `minimumScaleFactor`. Android gets a small Kotlin
loop armed from `onSizeChanged` and run before draw. Documented as "requires a
definite size". The price: the platforms will not pick identical sizes, and
UIKit's multiline height-fitting is weak: verify on device before committing to
it, and re-check the interaction with `textRectForBounds:`.

**Full parity: a large project.** A state channel from measure to mount, one
shrink search shared in `cpp/`, and two platform fit-predicates (which on iOS
means introducing `NSLayoutManager` measurement, per point 3). Everything in
[Why we cannot copy that answer](#why-we-cannot-copy-that-answer) has to be paid.

Nothing has been prototyped, and no numbers here are measured: the cost figures
are iteration counts read off RN's loops, not timings. If this gets picked up,
[measuring.md](measuring.md) applies before any claim about it goes in the README.

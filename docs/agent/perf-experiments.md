# Perf-suite A/B experiments

How to A/B test a native code path on the same release build, using the
library's `experiment` prop. Read this before wiring up a new one, whether the
user says "A/B test", "experiment", or just asks to compare two implementations
of the same behavior.

## What `experiment` is

One internal boolean prop, declared in `src/PlainTextViewNativeComponent.ts`:

```ts
experiment?: CodegenTypes.WithDefault<boolean, false>;
```

It is **not** part of `PlainText`'s public props: `PlainText.native.tsx` never
destructures it, so it only reaches a node through the bare codegen component
(`PlainTextViewNativeComponent`/`NativePlainText`) or through a prop spread
that bypasses the wrapper's type, which is exactly how the perf suite sets it
(see below). It is deliberately generic: `true` means "whatever is currently
being tried" and `false` means the old baseline kept only for comparison.
What `true` actually _does_ is entirely up to the experiment wired up at the
time: the prop itself carries no fixed meaning, only a comment in the codegen
spec describing the current one.

The default flips per experiment too: the running experiment defaults to
`true` so it's live without every call site opting in, and flips back to
`false` (see "Wiring up a new experiment" below) once the next one starts.
Whichever way it's set, keep the **three-way default contract** in sync: the
codegen spec's `WithDefault`, `PlainTextViewManager`'s `@ReactProp
defaultBoolean`, and the fallback `measure()`/`serializeProps` use when the
key is absent.

**One experiment at a time.** This is a single flag, not a registry: that was
a deliberate simplification (a generic multi-flag mechanism was built and then
stripped back down to this). Don't repurpose it to carry two unrelated
experiments simultaneously. Finish and unwire one before starting the next.

## Current state

**Unread.** `experiment` isn't driving anything right now, ready for the
next test. The previous experiment — matching RN's `CustomStyleSpan` by
setting `paint.isSubpixelText`/`isLinearText` in
`PlainTextView.applyTypeface()` — won and was concluded: the fix is
unconditional (no longer gated on `experiment`), and the "Exp" header toggle,
`unstable_experiment` on `PlainText`, and the `[SpecimenDiff]` onLayout logger
that A/B'd it (`example/src/components/CompareText.tsx`,
`example/src/components/Specimen.tsx`) are all removed. Root cause and how it
was found, below, kept as a history trail per "Concluding an experiment."

While it was live, this surfaced two other, permanent bugs, both now fixed
and documented where the next reader would actually look for them rather
than here: [native-gotchas.md](native-gotchas.md#android) (mutating a paint
flag alone doesn't invalidate/redraw the view) and
[sync-points.md](sync-points.md#a-prop-that-affects-measured-size)
(`experiment` was missing from `measurementInputsEqual`, so toggling it
alone never re-triggered a remeasure). Both are worth knowing before wiring
the next experiment onto either the mounted view's paint or measurement.

RN attaches a `CustomStyleSpan` (a `MetricAffectingSpan`,
`.../views/text/internal/span/CustomStyleSpan.kt`) whenever
`fontStyle != UNSET || fontWeight != UNSET || fontFamily != null`
(`TextLayoutManager.kt:477-494`, both the single-fragment and multi-fragment
branches) — i.e. whenever any of the three is set at all, regardless of what
it resolves to (an explicit `fontStyle="normal"` still attaches it). That
span's `apply()` does more than resolve the typeface:

```kotlin
paint.apply {
  fontFeatureSettings = fontFeatureSettingsParam
  setTypeface(typeface)
  isSubpixelText = true
  isLinearText = true
}
```

`isLinearText` (`LINEAR_TEXT_FLAG`) disables font hinting, measuring against
un-hinted/linear glyph outlines instead; `isSubpixelText`
(`SUBPIXEL_TEXT_FLAG`) changes subpixel positioning. Both shift measured
glyph advance widths by a sub-pixel amount per glyph relative to the default
hinted measurement — invisible on default-styled text (RN never attaches the
span there, so never sets these either — matching the "both `false`" finding
in item 1 below, which was correct but incomplete: it only checked the
_default_-styled case) and visible only once `fontFamily`/`fontWeight`/
`fontStyle` is customized, which is exactly the pattern the drift showed:
`delta: 0` on every plain row, ~0.3-2dp (occasionally ~5dp on font-feature
combinations like small-caps+ligatures) on every customized one.

Fixed in `PlainTextView.applyTypeface()`: computes the identical condition
(`fontStyle != ReactConstants.UNSET || fontWeight != ReactConstants.UNSET ||
fontFamily != null`, using the same `ReactConstants.UNSET`-sentineled fields
RN's own check uses) and sets both flags on `paint` to match, unconditionally.
Confirmed via the same real-device `onLayout`-based `[SpecimenDiff]` logging
this whole investigation used (since removed, see "Current state" above):
with the fix applied, every previously-drifting row read `delta: 0`; reverted,
the original drift reproduced exactly as before.

Investigated (real-device, avg of 5 runs) whether the fix has a measurable
perf cost: mounting 1000 OpenSans-styled nodes moved the `interaction` metric
(measuring.md) from 610ms to 625ms, ~2.5%. Checked whether prior art existed
for tweaking these flags on Android: yes, `SUBPIXEL_TEXT_FLAG` alone is a
known (if thinly-justified) idiom for custom `TypefaceSpan`s going back to at
least 2014, and `LINEAR_TEXT_FLAG`+`SUBPIXEL_TEXT_FLAG` together is
documented by Android's own SDK for smooth-scaling jitter — but nobody else
was found combining both flags specifically for custom-typeface correctness,
so RN's (and now this library's) combination has no independent precedent
beyond RN's own source. Decided the correctness win (matching RN's `<Text>`
exactly, both in measured width and drawn glyph position) was worth the cost
without further optimization for now; revisit if a future perf pass wants to
chase it (candidate angles: confirm which of the two flags actually causes
the cost by isolating them, or cache/skip the redundant work on the
off-screen measuring view specifically).

**Dead end, corrected: a "build a real `StaticLayout` when non-boring"
experiment, based on a wrong theory.** Before finding the actual cause
above, the hypothesis was that RN's `CustomStyleSpan` disqualifies
`BoringLayout.isBoring()` (being a `MetricAffectingSpan`), forcing RN onto
`createLayout`'s `static` branch (a real `StaticLayout`, whose
`getLineWidth(0)` can differ from `Layout.getDesiredWidth()` for the same
text/paint — confirmed as a real, separate phenomenon from patched
`TextLayoutManager.kt` logs, e.g. a `lineHeight`-bearing row showing
`desiredWidth=114` vs `resultWidth=118.19531`) while `PlainTextView` stayed
boring (no such span, typeface set directly on the paint). `experiment: true`
was wired to add a `PlainTextViewManager.refineWidthWithStaticLayout()` that
built a real `StaticLayout` and read `getLineWidth(0)`, gated by an "Exp"
toggle in `example/src/components/CompareText.tsx`. It changed nothing,
confirmed with `experiment: true` visible in the `[SpecimenDiff]` log itself.
Re-reading the same patched-RN logs this theory was based on showed why: the
drifting `fontFamily`/`fontWeight` rows are themselves logged as
`RNText createLayout(boring)` on RN's side, not `static` — a plain
`CustomStyleSpan`, without an accompanying `lineHeight` span, does **not**
disqualify `isBoring()` after all. Both RN and `PlainTextView` take the exact
same boring branch for these rows; the divergence was never about which
branch either side takes. This is now understood as a leftover, unrelated,
correctly-negative result — same shape as the `isBoring()`-first experiment
two entries below, not a second instance of it.

For non-`EXACTLY` width, `PlainTextViewManager.measure()` used to trust a real
`AppCompatTextView`'s `measuredWidth` from `view.measure(...)`, resolved
through `TextView.onMeasure`'s private `getDesiredWidth()`. That was replaced
(unconditionally, not behind this flag) with RN's own
`TextLayoutManager.createLayout` fallback branch: build a bare `Paint` and
call the public static `Layout.getDesiredWidth(text, paint)` directly. An
on-device check (release build, perf-suite screen, `PTDebug` logs) confirmed
this fires only for non-`EXACTLY` width as intended, the `AT_MOST` clamp holds
even when the raw desired width wildly overshoots, and it matches the old
value almost everywhere — with small (1-6dp) drift on some `serif`/`cursive`
samples and on italic/bold-italic text, not specifically monospace or
condensed faces as first suspected. That drift is expected: it's
`oldMeasuredWidth` (the real `TextView.onMeasure()` value) vs
`newMeasuredWidth` (the `getDesiredWidth`-based fix), and closing exactly that
gap was the point of the fix.

**Tried and dropped: gating `getDesiredWidth` behind `BoringLayout.isBoring()`
first.** `createLayout` actually reaches `getDesiredWidth` only as a
fallback — its primary branch, for simple/single-direction/non-wrapping text,
uses `BoringLayout.isBoring(text, paint).width` instead, measured from
per-glyph advances rather than a throwaway `StaticLayout`. The hypothesis was
that the two disagree once font fallback is involved, which seemed to fit the
serif/cursive/italic drift above. `experiment: true` was wired to try
`isBoring()` first (same guard as `createLayout`:
`widthMode == UNDEFINED || boring.width <= floor(width)`), falling back to
`getDesiredWidth` otherwise, with a `usedBoring` field added to the `PTDebug`
log to tell which branch ran. A second on-device pass disproved the
hypothesis: every sample where `isBoring()` qualified produced the exact same
`rawDesiredWidth` as the plain-`getDesiredWidth` run had for that same text,
and toggling the perf screen's `Boring: On`/`Off` header buttons (added for
this test, in `example/src/components/CompareText.tsx`, and since removed)
showed no visible difference on either the Features or Use Cases screen.
`BoringLayout.isBoring()` and `getDesiredWidth` simply agree in this app's
content, so trying `isBoring()` first changed zero measured widths and cost
an extra call per non-`EXACTLY` measure for no benefit. Reverted: `measure()`
is back to the unconditional `getDesiredWidth` call, the `isBoring()` helper
and the two toggle buttons are removed, and `experiment` is unread again.

**The serif/cursive/italic/weight drift itself, chased down as far as this
library's own code goes, without finding a cause here.** Real-device
comparisons of `PlainText`'s actual `onLayout` width against the RN `<Text>`
overlay's (via a temporary per-row logger in
`example/src/components/Specimen.tsx`, `[SpecimenDiff]` in Metro's console)
confirmed the drift is real, small (mostly 1-2dp, a few samples higher), and
**bidirectional**: `PlainText` lands wider than RN on some samples, narrower
on others, which rules out a single one-directional cause (a fixed padding
offset, a min-width floor, a consistently-missing adjustment) and points at
two measurement paths independently landing on slightly different sub-pixel
totals. Two categories in that data are **not** this drift and should be
ignored when looking at it:

- `textTransform` rows: RN's `<Text>` doesn't apply the transform to its own
  layout box at all here (matches the row's own footer note about a known
  capitalize bug) — its width is identical to the untransformed row every
  time, a documented RN gap, not measurement noise.
- `fontVariationSettings` rows: RN `<Text>` has no support for the prop at
  all (also documented on that row) — its width is pinned to the same value
  across every axis variant regardless of what's requested.

Chasing the real remainder, each hypothesis below was checked with actual
on-device data (via temporary `PTDebug` logs in
`PlainTextViewManager.measure()`, since removed) rather than reasoned from
source. Three came back negative; item 1 turned out to be the answer, just
checked against the wrong sample at the time (see the fix above):

1. **Paint flags** (`subpixelText`, `linearText`, `antiAlias`): logged
   `view.paint.flags` — decodes to `ANTI_ALIAS_FLAG | FILTER_BITMAP_FLAG |
DEV_KERN_TEXT_FLAG | EMBEDDED_BITMAP_TEXT_FLAG` (`raw=1283`).
   `subpixelText`/`linearText` are both `false`, matching RN's own minimal
   `TextPaint(TextPaint.ANTI_ALIAS_FLAG)` (`TextLayoutManager.kt:106,940`) on
   that axis. The three flags PlainTextView's paint carries beyond RN's are
   all draw-time (bitmap filtering, embedded-bitmap glyph strikes, an
   Android legacy no-op) and don't affect glyph advances.
   **This conclusion was correct but incomplete**, and turned out to be the
   actual cause once the gap was closed: it only checked `subpixelText`/
   `linearText` on _default_-styled rows, where both really do stay `false`
   on both sides. The samples that were actually drifting (`serif`,
   `cursive`, custom weights) all have `fontFamily`/`fontWeight`/`fontStyle`
   set, which is exactly when RN's `CustomStyleSpan` turns both flags `true`
   — never checked against a drifting sample at the time. See the fix
   above.
2. **`fontWeightAdjustment`** (Android's "Bold text" accessibility setting,
   which RN applies to every resolved typeface via
   `ReactTypefaceUtils.applyFontWeightAdjustment`, `PlainTextView` never
   does): `adb shell settings get secure font_weight_adjustment` returned
   `null` on the test device, i.e. `Configuration.FONT_WEIGHT_ADJUSTMENT_UNDEFINED`,
   which that function explicitly treats as a no-op. Inert on this device
   either way, so it can't explain what's observed here (still a real,
   separate correctness gap worth closing for devices where it isn't unset).
3. **Typeface identity**: logged, per node, a freshly-computed
   `ReactTypefaceUtils.applyStyles(null, style, weight, family, assets)` —
   the exact call RN's `TextLayoutManager.updateTextPaint` makes
   (`TextLayoutManager.kt:889`) — next to what `view.paint.typeface` actually
   ended up with. `sameInstance=true` on every single drifting sample
   (`serif`, `cursive`, `monospace`, `sans-serif-condensed`, every numeric
   weight, every `Inter_*` cut, italic/bold-italic). `PlainTextView` resolves
   the identical `Typeface` object RN would for the same request. (The
   `fontVariationSettings`/`OpenSans` rows show `sameInstance=false`, but
   that's expected — a fresh call without the axis derivation always makes a
   new instance — and is the already-excluded category above, not this
   drift.)
4. **Other paint properties beyond the typeface** (`letterSpacing`,
   `fontFeatureSettings`, `textScaleX`) and **whether `Layout.getDesiredWidth`
   itself returns something different given `view.paint`'s other quirks**:
   built a from-scratch `TextPaint(TextPaint.ANTI_ALIAS_FLAG)` per node,
   copied over the (now-proven-identical) typeface, text size, letter
   spacing, and font feature settings, and called
   `Layout.getDesiredWidth(text, freshPaint)` right next to
   `Layout.getDesiredWidth(text, view.paint)`. **Identical on every single
   sample**, including every drifting one (`serif`: 148.0/148.0, `monospace`:
   369.0/369.0, `sans-serif-condensed-light`: 712.0/712.0, every weight
   variant). Also confirmed the `Spannable` carries no metric-affecting spans
   beyond an unrelated `CustomLineHeightSpan`.

That closes off everything reachable from this side except the one thing
that turned out to matter: typeface, weight, style, letter spacing, font
features, and the `getDesiredWidth` call itself were all proven identical,
but item 1's paint-flags check compared `PlainTextView`'s paint against RN's
_unspanned_ minimal `TextPaint`, not against what RN's own `CustomStyleSpan`
mutates that same paint into once fontFamily/fontWeight/fontStyle is set —
`isSubpixelText`/`isLinearText` both flip to `true` there, and nothing here
had checked that state. Getting an actual RN-internal cross-check required
patching `node_modules/react-native`'s real `TextLayoutManager.kt` with its
own `PTDebug`-style logging and rebuilding the example app against that
patched source (via a temporary composite-build `includeBuild`/
`dependencySubstitution` in `example/android/settings.gradle`, since the
prebuilt `com.facebook.react:react-android` Maven artifact can't be patched)
rather than reasoning from the vendored source alone — that's what surfaced
`RNText createLayout(boring)`/`(static)` logs to compare against, and
eventually pointed at `CustomStyleSpan.kt` directly. See the fix above for
the fix; both the settings.gradle composite-build block and the patched
`TextLayoutManager.kt` copies (root and `example/node_modules`) are
reverted/removed as unpublished local edits to a dependency once this was
found.

Before this, the prop was used to A/B Android's off-screen measuring view:
`PlainTextViewManager.measureView()` reusing one `ThreadLocal` view (baseline)
vs. constructing a fresh one per node (experiment). Baseline won, and
`measureView()` is unconditional again. See
[sync-points.md](sync-points.md#the-reused-measuring-view) for that
experiment's history.

## Wiring up a new experiment

1. **Update the comment** in `src/PlainTextViewNativeComponent.ts` above
   `experiment` to say what `true` means _now_: the next reader has no other
   way to know, since the type itself never changes.
2. **Decide which platform(s) it applies to.** Asymmetric is fine and already
   the norm (the measuring-view experiment was Android-only). Only wire the
   platform(s) the experiment actually concerns.
3. **Read the value where the behavior lives:**
   - **Affects measurement** (what `measureContent`/`measure()` computes, or
     which code path computes it): Android already serializes `experiment`
     into the `props` `ReadableMap` passed to `PlainTextViewManager.measure()`
     (`PlainTextMeasurementsManager.cpp`: `if (props.experiment) { ... }`), so
     read it there with the same `props?.hasKey(...)` pattern every other
     measured prop uses. On iOS, read `props.experiment` directly in
     `PlainTextShadowNode::measureContent`.
   - **Affects the mounted view** (rendering, not sizing): implement real
     logic in `PlainTextViewManager.setExperiment` (Android, currently a
     no-op) and read `newViewProps.experiment` in `RNPlainText.mm`'s
     `updateProps:` (iOS).
   - An experiment can need both: measurement and the mounted view must still
     agree per the _three-way default contract_
     ([sync-points.md](sync-points.md#the-three-way-default-contract)) if it
     affects measured size.
4. **Drive it from the perf suite.** `example/src/screens/PerformanceScreen.tsx`
   already has a `Params` row for it (`ATTRIBUTES`, `key: 'experiment'`,
   options `(none)` / `baseline` / `experiment`) with `target: 'prop'`, which
   flows through `buildApplied`'s generic prop bucket and spreads via
   `{...extra}` onto both the `PlainText` and `NativePlainText` render
   branches. **No perf-suite changes are needed** to reuse it: update that
   row's comment (same reasoning as step 1) if what `true` means changed.
5. **Run the comparison** using [measuring.md](measuring.md)'s procedure:
   release build, kill the app between runs, one variant per run, same config
   otherwise.

## Concluding an experiment

Don't leave the winner behind a runtime flag: that's a permanent branch and a
permanent cost-policy violation waiting to happen (see
[performance.md](performance.md#prop-cost-policy)).

1. **Make the winning behavior unconditional.** Delete the branch, not just
   the default, mirror how `measureView()` was restored to always share the
   view once fresh-per-node lost.
2. **Revert anything wired only for the losing path** (a no-op setter is fine
   to leave, per step 3 above, but dead branches and helper functions are
   not).
3. **Leave `experiment` declared but unread again**, ready for the next test.
   Don't remove the prop itself. Rebuilding this plumbing per experiment is
   the thing this mechanism exists to avoid.
4. **Update this doc's "Current state" section and
   [sync-points.md](sync-points.md#the-reused-measuring-view)** with what was
   tried and what was decided, the way the measuring-view entry does: a
   history trail here is what tells the next agent an idea's already been
   tested, and what it cost to find out.

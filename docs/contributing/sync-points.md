# Sync points

This is the source of truth for every `// SYNC:` marker in the codebase. **Find the live set of markers with:**

```sh
grep -rn "SYNC:" src cpp ios android
```

A sync point is a **set of files that must change together**, where **nothing verifies it**: no type error, no failing
test, and usually nothing visibly wrong on first render. They share one failure mode: **correct on first render, wrong
after an update, silent in between.** Code review does not reliably catch these, because each site is individually
correct — the bug is only in the relationship between sites.

Each set below lists the props it applies to, every file involved, what has to agree between them, and what breaks
silently if you edit one and miss the rest. When you add or change a prop, check every set whose prop list could apply —
most props only touch a few.

---

## Set 1 — Any prop: the four-layer flow

**Props:** every prop declared in `NativeProps`:

- `text`
- `color`
- `fontSize`
- `fontFamily`
- `fontWeight`
- `fontStyle`
- `fontVariant`
- `fontVariationSettings`
- `lineHeight`
- `letterSpacing`
- `textAlign`
- `textAlignVertical`
- `verticalAlign`
- `writingDirection` (iOS-only — no Android setter body, no Android entry in
  [Set 2](#set-2--a-prop-that-affects-measured-size)'s measurement plumbing)
- `textDecorationLine`
- `textShadowColor`
- `textShadowOffsetWidth`
- `textShadowOffsetHeight`
- `textShadowRadius`
- `textTransform`
- `hyphens`
- `lang`
- `numberOfLines`
- `ellipsizeMode`
- `lineBreakStrategyIOS` (iOS-only — no Android setter body, no Android entry in
  [Set 2](#set-2--a-prop-that-affects-measured-size)'s measurement plumbing)
- `allowFontScaling`
- `maxFontSizeMultiplier`
- `lineHeightClippingCompat` (`unstable_lineHeightClippingCompat` at the JS boundary — see
  [Set 13](#set-13--lineheightclippingcompat-one-prop-renamed-at-the-js-boundary))
- `includeFontPadding` (Android-only — no `ios/PlainTextProps.mm` entry, no iOS entry in
  [Set 2](#set-2--a-prop-that-affects-measured-size)'s measurement plumbing)
- `textBreakStrategy` (Android-only — no `ios/PlainTextProps.mm` entry, no iOS entry in
  [Set 2](#set-2--a-prop-that-affects-measured-size)'s measurement plumbing)
- `android_hyphenationFrequency` (Android-only — no `ios/PlainTextProps.mm` entry, no iOS entry in
  [Set 2](#set-2--a-prop-that-affects-measured-size)'s measurement plumbing)
- `experiment` (internal-only)

**Files, every prop touches these at minimum, except the iOS-only and Android-only props noted above, which skip
`ios/PlainTextProps.mm` or the Android setter respectively:**

- `src/PlainTextViewNativeComponent.ts` — codegen spec, source of truth for the prop's name, type and JS-facing default
- `Props.h` (generated from the spec, not checked in) — native prop struct and its default
- `ios/PlainTextProps.mm` / RN's generated iOS glue — reads the generated prop into native code
- `android/src/main/java/com/mdjstack/plaintext/PlainTextViewManager.kt` — `@ReactProp` setter that applies the prop to
  the mounted view
- `example/src/screens/FeaturesScreen.tsx` — example app coverage, so the prop is exercised in the dev client

**Contract:** the spec is what the rest of the codebase treats as ground truth (`src/PlainTextViewNativeComponent.ts:8`,
`// SYNC: this spec is the source of truth for props`). Every other file listed here reads or mirrors it.

**Full layer breakdown:** [architecture.md](architecture.md).

---

## Set 2 — A prop that affects measured size

**Props (exactly the list `measurementInputsEqual` compares):**

Common: touch all five files below.

- `text`
- `fontSize`
- `fontFamily`
- `fontWeight`
- `fontStyle`
- `fontVariant`
- `fontVariationSettings`
- `lineHeight`
- `letterSpacing`
- `textTransform`
- `hyphens`
- `lang`
- `numberOfLines`
- `allowFontScaling`
- `maxFontSizeMultiplier`

iOS-only: touches `measurementInputsEqual`, `ios/PlainTextShadowNode.mm`, `RNPlainText.mm`. No
`PlainTextMeasurementsManager.cpp` or `PlainTextViewManager.kt` `measure()` entry.

- `lineBreakStrategyIOS`

Android-only: touches `measurementInputsEqual`, `PlainTextMeasurementsManager.cpp`, `PlainTextViewManager.kt`
`measure()`. No `ios/PlainTextShadowNode.mm` or `RNPlainText.mm` entry.

- `includeFontPadding`
- `textBreakStrategy`
- `android_hyphenationFrequency`

`experiment` (internal-only, both platforms): scoped to both platforms, unlike the two groups above. It's a generic
on/off switch for whatever's currently being benchmarked (see
[Set 4](#set-4--the-reused-measuring-view-android)). With no benchmark plugged in, it only touches
`measurementInputsEqual` and `PlainTextMeasurementsManager.cpp` today. A benchmark can wire it into `measureContent`,
`applyContentFromProps`, or `PlainTextViewManager.kt`'s `measure()`, on either platform or both. Whichever files it
reads have to keep agreeing with `measurementInputsEqual`, same as any other prop here, for the run of that benchmark.

- `experiment`

Notably _excluded_ — all draw-only, none affect the box:

- `color`
- `textAlign`
- `textAlignVertical`
- `verticalAlign`
- `writingDirection` (iOS-only, like `lineBreakStrategyIOS` above, but it doesn't affect wrapping: it reorders glyphs,
  not line breaks, so `boundingRectWithSize:` reports the same size either way)
- `textDecorationLine`
- `textShadowColor`, `textShadowOffsetWidth`, `textShadowOffsetHeight`, `textShadowRadius`
- `lineHeightClippingCompat`

Applying one of the common props above has to happen identically in five places, or the box and the rendered text
disagree. That's a stale or wrong size, not a crash. The groups above already say which of the five apply to
`lineBreakStrategyIOS`, `includeFontPadding`, `textBreakStrategy`, `android_hyphenationFrequency`, and `experiment`.

**Files:**

- `cpp/PlainTextMeasurementHelpers.cpp` → `measurementInputsEqual` — measurement-cache key: every input that affects
  size must be compared. Miss it and the size goes stale after an update (cache returns the old size)
- `ios/PlainTextShadowNode.mm` → `measureContent` — iOS measure pass, must mirror `RNPlainText.mm`'s
  `applyContentFromProps` attribute-for-attribute. Miss it and iOS measures without the new attribute
- `android/src/main/jni/react/renderer/components/RNPlainTextSpec/PlainTextMeasurementsManager.cpp` → `serializeProps` —
  serializes props across the JNI hop to Android's measure pass. Miss it and the prop never reaches Android's
  measurement
- `PlainTextViewManager.kt` → `measure()` — applies props to the shared off-screen measuring view, must apply exactly as
  the mounted view does. Miss it and the measured size disagrees with what's drawn
- `PlainTextView.kt` → the prop's setter, plus `flushPendingUpdates()` if its work is batched (see
  [Set 5](#set-5--deferred-prop-application-android-dirty-flags)) — applies the prop to the mounted view. Miss it and
  the prop is recorded but never rendered

**Exception — the `UIFont` itself is not mirrored.** `fontFamily`, `fontSize`, `fontWeight` and `fontStyle` all go
through `plaintext::resolveFont` (`ios/PlainTextFont.h`), so a change to font resolution lands on both iOS call sites at
once. A new prop that feeds the font belongs in there, not in either caller.

Accessibility scaling of the font size is inside `resolveFont` for the same reason: it takes the multiplier rather than
an already-scaled size, so `scaledFontSize`'s unrounded `fontSize * fontSizeMultiplier` (see
[native-gotchas.md](native-gotchas.md) for why it must stay unrounded) lives in one place. `lineHeight` scales in the
callers instead (also unrounded, matching RN), so it stays a sync point between `measureContent` and `RNPlainText.mm`.

`measurementInputsEqual` is shared C++, so every prop above runs through it on both platforms, even the ones a
platform never reads. `lineBreakStrategyIOS`, `textBreakStrategy` and `android_hyphenationFrequency` stay in there
permanently on the platform that can't measure them. `experiment` stays in there even while no benchmark has plugged
it into either platform. Drop an entry and the platform that does read the prop compares stale without knowing it.

**`lineBreakStrategyIOS` and `experiment` currently have an empty Android `@ReactProp` setter.** Codegen's interface has
no per-platform prop list, so `PlainTextViewManager.kt` has to implement every setter regardless.
`lineBreakStrategyIOS`'s stays empty permanently, same as `lineHeightClippingCompat`'s. `experiment`'s stays empty only
until a benchmark wires it into Android.

**`includeFontPadding` has no `PlainTextView.kt` setter.** `PlainTextViewManager.kt`'s `@ReactProp` writes straight to
`TextView`'s own `includeFontPadding` property instead. There's no shared work to defer (see
[Set 5](#set-5--deferred-prop-application-android-dirty-flags)).

---

## Set 3 — The three-way default contract

**Props:** every prop in [Set 2](#set-2--a-prop-that-affects-measured-size)'s list except `lineBreakStrategyIOS`, which
this set skips entirely — it is never serialized in `PlainTextMeasurementsManager.cpp`, so there is no Android default to
agree on. Two flavors, both three-way:

- Value-defaulted (a plain C++ default, not `std::optional`) — an omitted serialized key means "use this default":
  - `fontSize` (`14.0`)
  - `lineHeight` (`0.0`)
  - `textTransform` (`None`)
  - `hyphens` (`None`)
  - `numberOfLines` (`0`)
  - `allowFontScaling` (`true`)
  - `maxFontSizeMultiplier` (`0.0`)
  - `includeFontPadding` (`true`)
  - `textBreakStrategy` (`HighQuality`)
  - `android_hyphenationFrequency` (`None`)
  - `experiment` (`false`)
- Optional (`std::optional`, via `generateOptionalProperties`) — an omitted serialized key means "unset," and the Kotlin
  fallback has to reproduce whatever "unset" resolves to:
  - `text`
  - `fontFamily`
  - `fontWeight`
  - `fontStyle`
  - `fontVariant`
  - `fontVariationSettings`
  - `letterSpacing`
  - `lang`

**Files, per prop above, all three must agree on what "absent" resolves to:**

- `Props.h` (generated) — the codegen default
- `android/src/main/jni/react/renderer/components/RNPlainTextSpec/PlainTextMeasurementsManager.cpp` → `serializeProps` —
  the default/presence condition it serializes
- `PlainTextViewManager.kt` → `measure()` — the fallback applied for an absent key

**Failure mode:** a mismatch silently measures at the wrong size.

---

## Set 4 — The reused measuring view (Android)

**Props:** every prop in [Set 2](#set-2--a-prop-that-affects-measured-size)'s list except `lineBreakStrategyIOS` (see that
set's exception) — all of them must be (re-)applied on every `measure()` call, since the view is shared across nodes.

`PlainTextViewManager.measure()` sizes one shared off-screen view rather than a fresh one per node (see
[performance.md](performance.md)). Three invariants hold because of that, only one of them enforced:

- Set every size-affecting prop on every call, with its default when absent — else the previous node's value leaks into
  this one (`PlainTextViewManager.kt` → `measure()`; **not enforced**)
- Nothing in `PlainTextView` may derive new state from its own current state (`PlainTextView.kt` → `applyTypeface()`;
  **not enforced**). `applyTypeface()` resolves against a fixed `baseTypeface` for exactly this reason:
  `ReactTypefaceUtils.applyStyles` derives from the passed-in typeface when `fontFamily` is null, so chaining off the
  live value would leak one node's font into the next
- The scratch view needs `isMeasureOnly`, or it queues a `requestLayout` re-layout that never fires on a never-attached
  view (`PlainTextViewManager.kt`; **not enforced**)

Every `PlainTextView` also needs non-null `LayoutParams`, seeded in the constructor: a view that was measured but never
added to a parent reaches `checkForRelayout()` from `setText()`, which dereferences `layoutParams.width`. That covers
the scratch view and any mounted view whose insert was dropped — it is not about mount ordering.
`PlainTextViewLayoutParamsTest` pins this (`yarn test:android`, which CI runs but `yarn validate` does not).

This sharing is unconditional: a fresh view per measure was the alternative an earlier perf-suite A/B test measured
against, and it lost. The internal `experiment` prop (not part of `PlainText`'s public props — one generic on/off switch
for whatever the perf suite is currently A/B testing, see `src/PlainTextViewNativeComponent.ts`) is declared but unread
on both platforms for now, ready for whatever gets A/B tested next.

---

## Set 5 — Deferred prop application (Android dirty flags)

**Props, grouped by the dirty flag they set in `PlainTextView.kt`:**

- `dirtyFontSize`: `fontSize`, `allowFontScaling`, `maxFontSizeMultiplier` (cascades into `dirtyLetterSpacing`, since
  letterSpacing is relative to font size)
- `dirtyLetterSpacing`: `letterSpacing`
- `dirtyTypeface`: `fontFamily`, `fontWeight`, `fontStyle`
- `dirtyText`: `text`, `lineHeight`, `textTransform`, plus `fontSize` / `allowFontScaling` / `maxFontSizeMultiplier`
  again (the `lineHeight` span is scaled too, via `markScaledSizesDirty()`)
- Ordered separately, not a dirty flag: `fontVariationSettings` (see below)

Setters whose work is **shared with other props** record state and set one of the flags above; `flushPendingUpdates()`
does the work once. That covers typeface resolution, `setText`, and anything derived from the scaled font size.

**Files:**

- `PlainTextView.kt`:161 — a new prop feeding shared work must set its own dirty flag, and flags must be flushed in
  dependency order
- `PlainTextView.kt` → `flushPendingUpdates()` — the single place that does the deferred work
- `PlainTextViewManager.kt` → `onAfterUpdateTransaction` — calls flush, before the off-screen `measure`
- `PlainTextView.kt` → `reapplyScaledSizes` runnable — calls flush after an OS text-size change

**Failure mode:** a prop that is set but never flushed silently does nothing. A new read path that doesn't flush first
sees stale state. Flush never happens in the view's `init` — see [Set 11](#set-11--construction-time-state-android).

**`fontVariationSettings` ordering.** The one prop ordered against another rather than batched with it
(`PlainTextView.kt`:183): the axes are baked into a `Typeface` derived from the current one, so
`applyVariationSettings()` must run **after** `applyTypeface()`, whose output it invalidates. It guards itself by
comparing against the last applied string instead of a dirty flag, because that comparison is also what `applyTypeface`
invalidates (by resetting it to `null`). Move the call above the typeface block and the axes silently vanish whenever a
font prop changes in the same transaction.

Three pieces of state carry that relationship, and only work as a set (`PlainTextView.kt`:101):

- `appliedVariationSettings` — the last string applied; `null` also means "the live typeface has no axes derived onto
  it."
- `appliedBaseTypeface` — what `applyStyles` last resolved, i.e. what the live typeface is only until axes are applied.
  Both the identity guard in `applyTypeface` and the restore in `applyVariationSettings` read it.
- The identity guard itself — needed for the measuring view, where the dirty flag is always set, so `applyTypeface`
  would otherwise re-derive per node.

`appliedBaseTypeface` being the only record of the un-varied typeface makes `typeface` assignable from `applyTypeface`
and the restore **and nowhere else** — the live `typeface` is axis-derived whenever axes are set, so it can't be read
back to recover the base.

Layered on top is `variationTypefaceCache`, a process-wide `LruCache` keyed on `(base typeface, settings string)`,
shared by every `PlainTextView` including the measuring one (see
[performance.md](performance.md#cache-the-derived-fontvariationsettings-typeface-across-views-plaintextviewkt)). It
changes the cost, not the contract: on a miss, the three-piece state above still governs correctness, and the ordering
rule is unchanged. The one visible divergence is that a cache hit goes through `TextView.setTypeface`, which updates
`getTypeface()`, so a cache-hit view keeps its axes across an OS **Bold text** toggle where a cache-missed one drops
them (documented, not prevented — `TextView.onConfigurationChanged` calls `setTypeface(getTypeface())` on every attached
view when `Configuration.fontWeightAdjustment` changes; harmless because it re-assigns `appliedBaseTypeface`'s value to
itself, but it does drop axes off the paint until the next font-prop change).

The guard and the restore have to land together: the guard alone stops `applyTypeface` from resetting
`appliedVariationSettings` for consecutive nodes sharing a font, and without the restore the reused measuring view then
measures node N+1 at node N's axes — a wrong size for every node, not just a wrong render for one.

Props that map onto a single cheap independent write apply inline — no dirty flag needed (`numberOfLines`,
`ellipsizeMode`, via `setMaxLines`, `setJustificationMode`; the `relayoutPosted` guard in
`PlainTextView.requestLayout()` collapses their relayouts to at most one per transaction).

---

## Set 6 — Optional zero-valued props

**Props:** `letterSpacing`, `textShadowOffsetWidth`, `textShadowOffsetHeight` — all three declared `WithDefault<Float,
null>`.

**Files / contract:**

- codegen (`generateOptionalProperties`) — turns these into `std::optional<Float>`, preserving "unset" vs. "explicit
  zero" (a plain optional `Float` doesn't work — codegen currently assigns it a synthetic `0` default, RN#55315)
- iOS native code — unset `letterSpacing` keeps automatic kerning; explicit `0` disables it. A `{0, 0}` shadow offset
  still opts into the shadow path
- Android native code — maps absent optional Floats back to `0`; no unset/zero distinction on that platform
- `cpp/PlainTextMeasurementHelpers.cpp` → `measurementInputsEqual` — `letterSpacing` belongs here as the optional itself
  (text shadow is draw-only, so its fields do not — see [Set 2](#set-2--a-prop-that-affects-measured-size))

---

## Set 7 — The iOS font cache key

**Props:**

- Face key (`faceCacheKey`): `fontFamily`, `fontWeight`, `fontStyle`
- Font key (`fontCacheKey`): face key plus `fontSize`, `fontVariant`, `fontVariationSettings`

**Files:**

- `ios/PlainTextFontCacheKey.h` / `.cpp` → `faceCacheKey`, `fontCacheKey` — builds the cache keys
- `ios/PlainTextFont.mm`:195 → `computeFaceName` — must have every input it reads covered by `faceCacheKey`
- `ios/PlainTextFont.mm`:281 → `resolvedFont` (`plaintext::resolveFont`) — must have every input it reads covered by
  `fontCacheKey`

**Contract:** `faceCacheKey` covers `fontFamily`, `fontWeight` and the raw `fontStyle` string — not a converted bool; an
empty string and `"normal"` both mean "not italic" but must key separately, since `computeFaceName`'s face-name fallback
tells them apart. `fontCacheKey` adds `fontSize`, `fontVariant` and `fontVariationSettings` on top.

**Failure mode:** a new input read by `computeFaceName`/`resolveFont` and left out of the key doesn't fail to apply — it
applies once and then serves that first value back for every other one, keyed as if nothing had changed. Both caches are
unbounded (`familyNamesCache`, `faceNamesCache`) or bounded only by count (`resolvedFontsCache`,
`kFontCacheCountLimit`), so nothing evicts the stale entry on its own.

---

## Set 8 — Anything derived from the OS text-size setting

**Props:** `fontSize` and `lineHeight` — the two values actually scaled by the OS font-scale multiplier — gated by
`allowFontScaling` and `maxFontSizeMultiplier`. The scale itself is never a prop: both platforms read it ambiently while
applying props and store the result as absolute points/pixels, so when the user changes the OS setting, no prop changes,
Fabric's props diff never fires, and every derived value is stale until something re-derives it.

**Files:**

- `ios/RNPlainText.mm`:204 → `traitCollectionDidChange` — fires on a Dynamic Type change
- `android/src/main/java/com/mdjstack/plaintext/PlainTextView.kt`:242 → `onConfigurationChanged` — fires on a font scale
  change, if the Activity declares it¹

**Contract:** a new value that scales (a second span, a padding, anything multiplied by the multiplier) has to be
reachable from both callbacks or it holds its old size on one platform only. On Android that means
`markScaledSizesDirty()` must mark its dirty flag. On iOS, `applyContentFromProps` already covers everything it builds,
so nothing extra is needed there.

Re-measurement is **not** part of this contract: RN dirties every `MeasurableYogaNode` when the surface's
`fontSizeMultiplier` changes, so the shadow node re-measures on its own. Only the mounted view needs the callback.

Android's override carries a second, unrelated obligation through its `super` call: `TextView.onConfigurationChanged`
re-applies the OS **Bold text** setting to the typeface, which interacts with `fontVariationSettings` — see
[Set 5](#set-5--deferred-prop-application-android-dirty-flags).

¹ Otherwise Android recreates the Activity and the views are rebuilt anyway.
`example/plugins/withFontScaleConfigChanges.js` declares it so the no-recreate path is the one you exercise while
developing.

---

## Set 9 — Both platforms' shadow node headers

**Props:** every prop in [Set 2](#set-2--a-prop-that-affects-measured-size)'s list, indirectly — this set is about the
shared _traits/overrides_ the two headers declare to support measurement, not individual prop plumbing.

**Files:**

- `ios/PlainTextShadowNode.h`:9 — traits and overrides; mirrors the Android header
- `android/src/main/jni/react/renderer/components/RNPlainTextSpec/PlainTextShadowNode.h`:11 — traits and overrides;
  mirrors the iOS header

**Contract:** these are separate files with the same traits and overrides. A change to one usually belongs in the other.
Only the invalidation logic is genuinely shared, in `cpp/PlainTextMeasurementHelpers.{h,cpp}`.

---

## Set 10 — Recycled view state (iOS)

**Props:** every prop `applyContentFromProps` applies to `_label` — text (`text`, `textTransform`), font (`fontFamily`,
`fontSize`, `fontWeight`, `fontStyle`, `fontVariant`, `fontVariationSettings`, `allowFontScaling`,
`maxFontSizeMultiplier`), color (`color`), alignment (`textAlign`, `textAlignVertical`, `verticalAlign`,
`writingDirection`), `letterSpacing`, `lineHeight`, `textDecorationLine`, `hyphens`, `lang`, `numberOfLines`,
`ellipsizeMode`, `lineBreakStrategyIOS`, plus the shadow props (`textShadowColor`, `textShadowOffsetWidth`,
`textShadowOffsetHeight`, `textShadowRadius`) — i.e. Set 2's list plus every draw-only prop from
[Set 1](#set-1--any-prop-the-four-layer-flow).

Fabric recycles component views by type. iOS does it unconditionally through `RCTComponentViewRegistry`; Android only if
a view manager opts in via `setupViewRecycling()`, which `PlainTextViewManager` never calls — so this set is iOS-only
today.

**Files:**

- `ios/RNPlainText.mm`:108 → `applyContentFromProps` — fully determines the label's state (font, color, alignment,
  `text`/`attributedText`, `verticalTextShift`); must mirror the attribute set `PlainTextShadowNode::measureContent`
  reads (see [Set 2](#set-2--a-prop-that-affects-measured-size))
- `ios/RNPlainText.mm` → `_forceApplyProps` — set in `-initWithFrame:`, checked and cleared on the first `-updateProps`;
  forces content/`numberOfLines`/`lineBreakMode` to apply unconditionally on first mount regardless of the diff

**Why `_forceApplyProps` exists:** `updateProps` diffs against `_props` (the ivar), not `oldProps`, matching base
`RCTViewComponentView`. On construction `_props` doesn't yet describe what `_label` shows — the base class seeds it with
a plain `ViewProps`, replaced in `-initWithFrame:` with default `RNPlainTextProps`, while `_label` separately starts at
UILabel's own factory defaults (e.g. built-in 17pt font). A first-mount view whose real props happen to equal those
defaults would diff as "no change" and never apply, keeping UILabel's mismatched look — the same "correct on first
render, wrong after an update, silent in between" shape this whole document is about, just triggered on construction.

Recycling itself needs no extra handling: a recycled view is handed back out with `_props` still holding the previous
instance's real values, but nothing between that instance's last `-updateProps` and this one touches `_label`, so the
plain diff is already correct — real prop differences apply normally, and a coincidental match means `_label` already
shows the right thing.

**This is why there is no "reset every `_label` property to its default" routine, and why a new prop doesn't need one.**
`applyContentFromProps` fully determines the label's state (font, color, alignment, `text`/`attributedText`,
`verticalTextShift`), and the forced apply on first mount runs it before anything is on screen, so a fresh view needs no
separate seeding. Two earlier, rejected versions of this fix show why that's the right place to stop:

- An earlier version re-armed `_forceApplyProps` in `-prepareForRecycle`, modeled on `RCTViewComponentView`'s own
  diff-blind safety net for its `_props`-diffed properties (`-updateLayoutMetrics` sets `_needsInvalidateLayer = YES`
  unconditionally, rebuilding background/border layers every layout pass no matter what the diff concluded). It was
  removed: the recycling bug this was meant to fix actually occurred _with_ that re-arm in place (the logs show
  `_forceApplyProps` forcing `applyContentFromProps` to run), and the real cause was inside `applyContentFromProps`
  itself (the `attributedText` issue below) — so the re-arm was never doing anything for that failure, and speculative
  insurance against an undemonstrated one isn't worth the extra state.
- An earlier version also reset `_label` directly in `-prepareForRecycle`. It made correctness depend on that reset
  staying prop-for-prop in step with `applyContentFromProps` forever, which is exactly the kind of silent sync point
  this document exists to avoid. If a `_label` property is ever set outside `applyContentFromProps`/`updateProps`, that
  reasoning breaks and it needs its own handling.

**One property inside `applyContentFromProps` needs its own explicit handling: `attributedText`.** Text content is
carried on either `.text` (plain path) or `.attributedText` (letterSpacing, lineHeight, underline/strikethrough), only
one set per call. Apple documents that setting `.text` also clears `.attributedText`, but a real repro (recycled from an
instance with `letterSpacing` into one without) showed the old kerning surviving. The plain path now sets
`_label.attributedText = nil` explicitly before `.text`. A future rewrite of `applyContentFromProps` must keep doing
this — the failure is invisible until something is recycled from the attributed path into the plain one.

Android likely doesn't share this specific hazard: `PlainTextView.applyText()` has the same plain-vs-spanned duality
(`setText(value)` vs. a `SpannableString` carrying the `lineHeight` span), but both branches go through the single
`setText()` entry point, so there's no second backing store for a stale span to hide in. It has no recycling reset of
any kind either: `PlainTextView`/`PlainTextViewManager` reset nothing on reuse, where RN's own `ReactTextViewManager`
overrides `prepareToRecycleView` and calls `ReactTextView.recycleView()` from there, resetting at unmount on the way
_into_ the pool. Reset at that end, not the other: `ViewManager.recycleView(reactContext, view)` is a differently-scoped
hook with a confusingly identical name, called from `createViewInstance` on the way back _out_ of the pool, and RN's
text manager leaves it alone. Either way the reset costs nothing while `setupViewRecycling()` goes uncalled, and it is
the first thing opting in has to bring: **a pooled view would arrive carrying the previous instance's text, font and
color, and `init`'s seeding only runs for a genuinely new one.**

---

## Set 11 — Construction-time state (Android)

**Props whose seeded field `init` reads:** `fontSize` (`fontSizeSp`, `textSize`), `letterSpacing` (`letterSpacingDip`),
plus the ungated fields `allowFontScaling` and `fontWeight` (`baseTypeface`) that other seeded computations depend on.

`PlainTextView`'s `init` seeds `textSize` and `letterSpacing`, because Fabric skips setters for props still at their
default and the off-screen measuring view always applies both — a view left on the theme's values would render at a size
nothing measured.

Kotlin runs property initializers and `init` blocks in declaration order, so a field declared **below** `init` still
holds its zero-default while `init` runs (`allowFontScaling` false rather than true, `letterSpacingDip` `0f` rather than
`NaN`, `fontWeight` `0` rather than `UNSET`, a null `baseTypeface`). Anything `init` reads, directly or through a call,
therefore gets the wrong value — no crash, just the wrong font or size on every view. `init` currently reads only the
four fields above, but which ones it reads is not a property you want a future edit to have to re-derive, hence the
blanket "declare every field above `init`" rule below rather than "declare only the fields `init` happens to read."

**Files / rules:**

- `PlainTextView.kt` — the `State` block, above `init`: every field `init` reads must be declared here (Kotlin's "must
  be initialized" check makes a violation a compile error — **enforced**)
- `PlainTextView.kt`:43 → `toEffectivePixel`, `calculateLetterSpacing` — must stay pure top-level functions, not methods
  (**not enforced**). The compile check only fires for a field read written directly inside `init`; it does not follow a
  call. Turning either into a method that reads the fields itself silently drops the guarantee

`requestLayout()` is a separate case field order cannot fix: `TextView`'s constructor calls it before any initializer
runs, so `measureAndLayout` is null there. The `width == 0 || height == 0` guard is what makes that safe.

---

## Set 12 — The verticalAlign and textAlignVertical merge

**Props:** `textAlignVertical`, `verticalAlign` — two props that resolve down to one effective vertical alignment.

`verticalAlign` (the cross-platform CSS-style prop) wins over `textAlignVertical` when set, and its `'middle'` maps to
`textAlignVertical`'s `'center'`. This merge used to run once in JS (`PlainText.tsx`'s former
`resolveTextAlignVertical`) and was moved into each native implementation for cost reasons (see
[performance.md](performance.md#prop-cost-policy)), which turned one shared function into two that must resolve
identically.

**Files:**

- `ios/PlainTextProps.h` / `.mm` → `resolveVerticalAlign` — the iOS resolution
- `PlainTextView.kt`:552 → `applyVerticalAlignGravity` (called from `setVerticalAlign`) — the Android resolution, must
  match `resolveVerticalAlign` output-for-output
- `android/src/test/java/com/mdjstack/plaintext/PlainTextViewVerticalAlignTest.kt` — pins the Android side of the
  contract; doesn't run against iOS, so it can't catch the two drifting apart on its own

**Failure mode:** a text node with both props set, or with `verticalAlign: 'middle'`, resolves to a different vertical
position on iOS than on Android — visually wrong, nothing throws.

---

## Set 13 — `lineHeightClippingCompat`: one prop, renamed at the JS boundary

**Props:** one `PlainText` public prop, named differently per layer:

- `PlainText.tsx` — `unstable_lineHeightClippingCompat` (the `unstable_` marks that shape/default may change without a
  major bump)
- `src/PlainTextViewNativeComponent.ts`, `Props.h`, both native implementations — bare `lineHeightClippingCompat`; codegen
  output and native code aren't the unstable surface, the JS entry point is

**Contract:** `mapPlainTextProps` forwards `props.unstable_lineHeightClippingCompat` straight through as
`lineHeightClippingCompat`; unset stays `undefined` and the codegen `WithDefault<boolean, false>` supplies the default. It
does **not** affect `measureContent`/`measure()` (the shift it gates is draw-only, the line-height box size is identical
either way), so it's excluded from [Set 2](#set-2--a-prop-that-affects-measured-size) and
[Set 3](#set-3--the-three-way-default-contract). Android no-ops it (`PlainTextViewManager.setLineHeightClippingCompat`):
the TextKit bug it reverts (RN#29507) has no Android counterpart.

---

## Set 14 — Padding and border width (not props)

**Not part of `NativeProps`.** Padding and border width are ordinary Yoga style/layout inputs, resolved by Yoga itself,
not `PlainText` props — there is no `padding` or `borderWidth` entry in `src/PlainTextViewNativeComponent.ts` to keep in
sync. What has to stay in sync instead is how each platform insets the _rendered text_ once Yoga has resolved them,
since neither value ever reaches a prop setter: Yoga folds them into the shadow view's `contentInsets`, and each
platform inflates the view's frame by them, so the box grows whether or not anything insets the text inside it. The
failure mode is that the size is right and only the glyphs are in the wrong place.

**Files:**

- iOS — free, no file. `RCTViewComponentView` lays `contentView` out at `layoutMetrics.getContentFrame()`, already inset
- Android — `PlainTextViewManager.kt`:64 → `setPadding`: an opt-in override — `ViewManager`'s base implementation is an
  empty no-op
- `android/src/main/java/com/mdjstack/plaintext/PlainTextViewManagerDelegate.java` — drawing the border, separate
  Android-only opt-in: forwards border props to `BackgroundStyleApplicator`, because `BaseViewManager` has no border
  setters worth inheriting

A view manager with a delegate is driven **only** through that delegate, so a `@ReactProp` for anything the codegen spec
doesn't declare is never called — a new view-style prop belongs in the delegate, not as a `PlainTextViewManager`
annotation.

Measurement needs no counterpart on either platform: Yoga hands the measure callback the content box, already minus
padding/border, and adds them back to the result. The shared off-screen view in `PlainTextViewManager.measure()` must
therefore stay padding-free, unlike every prop in [Set 2](#set-2--a-prop-that-affects-measured-size), which must be set
on every call (see [Set 4](#set-4--the-reused-measuring-view-android)).

---

## Set 15 — The `__baseline` marker string (Android)

**Props:** none — `"__baseline"` is an internal marker key stuffed into the serialized props map, never a real
`PlainText` prop.

`alignItems: "baseline"` works by both shadow nodes setting the `BaselineYogaNode` trait and overriding `baseline()`,
mirroring RN's own `ParagraphShadowNode`. iOS computes it in pure C++ from the font's ascender
(`ios/PlainTextShadowNode.mm`) — no JNI hop needed. Android has no thread-safe pure-C++ text measurement, so
`PlainTextShadowNode::baseline()` reuses the same `FabricUIManager.measure` JNI bridge as normal measurement, with the
node's final layout `size` passed as both min and max constraint, and a `"__baseline"` marker stuffed into the
serialized props.

**Files:**

- `android/src/main/jni/react/renderer/components/RNPlainTextSpec/PlainTextMeasurementsManager.cpp` → `baseline()` —
  sets the marker string
- `PlainTextViewManager.kt`:281,360 → `BASELINE_QUERY_PROP` in `measure()` — reads the marker string

**Contract:** the literal string must match in exactly these two places, and nothing checks it.

**Failure mode:** a mismatch doesn't fail loudly — `measure()` never takes the baseline branch, and `baseline()`
silently gets back the measured height packed into the wrong slot instead of `TextView.getBaseline()`.

---

## Adding a new sync point

If you add a `// SYNC:` comment anywhere in `src`, `cpp`, `ios` or `android`, add or extend a set above in the same
change: name the props it applies to, the files involved, the contract between them, and the silent failure mode. A
`SYNC:` comment with no entry here is only half the guardrail — the comment tells the next editor _that_ something else
must change, this file is what tells them _what_, _where_, and for which props.

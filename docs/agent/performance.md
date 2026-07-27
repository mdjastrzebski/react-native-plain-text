# Performance notes

What has been optimized, what was tried and rejected, and the mechanisms behind
both. Read [measuring.md](measuring.md) first for what the numbers mean.

Release builds, 1000 views mounted in one state update, app killed between runs.
Directional, not a controlled benchmark.

**Every comparison in this document is within one device.** `PlainText` vs
`Text`, or one version of `PlainText` against another, on the same hardware.
Nothing here compares iOS to Android, and no number on one platform's table
means anything held against the other's — different devices, and in some
sections a simulator against a phone. Optimization decisions follow from the
within-device deltas only.

## Where things stand

### Android — Pixel 3, physical device

Release build, mount 1000 views in one state update, mean of 3 runs at each
font size — same methodology and Large/Regular/Small tiers as the iOS table
below.

| | `PlainText` mem | `PlainText` interaction | `Text` mem | `Text` interaction | `NativeText` mem | `NativeText` interaction |
| --- | --- | --- | --- | --- | --- | --- |
| Large | 35.3 KB | 503.7 ms | 53.2 KB | 718.0 ms | 50.0 KB | 673.7 ms |
| Regular | 35.4 KB | 504.7 ms | 52.7 KB | 724.3 ms | 50.1 KB | 675.0 ms |
| Small | 35.1 KB | 502.0 ms | 52.9 KB | 716.3 ms | 50.4 KB | 675.7 ms |
| **mean** | **35.3 KB** | **503.4 ms** | **52.9 KB** | **719.6 ms** | **50.2 KB** | **674.8 ms** |

`PlainText` vs `Text`:

| | mem | interaction |
| --- | --- | --- |
| Large | -33.6% | -29.9% |
| Regular | -32.8% | -30.3% |
| Small | -33.6% | -30.1% |
| **average** | **-33.3%** | **-30.1%** |

`NativeText` vs `Text` is again mostly flat across sizes (-4.8% to -6.1% mem,
-6.2% to -6.8% interaction) — the same read as iOS below: most of `PlainText`'s
margin over `Text` is the native implementation, not its JS wrapper.

Unlike iOS, **memory and interaction barely move across font sizes** here — the
three rows differ by well under 1%. `TextView` measurement cost scales with
string content and layout, not directly with `UIFont`/`NSAttributedString`
construction the way iOS's does, so a bigger font doesn't add proportionally
more work on this platform.

This mean-of-3 measurement replaces the single-run `interaction` figure this
section used to report, including the earlier `Text` number that had been
derived from a pre-Event-Timing measurement rather than read directly — these
are real, repeated Event Timing runs. The `commit` (JS-thread) breakdown and the
`NativePlainText` comparison below are still from that single earlier run and
haven't been repeated per size:

| | `PlainText` | `NativePlainText` | `Text` | `NativeText` |
| --- | --- | --- | --- | --- |
| commit (JS thread) | ~200 ms | ~175 ms | ~324 ms | ~272 ms |

Starting point for the same scenario was ~450 ms commit and ~687 ms to painted.

### iOS — iPhone 16, physical device

Release build, mount 1000 views in one state update, median of 3 runs at each
font size. Font size matters because it changes how much text pipeline there is
to skip: Large is a headline-scale size, Regular is body text, Small is a
caption — the same three tiers the example app's Large/Regular/Small buttons
mount.

| | `PlainText` mem | `PlainText` interaction | `Text` mem | `Text` interaction | `NativeText` mem | `NativeText` interaction |
| --- | --- | --- | --- | --- | --- | --- |
| Large | 148.6 KB | 165.0 ms | 197.6 KB | 210.3 ms | 196.5 KB | 202.0 ms |
| Regular | 49.6 KB | 144.3 ms | 58.4 KB | 170.7 ms | 57.1 KB | 162.3 ms |
| Small | 34.5 KB | 142.0 ms | 42.6 KB | 164.0 ms | 41.0 KB | 155.7 ms |

`PlainText` vs `Text` (its JS wrapper included both sides):

| | mem | interaction |
| --- | --- | --- |
| Large | -24.8% | -21.6% |
| Regular | -15.1% | -15.4% |
| Small | -19.1% | -13.4% |
| **average** | **-19.7%** | **-16.8%** |

`NativeText` vs `Text` isolates the wrapper cost from the native win: it is
mostly flat, -0.6% to -3.8% on memory and -4.0% to -5.1% on interaction across
sizes — RN's own bare host component barely beats its JS-wrapped form here, so
almost all of `PlainText`'s margin over `Text` is the native implementation, not
avoiding a JS wrapper.

The win grows with font size rather than shrinking: Large shows the largest gap
on both memory and time, Small the smallest. A bigger font means a longer
`NSAttributedString` and more `NSLayoutManager` work for `Text` to build; `PlainText`
skips that pipeline regardless of size, so the delta it avoids scales with it.

This mount-level view (memory and interaction only) replaces the earlier
simulator-based numbers for this platform. It does not yet have a `commit`/
UI-thread split the way the Android numbers do — no physical-device run of that
split exists yet (see [Open opportunities](#open-opportunities)).

## What changed, in order

| Change | Effect |
| --- | --- |
| Reuse the off-screen measuring view | commit 450 → 230 ms |
| C++ micro-optimizations in the measure hop | commit 230 → 200 ms |
| `requestLayout` scoping + batched prop application | mount half 488 → 307 ms (interaction 687 → ~505 ms) |
| `shouldNewRevisionDirtyMeasurement` override | ancestor re-render of 1000 mounted items: ~165 → 68 ms commit |

The first two moved the JS half, the last two the UI half. Nothing moved both,
which is why the `interaction`/`commit` split is worth keeping.

## Implemented

### Reuse the off-screen measuring view (`PlainTextViewManager.kt`)

`measure()` allocated a fresh `PlainTextView` per node. Constructing an
`AppCompatTextView` is expensive — theme attribute resolution for the text
style, `AppCompatTextHelper`, emoji/tint helpers — roughly 100–200 µs, which
dominated the layout pass. It is now a `ThreadLocal` scratch view, rebuilt only
when the `Context` changes.

This was the single largest win. RN's own `<Text>` never constructs a view to
measure at all (`TextLayoutManager` uses a `ThreadLocal<TextPaint>` and a
`StaticLayout`), which is why it was faster here despite a slower commit.

The scratch view is held through a `WeakReference`, because reuse means holding a
`Context`. `FabricUIManager.measure` hands us the surface's `ThemedReactContext`,
whose base is the Activity, and no ViewManager hook tells us a surface stopped —
`onSurfaceStopped` is gated on `enableViewRecycling` (see
[below](#view-recycling)) and `trimMemory()` is package-private to RN. A strong
reference therefore retained a destroyed Activity until some other surface
measured, which for an app whose `ReactHost` outlives its Activity is the rest of
the session. Weakly held, the view is only reachable inside one `measure()` call,
so the cost is a rebuild per GC that lands mid-pass — bounded by GC frequency,
not by node count. With two live surfaces the `Context` identity check alternates
per commit rather than per node (Fabric serializes layout per thread, so every
call within one pass shares a surface), so the reuse win holds there too.

Reuse forced three fixes, all documented as invariants in AGENTS.md: every
size-affecting prop must be set unconditionally on each call; nothing in the
view may derive new state from its own current state (this is why
`updateTypeface()` resolves against a fixed `baseTypeface` — it was leaking one
node's font family into the next); and the scratch view needs `isMeasureOnly`
plus non-null `LayoutParams`, or `TextView.checkForRelayout()` NPEs from the
second measurement onward.

### C++ micro-optimizations (`PlainTextMeasurementsManager.cpp`)

Per-node work removed from the measure hop: the `"RNPlainText"` `jstring` and
the `FabricUIManager` global ref are resolved once instead of per call, and only
props that differ from their codegen default are serialized into the
`ReadableNativeMap` (usually `text` + `fontSize` rather than ten entries).

The default-omission introduces a coupling: the Kotlin `measure()` fallbacks
must match the defaults in the generated `Props.h` exactly, because an absent
key now means "default", not "unset".

### Scope the `requestLayout` re-measure hack (`PlainTextView.kt`)

The hack posts a `measureAndLayout` runnable so the mounted `TextView` rebuilds
its draw `Layout`. It fired on *every* `requestLayout`, including during initial
mount — where the view has no frame yet, so it measured at 0×0, and where Fabric
already calls `measure()` + `layout()` itself after applying props
(`SurfaceMountingManager.updateLayout`). With ~18 prop setters each triggering a
`requestLayout`, that was ~18,000 wasted runnables per 1000 views.

Now guarded on `width`/`height` being non-zero, with `removeCallbacks` to
coalesce. What the hack actually covers is the other case: a prop change on a
laid-out view whose size doesn't change, where Fabric emits no `updateLayout`.

### Batch prop application (`PlainTextView.kt` + `onAfterUpdateTransaction`)

Fabric applies props one setter at a time and several feed the same expensive
operation: three font props each re-resolved the typeface, and
`text`/`lineHeight`/the scaling knobs each called `setText`. Those setters now
record state and set a dirty flag; `flushPendingUpdates()` does the work once, from
`onAfterUpdateTransaction` (which `ViewManager.updateProperties` calls after the
whole transaction) and before the off-screen measure — never from the view's
`init`, which seeds the two values it needs itself (see
[sync-points.md](sync-points.md#construction-time-state)).

Mirrors how RN's `<Text>` applies a single prebuilt `ReactTextUpdate`.

### Share and cache iOS font resolution (`ios/PlainTextFont.{h,mm}`)

`RNPlainTextFontFromProps` in `RNPlainText.mm` and a hand-duplicated copy in
`PlainTextShadowNode::measureContent` resolved the same `UIFont` from the same
props — so mounting 1000 items ran 2000 uncached resolutions for what is usually
a single distinct font. Both now call `plainTextFont`, backed by an `NSCache`
keyed on the only four inputs that reach `UIFont`: family, size, weight, italic.

Resolution is not free, which is why RN caches its own system fonts the same way
(`RCTFont.mm`, `cachedSystemFont`). The custom-family path is the expensive one:
`fontDescriptorWithFontAttributes:` + `fontWithDescriptor:` matches against the
font database, and italic adds a second descriptor round-trip. `UIFont` and
`NSCache` are both thread-safe, so the shadow thread and the main thread share
one cache.

This is the iOS counterpart to Android's batched typeface resolution, and unlike
the changes above it *removes* a sync point rather than adding one — the two
copies had to stay identical or the measured box wouldn't fit the drawn text.
The cache clears on `kCTFontManagerRegisteredFontsChangedNotification`, so a font
registered at runtime (expo-font) doesn't leave the earlier fallback cached.

Not yet measured; the font path is a small share of an iOS commit dominated by
CoreText layout.

### Skip measurement invalidation on structural clones (both platforms)

The largest structural inefficiency, and invisible in a cold-mount benchmark:
**any ancestor re-render re-measured every mounted `PlainText`**.

`YogaLayoutableShadowNode::adoptYogaChild` clones every child of a changed
parent purely to re-own its Yoga node (a Yoga node can only have one owner), and
the base `shouldNewRevisionDirtyMeasurement` returns `true` unconditionally, so
each clone dirtied its measurement. RN's `ParagraphShadowNode` overrides it to
`fragment.props != nullptr`; ours goes further and compares the props
measurement actually reads (`cpp/PlainTextMeasurementHelpers.{h,cpp}`, shared by
both platforms), so a revision changing only e.g. `color` also keeps its size.

The comparison runs in the shadow node's **clone constructor**, and the override
just returns the cached verdict. It cannot run in the override itself —
`completeClone` calls that with the *new* node, whose props are already the new
ones. [intrinsic-sizing.md](intrinsic-sizing.md#where-the-comparison-has-to-happen)
has the details; the paragraph below has the history.

#### What it costs, measured

Release build, Pixel 3, single runs. The Performance screen's **Re-render** and
font-size buttons measure updates to text already on screen, so these are
directly comparable; see [measuring.md](measuring.md#update-scenarios).

| With 1000 `PlainText` mounted | interaction | commit |
| --- | --- | --- |
| Empty screen (baseline, nothing mounted) | 28 ms | 9 ms |
| **Re-render** — ancestor changes, item props identical | 102 ms | 68 ms |
| **Font size** — every item's measurement inputs change | 323 ms | 165 ms |
| *Add 1000, for scale* | *497 ms* | *195 ms* |

Reading the commit column, which is where measurement happens:

- **9 → 68 ms** is what re-owning 1000 shadow nodes costs with the override in
  place: 1000 React components re-rendered, 1000 shadow nodes cloned, Yoga
  re-parented. Irreducible bookkeeping, no measurement.
- **68 → 165 ms** is the extra work when the props genuinely change: prop
  diffing and payload creation, plus 1000 real measurements. Measurement is
  most of it.

So the override saves most of ~97 ms of commit on *every* ancestor re-render,
and the earlier `1000 → 0` framing holds: had it not worked, the Re-render row
would sit up near the font-size row instead of at 40% of it.

It also refines where commit time goes. Measurement is a large share of it but
not the ~85% a font-size run alone suggests — closer to 60%, with React and
Fabric bookkeeping accounting for the rest. Worth remembering before optimizing
the measure hop again.

#### History: the first version never invalidated anything

The override originally ran its comparison inside
`shouldNewRevisionDirtyMeasurement`, where `completeClone` supplies the *new*
node — so it compared the new props against themselves, always returned
`false`, and no prop change ever dirtied measurement. Symptom: with 1000 items
mounted, changing the font size left every label at its old size. Fixed by
moving the comparison into the clone constructor; the numbers above are from
after the fix.

## Considered and rejected

Each of these has a revisit trigger; they are summarized in
[Open opportunities](#open-opportunities) below.

### Measure via `StaticLayout`/`BoringLayout` instead of a `TextView`

RN's approach. **Rejected**, for three reasons that compound:

- `TextLayoutManager` is Kotlin `internal` and takes RN's private `MapBuffer`
  serialization, so it can only be *reimplemented*, not called.
- After view reuse, the remaining delta is small: `TextView.measure()` already
  builds a `BoringLayout`/`StaticLayout` internally and takes the boring fast
  path for single-line text.
- Cold vs warm measurement (85 µs vs 59 µs per node) suggests a meaningful share
  of the cold cost is Minikin's word-level shaping cache, which sits underneath
  both approaches and would not be avoided.

Against that: measurement would have to replicate `TextView.makeNewLayout()`
exactly, and every parameter is a place where measure and draw can silently
drift apart — the failure mode being clipped or over-tall text.

Revisit only if profiling shows measurement dominating again.

### View recycling

**Not implemented**, because it currently does nothing. `setupViewRecycling()`
is gated on `ReactNativeFeatureFlags.enableViewRecycling()`, which defaults to
**false** on RN main (checked at `eb4d389`, 2026-07-21) despite being added
2024-07-31 with `expectedReleaseValue: true`. The per-component flags
(`enableViewRecyclingForText`, `ForView`) default true but are inner gates, so
in a stock app **not even RN's `<Text>` recycles**.

It also buys nothing on a cold mount — the pool starts empty. The value is in
list churn, and the risk is that `prepareToRecycleView` must reset every prop to
its exact codegen default (Fabric only calls setters for props differing from
defaults), which is the same stale-state hazard as the shared measuring view but
across all 15 props.

Revisit if the flag flips. Do it with the flag enabled locally and a
mount/unmount churn benchmark, not blind.

### Trimming the JS wrapper

Measured at ~33 ms per 1000 views (`PlainText` 218 ms vs `NativePlainText`
185 ms). **Not worth it**: most of that is React rendering, reconciling and
committing one extra composite fiber per item, which no amount of trimming
`StyleSheet.flatten` or the rest/spread removes. For scale, RN's own `<Text>`
wrapper costs ~50 ms over `NativeText` — ours is already cheaper.

### Caching measurement results

An LRU keyed on the size-affecting props plus constraints, in the C++ manager,
so hits skip JNI entirely. **Not implemented**: zero benefit in this benchmark
(1000 unique strings). Plausible win for real screens with repeated labels.

### Removing the `requestLayout` hack entirely

**Not possible.** Fabric's `updateLayout` covers the mount path, but a prop
change on a laid-out view whose size doesn't change emits no `updateLayout`, and
nothing else rebuilds the `TextView`'s draw `Layout`.

## Open opportunities

Nothing here is blocked; each is waiting on a trigger or on evidence that it
matters. Ordered by expected value if its trigger fires.

| Idea | Expected value | Why not yet | Revisit when |
| --- | --- | --- | --- |
| **iOS mount path** | Unknown, but the UI thread is where `PlainText` leads least | The iPhone 16 mount numbers confirm a real, size-scaling win (13–25% on interaction) but only as one combined figure — nothing splits it into commit vs UI-thread the way the Pixel 3 numbers do, so whether the remaining headroom is in mounting or measuring is still unknown on device. Every mount-path fix so far has been Android-only, and nothing checks whether `applyContentFromProps` rebuilds the attributed string more than once per transaction | A physical-device iOS run adds the `performance.mark`/`measure` commit split alongside `interaction`, the way the Android numbers already do |
| **View recycling** | Nothing on cold mount; real for list churn | `enableViewRecycling` defaults false, so not even RN's `<Text>` recycles ([details](#view-recycling)) | The flag flips, or a consuming app enables it. Do it with the flag on locally and a mount/unmount churn benchmark |
| **Measurement LRU cache** (C++, keyed on size-affecting props + constraints) | Skips the JNI hop entirely on a hit | Zero benefit in a benchmark of 1000 unique strings | A real screen with repeated labels shows measurement cost |
| **`StaticLayout` measure path** | Small, now that the view is reused | Parity risk, and Minikin shaping sits under both approaches ([details](#measure-via-staticlayoutboringlayout-instead-of-a-textview)) | Profiling shows measurement dominating again |
| **iOS wrap detection without a second layout** | Drops one of the two `boundingRectWithSize:` calls `measureContent` runs per node | The second pass exists only to decide *whether* the text wrapped, because RN reports the full constraint width when it did and the tight width when it didn't. It is the cheaper of the two (unconstrained, so no line breaking), and the obvious replacements — compare the height against one line height, or count line fragments — are exactly the shortcuts that break on an explicit `\n` or a font with unusual metrics, which the current version gets right. Unquantified besides: iOS has no `commit`/UI-thread split yet, so measurement's share of commit is unknown there (Android's is ~60%) | The iOS commit split lands (see the **iOS mount path** row) and measurement shows up in it. Code: `ios/PlainTextShadowNode.mm` |
| **Custom JNI measure entry** (primitives instead of a `ReadableNativeMap`) | Removes the per-node map allocation | Default-omission already took most of it | The remaining serialization shows in a profile |
| **Trim the JS wrapper** | A few ms per 1000 views | Most of the 33 ms is one extra React fiber per item, which trimming can't remove ([details](#trimming-the-js-wrapper)) | Only if the wrapper delta grows |

## What we don't know yet

Gaps in evidence rather than in implementation. Worth closing before making
stronger claims — or before assuming a change was a win everywhere.

- **iOS mount cost and memory are now measured on a physical device** (iPhone
  16, [above](#ios--iphone-16-physical-device)), confirming the simulator's
  directional read: `PlainText` beats `Text` on both mem and interaction, and
  the win scales up with font size rather than down. What's still unconfirmed
  on device is the `commit`/UI-thread split and the update scenarios
  (re-render, font-size-on-mounted) — those numbers below remain simulator-only.
- **The clone-invalidation override is verified on both platforms.** Prop
  changes re-measure and ancestor re-renders don't. Android confirms it against
  its own baseline (165 vs 68 ms commit, physical device); iOS confirms it
  against a simulator baseline (34 vs 23 ms commit) — those two are separate
  results, not a comparison. Visual check passes on both: labels resize, and
  iOS shows no rendering discrepancy against `Text`. No longer an open
  question; kept here only because both are single runs, and the iOS one is
  still simulator-only.
- **Scrolling and steady-state jank are unmeasured.** The harness only does a
  cold mount of 1000 views in one commit; real apps virtualize. For a long list
  the number that matters is dropped frames during scroll, and nothing here
  reports it. The same `PerformanceObserver` can watch `longtask` entries, which
  would be the cheapest first step.
- **`Text`'s interaction figure is derived** only in the single-run Android
  `commit`/`NativePlainText` table still sitting below the mean-of-3 numbers.
  The mount-level Android and iOS tables above both read `Text` interaction
  directly from Event Timing, no derivation.
- **Most published numbers are still single runs.** The mount-level mem/
  interaction tables (Android and iOS, both above) are now a mean of 3, closer
  to but still short of the median-of-5 [measuring.md](measuring.md) asks for.
  The `commit`/UI-thread breakdown, `NativePlainText`, and the update scenarios
  (re-render, font-size-on-mounted) remain single runs.

## Mechanisms worth knowing

**Fabric commit and layout run on the JS thread** (`mqt_v_js`); mounting is
dispatched to the UI thread afterwards. A `useEffect` after a `setState` fires
~11 ms after layout finishes and, in this scenario, ~385 ms *before* the first
frame. Any JS-side timing therefore excludes mounting — which is why the
original numbers looked like a large win while real time-to-paint was a tie.

**Mount cost scales with item count; draw cost is bounded by the viewport.**
Android only draws children within the clip bounds, so 1000 mounted views cost
1000 constructions but ~15 rows of drawing. This is why `interaction` (which
ends at mount) captures nearly all the scaling cost here, and why it would not
for a component with expensive per-frame painting.

**Per-node measure cost** on this device: ~85 µs cold, ~59–77 µs warm. Per-view
mount cost after the fixes: ~300 µs.

## Measurement pitfalls hit in practice

- **Instrumentation inside the measured path.** Native measure-batch logging
  added two `System.nanoTime()` calls and an atomic per `measure()` — inflating
  the numbers it existed to explain.
- **Debounced logging misattributes time.** A flush posted to the main looper
  reported a batch as 418 ms when the actual busy time was 77 ms; the rest was
  the flush waiting for a busy main thread. Timestamp the events, never the
  flush.
- **`tid == pid` in logcat is not proof of the main thread** — it was the log
  handler, not the measure calls, which ran on `mqt_v_js`.
- **Two independent metrics agreeing is worth the effort.** The hand-rolled
  frame loop and RN's Event Timing landed on the same instant, differing only by
  a constant ~13–14 ms across variants — which identified that offset as
  input-dispatch latency and justified deleting the hand-rolled one.

## Sync points these optimizations introduced

Three of the changes above traded automatic correctness for speed, and the cost
is manual coupling that nothing verifies. All are listed with their failure
modes in AGENTS.md under *Manual sync points*, and marked in code with `// SYNC:`
comments — `grep -rn "SYNC:" src cpp ios android`.

| Optimization | What must now be kept in sync |
| --- | --- |
| Serializing only non-default props across JNI | The generated `Props.h` default, the C++ omission condition, and the Kotlin fallback — three places, one value |
| Reusing the off-screen measuring view | Every size-affecting prop must be set on every `measure()` call, and no view state may derive from the view's own current state |
| Comparing measurement inputs on clone | `measurementInputsEqual` must list every prop either `measureContent` reads |

The shared failure mode is the same in all three: correct on first render, wrong
after an update, and silent in between. Worth knowing before optimizing further
in this area — each of these was cheap to add and would be expensive to debug.

[Sharing iOS font resolution](#share-and-cache-ios-font-resolution-iosplaintextfonthmm)
went the other way and removed one, which is the shape to aim for: the two
copies of `RNPlainTextFontFromProps` were a sync point on their own, and folding
them into `plainTextFont` was what made caching worth doing.

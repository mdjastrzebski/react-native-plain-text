# Performance notes

What has been optimized, what was tried and rejected, and the mechanisms behind
both. Read [measuring.md](measuring.md) first for what the numbers mean.

All figures: Pixel 3a, release build, 1000 views mounted in one state update,
app killed between runs. Directional, not a controlled benchmark.

## Where things stand

| | `PlainText` | `NativePlainText` | `Text` | `NativeText` |
| --- | --- | --- | --- | --- |
| interaction (press → mounted) | ~505 ms | ~490 ms | ~720 ms\* | ~677 ms |
| commit (JS thread) | ~200 ms | ~175 ms | ~324 ms | ~272 ms |
| memory/view | ~36 KB | ~36 KB | ~51 KB | — |

\* derived: `Text` was measured before the switch to Event Timing, so this is
its frame-loop number plus the measured ~13 ms input-dispatch offset. Re-measure
before quoting it anywhere that matters.

Starting point for the same scenario was ~450 ms commit and ~687 ms to painted.

## What changed, in order

| Change | Effect |
| --- | --- |
| Reuse the off-screen measuring view | commit 450 → 230 ms |
| C++ micro-optimizations in the measure hop | commit 230 → 200 ms |
| `requestLayout` scoping + batched prop application | mount half 488 → 307 ms (interaction 687 → ~505 ms) |
| `shouldNewRevisionDirtyMeasurement` override | re-measures on an ancestor re-render: 1000 → 0 |

The first two moved the JS half, the last two the UI half. Nothing moved both,
which is why the `interaction`/`commit` split is worth keeping.

## Implemented

### Reuse the off-screen measuring view (`RNPlainTextManager.kt`)

`measure()` allocated a fresh `RNPlainText` per node. Constructing an
`AppCompatTextView` is expensive — theme attribute resolution for the text
style, `AppCompatTextHelper`, emoji/tint helpers — roughly 100–200 µs, which
dominated the layout pass. It is now a `ThreadLocal` scratch view, rebuilt only
when the `Context` changes.

This was the single largest win. RN's own `<Text>` never constructs a view to
measure at all (`TextLayoutManager` uses a `ThreadLocal<TextPaint>` and a
`StaticLayout`), which is why it was faster here despite a slower commit.

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

### Scope the `requestLayout` re-measure hack (`RNPlainText.kt`)

The hack posts a `measureAndLayout` runnable so the mounted `TextView` rebuilds
its draw `Layout`. It fired on *every* `requestLayout`, including during initial
mount — where the view has no frame yet, so it measured at 0×0, and where Fabric
already calls `measure()` + `layout()` itself after applying props
(`SurfaceMountingManager.updateLayout`). With ~18 prop setters each triggering a
`requestLayout`, that was ~18,000 wasted runnables per 1000 views.

Now guarded on `width`/`height` being non-zero, with `removeCallbacks` to
coalesce. What the hack actually covers is the other case: a prop change on a
laid-out view whose size doesn't change, where Fabric emits no `updateLayout`.

### Batch prop application (`RNPlainText.kt` + `onAfterUpdateTransaction`)

Fabric applies props one setter at a time and several feed the same expensive
operation: three font props each re-resolved the typeface, and
`text`/`lineHeight`/the scaling knobs each called `setText`. Setters now record
state and set a dirty flag; `flushPendingUpdates()` does the work once, from
`onAfterUpdateTransaction` (which `ViewManager.updateProperties` calls after the
whole transaction), from the view's `init`, and before the off-screen measure.

Mirrors how RN's `<Text>` applies a single prebuilt `ReactTextUpdate`.

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

## Considered and rejected

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

# Measuring

How the numbers in the README are produced, what they mean, and what they
deliberately don't cover. The example app's **Performance** tab is the harness.

For what has actually been optimized and what was tried and rejected, see
[performance.md](performance.md).

## What is measured

Everything comes from React Native's own Web Performance APIs, [stable since
0.83](https://reactnative.dev/blog/2025/12/10/react-native-0.83), plus a native
memory probe. Nothing is hand-rolled, so each number means what the spec says it
means rather than what the benchmark decided it means.

| Metric | Source | Span |
| --- | --- | --- |
| **interaction** | `PerformanceObserver`, `event` entry (`PerformanceEventTiming.duration`) | Native press → the new views are mounted |
| **commit** | `performance.mark` / `performance.measure` | The JS-thread slice: React render, Fabric commit, Yoga layout |
| **memory/view** | `react-native-memory-footprint` | Process footprint delta ÷ number of views |

**interaction** is the headline. It is React Native's analogue of the web's
[INP](https://web.dev/articles/inp): when an event's handler causes rendering
updates, RN's `EventPerformanceLogger` holds the entry until the shadow tree
mounts and reports `duration = mountTime - eventStartTime`. It starts at the
*native* event timestamp, so it includes the input-dispatch latency the user
really waits through — typically ~13&nbsp;ms more than a JS-side timer would
show.

**commit** exists to locate a change, not to judge it: `interaction - commit` is
roughly what mounting cost, which is what tells you whether a regression landed
on the JS thread or the UI thread.

## What it does not cover

- **Rasterization and compositing.** `interaction` ends at mount, not at pixels.
  In this benchmark the omission is small, because mount cost scales with the
  number of views while draw cost is bounded by the viewport — but it would not
  be small for a component with expensive per-frame painting.
- **Non-interaction updates.** No `event` entry exists for a render caused by a
  timer, a network response, or app startup.
- **Multi-commit interactions.** The entry resolves on the *first* mount after
  the event. An interaction that renders a placeholder and then real content is
  timed to the placeholder.
- **Scrolling and steady-state jank.** Nothing here measures dropped frames
  during scroll, which for a virtualized list matters more than cold-mount cost.

## Scenario

The harness mounts `COUNT` (1000) text views in a single state update, inside a
`ScrollView`. This is a deliberate worst case, not a representative workload:
real apps virtualize. It is useful precisely because it exaggerates the
per-view costs this library exists to reduce.

Four variants are measured so that JS-wrapper cost is separable from native
cost:

| Variant | What it is |
| --- | --- |
| `PlainText` | This library's public component |
| `NativePlainText` | Its bare codegen host component, no JS wrapper |
| `Text` | React Native's `<Text>` |
| `NativeText` | RN's bare `RCTText` host component (`unstable_NativeText`) |

The `PlainText`/`NativePlainText` and `Text`/`NativeText` deltas price each
library's JS wrapper; the `NativePlainText`/`NativeText` delta compares the
native implementations directly.

### Update scenarios

The four buttons above measure *mounting*. The controls on the top row measure
*updating* text that is already on screen, which is a different cost and the
only way to exercise measurement invalidation
([intrinsic-sizing.md](intrinsic-sizing.md#measurement-invalidation-both-platforms)).
They report `interaction`/`commit` on their own line, no memory.

| Control | What changes | Should |
| --- | --- | --- |
| **Large / Regular / Small** | `fontSize` on every mounted item | re-measure all of them |
| **Re-render** | one sibling label, nothing the items receive | re-measure none of them |

They are complements, and they catch opposite failures: a **font size** run near
the empty-screen baseline means invalidation never fires (stale sizes — text
redraws inside its old frame), while a **re-render** run near the font-size
number means it always fires (the override is doing nothing).

Two things make these different from the mount runs:

- **They require a populated tree**, so the "kill the app between runs" rule
  cannot apply. Record what is mounted alongside the number; it is meaningless
  without it. Take the empty-screen baseline first, before mounting anything —
  the screen's own chrome costs a few ms and both runs include it.
- **Neither is a clean zero.** Even a re-render that measures nothing still
  re-runs 1000 React components and clones 1000 shadow nodes. That floor is
  React and Fabric bookkeeping, not this library.

The **Re-render** button puts its press count in its own label on purpose. A
state change that renders an identical tree makes React bail out and Fabric
commit nothing, which measures the absence of the scenario rather than a cheap
one. Changing one sibling inside the same content container forces that
container to be cloned with a new children list, which is what re-owns every
mounted item via `YogaLayoutableShadowNode::adoptYogaChild`.

## Procedure

1. **Release build.** Debug numbers are meaningless here.
2. **Physical device, on Android.** The emulator diverges sharply from real
   hardware and its numbers are not usable. On **iOS a simulator is acceptable**
   for comparing variants: it is not an emulator, it runs the same arm64 binary
   against the same frameworks, and Apple-silicon single-core throughput is in
   the same class as current iPhones. Two limits — it models the UI-thread and
   compositing path poorly, and its memory footprint is not a phone's, so never
   take memory figures from it. Record which you used.
3. **Kill the app between every run.** Memory is a process-footprint delta, and
   a warm process invalidates it. Mounted views from a previous variant also
   change the tree the next one commits into.
4. Press one button, wait for the row to appear (memory is sampled after a
   settle delay), record, kill, repeat.
5. **Report the median of at least 5 runs**, with the range. Single numbers on a
   phone are noise.
6. State the **device and OS version**. Numbers are comparable across variants
   on one device — never across devices or platforms.

## Reading the results

The stats row shows:

```
PlainText: 36.1 KB/view · 35.3 MB total
506 ms interaction · 200 ms commit
initial 142 MB → final 177 MB
```

The update runs share a single line above it, labelled by which one produced it:

```
re-render: 102 ms interaction · 68 ms commit
```

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

It is **not** part of `PlainText`'s public props — `PlainText.native.tsx` never
destructures it, so it only reaches a node through the bare codegen component
(`PlainTextViewNativeComponent`/`NativePlainText`) or through a prop spread
that bypasses the wrapper's type, which is exactly how the perf suite sets it
(see below). It is deliberately generic: `false` means baseline, `true` means
"whatever is currently being tried." What `true` actually _does_ is entirely
up to the experiment wired up at the time — the prop itself carries no fixed
meaning, only a comment in the codegen spec describing the current one.

**One experiment at a time.** This is a single flag, not a registry — that was
a deliberate simplification (a generic multi-flag mechanism was built and then
stripped back down to this). Don't repurpose it to carry two unrelated
experiments simultaneously; finish and unwire one before starting the next.

## Current state

Unread on both platforms. The prop was last used to A/B Android's off-screen
measuring view — `PlainTextViewManager.measureView()` reusing one `ThreadLocal`
view (baseline) vs. constructing a fresh one per node (experiment). Baseline
won, `measureView()` is unconditional again, and nothing currently reads
`experiment` — same as `textAlignVertical` on iOS, declared but inert until
something needs it. See [sync-points.md](sync-points.md#the-reused-measuring-view)
for that experiment's history.

## Wiring up a new experiment

1. **Update the comment** in `src/PlainTextViewNativeComponent.ts` above
   `experiment` to say what `true` means _now_ — the next reader has no other
   way to know, since the type itself never changes.
2. **Decide which platform(s) it applies to.** Asymmetric is fine and already
   the norm (the measuring-view experiment was Android-only). Only wire the
   platform(s) the experiment actually concerns.
3. **Read the value where the behavior lives:**
   - **Affects measurement** (what `measureContent`/`measure()` computes, or
     which code path computes it): Android already serializes `experiment`
     into the `props` `ReadableMap` passed to `PlainTextViewManager.measure()`
     (`PlainTextMeasurementsManager.cpp` — `if (props.experiment) { ... }`), so
     read it there with the same `props?.hasKey(...)` pattern every other
     measured prop uses. On iOS, read `props.experiment` directly in
     `PlainTextShadowNode::measureContent`.
   - **Affects the mounted view** (rendering, not sizing): implement real
     logic in `PlainTextViewManager.setExperiment` (Android, currently a
     no-op) and read `newViewProps.experiment` in `RNPlainText.mm`'s
     `updateProps:` (iOS).
   - An experiment can need both — measurement and the mounted view must still
     agree per the _three-way default contract_
     ([sync-points.md](sync-points.md#the-three-way-default-contract)) if it
     affects measured size.
4. **Drive it from the perf suite.** `example/src/screens/PerformanceScreen.tsx`
   already has a `Params` row for it (`ATTRIBUTES`, `key: 'experiment'`,
   options `(none)` / `baseline` / `experiment`) with `target: 'prop'`, which
   flows through `buildApplied`'s generic prop bucket and spreads via
   `{...extra}` onto both the `PlainText` and `NativePlainText` render
   branches. **No perf-suite changes are needed** to reuse it — update that
   row's comment (same reasoning as step 1) if what `true` means changed.
5. **Run the comparison** using [measuring.md](measuring.md)'s procedure:
   release build, kill the app between runs, one variant per run, same config
   otherwise.

## Concluding an experiment

Don't leave the winner behind a runtime flag — that's a permanent branch and a
permanent cost-policy violation waiting to happen (see
[performance.md](performance.md#prop-cost-policy)).

1. **Make the winning behavior unconditional.** Delete the branch, not just
   the default — mirror how `measureView()` was restored to always share the
   view once fresh-per-node lost.
2. **Revert anything wired only for the losing path** (a no-op setter is fine
   to leave, per step 3 above, but dead branches and helper functions are
   not).
3. **Leave `experiment` declared but unread again**, ready for the next test —
   don't remove the prop itself; rebuilding this plumbing per experiment is
   the thing this mechanism exists to avoid.
4. **Update this doc's "Current state" section and
   [sync-points.md](sync-points.md#the-reused-measuring-view)** with what was
   tried and what was decided, the way the measuring-view entry does — a
   history trail here is what tells the next agent an idea's already been
   tested, and what it cost to find out.

# Performance notes

What has been optimized, what was tried and rejected, and the mechanisms behind
both. Read [measuring.md](measuring.md) first for what the numbers mean.

Release builds, 1000 views mounted in one state update, app killed between runs.
Directional, not a controlled benchmark.

**Every comparison in this document is within one device.** `PlainText` vs
`Text`, or one version of `PlainText` against another, on the same hardware.
Nothing here compares iOS to Android, and no number on one platform's table
means anything held against the other's, different devices, and in some
sections a simulator against a phone. Optimization decisions follow from the
within-device deltas only.

## Prop cost policy

Two rules, both binding on every new prop or style.

- **An unused prop costs a check.** A prop left at its default must not
  allocate, resolve a font, build a string, force a second pass, or reach a
  platform setter that does any of those. A comparison and an early return is
  the whole budget. This is what keeps the component cheap for the common case,
  where a node sets three or four values out of the seventeen on offer. Every
  prop today holds to it, so a new one that can't is the exception and needs an
  argument, not a footnote.
- **Estimate the cost of a prop that is set, and record it.** Rate it light,
  medium or heavy by the table below, and if it is medium or heavy say so in a
  `Cost:` line beside it in `src/PlainTextViewNativeComponent.ts` and add it to
  the ratings table below. An unrated prop reads as light, so leaving a medium
  one unmarked is a silent claim that it is free.
- **Mark the call the cost is actually in**, with `// EXPENSIVE: {reason}` on the line
  above it. Platform setters do not read as expensive, so a rating in this file is not
  enough on its own: a reader in the native source has to be able to see which call
  allocates, derives, or invalidates a layout, and which one only looks like it does.
  `grep -rn 'EXPENSIVE:'` should return every such call. Where the obvious suspect is
  in fact cached, say that too, or the next reader will guard the wrong line.

| Tier       | Means                                                                                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **light**  | A comparison and at most one primitive write per apply. No allocation. This is what a prop mapping onto a single platform setter should cost.            |
| **medium** | Allocates per apply or per content build, or pushes the whole node onto a more expensive path. Acceptable when the cost is cached or paid once per node. |
| **heavy**  | Scales with text length, runs more than once per commit, or defeats a cache. Needs a measurement before it lands, not after.                             |

Nothing is heavy today. `adjustsFontSizeToFit` would be the first, which is part
of why it is still in [todo.md](todo.md).

| Prop                    | Cost   | Why                                                                                                                                                                      |
| ----------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `fontFamily`            | medium | First resolution hits the system font database on iOS and the asset lookup on Android. Cached after, per family and size.                                                |
| `fontVariant`           | medium | A descriptor round trip on an iOS cache miss, and a fresh string plus an unguarded paint write per apply on Android.                                                     |
| `fontVariationSettings` | medium | A `CTFont` copy on an iOS cache miss. On Android it derives a new `Typeface`, and any typeface change re-derives it, twice, since clearing the old axes derives as well. |
| `lineHeight`            | medium | Forces the iOS attributed-string path and an Android `SpannableString` with a span, in place of a plain string.                                                          |
| `letterSpacing`         | medium | Forces the iOS attributed-string path. The Android side is one paint write.                                                                                              |
| `textDecorationLine`    | medium | Forces the iOS attributed-string path. The Android side is two paint flags.                                                                                              |
| `textShadow*`           | medium | Forces the iOS attributed-string path. The Android side is one `Paint.setShadowLayer` call.                                                                              |
| `textTransform`         | medium | Allocates a transformed copy of the string per apply on both platforms; `capitalize` additionally walks word boundaries.                                                 |
| everything else         | light  | One write, or one entry in the font cache key.                                                                                                                           |

Four of those are medium for the same reason, and it is worth knowing as one
fact rather than four: `applyContentFromProps` takes its plain path only when
`lineHeight`, `letterSpacing`, `textDecorationLine` and `textShadow` (via
`hasTextShadow`) are all unset. Any one of them puts the node on the
`NSAttributedString` path for good. A further prop that needs an
attributed-string attribute is therefore free on top of the first, and that is
the argument for expressing a new iOS text feature as one if it has the choice.

### Where the "unused is free" rule gets tested

- **The reused measuring view sets every size-affecting prop on every call**, at
  its default when absent ([sync-points.md](sync-points.md#the-reused-measuring-view)).
  So an unused prop is not skipped there the way Fabric skips it on the mounted
  view. Its setter runs once per node per measure pass with the default value,
  which is exactly why a setter must early-out on that value without allocating.
- **iOS diffs the whole prop set on every update.** `updateProps:` compares
  every content prop whether or not it is used, so the check is already paid.
  What must not grow is the work behind the check.
- **Android's flush is dirty-flag driven**, so an unused prop is one flag test.
  A prop that instead compares its own last-applied value
  (`fontVariationSettings`) must make that comparison the first thing it does.
- **The dirty flag is worth nothing on the measuring path.** `measure()` sets every
  size-affecting prop unconditionally, so every flag is always set and every batched
  apply always runs. `applyTypeface` therefore carries its own identity guard on the
  resolved `Typeface` (`appliedBaseTypeface`), which holds because
  `ReactTypefaceUtils.applyStyles` interns its results: `ReactFontManager`'s caches
  for a custom family, `Typeface`'s static style and weight caches otherwise. What it
  actually saves is narrower than it looks, and the call chain is marked in the source
  at `applyTypeface`: not `applyStyles` (cached) and not `setTypeface` (which
  early-outs on its own identity check, `TextView.java:4851`), but the
  `appliedVariationSettings` reset, which made `applyVariationSettings` redo two
  uncached native `Typeface` derivations per node. The guard's ordering obligations are
  in [sync-points.md](sync-points.md).

## Where things stand

### Android: Pixel 3, physical device

Release build, mount 1000 views in one state update, mean of 3 runs at each
font size, same methodology and Large/Regular/Small tiers as the iOS table
below.

|          | `PlainText` mem | `PlainText` interaction | `Text` mem  | `Text` interaction | `NativeText` mem | `NativeText` interaction |
| -------- | --------------- | ----------------------- | ----------- | ------------------ | ---------------- | ------------------------ |
| Large    | 35.3 KB         | 503.7 ms                | 53.2 KB     | 718.0 ms           | 50.0 KB          | 673.7 ms                 |
| Regular  | 35.4 KB         | 504.7 ms                | 52.7 KB     | 724.3 ms           | 50.1 KB          | 675.0 ms                 |
| Small    | 35.1 KB         | 502.0 ms                | 52.9 KB     | 716.3 ms           | 50.4 KB          | 675.7 ms                 |
| **mean** | **35.3 KB**     | **503.4 ms**            | **52.9 KB** | **719.6 ms**       | **50.2 KB**      | **674.8 ms**             |

`PlainText` vs `Text`:

|             | mem        | interaction |
| ----------- | ---------- | ----------- |
| Large       | -33.6%     | -29.9%      |
| Regular     | -32.8%     | -30.3%      |
| Small       | -33.6%     | -30.1%      |
| **average** | **-33.3%** | **-30.1%**  |

`NativeText` vs `Text` is again mostly flat across sizes (-4.8% to -6.1% mem,
-6.2% to -6.8% interaction), the same read as iOS below: most of `PlainText`'s
margin over `Text` is the native implementation, not its JS wrapper.

Unlike iOS, **memory and interaction barely move across font sizes** here: the
three rows differ by well under 1%. `TextView` measurement cost scales with
string content and layout, not directly with `UIFont`/`NSAttributedString`
construction the way iOS's does, so a bigger font doesn't add proportionally
more work on this platform.

This mean-of-3 measurement replaces the single-run `interaction` figure this
section used to report, including the earlier `Text` number that had been
derived from a pre-Event-Timing measurement rather than read directly, these
are real, repeated Event Timing runs. The `commit` (JS-thread) breakdown and the
`NativePlainText` comparison below are still from that single earlier run and
haven't been repeated per size:

|                    | `PlainText` | `NativePlainText` | `Text`  | `NativeText` |
| ------------------ | ----------- | ----------------- | ------- | ------------ |
| commit (JS thread) | ~200 ms     | ~175 ms           | ~324 ms | ~272 ms      |

Starting point for the same scenario was ~450 ms commit and ~687 ms to painted.

### iOS: iPhone 16, physical device

Release build, mount 1000 views in one state update, median of 3 runs at each
font size. Font size matters because it changes how much text pipeline there is
to skip: Large is a headline-scale size, Regular is body text, Small is a
caption, the same three tiers the example app's Large/Regular/Small buttons
mount.

|         | `PlainText` mem | `PlainText` interaction | `Text` mem | `Text` interaction | `NativeText` mem | `NativeText` interaction |
| ------- | --------------- | ----------------------- | ---------- | ------------------ | ---------------- | ------------------------ |
| Large   | 148.6 KB        | 165.0 ms                | 197.6 KB   | 210.3 ms           | 196.5 KB         | 202.0 ms                 |
| Regular | 49.6 KB         | 144.3 ms                | 58.4 KB    | 170.7 ms           | 57.1 KB          | 162.3 ms                 |
| Small   | 34.5 KB         | 142.0 ms                | 42.6 KB    | 164.0 ms           | 41.0 KB          | 155.7 ms                 |

`PlainText` vs `Text` (its JS wrapper included both sides):

|             | mem        | interaction |
| ----------- | ---------- | ----------- |
| Large       | -24.8%     | -21.6%      |
| Regular     | -15.1%     | -15.4%      |
| Small       | -19.1%     | -13.4%      |
| **average** | **-19.7%** | **-16.8%**  |

`NativeText` vs `Text` isolates the wrapper cost from the native win: it is
mostly flat, -0.6% to -3.8% on memory and -4.0% to -5.1% on interaction across
sizes, RN's own bare host component barely beats its JS-wrapped form here, so
almost all of `PlainText`'s margin over `Text` is the native implementation, not
avoiding a JS wrapper.

The win grows with font size rather than shrinking: Large shows the largest gap
on both memory and time, Small the smallest. A bigger font means a longer
`NSAttributedString` and more `NSLayoutManager` work for `Text` to build. `PlainText`
skips that pipeline regardless of size, so the delta it avoids scales with it.

This mount-level view replaces the earlier simulator-based numbers for this
platform. The table above is memory and interaction only, but a device run of
the `commit` split at Large now exists, taken while measuring the wrap-detection
work:

| mount 1000, Large | interaction | commit  | UI thread (derived) |
| ----------------- | ----------- | ------- | ------------------- |
| before            | 165 ms      | 64.5 ms | ~100.5 ms           |
| after             | 161 ms      | 59 ms   | ~102 ms             |

**About 62% of iOS interaction is the UI-thread half**, and it did not move,
as expected, since that change was commit-side only. That answers the question
the _iOS mount path_ row in [Open opportunities](#open-opportunities) was
waiting on: the remaining headroom is in mounting, not measuring. Single runs at
one font size. The other sizes and the update scenarios are still
interaction-only.

## What changed, in order

| Change                                             | Platform | Effect                                                                  |
| -------------------------------------------------- | -------- | ----------------------------------------------------------------------- |
| Reuse the off-screen measuring view                | Android  | commit 450 → 230 ms                                                     |
| C++ micro-optimizations in the measure hop         | Android  | commit 230 → 200 ms                                                     |
| `requestLayout` scoping + batched prop application | Android  | mount half 488 → 307 ms (interaction 687 → ~505 ms)                     |
| `shouldNewRevisionDirtyMeasurement` override       | both     | ancestor re-render of 1000 mounted items: ~165 → 68 ms commit (Pixel 3) |
| Skip the second layout when the text fits          | iOS      | commit 64.5 → 59 ms (iPhone 16, Large)                                  |

Each of these moved one half or the other, never both, which is why the
`interaction`/`commit` split is worth keeping: the first two and the last are
commit-side, the `requestLayout`/batching work is mount-side.

## Implemented

### Reuse the off-screen measuring view (`PlainTextViewManager.kt`)

`measure()` allocated a fresh `PlainTextView` per node. Constructing an
`AppCompatTextView` is expensive: theme attribute resolution for the text
style, `AppCompatTextHelper`, emoji/tint helpers, roughly 100–200 µs, which
dominated the layout pass. It is now a `ThreadLocal` scratch view, rebuilt only
when the `Context` changes.

This was the single largest win. RN's own `<Text>` never constructs a view to
measure at all (`TextLayoutManager` uses a `ThreadLocal<TextPaint>` and a
`StaticLayout`), which is why it was faster here despite a slower commit.

The scratch view is held through a `WeakReference`, because reuse means holding a
`Context`. `FabricUIManager.measure` hands us the surface's `ThemedReactContext`,
whose base is the Activity, and no ViewManager hook tells us a surface stopped:
`onSurfaceStopped` is gated on `enableViewRecycling` (see
[below](#view-recycling)) and `trimMemory()` is package-private to RN. A strong
reference therefore retained a destroyed Activity until some other surface
measured, which for an app whose `ReactHost` outlives its Activity is the rest of
the session. Weakly held, the view is only reachable inside one `measure()` call,
so the cost is a rebuild per GC that lands mid-pass, bounded by GC frequency,
not by node count. With two live surfaces the `Context` identity check alternates
per commit rather than per node (Fabric serializes layout per thread, so every
call within one pass shares a surface), so the reuse win holds there too.

Reuse forced three fixes, all documented as invariants in
[sync-points.md](sync-points.md#the-reused-measuring-view): every
size-affecting prop must be set unconditionally on each call. Nothing in the
view may derive new state from its own current state (this is why
`updateTypeface()` resolves against a fixed `baseTypeface`, it was leaking one
node's font family into the next), and the scratch view needs `isMeasureOnly`
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
its draw `Layout`. It fired on _every_ `requestLayout`, including during initial
mount, where the view has no frame yet, so it measured at 0×0, and where Fabric
already calls `measure()` + `layout()` itself after applying props
(`SurfaceMountingManager.updateLayout`). With ~18 prop setters each triggering a
`requestLayout`, that was ~18,000 wasted runnables per 1000 views.

Now guarded on `width`/`height` being non-zero. What the hack actually covers is
the other case: a prop change on a laid-out view whose size doesn't change, where
Fabric emits no `updateLayout`.

The update path had the same redundancy the `width`/`height` guard removed from
the mount path, and the guard can't see it: at `post` time nothing yet says
whether a size change is coming, and the mount items that would say so,
`UpdatePadding`, then `UpdateLayout`, are ordered after props deliberately
(`FabricMountingManager.cpp`). So any prop change that _did_ resize the view
rebuilt its `Layout` twice: once in Fabric's `measure()` + `layout()`, once more
in the runnable a message loop turn later.

The runnable now re-checks at the point where the answer exists, by reading
`isLayoutRequested`. `View.layout()` clears `PFLAG_FORCE_LAYOUT` unconditionally,
so a still-set flag means no `updateLayout` arrived, and nothing else can clear
it behind Fabric's back, since `ReactRootView.requestLayout()` is a no-op
terminator and no ancestor drives a layout pass over these views. Mount is
unaffected. The `width == 0` guard already bailed there.

### Coalesce the re-layout post without `removeCallbacks` (`PlainTextView.kt`)

Coalescing the ~18 `requestLayout`s a transaction produces into one runnable used
to be `removeCallbacks` + `post`. `View.removeCallbacks` walks the entire
`MessageQueue` under its lock looking for the runnable, then walks the
`HandlerActionQueue` too, a linear scan per call, so re-rendering 1000 laid-out
views meant thousands of queue traversals to schedule at most 1000 runnables.

A `relayoutPosted` boolean gives the same coalescing for a field read. It is
cleared at the _start_ of the runnable rather than the end, so a `requestLayout`
raised from inside `measure()`/`layout()` can queue a fresh one instead of being
swallowed. That can't spin, because the trailing `layout()` clears
`PFLAG_FORCE_LAYOUT` and the re-posted runnable falls out at the
`isLayoutRequested` check above.

If the view is detached with a runnable pending, `post` has already parked it in
the `HandlerActionQueue`, which Android drains on re-attach, so the flag clears
on the next attach, or never, on a view that is never coming back.

### Batch prop application (`PlainTextView.kt` + `onAfterUpdateTransaction`)

Fabric applies props one setter at a time and several feed the same expensive
operation: three font props each re-resolved the typeface, and
`text`/`lineHeight`/the scaling knobs each called `setText`. Those setters now
record state and set a dirty flag. `flushPendingUpdates()` does the work once, from
`onAfterUpdateTransaction` (which `ViewManager.updateProperties` calls after the
whole transaction) and before the off-screen measure, never from the view's
`init`, which seeds the two values it needs itself (see
[sync-points.md](sync-points.md#construction-time-state)).

Mirrors how RN's `<Text>` applies a single prebuilt `ReactTextUpdate`.

### Cache the derived `fontVariationSettings` `Typeface` across views (`PlainTextView.kt`)

**Not measured yet**, opened by a real-device report: mounting 1000 `PlainText`
at the bundled variable font plus one shared axis value went from ~580 ms to
~5163 ms and 39.3 KB/view to 421 KB/view on a Pixel 3, release build, far past
what the per-node cost in the ratings table above predicts. Wants the same
Pixel 3 run per [measuring.md](measuring.md) to close.

`appliedVariationSettings` and `applyTypeface`'s identity guard each stop only
one view from redoing its own work. N mounted views at the same font and axes
(a list of rows at one weight) each start uncached, so each pays for its own
native `Typeface` derivation, the cost
[native-gotchas.md](native-gotchas.md#L151-242) flags as unmemoized below API 36.

`applyVariationSettings()` now checks a small `LruCache<VariationCacheKey,
Typeface>` keyed on `(appliedBaseTypeface, settings)` first. A hit assigns the
cached `Typeface` directly: one `setTypeface`, not two native derivations. A
miss pays the existing cost once, then populates the cache by reading `paint`
(not `typeface`, `setFontVariationSettings` only writes `mTextPaint`).
Bounded the same way as the iOS font cache
([above](#share-and-cache-ios-font-resolution-iosplaintextfonthmm)), since axis
strings are a continuous value an animating screen could otherwise grow this
without limit.

Accepted divergence: a cache-hit assignment goes through
`TextView.setTypeface`, which (unlike deriving it yourself) updates the base
`getTypeface()` reports. Only shows on the OS Bold-text toggle: a cache-missed
view drops its axes, a cache-hit view keeps them.

### Guard `applyTypeface` on the resolved typeface (`PlainTextView.kt`)

**Not measured yet.** The mechanism is clear and the correctness half of it is
required regardless (see [sync-points.md](sync-points.md)), so it landed without a
number. It wants a Pixel 3 run per [measuring.md](measuring.md), on a screen setting
`fontVariationSettings`, which is where nearly all of the saving is.

Batching buys nothing on the measuring path: `measure()` sets `fontFamily`,
`fontWeight` and `fontStyle` unconditionally, so `dirtyTypeface` is always set and
`applyTypeface` ran per node.

Be precise about what that cost, because two of the three plausible answers are
wrong. `applyStyles` is cached. `setTypeface` early-outs on
`mTextPaint.getTypeface() != tf` (`TextView.java:4851`), so re-assigning the same
resolved typeface was already nearly free. The real cost was the
`appliedVariationSettings = null` reset, which made `applyVariationSettings` redo
both of its `Paint` calls, and **each one derives a `Typeface`**: one to clear the
old axes, one to apply the new, plus a `fromFontVariationSettings` parse and an
`isSupportedAxes` call per axis. Both derivations reach
`nativeCreateFromTypefaceWithVariation` and minikin, and nothing memoizes them until
API 36 puts an `LruCache` behind `Flags.typefaceCacheForVarSettings`.

That also means the `setTypeface` was only reached by an axis-carrying node in the
first place: for those, the live typeface is the axis-derived one, so `!= tf` passes
and it does `nullLayouts()` + `requestLayout()` + `invalidate()`. A node without axes
gains only `setTypeface`'s preamble, which is one field write plus a cached
`Typeface.create` when the OS bold-text setting is on. Do not describe the guard as
a win for every node.

**It also only pays off when consecutive measured nodes carry the _same_ axes**, which
is the realistic shape (a list of rows all at one weight): there the whole path
early-outs to a string compare and costs nothing. When the axes differ per node the
guard saves only a cached `applyStyles` lookup, because `applyVariationSettings` then
does the same restore, clear and apply that `applyTypeface` used to do. The Features
screen's variable-font rows each use a different value, so benchmarking there would
measure the case with no win in it.

`applyTypeface` now compares the resolved `Typeface` against
`appliedBaseTypeface` by identity and returns early when they match, so consecutive
measured nodes sharing a font cost one reference compare. Identity is the right
comparison because `applyStyles` interns everything it returns. It cannot compare
the live `typeface`, which is the axis-derived one once
`fontVariationSettings` is in play, the same reason `appliedBaseTypeface` exists
at all.

### Share and cache iOS font resolution (`ios/PlainTextFont.{h,mm}`)

`RNPlainTextFontFromProps` in `RNPlainText.mm` and a hand-duplicated copy in
`PlainTextShadowNode::measureContent` resolved the same `UIFont` from the same
props, so mounting 1000 items ran 2000 uncached resolutions for what is usually
a single distinct font. Both now call `plainTextFont`, backed by an `NSCache`
keyed on the only six inputs that reach `UIFont`: family, size, weight, italic,
variants and variation settings.

Resolution is not free, which is why RN caches its own system fonts the same way
(`RCTFont.mm`, `cachedSystemFont`). `UIFont` and `NSCache` are both thread-safe,
so the shadow thread and the main thread share one cache.

The custom-family path is the expensive one, and got more so when face selection
started mirroring `RCTFont.mm` face by face (for the parity reasons in that file's
comments) instead of matching one font descriptor: a miss over N faces
instantiates N fonts, queries 2N symbolic traits and runs N `RCTGetFontWeight`
calls. Two more caches and a short-circuit keep that off the hot path:

- **The family's face names, per family.** `+[UIFont fontNamesForFamilyName:]`
  enumerates the font database. RN calls it expensive and wraps it identically.
- **The winning face, per family/weight/style rather than per size.** Every input
  the comparison reads belongs to the face, so the scan runs at a fixed probe size
  and only the instantiation uses the real one. Without this, each new size re-ran
  the scan to reach a name it already knew, and a type scale or a Dynamic Type
  step is several new sizes.
- **A single-face family skips the scan**, since the loop's result is provably
  that one name. That is the shape of most custom and expo-registered fonts.

The font cache has a `countLimit` because its key includes two continuous inputs,
`fontSize` and the axis values in `fontVariationSettings`, which an app animating
either would otherwise walk through without bound.

This is the iOS counterpart to Android's batched typeface resolution, and unlike
the changes above it _removes_ a sync point rather than adding one: the two
copies had to stay identical or the measured box wouldn't fit the drawn text.
The cache clears on `kCTFontManagerRegisteredFontsChangedNotification`, so a font
registered at runtime (expo-font) doesn't leave the earlier fallback cached.

Not yet measured. The font path is a small share of an iOS commit dominated by
CoreText layout.

### Skip iOS's second layout when the text fits (`ios/PlainTextShadowNode.mm`)

`measureContent` needs two things: the size, and whether the text wrapped (RN
reports the full constraint width when it did, the tight width when it didn't).
It used to get them from two unconditional `boundingRectWithSize:` calls, the
constrained one for the size, an unconstrained one purely to compare heights.

Reversing the order makes the second call conditional. Measure unconstrained
first: with no width limit the engine breaks only at hard breaks, so that width
is exactly the width the text needs in order _not_ to wrap.

- `unconstrained.width <= constraint` → it already fits, so constraining to a
  width it never reaches cannot move a line break. The constrained layout would
  be identical, and the unconstrained result is the answer. **One layout.**
- Otherwise it wraps, which fixes the width at the constraint and leaves only
  the height to measure. **Two layouts, as before.**

The `textDidWrap` flag disappears: the branch is the flag.

What makes this different from the proxies below is that it adds no new way of
computing anything. Both numbers still come from `boundingRectWithSize:`, so
CoreText's line-breaking rules are inherited rather than predicted. The one
assumption is a property of line breaking, not of any API: text that already
fits does not break differently given more room.

Verified equivalent by probing both algorithms over 11 strings × 55 constraint
widths, 605 combinations, zero differences in reported width or height, and
67% of them served by a single layout. (An artificial spread. A screen of short
labels in a wide container is closer to 100%, which is what the benchmark
mounts.)

iPhone 16, physical device, mount 1000 at Large, single runs:

|                                                                                                           | interaction | commit    |
| --------------------------------------------------------------------------------------------------------- | ----------- | --------- |
| Two unconditional layouts (baseline)                                                                      | 165 ms      | 64.5 ms   |
| **Skip the second when it fits**                                                                          | **161 ms**  | **59 ms** |
| Widest-paragraph proxy ([rejected](#replacing-ioss-second-boundingrectwithsize-with-a-cheaper-wrap-test)) | 169 ms      | 69.5 ms   |

**~8.5% off commit.** Worth putting the three rows side by side: the same
second layout that a cheaper proxy could not profitably replace is worth 5.5 ms
to skip outright when it is provably unnecessary. The saving was never in
computing the wrap answer faster: it was in not needing to ask.

### Skip measurement invalidation on structural clones (both platforms)

The largest structural inefficiency, and invisible in a cold-mount benchmark:
**any ancestor re-render re-measured every mounted `PlainText`**.

`YogaLayoutableShadowNode::adoptYogaChild` clones every child of a changed
parent purely to re-own its Yoga node (a Yoga node can only have one owner), and
the base `shouldNewRevisionDirtyMeasurement` returns `true` unconditionally, so
each clone dirtied its measurement. RN's `ParagraphShadowNode` overrides it to
`fragment.props != nullptr`. Ours goes further and compares the props
measurement actually reads (`cpp/PlainTextMeasurementHelpers.{h,cpp}`, shared by
both platforms), so a revision changing only e.g. `color` also keeps its size.

The comparison runs in the shadow node's **clone constructor**, and the override
just returns the cached verdict. It cannot run in the override itself:
`completeClone` calls that with the _new_ node, whose props are already the new
ones. [intrinsic-sizing.md](intrinsic-sizing.md#where-the-comparison-has-to-happen)
has the details. The paragraph below has the history.

#### What it costs, measured

Release build, Pixel 3, single runs. The Performance screen's **Re-render** and
font-size buttons measure updates to text already on screen, so these are
directly comparable. See [measuring.md](measuring.md#update-scenarios).

| With 1000 `PlainText` mounted                         | interaction | commit   |
| ----------------------------------------------------- | ----------- | -------- |
| Empty screen (baseline, nothing mounted)              | 28 ms       | 9 ms     |
| **Re-render**: ancestor changes, item props identical | 102 ms      | 68 ms    |
| **Font size**: every item's measurement inputs change | 323 ms      | 165 ms   |
| _Add 1000, for scale_                                 | _497 ms_    | _195 ms_ |

Reading the commit column, which is where measurement happens:

- **9 → 68 ms** is what re-owning 1000 shadow nodes costs with the override in
  place: 1000 React components re-rendered, 1000 shadow nodes cloned, Yoga
  re-parented. Irreducible bookkeeping, no measurement.
- **68 → 165 ms** is the extra work when the props genuinely change: prop
  diffing and payload creation, plus 1000 real measurements. Measurement is
  most of it.

So the override saves most of ~97 ms of commit on _every_ ancestor re-render,
and the earlier `1000 → 0` framing holds: had it not worked, the Re-render row
would sit up near the font-size row instead of at 40% of it.

It also refines where commit time goes. Measurement is a large share of it but
not the ~85% a font-size run alone suggests, closer to 60%, with React and
Fabric bookkeeping accounting for the rest. Worth remembering before optimizing
the measure hop again.

#### History: the first version never invalidated anything

The override originally ran its comparison inside
`shouldNewRevisionDirtyMeasurement`, where `completeClone` supplies the _new_
node, so it compared the new props against themselves, always returned
`false`, and no prop change ever dirtied measurement. Symptom: with 1000 items
mounted, changing the font size left every label at its old size. Fixed by
moving the comparison into the clone constructor. The numbers above are from
after the fix.

## Considered and rejected

Each of these has a revisit trigger. They are summarized in
[Open opportunities](#open-opportunities) below.

### Measure via `StaticLayout`/`BoringLayout` instead of a `TextView`

RN's approach. **Rejected**, for three reasons that compound:

- `TextLayoutManager` is Kotlin `internal` and takes RN's private `MapBuffer`
  serialization, so it can only be _reimplemented_, not called.
- After view reuse, the remaining delta is small: `TextView.measure()` already
  builds a `BoringLayout`/`StaticLayout` internally and takes the boring fast
  path for single-line text.
- Cold vs warm measurement (85 µs vs 59 µs per node) suggests a meaningful share
  of the cold cost is Minikin's word-level shaping cache, which sits underneath
  both approaches and would not be avoided.

Against that: measurement would have to replicate `TextView.makeNewLayout()`
exactly, and every parameter is a place where measure and draw can silently
drift apart, the failure mode being clipped or over-tall text.

Revisit only if profiling shows measurement dominating again.

### View recycling

**Not implemented**, because it currently does nothing. `setupViewRecycling()`
is gated on `ReactNativeFeatureFlags.enableViewRecycling()`, which defaults to
**false** on RN main (checked at `eb4d389`, 2026-07-21) despite being added
2024-07-31 with `expectedReleaseValue: true`. The per-component flags
(`enableViewRecyclingForText`, `ForView`) default true but are inner gates, so
in a stock app **not even RN's `<Text>` recycles**.

It also buys nothing on a cold mount: the pool starts empty. The value is in
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
wrapper costs ~50 ms over `NativeText`, ours is already cheaper.

### Caching measurement results

An LRU keyed on the size-affecting props plus constraints, in the C++ manager,
so hits skip JNI entirely. **Not implemented**: zero benefit in this benchmark
(1000 unique strings). Plausible win for real screens with repeated labels.

### Replacing iOS's second `boundingRectWithSize:` with a cheaper wrap test

`measureContent` used to run `boundingRectWithSize:` twice unconditionally, the
second one purely to answer _did this wrap?_ Replacing that second layout with a
cheaper way of computing the same answer looks like an obvious win. **Built,
measured, reverted: it was slower.**

(The second layout is now skipped when the text fits, by
[reordering the two calls](#skip-ioss-second-layout-when-the-text-fits-iosplaintextshadownodemm),
a different change, and one that adds no new way of computing anything.)

iPhone 16, physical device, mount 1000, isolating this change against `main`:

|                                       | interaction | commit  |
| ------------------------------------- | ----------- | ------- |
| Second `boundingRectWithSize:` (kept) | 165 ms      | 64.5 ms |
| Widest-paragraph width comparison     | 169 ms      | 69.5 ms |

Roughly 8% worse on commit. The replacement was `enumerateSubstringsInRange:`
`ByLines` plus `sizeWithAttributes:` per run, the iOS analogue of Android's
`Layout.getDesiredWidth`, which is what RN Android compares against the
constraint instead of computing a wrap flag at all. In hindsight the mechanism
is plain: that is ICU line segmentation _and_ a measurement that builds its own
layout machinery, i.e. two costs where the second `boundingRectWithSize:` is
one.

It was also wrong twice before it was fast enough to reject, and both errors
were found by a throwaway probe rather than by reading the code:

- `ByParagraphs` does not split on U+2028, which the text engine still breaks at.
- `sizeWithAttributes:` counts trailing whitespace where line breaking hangs it,
  so the test over-reported wrapping in a narrow band. The obvious fix, trim
  trailing whitespace, turned out to break the other two cases, because iOS
  drops that whitespace in exactly one shape (see
  [native-gotchas.md](native-gotchas.md#cross-platform)).

**The reason the second layout wins is the reason to keep it.** It asks the same
engine the same question, so it inherits CoreText's line-breaking rules for
free. Every cheaper proxy has to _predict_ them, and there is no reason to think
two quirks was all of them.

Two further alternatives, not measured:

- **Infer the line count from `height / perLineHeight`** and compare against a
  count of `\n`. Genuinely free, and it shipped briefly, but font fallback
  breaks the even division and a trailing newline needs a deliberate bias.
- **`NSTextStorage`/`NSLayoutManager` line fragments**, what RN's
  `RCTTextLayoutManager` does (`:536-570`), exact from a single layout. It sets
  `usesFontLeading = NO` and measures through TextKit, right for RN, which
  _renders_ through TextKit, wrong here. `PlainText` draws into a `UILabel`, and
  `boundingRectWithSize:` is the CoreText path that matches it.

Revisit only with a profile showing iOS measurement dominating, and measure
before believing it.

### Removing the `requestLayout` hack entirely

**Not possible.** Fabric's `updateLayout` covers the mount path, but a prop
change on a laid-out view whose size doesn't change emits no `updateLayout`, and
nothing else rebuilds the `TextView`'s draw `Layout`.

### Guarding the `fontFeatureSettings` write (`PlainTextView.kt`)

`setFontVariant` applies inline rather than through a dirty flag, so it runs per node
per measure pass on the shared measuring view with a string
`ReactTypefaceUtils.parseFontVariant` allocates fresh each call. That looks like it
should be guarded, because `TextView.setFontFeatureSettings` compares old against new
**by reference**, so its early-out never fires for an equal string.

It buys nothing. `Paint.setFontFeatureSettings` compares with `equals` and returns
before touching `mNativePaint`, so the write and its JNI hop are already skipped, and
the feature string is parsed during shaping rather than at set time. What the
reference comparison fails to skip is only `nullLayouts()` + `requestLayout()` +
`invalidate()`, and on the measuring view the per-node `setText` invalidates the
layout regardless. On mounted views the re-layout post is already coalesced by
`relayoutPosted`.

So the guard would trade a field, and the field-ordering hazard in
[sync-points.md](sync-points.md#construction-time-state), for a saved
`nullLayouts()`. Revisit only if a profile shows layout invalidation in this path.

## Open opportunities

Nothing here is blocked. Each is waiting on a trigger or on evidence that it
matters. Ordered by expected value if its trigger fires.

| Idea                                                                             | Expected value                                                               | Why not yet                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Revisit when                                                                                                        |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **iOS mount path**                                                               | Now the largest known iOS target: ~62% of interaction                        | **Trigger has fired.** The device split at Large puts ~102 ms of a 161 ms interaction on the UI thread against 59 ms of commit, so the remaining headroom is in mounting, not measuring ([above](#ios-iphone-16-physical-device)). Every mount-path fix so far has been Android-only, and nothing checks whether `applyContentFromProps` rebuilds the attributed string more than once per transaction, the exact problem prop batching solved on Android                                                   | Ready now. Start by instrumenting `updateProps:`/`applyContentFromProps` for repeat work within one transaction     |
| **View recycling**                                                               | Nothing on cold mount, real for list churn                                   | `enableViewRecycling` defaults false, so not even RN's `<Text>` recycles ([details](#view-recycling))                                                                                                                                                                                                                                                                                                                                                                                                       | The flag flips, or a consuming app enables it. Do it with the flag on locally and a mount/unmount churn benchmark   |
| **Measurement LRU cache** (C++, keyed on size-affecting props + constraints)     | Skips the JNI hop entirely on a hit                                          | Zero benefit in a benchmark of 1000 unique strings                                                                                                                                                                                                                                                                                                                                                                                                                                                          | A real screen with repeated labels shows measurement cost                                                           |
| **`StaticLayout` measure path**                                                  | Small, now that the view is reused                                           | Parity risk, and Minikin shaping sits under both approaches ([details](#measure-via-staticlayoutboringlayout-instead-of-a-textview))                                                                                                                                                                                                                                                                                                                                                                        | Profiling shows measurement dominating again                                                                        |
| **Custom JNI measure entry** (primitives instead of a `ReadableNativeMap`)       | Removes the per-node map allocation                                          | Default-omission already took most of it                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | The remaining serialization shows in a profile                                                                      |
| **Trim the JS wrapper**                                                          | A few ms per 1000 views                                                      | Most of the 33 ms is one extra React fiber per item, which trimming can't remove ([details](#trimming-the-js-wrapper))                                                                                                                                                                                                                                                                                                                                                                                      | Only if the wrapper delta grows                                                                                     |
| **Skip the axis-clearing derivation when the axes changed** (`PlainTextView.kt`) | Halves the axis-change path: one native `Typeface` derivation instead of two | The unconditional `null` clear is only strictly needed when the new settings string _equals_ the one `Paint` is holding while the typeface changed underneath. With the base typeface restored, an unequal string could be applied directly, since `Paint` would not early-out on it. Guarding on `super.getFontVariationSettings()` expresses that, but it adds a branch to the most order-sensitive function in the file and couples us to `Paint`'s early-out being a string compare on that same getter | The guard above gets its number, or an axis-animating screen (per-frame `fontVariationSettings`) shows in a profile |

## What we don't know yet

Gaps in evidence rather than in implementation. Worth closing before making
stronger claims, or before assuming a change was a win everywhere.

- **iOS mount cost and memory are now measured on a physical device** (iPhone
  16, [above](#ios-iphone-16-physical-device)), confirming the simulator's
  directional read: `PlainText` beats `Text` on both mem and interaction, and
  the win scales up with font size rather than down. The `commit`/UI-thread
  split now exists on device too, but only for `PlainText` at Large, there is
  no device split for `Text`, for the other sizes, or for the update scenarios
  (re-render, font-size-on-mounted), which remain simulator-only.
- **The clone-invalidation override is verified on both platforms.** Prop
  changes re-measure and ancestor re-renders don't. Android confirms it against
  its own baseline (165 vs 68 ms commit, physical device). iOS confirms it
  against a simulator baseline (34 vs 23 ms commit), those two are separate
  results, not a comparison. Visual check passes on both: labels resize, and
  iOS shows no rendering discrepancy against `Text`. No longer an open
  question, kept here only because both are single runs, and the iOS one is
  still simulator-only.
- **Scrolling and steady-state jank are unmeasured.** The harness only does a
  cold mount of 1000 views in one commit. Real apps virtualize. For a long list
  the number that matters is dropped frames during scroll, and nothing here
  reports it. The same `PerformanceObserver` can watch `longtask` entries, which
  would be the cheapest first step.
- **`Text`'s interaction figure is derived** only in the single-run Android
  `commit`/`NativePlainText` table still sitting below the mean-of-3 numbers.
  The mount-level Android and iOS tables above both read `Text` interaction
  directly from Event Timing, no derivation.
- **The `applyTypeface` identity guard has no number.** It landed on mechanism
  ([above](#guard-applytypeface-on-the-resolved-typeface-plaintextviewkt)) because
  its correctness half is mandatory anyway. The claim to close is the commit-side
  saving on a screen setting `fontVariationSettings`, which is where nearly all of
  it is. Two ways to measure nothing: a node without axes was already stopped by
  `TextView.setTypeface`'s own identity check, and a screen whose nodes each use a
  different axis value keeps paying the same derivations under a different name. The
  benchmark wants many nodes sharing one axis value.
- **Nothing about `fontVariationSettings` has been verified on a device below API 36.** The double-derivation cost and the axis-clearing behavior in
  [native-gotchas.md](native-gotchas.md) are both read off AOSP `main` plus the
  minikin fallback, not observed. The behavior is version-gated on a flag, so a
  36-only check proves nothing about the range that matters.
- **Most published numbers are still single runs.** The mount-level mem/
  interaction tables (Android and iOS, both above) are now a mean of 3, closer
  to but still short of the median-of-5 [measuring.md](measuring.md) asks for.
  The `commit`/UI-thread breakdown, `NativePlainText`, and the update scenarios
  (re-render, font-size-on-mounted) remain single runs.

## Mechanisms worth knowing

**Fabric commit and layout run on the JS thread** (`mqt_v_js`). Mounting is
dispatched to the UI thread afterwards. A `useEffect` after a `setState` fires
~11 ms after layout finishes and, in this scenario, ~385 ms _before_ the first
frame. Any JS-side timing therefore excludes mounting, which is why the
original numbers looked like a large win while real time-to-paint was a tie.

**Mount cost scales with item count. Draw cost is bounded by the viewport.**
Android only draws children within the clip bounds, so 1000 mounted views cost
1000 constructions but ~15 rows of drawing. This is why `interaction` (which
ends at mount) captures nearly all the scaling cost here, and why it would not
for a component with expensive per-frame painting.

**Per-node measure cost** on this device: ~85 µs cold, ~59–77 µs warm. Per-view
mount cost after the fixes: ~300 µs.

## Measurement pitfalls hit in practice

- **Instrumentation inside the measured path.** Native measure-batch logging
  added two `System.nanoTime()` calls and an atomic per `measure()`, inflating
  the numbers it existed to explain.
- **Debounced logging misattributes time.** A flush posted to the main looper
  reported a batch as 418 ms when the actual busy time was 77 ms. The rest was
  the flush waiting for a busy main thread. Timestamp the events, never the
  flush.
- **`tid == pid` in logcat is not proof of the main thread**: it was the log
  handler, not the measure calls, which ran on `mqt_v_js`.
- **Two independent metrics agreeing is worth the effort.** The hand-rolled
  frame loop and RN's Event Timing landed on the same instant, differing only by
  a constant ~13–14 ms across variants, which identified that offset as
  input-dispatch latency and justified deleting the hand-rolled one.

## Sync points these optimizations introduced

Three of the changes above traded automatic correctness for speed, and the cost
is manual coupling that nothing verifies: serializing only non-default props
across JNI ([the three-way default contract](sync-points.md#the-three-way-default-contract)),
reusing the off-screen measuring view ([sync-points.md](sync-points.md#the-reused-measuring-view)),
and comparing measurement inputs on clone
([intrinsic-sizing.md](intrinsic-sizing.md#measurement-invalidation-both-platforms)).
Each is marked in code with `// SYNC:` comments:
`grep -rn "SYNC:" src cpp ios android`.

The shared failure mode is the same in all three: correct on first render, wrong
after an update, and silent in between. Worth knowing before optimizing further
in this area, each of these was cheap to add and would be expensive to debug.

[Sharing iOS font resolution](#share-and-cache-ios-font-resolution-iosplaintextfonthmm)
went the other way and removed one, which is the shape to aim for: the two
copies of `RNPlainTextFontFromProps` were a sync point on their own, and folding
them into `plainTextFont` was what made caching worth doing.

# Manual sync points

Places that must be updated together where **nothing verifies them** — no type
error, no failing test, and usually nothing visibly wrong on first render. Every
site carries a `// SYNC:` comment:

```sh
grep -rn "SYNC:" src cpp ios android
```

The shared failure mode is worth internalizing: **correct on first render, wrong
after an update, silent in between.** Review does not reliably catch these.

## Any prop

The four layers in [architecture.md](architecture.md), plus a section on the
Features screen (`example/src/screens/FeaturesScreen.tsx`).

## A prop that affects measured size

Anything the text's width or height depends on — text, font, spacing, line
count. All five, or the box and the text disagree:

| Site | Miss it and… |
| --- | --- |
| `cpp/PlainTextMeasurementHelpers.cpp` → `measurementInputsEqual` | the size goes stale after an update |
| `ios/PlainTextShadowNode.mm` → `measureContent` | iOS measures without it; must mirror `RNPlainText.mm`'s `applyContentFromProps` |
| `android/.../PlainTextMeasurementsManager.cpp` | the prop never reaches the Android measure pass |
| `RNPlainTextManager.kt` → `measure()` | same from the other side — and it must apply props exactly as the mounted view does |
| `RNPlainText.kt` → setter + `flushPendingUpdates()` | the prop is recorded but never applied |

## The three-way default contract

These must all agree, per prop:

1. the default in the generated `Props.h`,
2. the `if (prop != default)` condition in `PlainTextMeasurementsManager.cpp`,
3. the fallback in `RNPlainTextManager.measure()`.

The C++ side omits props still at their default, so an absent key means
"default", not "unset". A mismatch silently measures at the wrong size.

## The reused measuring view

`RNPlainTextManager.measure()` sizes one shared off-screen view rather than a
fresh one per node (see [performance.md](performance.md) for why). That makes
three things load-bearing:

- **Set every size-affecting prop on every call**, with its default when absent
  — otherwise the previous node's value leaks into this one.
- **Nothing in `RNPlainText` may derive new state from its own current state.**
  `applyTypeface()` resolves against a fixed `baseTypeface` for exactly this
  reason: `ReactTypefaceUtils.applyStyles` derives from the typeface passed in
  when `fontFamily` is null, so chaining off the live value let one node's font
  survive into the next.
- **The scratch view needs `isMeasureOnly` and non-null `LayoutParams`** — it
  skips the `requestLayout` re-layout post (which would queue forever on a
  never-attached view), and `TextView.checkForRelayout()` dereferences the
  LayoutParams from the second measurement onward.

## Deferred prop application

Setters on `RNPlainText` record state and set a dirty flag; `flushPendingUpdates()`
does the work. A new prop's setter must mark the flag its work belongs to, and
the flush must apply it in dependency order. A prop that is set but never
flushed silently does nothing; a new read path that doesn't flush first sees
stale state.

Flush happens in `RNPlainTextManager.onAfterUpdateTransaction`, at the end of the
view's `init`, and before the off-screen `measure`.

## Both platforms' shadow nodes

`ios/PlainTextShadowNode.h` and `android/.../PlainTextShadowNode.h` are separate
files with the same traits and overrides. A change to one usually belongs in the
other. Only the invalidation logic is genuinely shared, in
`cpp/PlainTextMeasurementHelpers.{h,cpp}`.

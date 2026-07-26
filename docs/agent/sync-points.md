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
| `PlainTextViewManager.kt` → `measure()` | same from the other side — and it must apply props exactly as the mounted view does |
| `PlainTextView.kt` → setter, plus `flushPendingUpdates()` if its work is batched | the prop is recorded but never applied |

## The three-way default contract

These must all agree, per prop:

1. the default in the generated `Props.h`,
2. the `if (prop != default)` condition in `PlainTextMeasurementsManager.cpp`,
3. the fallback in `PlainTextViewManager.measure()`.

The C++ side omits props still at their default, so an absent key means
"default", not "unset". A mismatch silently measures at the wrong size.

## The reused measuring view

`PlainTextViewManager.measure()` sizes one shared off-screen view rather than a
fresh one per node (see [performance.md](performance.md) for why). Three things
must hold because of that:

- **Set every size-affecting prop on every call**, with its default when absent
  — otherwise the previous node's value leaks into this one.
- **Nothing in `PlainTextView` may derive new state from its own current state.**
  `applyTypeface()` resolves against a fixed `baseTypeface` for exactly this
  reason: `ReactTypefaceUtils.applyStyles` derives from the typeface passed in
  when `fontFamily` is null, so chaining off the live value let one node's font
  survive into the next.
- **The scratch view needs `isMeasureOnly` and non-null `LayoutParams`** — it
  skips the `requestLayout` re-layout post (which would queue forever on a
  never-attached view), and `TextView.checkForRelayout()` dereferences the
  LayoutParams from the second measurement onward.

## Deferred prop application

Setters on `PlainTextView` whose work is **shared with other props** record state
and set a dirty flag; `flushPendingUpdates()` does the work once. That covers
typeface resolution, `setText`, and anything derived from the scaled font size —
the props that used to redo the same expensive work several times per transaction.

A new prop feeding any of that must mark the flag it belongs to, and the flush
must apply it in dependency order. A prop that is set but never flushed silently
does nothing; a new read path that doesn't flush first sees stale state.

Props that map onto a single cheap independent write apply inline — there is
nothing to coalesce, and a dirty flag would only add state to keep in sync. Some
of them (`maxLines`, `justificationMode`) call `requestLayout()` unconditionally,
which the `removeCallbacks`/`post` in `PlainTextView.requestLayout()` collapses to
one re-layout per transaction.

Flush happens in `PlainTextViewManager.onAfterUpdateTransaction` and before the
off-screen `measure` — never in the view's `init`, for the reason below.

## Construction-time state

`PlainTextView`'s `init` seeds `textSize` and `letterSpacing`, because Fabric skips
setters for props still at their default and the off-screen measuring view always
applies both — a view left on the theme's values would render at a size nothing
measured.

Kotlin runs property initializers and `init` blocks in declaration order, so a
field declared **below** `init` still holds its zero-default while `init` runs —
`allowFontScaling` false rather than true, `letterSpacingDip` 0f rather than NaN,
`fontWeight` 0 rather than `UNSET`, a null `baseTypeface`. Anything `init` reads,
directly or through a call, therefore gets that value instead of the written one:
no crash, just the wrong font or size on every view. `init` currently reads only
the first four fields, but which ones it reads is not a property you want a future
edit to have to re-derive, hence the blanket rule.

Two things keep that from happening, and only the first is enforced:

- **Every field is declared in the `State` block above `init`.** For the four
  fields `init` reads, Kotlin's "must be initialized" check makes a violation a
  compile error.
- **`toEffectivePixel` and `calculateLetterSpacing` are pure top-level functions,
  not methods.** This is the unverified half. The check only fires for a field read
  written *inside* `init`; it does not follow a call. Turn either function into a
  method that reads the fields itself and every guarantee above silently
  disappears, with nothing to show for it until someone reorders a field months
  later.

`requestLayout()` is a separate case that field order cannot fix: `TextView`'s
constructor calls it before any initializer runs, so `measureAndLayout` is null
there. The `width == 0 || height == 0` guard is what makes that safe — it is not
only about Fabric's initial mount.

## Both platforms' shadow nodes

`ios/PlainTextShadowNode.h` and `android/.../PlainTextShadowNode.h` are separate
files with the same traits and overrides. A change to one usually belongs in the
other. Only the invalidation logic is genuinely shared, in
`cpp/PlainTextMeasurementHelpers.{h,cpp}`.

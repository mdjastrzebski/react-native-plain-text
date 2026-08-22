# Manual sync points

Places that must be updated together where **nothing verifies them**: no type
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

Anything the text's width or height depends on: text, font, spacing, line
count. All five, or the box and the text disagree:

| Site                                                                             | Miss it and…                                                                                                            |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `cpp/PlainTextMeasurementHelpers.cpp` → `measurementInputsEqual`                 | the size goes stale after an update                                                                                     |
| `ios/PlainTextShadowNode.mm` → `measureContent`                                  | iOS measures without it, must mirror `RNPlainText.mm`'s `applyContentFromProps`                                         |
| `android/.../PlainTextMeasurementsManager.cpp`                                   | the prop never reaches the Android measure pass                                                                         |
| `PlainTextViewManager.kt` → `measure()`                                          | same from the other side, and it must apply props exactly as the mounted view does                                      |
| `PlainTextView.kt` → setter, plus `flushPendingUpdates()` if its work is batched | the prop is recorded but never applied                                                                                  |

The two iOS sites are the ones that have to agree _attribute by attribute_, with
one exception: the `UIFont` itself is not mirrored. `fontFamily`, `fontSize`,
`fontWeight` and `fontStyle` all go through `plainTextFont`
(`ios/PlainTextFont.h`), so a change to font resolution lands on both sides at
once. A new prop that feeds the font belongs in there, not in either caller.

Accessibility scaling of the font size is inside it for the same reason: it
takes the multiplier rather than an already-scaled size so `scaledFontSize`'s
unrounded `fontSize * fontSizeMultiplier` (see native-gotchas.md for why it
must stay unrounded) lives in one place. `lineHeight` scales in the callers
instead (also unrounded, matching RN), so it stays a sync point between them.

## The iOS font cache key

`ios/PlainTextFontCacheKey.cpp` builds the keys behind `resolvedFaceName`'s and
`plainTextFont`'s caches (`ios/PlainTextFont.mm`) from a fixed list of inputs:
`faceCacheKey` takes `fontFamily`, `fontWeight` and the raw `fontStyle` string
(not a converted bool, an empty string and `"normal"` both mean "not italic"
but must key separately, since `computeFaceName`'s face-name fallback tells
them apart). `fontCacheKey` adds `fontSize`, `fontVariant` and
`fontVariationSettings` on top. That list has to
name every input `computeFaceName`/`resolvedFont` read to pick a face or build
the `UIFont`: a new one read there and left out of the key doesn't fail to
apply, it applies once and then serves that first value back for every other
one, keyed as if nothing had changed. Both caches are unbounded
(`familyNamesCache`, `faceNamesCache`) or bounded only by count
(`resolvedFontsCache`, `kFontCacheCountLimit`), so nothing evicts the stale
entry on its own.

## The three-way default contract

These must all agree, per prop:

1. the default in the generated `Props.h`,
2. the `if (prop != default)` condition in `PlainTextMeasurementsManager.cpp`,
3. the fallback in `PlainTextViewManager.measure()`.

The C++ side omits props still at their default, so an absent key means
"default", not "unset". A mismatch silently measures at the wrong size.

## `letterSpacing`'s companion `hasLetterSpacing`

`letterSpacing` defaults to `0`, same as "explicitly set to `0`", but iOS's
kerning attribute treats those two differently (auto kerning vs. disabled).
`hasLetterSpacing` carries the "was it set" bit separately, from
`PlainText.native.tsx` through to `ios/PlainTextShadowNode.mm` and
`ios/RNPlainText.mm`, and belongs in `measurementInputsEqual`
(`cpp/PlainTextMeasurementHelpers.cpp`) alongside `letterSpacing` itself.

Android ignores it (no such distinction there) and it doesn't enter the
three-way default contract above.

## `lineHeightClippingIos`: global config with a per-instance override

Unlike `hasLetterSpacing`, this one _is_ one of `PlainText`'s
public props, just named differently at each layer. `PlainText.native.tsx`
exposes it as `unstable_lineHeightClippingIos`, the `unstable_` marking that
its shape/default may change without a major version bump, matching
`unstable_configureTextCompat`. Past the JS wrapper the prefix drops: the
native prop (`PlainTextViewNativeComponent.ts`), `Props.h`, and both native
implementations all use the bare `lineHeightClippingIos`, since codegen output
and native code aren't the unstable surface, the JS entry point is.

The value has two sources: `src/compat.ts` holds the module-level default
`unstable_configureTextCompat` writes, and `PlainText.native.tsx` resolves
`props.unstable_lineHeightClippingIos ?? getTextCompatConfig().lineHeightClippingIos`
on every render, so an explicit prop always wins over the global config. It
doesn't affect `measureContent`/`measure()` (the shift it gates is draw-only,
the line-height box size is identical either way), so unlike `hasLetterSpacing`
it does not belong in `measurementInputsEqual` or the three-way default
contract. Android no-ops it (`PlainTextViewManager.setLineHeightClippingIos`):
the TextKit bug it reverts to (RN#29507) has no Android counterpart.

## Anything derived from the OS text-size setting

The scale is never a prop. Both platforms read it ambiently while applying props
(`RCTFontSizeMultiplier()` on iOS, `PixelUtil` on Android) and store the
result as absolute points/pixels. So when the user changes the setting, no prop
changes, Fabric's props diff never fires, and every derived value is stale until
something else remounts the view. Each platform re-derives from an OS callback
instead:

| Site                                          | Fires on                                          |
| --------------------------------------------- | ------------------------------------------------- |
| `RNPlainText.mm` → `traitCollectionDidChange` | a Dynamic Type change                             |
| `PlainTextView.kt` → `onConfigurationChanged` | a font scale change, if the Activity declares it¹ |

A new value that scales (a second span, a padding, anything multiplied by the
multiplier) has to be reachable from both, or it holds its old size on one
platform only. On Android that means `markScaledSizesDirty()` must mark its
dirty flag. On iOS `applyContentFromProps` already covers everything it builds.

Re-measurement is not part of this contract: RN dirties every
`MeasurableYogaNode` when the surface's `fontSizeMultiplier` changes, so the
shadow node re-measures on its own. Only the mounted view needs the callback.

Android's override carries a second, unrelated obligation through its `super`
call: `TextView.onConfigurationChanged` re-applies the OS **Bold text** setting to
the typeface, which interacts with `fontVariationSettings`. See _Deferred prop
application_ below.

¹ Otherwise Android recreates the Activity and the views are rebuilt anyway.
`example/plugins/withFontScaleConfigChanges.js` declares it so the no-recreate
path is the one you exercise while developing.

## The reused measuring view

`PlainTextViewManager.measure()` sizes one shared off-screen view rather than a
fresh one per node (see [performance.md](performance.md) for why). Three things
must hold because of that:

- **Set every size-affecting prop on every call**, with its default when absent:
  otherwise the previous node's value leaks into this one.
- **Nothing in `PlainTextView` may derive new state from its own current state.**
  `applyTypeface()` resolves against a fixed `baseTypeface` for exactly this
  reason: `ReactTypefaceUtils.applyStyles` derives from the typeface passed in
  when `fontFamily` is null, so chaining off the live value let one node's font
  survive into the next.
- **The scratch view needs `isMeasureOnly`**: it skips the `requestLayout`
  re-layout post, which would queue forever on a never-attached view.

Every `PlainTextView` also needs non-null `LayoutParams`, seeded in the
constructor: a view that was measured but never added to a parent reaches
`checkForRelayout()` from `setText()`, which dereferences `layoutParams.width`.
That covers the scratch view and any mounted view whose insert was dropped. It
is not about mount ordering, and `PlainTextViewLayoutParamsTest` pins it
(`yarn test:android`, which CI runs but `yarn validate` does not).

This is now unconditional: measuring with a fresh view every time was the
alternative an earlier perf-suite A/B test measured against, and it lost, so
`measureView()` always shares the one view above. The internal `experiment`
prop (not part of `PlainText`'s public props, one generic on/off switch for
whatever the perf suite is currently A/B testing, see
`src/PlainTextViewNativeComponent.ts`) is declared but unread on both
platforms for now, ready for whatever gets A/B tested next.

## Deferred prop application

Setters on `PlainTextView` whose work is **shared with other props** record state
and set a dirty flag. `flushPendingUpdates()` does the work once. That covers
typeface resolution, `setText`, and anything derived from the scaled font size:
the props that used to redo the same expensive work several times per transaction.

A new prop feeding any of that must mark the flag it belongs to, and the flush
must apply it in dependency order. A prop that is set but never flushed silently
does nothing. A new read path that doesn't flush first sees stale state.

`fontVariationSettings` is the one prop ordered against another rather than
batched with it: the axes are baked into a `Typeface` derived from the current
one, so `applyVariationSettings()` must run **after** `applyTypeface()` and is
invalidated by it. It guards itself by comparing against the last applied
string instead of a dirty flag, because that comparison is also what
`applyTypeface` invalidates (by resetting it to `null`). Move the call above the
typeface block and the axes silently vanish whenever a font prop changes in the
same transaction.

Three pieces of state carry that between the two, and they only work as a set:

- `appliedVariationSettings`: the last string applied, `null` also meaning "the
  live typeface has no axes derived onto it".
- `appliedBaseTypeface`: what `applyStyles` last resolved, which is what the live
  typeface is only until axes are applied. Both the identity guard in
  `applyTypeface` and the restore in `applyVariationSettings` read it.
- The identity guard itself. It exists for the measuring view, where the dirty flag
  is always set, so `applyTypeface` would otherwise re-derive per node.

`appliedBaseTypeface` being the only record of the un-varied typeface makes
`typeface` assignable from `applyTypeface` and the restore **and nowhere else**. The
live `typeface` is the axis-derived one whenever axes are set, so it cannot be read
back to recover the base. Before the identity guard an assignment from anywhere would
self-heal on the next flush, because `applyTypeface` re-set the typeface every time.
It now persists.

One assignment is out of our hands and is documented rather than prevented.
`TextView.onConfigurationChanged` calls `setTypeface(getTypeface())` when
`Configuration.fontWeightAdjustment` changes (the OS **Bold text** setting, API 31+)
and our override calls `super`, so it runs on every attached view. It does not
desync `appliedBaseTypeface`: `getTypeface()` returns `mOriginalTypeface`, the last
value handed to `setTypeface`, and `TextView.setFontVariationSettings` writes only
`mTextPaint`, so the field still holds the un-varied base and the call re-assigns it
to itself. What it does is drop the axes off the paint while `Paint` keeps the
settings string that says otherwise, so a **Bold text** toggle leaves a variable font
at its default instance until the next change to `fontVariationSettings` or to any
font prop: the `settings == appliedVariationSettings` early-out means an unchanged
prop will not re-derive it. Known, benign, not worth a per-view listener.

The guard and the restore have to land together. The guard alone stops
`applyTypeface` from resetting `appliedVariationSettings` for consecutive nodes
sharing a font, and without the restore the reused measuring view then measures
node N+1 at node N's axes: a wrong size for every node, not just a wrong render
for one. Before the guard, `measure()` was correct only because `applyTypeface`
ran unconditionally. Don't restore that accident by dropping either half.

Props that map onto a single cheap independent write apply inline: there is
nothing to coalesce, and a dirty flag would only add state to keep in sync. Some
of them relayout on their own (`setMaxLines` always, `setJustificationMode` once
the view has a text Layout), which the `relayoutPosted` guard in `PlainTextView.requestLayout()` collapses to
one re-layout per transaction, and often to none, since the posted runnable
drops out when Fabric re-laid-out the view itself.

Flush happens in `PlainTextViewManager.onAfterUpdateTransaction`, before the
off-screen `measure`, and in the `reapplyScaledSizes` runnable after an OS
text-size change, never in the view's `init`, for the reason below.

## Construction-time state

`PlainTextView`'s `init` seeds `textSize` and `letterSpacing`, because Fabric skips
setters for props still at their default and the off-screen measuring view always
applies both: a view left on the theme's values would render at a size nothing
measured.

Kotlin runs property initializers and `init` blocks in declaration order, so a
field declared **below** `init` still holds its zero-default while `init` runs:
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
  written _inside_ `init`. It does not follow a call. Turn either function into a
  method that reads the fields itself and every guarantee above silently
  disappears, with nothing to show for it until someone reorders a field months
  later.

`requestLayout()` is a separate case that field order cannot fix: `TextView`'s
constructor calls it before any initializer runs, so `measureAndLayout` is null
there. The `width == 0 || height == 0` guard is what makes that safe: it is not
only about Fabric's initial mount.

## Padding and border width, which are not props

Neither ever reaches a prop setter. Yoga resolves them into the shadow view's
`contentInsets`, and each platform inflates the view's frame by them, so the box
grows whether or not anything insets the text inside it. That is the failure
mode: the size is right and only the glyphs are in the wrong place.

| Platform | How the text gets inset                                                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS      | Free. `RCTViewComponentView` lays `contentView` out at `layoutMetrics.getContentFrame()`, the frame already inset by the same insets.                             |
| Android  | `PlainTextViewManager.setPadding` → `view.setPadding`. Fabric emits a separate `UpdatePadding` mount item. `ViewManager`'s base implementation is an empty no-op. |

So the Android half is opt-in and silent when missing: the same override RN's
own `ReactTextViewManager` carries.

_Drawing_ the border is a separate, also Android-only, piece of opt-in:
`PlainTextViewManagerDelegate` (Java, and it explains why) forwards the border
props to `BackgroundStyleApplicator`, because `BaseViewManager` has no border
setters worth inheriting. Its other job is the reason a new view-style prop may
have nowhere to land: a view manager with a delegate is driven **only** through
that delegate, so a `@ReactProp` for anything the codegen spec doesn't declare is
never called.

Measurement needs no counterpart on either platform: Yoga hands the measure
callback the content box, already minus padding and border, and adds them back
to the result. The shared off-screen view in `PlainTextViewManager.measure()`
must therefore stay padding-free, unlike every other size-affecting value, which
has to be set on every call.

## Recycled view state

Fabric recycles component views by type: an unmounted view is handed straight
back out to back an unrelated component instance's first mount. iOS does that
unconditionally, through `RCTComponentViewRegistry`. Android makes it per view
manager: a concrete `ViewManager` has to call `setupViewRecycling()` in its
constructor, and that call is itself gated on `enableViewRecycling()`, which
defaults to false. `enableViewRecyclingForText`/`ForView`, both default true, are
extra conditions read inside RN's own `ReactTextViewManager`/`ReactViewManager`
constructors, not a pool a third-party manager is enrolled in.
`PlainTextViewManager` never calls `setupViewRecycling()`, so nothing recycles a
`PlainTextView` today and everything below describes iOS.

`RNPlainText.mm`'s `updateProps` diffs against `_props` (the ivar), not the
`oldProps` parameter, matching the base `RCTViewComponentView`. `_props` is
supposed to describe what `_label` is _actually_ showing. On construction it
doesn't: the base class seeds `_props` with a plain `ViewProps`, which
`-initWithFrame:` replaces with default `RNPlainTextProps` (both `-updateProps`
and `-traitCollectionDidChange` `static_pointer_cast` it, so the concrete type
has to be there from the start), while `_label` separately starts out with
UILabel's own factory defaults (e.g. its built-in 17pt font), which are not what
those prop defaults render as. A first-mount view whose real props happen to equal those defaults would
diff as "no change" and never apply, keeping UILabel's mismatched look: the
exact "correct on first render, wrong after an update, silent in between" shape
this whole document is about, just triggered on construction instead of by a
prop update.

`_forceApplyProps` (`ios/RNPlainText.mm`) closes that: set in `-initWithFrame:`,
checked and cleared on the first `-updateProps`, it makes that one call apply
the content build, `numberOfLines` and `lineBreakMode` unconditionally,
regardless of the diff.

Recycling turns out not to need the same treatment. A recycled view is handed
straight back out to back an unrelated instance's first mount with `_props`
still holding the previous instance's real values (the base
`-prepareForRecycle` resets the layers and state it owns, not `_props`), but
nothing between that instance's last `-updateProps` and this one touches
`_label`, so `_label` still genuinely matches `_props`. The plain diff is
therefore already correct on recycle: real prop differences apply normally, and
if the new instance's props happen to equal the leftovers, that's not a bug:
`_label` already shows the right thing. An earlier version of this fix also
re-armed `_forceApplyProps` in `-prepareForRecycle`, modeled on
`RCTViewComponentView`'s own diff-blind safety net for its `_props`-diffed
properties (`-updateLayoutMetrics` sets `_needsInvalidateLayer = YES`
unconditionally, rebuilding background/border layers every layout pass no
matter what the diff concluded). It was removed: the recycling bug actually hit
occurred _with_ that re-arm in place (the logs show `_forceApplyProps` forcing
`applyContentFromProps` to run) and the real cause was inside
`applyContentFromProps` itself (see below), so the re-arm was never doing
anything for that failure, and speculative insurance against an undemonstrated
one isn't worth the extra state.

**This is why there is no "reset every `_label` property to its default"
routine**, and why a new prop doesn't need one. `applyContentFromProps` fully
determines the label's state (font, color, alignment, `text`/`attributedText`,
`verticalTextShift`), and the forced apply on first mount runs it before
anything is on screen, so a fresh view needs no separate seeding. An earlier
version also reset `_label` directly in `-prepareForRecycle`. It made
correctness depend on that reset staying prop-for-prop in step with
`applyContentFromProps` forever, which is exactly the kind of silent sync point
this document exists to avoid. If a `_label` property is ever set outside
`applyContentFromProps`/`updateProps`, that reasoning breaks and it needs its
own handling.

One property does need explicit handling within `applyContentFromProps`
itself: `attributedText`. `numberOfLines`/`ellipsizeMode`/`textColor`/etc. are
plain properties with one obvious value, so setting them always overwrites
whatever the recycled-from instance left. Text content isn't: it's carried on
either `.text` (the plain path, when nothing needs an attributed string) or
`.attributedText` (letterSpacing, lineHeight, underline/strikethrough), and
only one of the two is ever set per call. Apple documents that setting `.text`
also clears `.attributedText` to an equivalent, attribute-free string, but a
real repro (a view recycled from an instance with `letterSpacing`, the
attributed path, `NSKernAttributeName`, into one without) showed the old
kerning surviving: the label kept the previous instance's spacing and
truncation even though every prop, and `_label.text` itself, were already
correct. The plain path now sets `_label.attributedText = nil` explicitly
before `.text`, rather than relying on that documented side effect. A future
rewrite of `applyContentFromProps` must keep doing this: the failure is
invisible until something is recycled from the attributed path into the plain
one.

**Android likely wouldn't share this specific hazard**: `PlainTextView.applyText()`
has the same plain-vs-spanned duality (`setText(value)` vs a `SpannableString`
carrying the `lineHeight` span), but both branches go through the single
`setText()` entry point rather than two separate properties, so there's no
second backing store for a stale span to hide in. It has no recycling reset of
any kind either: `PlainTextView`/`PlainTextViewManager` reset nothing on reuse,
where RN's own `ReactTextViewManager` overrides `prepareToRecycleView` and calls
`ReactTextView.recycleView()` from there, resetting at unmount on the way _into_
the pool. Reset at that end, not the other: `ViewManager.recycleView(reactContext,
view)` is a differently-scoped hook with a confusingly identical name, called from
`createViewInstance` on the way back _out_ of the pool, and RN's text manager
leaves it alone. Either way the reset costs nothing while `setupViewRecycling()`
goes uncalled, and it is the first thing opting in has to bring: a pooled view
arrives carrying the previous instance's text, font and color, and `init`'s
seeding only runs for a genuinely new one.

## Both platforms' shadow nodes

`ios/PlainTextShadowNode.h` and `android/.../PlainTextShadowNode.h` are separate
files with the same traits and overrides. A change to one usually belongs in the
other. Only the invalidation logic is genuinely shared, in
`cpp/PlainTextMeasurementHelpers.{h,cpp}`.

## The `__baseline` marker prop (Android)

`alignItems: "baseline"` works by both shadow nodes setting the
`BaselineYogaNode` trait and overriding `baseline()`, mirroring RN's own
`ParagraphShadowNode`. iOS computes it in pure C++ from the font's ascender
(`ios/PlainTextShadowNode.mm`), no JNI hop needed. Android has no thread-safe
pure-C++ text measurement (same reason `measure()` exists at all), so
`PlainTextShadowNode::baseline()` reuses the same `FabricUIManager.measure`
JNI bridge, with the node's final layout `size` passed as both the min and
max constraint (forcing Yoga's EXACTLY mode on both dimensions) and a
`"__baseline"` marker stuffed into the serialized props.

That string must match in exactly two places, and nothing checks it:
`PlainTextMeasurementsManager.cpp`'s `baseline()` (where it's set) and
`PlainTextViewManager.kt`'s `measure()` (`BASELINE_QUERY_PROP`, where it's
read). A mismatch doesn't fail loudly: `measure()` just never takes the
baseline branch, and `baseline()` silently gets back the measured height
packed into the wrong slot instead of `TextView.getBaseline()`.

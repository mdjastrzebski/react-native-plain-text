# Caching

What `PlainText` caches, what RN's `<Text>` caches, and why the two differ.

`PlainText` measures through the platform's native text widget, which is cheap
for static one-shot text and has its own low-level caches underneath. The
library caches only what is expensive and shared across nodes (font resolution),
and otherwise skips repeat work with guards rather than by storing every node's
size. RN runs its own cross-platform text engine on every measure, so it caches
that engine's whole output.

## What PlainText caches

### Font resolution, iOS (`ios/PlainTextFont.mm`)

Three caches, each an `NSCache` behind `PlainTextFontCache`. All are shared
between the shadow thread (`measureContent`) and the main thread (draw), so one
lookup serves both measuring and rendering.

| Cache             | Key                                                       | Value                                                            | Bound     |
| ----------------- | --------------------------------------------------------- | ---------------------------------------------------------------- | --------- |
| Family face names | family name                                               | `[UIFont fontNamesForFamilyName:]` result, empty answer included | unbounded |
| Winning face name | family + weight + style                                   | PostScript face name, resolved at a fixed probe size             | unbounded |
| Resolved font     | face key + size + `fontVariant` + `fontVariationSettings` | `UIFont`                                                         | 256       |

Face selection is split from the final font because it does not depend on size:
a new size or a Dynamic Type step then costs one `UIFont` instantiation, not
another scan of the family. The resolved-font cache is capped because its key
carries two continuous inputs (`fontSize` and the variation axes) that an
animating app would otherwise walk without bound. All three clear on
`kCTFontManagerRegisteredFontsChangedNotification`, so a font registered at
runtime (for example via `expo-font`) does not leave an earlier fallback cached.

### Typeface resolution, Android (`android/src/main/java/com/mdjstack/plaintext/PlainTextView.kt`)

`PlainText` mostly relies on RN's existing interning here rather than adding its
own cache. `applyTypeface()` calls `ReactTypefaceUtils.applyStyles`, whose
result is interned by `ReactFontManager` for custom families and by `Typeface`'s
own static caches otherwise, then identity-guards that result so an unchanged
typeface is never re-set on the reused measuring view.

It caches one thing of its own: the `fontVariationSettings`-derived typeface, in
`variationTypefaceCache` (`LruCache`, 64 entries, keyed on base typeface
identity plus the settings string). The platform does not cache that derivation
before API 36, so without this cache every row at a given weight pays for its
own native derivation.

### Measuring view pool, Android (`PlainTextViewManager.kt`)

Not a result cache but an object pool. Measurement reuses one off-screen
`PlainTextView`, held in a `ThreadLocal` weak reference and rebuilt when the
`Context` changes, instead of constructing an `AppCompatTextView` per node. It
is paired with per-instance "last applied" fields on the view that skip
re-applying a typeface, variation string, or paint flag already set on it.

### Re-measurement guard, both platforms (`cpp/PlainTextMeasurementHelpers.cpp`)

`measurementInputsEqual` and `shouldRevisionDirtyMeasurement` are a guard, not a
store. They decide whether Fabric may reuse a node's previous `LayoutMetrics`
instead of calling `measureContent` at all.

The guard stops an ancestor re-render from re-measuring every mounted
`PlainText`. `YogaLayoutableShadowNode::adoptYogaChild` clones every child of a
changed parent just to re-own its Yoga node, and the base
`shouldNewRevisionDirtyMeasurement` dirties measurement on every clone. RN's
`ParagraphShadowNode` overrides that with a coarse `fragment.props != nullptr`
check. `PlainText` goes further and compares the specific props that measurement
reads (the list in `measurementInputsEqual`), so a revision that changes only
`color`, `textAlign`, `textDecorationLine`, or `textShadow*` keeps its measured
size. The comparison runs in the shadow node's clone constructor and the
`shouldNewRevisionDirtyMeasurement` override just returns the stored verdict,
for the reason spelled out in the header comment.

### Yoga per-node measurement cache, inherited

`PlainTextShadowNode` is a `MeasurableYogaNode`, so Yoga caches its
`measureContent` returns per constraint (up to 8 per node), with no library code
involved. It covers a different case from the guard above: the guard works
across revisions, Yoga across layout passes within and between commits.

### Nothing in JS

`mapPlainTextProps` in `src/PlainText.tsx` calls `StyleSheet.flatten(style)` and
rebuilds the native prop object on every render. Nothing is memoized.

### Not the whole measurement result

There is no cache of the measured `Size` per node, the way RN caches
`TextMeasurement`. An LRU keyed on the size-affecting props plus constraints has
been prototyped and left unmerged. It showed no benefit on the benchmark (1000
unique strings, so every lookup misses) and it adds a key build and a hash to
every measure, which the cold path is written to avoid. It would likely help
real screens with many repeated labels. See
[performance.md](performance.md#caching-measurement-results). The `experiment`
prop that drove that prototype is currently unread
([perf-experiments.md](perf-experiments.md#current-state)).

## What React Native's `<Text>` caches

| Cache                                              | Key                                                                    | Value                           | Notes                                                                     |
| -------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------- |
| `TextLayoutManager::textMeasureCache_`             | attributed string + paragraph attrs + constraints + `pointScaleFactor` | `TextMeasurement`               | Always present, all platforms, cap 1024. The one that matters most.       |
| `TextLayoutManager::lineMeasureCache_`             | attributed string + attrs + size                                       | per-line frames and metrics     | Feeds `onTextLayout`.                                                     |
| `TextLayoutManager::preparedTextCache_`            | attributed string + attrs + constraints                                | laid-out drawable layout object | Android only, gated behind `enablePreparedTextLayout()` (off by default). |
| `RCTFont` `cachedSystemFont` (iOS)                 | family + size + weight + style + variant                               | `UIFont`                        | The equivalent of `PlainText`'s iOS font caches.                          |
| `ReactFontManager` + `Typeface.create()` (Android) | family + style + weight                                                | interned `Typeface`             | The interning `PlainText` relies on directly.                             |
| Yoga per-node cache                                | `(availableWidth, availableHeight, sizingMode)`                        | computed size                   | Same one `PlainText` inherits.                                            |
| Minikin word-shaping cache (Android platform)      | per word                                                               | glyph shaping                   | Underneath `TextView`, so `PlainText` gets it too.                        |

`textMeasureCache_` is the important one. RN's text engine (`TextLayoutManager`,
a re-implementation of platform layout that takes RN's own serialized
attributes) runs on every measure and is expensive, so RN caches its entire
output. A hit skips the engine: on Android the whole `FabricUIManager.measure`
JNI hop plus an off-screen `TextView` layout, on iOS the CoreText passes.

## Comparison

|                                     | PlainText                                                              | RN `<Text>`                                                                |
| ----------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Who lays out text                   | the native widget (`UILabel`, `TextView`), one shot                    | RN's own `TextLayoutManager`                                               |
| Whole measurement result cached     | no (prototyped, not merged)                                            | yes, `textMeasureCache_`, always on                                        |
| Redundant re-measurement handled by | a guard that skips `measureContent` for unchanged size inputs          | the same `fragment.props` guard, coarser, plus the result cache            |
| Font resolution cached              | yes, own implementation per platform                                   | yes, `RCTFont` / `ReactFontManager`                                        |
| Cost on a cold mount                | just the guard check and font-cache lookups                            | that, plus building and hashing a measurement key per node                 |
| Weak spot                           | a warm re-mount of wrapping text re-runs native line breaking per node | key build and hash on every measure, and cache size assumes virtualization |

Each design caches where its own expensive step is. RN cannot avoid running its
engine, so it caches the engine's output. `PlainText` hands layout to a widget
that is fast for static text and has its own word-shaping cache underneath, so
it caches only font resolution (expensive, and shared across many nodes) and
otherwise avoids re-measuring nodes that have not changed.

The cost shows on a warm re-mount of longer wrapping text, the same strings
mounted again without killing the app. RN's `textMeasureCache_` returns the line
breaking from cache, while `PlainText` re-runs it per node. A measured-`Size`
cache would close that gap, at the cost of a key build and hash on every
measure, cold mount included. That prototype exists but is not merged (see
above).

## What is not cached

- **Per-node measurement results.** Covered above. A prototype LRU of measured
  `Size` was not merged: no benchmark benefit, and a key build plus hash on
  every measure. See
  [performance.md](performance.md#caching-measurement-results).
- **The built `NSAttributedString` / `SpannableString`.** Rebuilt on every
  apply. Cheaper than keying and storing it, and the font, which is the
  expensive part of it, is already cached.

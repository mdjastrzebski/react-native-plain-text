# Props and styles

## Supported props

| Prop                                                            | RN `<Text>` compatible | Notes                                                                              |
| --------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------- |
| [`allowFontScaling`](#allowfontscaling)                         | ✅                     |                                                                                    |
| [`android_hyphenationFrequency`](#android_hyphenationfrequency) | ✅                     | Android-only, like RN `<Text>`. Only a fallback for when `hyphens` is unset.       |
| [`children`](#children)                                         | 🟡                     | Text only: a string, number, bigint, or a flat array of them (`{count} items`).    |
| [`ellipsizeMode`](#ellipsizemode)                               | ✅                     |                                                                                    |
| [`hyphens`](#hyphens)                                           | ⬆️                     | Not in RN `<Text>`. `'none' \| 'auto'`, default `'none'`. See below.               |
| [`lang`](#lang)                                                 | ⬆️                     | Not in RN `<Text>`. BCP-47 tag (e.g. `'de'`) for hyphenation and line breaking.    |
| [`lineBreakStrategyIOS`](#linebreakstrategyios)                 | ✅                     | iOS-only, like RN `<Text>`. No-op on Android.                                      |
| [`maxFontSizeMultiplier`](#maxfontsizemultiplier)               | ✅                     |                                                                                    |
| [`nativeID`](#view-props)                                       | ✅                     |                                                                                    |
| [`id`](#view-props)                                             | ✅                     |                                                                                    |
| [`numberOfLines`](#numberoflines)                               | ✅                     |                                                                                    |
| [`onLayout`](#view-props)                                       | ✅                     |                                                                                    |
| [`testID`](#view-props)                                         | ✅                     |                                                                                    |
| [`text`](#text)                                                 | ⬆️                     | Alternative to `children`. Use this to [animate text](./recipes#animating-text).   |
| [`textBreakStrategy`](#textbreakstrategy)                       | ✅                     | Android-only, like RN `<Text>`                                                     |
| [Accessibility props](#view-props)                              | ✅                     | `accessible`, `accessibilityLabel`, `accessibilityRole`, `accessibilityState`, etc |

RN `<Text>` compatibility: ✅ fully compatible · 🟡 partially compatible · ⬆️ added in Plain Text.

## Supported styles

| Style                                             | RN `<Text>` compatible | Notes                                                                                   |
| ------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------- |
| [`color`](#color)                                 | ✅                     |                                                                                         |
| [`fontFamily`](#fontfamily)                       | ✅                     |                                                                                         |
| [`fontSize`](#fontsize)                           | ✅                     |                                                                                         |
| [`fontStyle`](#fontstyle)                         | ✅                     |                                                                                         |
| [`fontVariant`](#fontvariant)                     | ✅                     |                                                                                         |
| [`fontVariationSettings`](#fontvariationsettings) | ⬆️                     | Not in RN `<Text>`. Variable-font axes in CSS syntax, e.g. `'"wght" 700, "wdth" 87.5'`. |
| [`fontWeight`](#fontweight)                       | ✅                     |                                                                                         |
| [`includeFontPadding`](#includefontpadding)       | ✅                     | Android-only, like RN `<Text>`                                                          |
| [`letterSpacing`](#letterspacing)                 | ✅                     |                                                                                         |
| [`lineHeight`](#lineheight)                       | ✅                     |                                                                                         |
| [`textAlign`](#textalign)                         | ✅                     |                                                                                         |
| [`textAlignVertical`](#textalignvertical)         | ✅ ⬆️                  | Android-only in RN Text. Implemented for both iOS & Android here.                       |
| [`textDecorationLine`](#textdecorationline)       | ✅                     |                                                                                         |
| [`textShadowColor`](#textshadowcolor)             | ✅                     |                                                                                         |
| [`textShadowOffset`](#textshadowoffset)           | ✅                     |                                                                                         |
| [`textShadowRadius`](#textshadowradius)           | ✅                     |                                                                                         |
| [`textTransform`](#texttransform)                 | ✅                     |                                                                                         |
| [`verticalAlign`](#verticalalign)                 | ✅ ⬆️                  | Android-only in RN Text. Implemented for both iOS & Android                             |
| [`writingDirection`](#writingdirection)           | ✅                     | iOS-only, like RN `<Text>`. No-op on Android.                                           |
| [Every other `ViewStyle` prop](#view-styles)      | ✅                     | `width`, `margin`, `padding`, `backgroundColor`, `opacity`, etc                         |

RN `<Text>` compatibility: ✅ fully compatible · ⬆️ added in Plain Text

## Improvements over RN Text

Things Plain Text does that RN `<Text>` does not:

- [`fontVariationSettings`](#fontvariationsettings): set variable-font axes in
  CSS syntax.
- [`verticalAlign`](#verticalalign) and
  [`textAlignVertical`](#textalignvertical) on iOS: RN `<Text>` only honors
  these on Android. Plain Text implements them on both platforms.
- [`lineHeight`](#lineheight) clipping fix on iOS: with a large or small
  `lineHeight`, iOS TextKit clips the first line's ascenders and pushes the text
  down ([RN#29507](https://github.com/facebook/react-native/issues/29507)). Plain
  Text keeps the text centered in its line box.
- [`hyphens`](#hyphens) and [`lang`](#lang): cross-platform hyphenation
  control. RN `<Text>` has none on iOS.

## Differences from RN Text

Known differences that apply to all text, on top of the per-prop notes below:

- **iOS wraps slightly earlier.** `UILabel` needs a bit more horizontal space
  than RN `<Text>`'s TextKit layout, so near a width limit a word can move to
  the next line where RN `<Text>` keeps it. The box gets the same width, only
  the wrap point differs. Inherent to `UILabel`.
- **iOS wraps at a plain hyphen.** `"text-size"` can split as `"text-"` /
  `"size"`, which RN `<Text>` doesn't do. Use a non-breaking hyphen (`U+2011`,
  `‑`) where that split is unwanted.
- **iOS ignores trailing spaces on the last line of multi-line text** when
  sizing the box. RN `<Text>` counts them, so its box is wider by their width.
  Single-line text and Android are unaffected.
- **Single style only.** No nested `<Text>`, press handling or selection. See
  [Not supported](#not-supported).

## How to read the reference

Each entry below lists the prop's type, its default, and its **cost**: the
extra native work a node pays when the prop is set. A prop left unset costs
only a comparison, whatever its rating.

- **light**: one comparison and at most one primitive write. No allocation.
- **medium**: allocates per update, or moves the node onto a slower rendering
  path. Cached or paid once per node where possible.
- **heavy**: scales with text length or defeats a cache. No prop is heavy
  today.

Where a prop behaves differently from RN `<Text>`, its entry has an
**RN `<Text>`:** note. No note means no known difference. Differences that
affect all text, whatever the props, are listed under
[Differences from RN Text](#differences-from-rn-text).

## Props reference

### `allowFontScaling`

Whether the font size scales with the OS text-size (accessibility) setting.
Also scales `lineHeight`. Scaling tracks the setting live, without a remount.

| Type    | Default | Cost  |
| ------- | ------- | ----- |
| boolean | `true`  | light |

### `android_hyphenationFrequency`

_Android only._

How often Android inserts hyphens when wrapping: `'none'`, `'normal'` or
`'full'`. Prefer the cross-platform [`hyphens`](#hyphens) prop, which wins
whenever it is set. This prop only applies when `hyphens` is left unset.

| Type                           | Default  | Cost  |
| ------------------------------ | -------- | ----- |
| `'none' \| 'normal' \| 'full'` | `'none'` | light |

- **Android:** on API 33+, `'normal'` and `'full'` use the faster `*_FAST`
  hyphenation modes.
- **iOS:** no-op.

### `children`

The text to render. A string, a number, a `bigint`, or a flat array of them,
which JSX produces for `{count} items`. The array is joined into one string.
`null`, `undefined` and booleans render nothing, as in RN `<Text>`.

| Type                                          | Default     | Cost  |
| --------------------------------------------- | ----------- | ----- |
| `PlainTextChild \| readonly PlainTextChild[]` | `undefined` | light |

A plain string is the fastest path. An array is joined in JS on every render.

- **RN `<Text>`:** also accepts nested `<Text>` and inline elements. Plain Text
  doesn't: development builds warn once and render nothing for them. Use the
  [`Text` component](./text-component) for automatic fallback to RN `<Text>`.

### `ellipsizeMode`

Where to truncate text that doesn't fit in `numberOfLines`: at the start
(`'head'`), in the middle (`'middle'`), at the end (`'tail'`), or cut off
without an ellipsis (`'clip'`). Has an effect only together with
[`numberOfLines`](#numberoflines).

| Type                                     | Default  | Cost  |
| ---------------------------------------- | -------- | ----- |
| `'head' \| 'middle' \| 'tail' \| 'clip'` | `'tail'` | light |

- **Android:** with `numberOfLines` above `1`, only `'tail'` and `'clip'` work
  correctly. This is a `TextView` limitation, shared with RN `<Text>`.

### `hyphens`

_Not in RN `<Text>`._

Hyphenation control. `'auto'` turns on dictionary-based hyphenation. `'none'`
leaves the platform default, which inserts no automatic hyphens. Pair with
[`lang`](#lang) to pick the dictionary.

Neither value touches soft hyphens (`U+00AD`) already in the text. iOS breaks
lines at them, Android doesn't, whatever `hyphens` is set to.

| Type               | Default  | Cost  |
| ------------------ | -------- | ----- |
| `'none' \| 'auto'` | `'none'` | light |

- **iOS:** `'auto'` sets `usesDefaultHyphenation` on the paragraph style.
- **Android:** `'auto'` uses `Layout.HYPHENATION_FREQUENCY_FULL`. Setting
  `hyphens` at all, `'none'` included, overrides
  [`android_hyphenationFrequency`](#android_hyphenationfrequency).
- **Known gap (Android):** the off-screen measuring pass can't tell an unset
  `hyphens` from an explicit `'none'`. With `hyphens="none"` and a non-default
  `android_hyphenationFrequency`, the measured size can assume that frequency
  while the text renders without hyphens.

Dropped with a development warning when the [`Text` component](./text-component)
falls back to RN `<Text>`.

### `lang`

_Not in RN `<Text>`._

BCP-47 language tag, e.g. `'de'` or `'pl'`, for hyphenation and line breaking.
An empty or unset value uses the device locale.

| Type   | Default     | Cost  |
| ------ | ----------- | ----- |
| string | `undefined` | light |

- **iOS:** sets `NSLanguageIdentifierAttributeName` on the text.
- **Android:** sets `TextView.textLocales`.

Dropped with a development warning when the [`Text` component](./text-component)
falls back to RN `<Text>`.

### `lineBreakStrategyIOS`

_iOS only._

The line-break strategy iOS uses when wrapping. `'standard'` is the system's
own strategy for labels, `'hangul-word'` keeps Korean words whole, and
`'push-out'` moves words down to avoid a lone word on the last line. `'none'`
wraps as soon as a word doesn't fit.

| Type                                                  | Default  | Cost  |
| ----------------------------------------------------- | -------- | ----- |
| `'none' \| 'standard' \| 'hangul-word' \| 'push-out'` | `'none'` | light |

- **Android:** no-op. See [`textBreakStrategy`](#textbreakstrategy).

### `maxFontSizeMultiplier`

The largest scale factor the OS text-size setting can apply to this node's
font. `2` means a 14pt font grows to at most 28pt. Values below `1`, including
the default `0`, mean no limit. Ignored when `allowFontScaling` is `false`.

| Type   | Default | Cost  |
| ------ | ------- | ----- |
| number | `0`     | light |

### `numberOfLines`

Truncates the text to at most this many lines, ellipsized per
[`ellipsizeMode`](#ellipsizemode). `0` means no limit. The limit also caps the
node's measured height.

| Type   | Default | Cost  |
| ------ | ------- | ----- |
| number | `0`     | light |

### `text`

_Not in RN `<Text>`._

Alternative to `children`, and wins over it when both are set. A plain prop can
be driven by Animated or Reanimated without a re-render, which `children`
can't. See [Animating text](./recipes#animating-text).

| Type   | Default     | Cost  |
| ------ | ----------- | ----- |
| string | `undefined` | light |

### `textBreakStrategy`

_Android only._

The line-breaking algorithm Android uses when wrapping: `'simple'` is
greedy, `'highQuality'` optimizes the whole paragraph, and `'balanced'`
evens out line lengths.

| Type                                      | Default         | Cost  |
| ----------------------------------------- | --------------- | ----- |
| `'simple' \| 'highQuality' \| 'balanced'` | `'highQuality'` | light |

- **iOS:** no-op. See [`lineBreakStrategyIOS`](#linebreakstrategyios).

### `unstable_lineHeightClippingCompat`

_iOS only._

Reverts the iOS [`lineHeight`](#lineheight) centering fix to RN `<Text>`'s
behavior, where a `lineHeight` smaller than the font's own clips the ascenders
only. For apps migrating from RN `<Text>` that depend on that exact rendering.
Unstable: may change or go away.

| Type    | Default | Cost  |
| ------- | ------- | ----- |
| boolean | `false` | light |

- **Android:** no-op.

### View props

`id`, `nativeID`, `testID`, `onLayout` and the accessibility props
(`accessible`, `accessibilityLabel`, `accessibilityRole`, `accessibilityState`,
`role`, `aria-*` and the rest) behave as on any RN `View`. Each is light.

## Styles reference

Text styles are read from the flattened `style`. Every other key is applied to
the view.

### `color`

Text color.

| Type                                         | Default   | Cost  |
| -------------------------------------------- | --------- | ----- |
| [color](https://reactnative.dev/docs/colors) | `'black'` | light |

- **Android:** unset resolves to black, as in RN `<Text>`, not the theme's
  gray `TextView` color.

### `fontFamily`

Font family name, or a font file's name for fonts bundled the RN way (Expo
Font, `react-native-asset`, `assets/fonts`). Within a multi-face family, the
face closest to `fontWeight` and `fontStyle` is picked, as in RN `<Text>`.
Defaults to the system font.

| Type   | Default     | Cost   |
| ------ | ----------- | ------ |
| string | `undefined` | medium |

The first use of a family looks it up in the system font database (iOS) or the
assets (Android). The result is cached per family and size, so later nodes with
the same font pay little. Also carries `fontWeight`'s Android cost.

### `fontSize`

Font size in points (dp). Scaled by the OS text-size setting unless
[`allowFontScaling`](#allowfontscaling) is `false`.

| Type   | Default | Cost  |
| ------ | ------- | ----- |
| number | `14`    | light |

- **Android:** rounded up to a whole pixel, as in RN `<Text>`.

### `fontStyle`

`'normal'` or `'italic'`.

| Type                   | Default     | Cost   |
| ---------------------- | ----------- | ------ |
| `'normal' \| 'italic'` | `undefined` | medium |

Cost as for [`fontWeight`](#fontweight).

### `fontVariant`

OpenType features such as `'tabular-nums'`, `'small-caps'` or
`'oldstyle-nums'`. An array, or a space- or comma-separated string.

| Type                 | Default     | Cost   |
| -------------------- | ----------- | ------ |
| `string[] \| string` | `undefined` | medium |

The font needs to carry the feature, otherwise it has no effect.

- **iOS:** each value maps to a Core Text font feature. Unknown values are
  ignored. Resolving the feature-carrying font is cached per variant list.
- **Android:** passed as `font-feature-settings` on the paint, rebuilt on every
  update.
- **RN `<Text>`:** on the New Architecture, RN drops the ligature and
  contextual values (`common-ligatures`, `discretionary-ligatures`,
  `historical-ligatures`, `contextual` and their `no-` forms) on both
  platforms. Plain Text applies them. On Android, RN also ignores
  `fontVariant` unless `fontFamily`, `fontWeight` or `fontStyle` is set as
  well. Plain Text applies it on its own.

### `fontVariationSettings`

_Not in RN `<Text>`._

Variable-font axes in CSS `font-variation-settings` syntax, e.g.
`'"wght" 700, "wdth" 87.5'`. `'normal'` or an empty string clears them. RN
`<Text>` gains this style in RN 0.88
([RN#57804](https://github.com/facebook/react-native/pull/57804)).

| Type   | Default     | Cost   |
| ------ | ----------- | ------ |
| string | `undefined` | medium |

Needs a variable font with an `fvar` table. No system font qualifies. A
malformed string logs a warning and is ignored.

- **iOS:** the varied font is cached per font and axes.
- **Android:** API 26+, no-op below. Each view derives its own varied
  `Typeface`, uncached across views, so many nodes with the same axes each pay
  it. Changing the font while axes are set derives twice.

Dropped with a development warning when the [`Text` component](./text-component)
falls back to RN `<Text>`.

### `fontWeight`

Font weight: `'normal'`, `'bold'`, `'100'` to `'900'`, or the same as a number.

| Type                                          | Default     | Cost   |
| --------------------------------------------- | ----------- | ------ |
| `'normal' \| 'bold' \| '100'…'900' \| number` | `undefined` | medium |

- **iOS:** mapped to the matching `UIFont.Weight`, unknown values to regular. With a custom `fontFamily`,
  the family's closest face is used, so a family with no bold face renders at
  its nearest available weight.
- **Android:** setting `fontWeight` or `fontStyle` at all, even to the font's
  own default, moves the node onto Android's unhinted glyph path, matching RN
  `<Text>`. Glyph positions shift by a subpixel and mounting costs about 2.5%
  more.

### `includeFontPadding`

_Android only._

Whether Android adds extra top and bottom padding to fit accents and
descenders that exceed the font's ascent and descent. Set to `false` to line
up text vertically with iOS.

| Type    | Default | Cost  |
| ------- | ------- | ----- |
| boolean | `true`  | light |

- **iOS:** no-op.

### `letterSpacing`

Extra space between characters, in points.

| Type   | Default     | Cost  |
| ------ | ----------- | ----- |
| number | `undefined` | light |

- **iOS:** applied as kerning.
- **Android:** converted to `em` against the current font size, as in RN
  `<Text>`.

### `lineHeight`

Height of each line, in points. The glyphs are centered in the line box.
Unset uses the font's natural line height. Scaled with the font when
[`allowFontScaling`](#allowfontscaling) is on.

| Type   | Default     | Cost   |
| ------ | ----------- | ------ |
| number | `undefined` | medium |

- **iOS:** costs two paragraph-style fields.
- **RN `<Text>`:** on iOS, a `lineHeight` below the font's natural height
  clips only the top of the first line in RN, and a larger one pushes the text
  down ([RN#29507](https://github.com/facebook/react-native/issues/29507)).
  Plain Text shifts the drawn text so it stays centered and clips evenly. Set
  [`unstable_lineHeightClippingCompat`](#unstable_lineheightclippingcompat) to
  get RN's behavior back.
- **Android:** wraps the text in a `SpannableString` with a line-height span
  instead of passing a plain string, the reason for the medium rating.

### `textAlign`

Horizontal alignment. `'auto'` follows the layout direction.

| Type                                                   | Default  | Cost  |
| ------------------------------------------------------ | -------- | ----- |
| `'auto' \| 'left' \| 'right' \| 'center' \| 'justify'` | `'auto'` | light |

- **Android:** `'left'` and `'right'` swap in RTL layouts, as in RN `<Text>`.
  `'justify'` needs API 26+ and falls back to `'left'` below.

### `textAlignVertical`

_RN `<Text>` supports this on Android only. Plain Text supports it on both platforms._

Vertical alignment of the text when the view is taller than it, e.g. with a
fixed `height` or `flex: 1`. `'auto'` is `'top'`.

| Type                                      | Default  | Cost  |
| ----------------------------------------- | -------- | ----- |
| `'auto' \| 'top' \| 'bottom' \| 'center'` | `'auto'` | light |

- Overridden by [`verticalAlign`](#verticalalign) when both are set.

### `textDecorationLine`

Draws a line under or through the text.

| Type                                                                  | Default  | Cost  |
| --------------------------------------------------------------------- | -------- | ----- |
| `'none' \| 'underline' \| 'line-through' \| 'underline line-through'` | `'none'` | light |

The line takes the text color. `textDecorationColor` and
`textDecorationStyle` are [not supported yet](#planned).

- **RN `<Text>`:** on iOS, RN draws the underline about one line thickness
  above the font's own underline position. Plain Text uses the font's
  position, so underlines sit slightly lower than in RN `<Text>`.

### `textShadowColor`

Color of the text shadow.

| Type                                         | Default              | Cost   |
| -------------------------------------------- | -------------------- | ------ |
| [color](https://reactnative.dev/docs/colors) | black at 33% opacity | medium |

Cost as for [`textShadowOffset`](#textshadowoffset).

### `textShadowOffset`

Offset of the text shadow, in points.

| Type                                | Default     | Cost   |
| ----------------------------------- | ----------- | ------ |
| `{ width: number, height: number }` | `undefined` | medium |

The three shadow styles decide differently whether a shadow is drawn, matching
RN `<Text>` on each platform:

- **iOS:** a shadow is drawn whenever `textShadowOffset` is set, even
  `{ width: 0, height: 0 }`, and never without it. The shadow is rebuilt on
  every content update.
- **Android:** a shadow is drawn when the offset or radius is non-zero and the
  color isn't transparent. `textShadowRadius` alone is enough. Costs one paint
  call.

### `textShadowRadius`

Blur radius of the text shadow.

| Type   | Default | Cost   |
| ------ | ------- | ------ |
| number | `0`     | medium |

- **Android:** in pixels, not dp, as in RN `<Text>`. The same value looks
  sharper on high-density screens than on iOS.

### `textTransform`

Changes the case of the displayed text. The `text` or `children` you pass stays
unchanged.

| Type                                                   | Default  | Cost   |
| ------------------------------------------------------ | -------- | ------ |
| `'none' \| 'uppercase' \| 'lowercase' \| 'capitalize'` | `'none'` | medium |

Allocates a transformed copy of the string on every update, on both platforms.
`'capitalize'` also walks word boundaries. For static text, transforming the
string yourself once is cheaper.

- **RN `<Text>`:** on iOS, RN's `'capitalize'` also lowercases the rest of each
  word ([RN#34117](https://github.com/facebook/react-native/issues/34117)), so
  `'iPhone'` becomes `'Iphone'`. Plain Text only uppercases the first letter,
  as CSS and Android do.

### `verticalAlign`

_RN `<Text>` supports this on Android only. Plain Text supports it on both platforms._

Same as [`textAlignVertical`](#textalignvertical), with `'middle'` for
`'center'`. Wins over `textAlignVertical` when both are set.

| Type                                      | Default     | Cost  |
| ----------------------------------------- | ----------- | ----- |
| `'auto' \| 'top' \| 'bottom' \| 'middle'` | `undefined` | light |

### `writingDirection`

_iOS only._

Base writing direction of the paragraph. With `textAlign: 'auto'`, also decides
which side the text aligns to.

| Type                       | Default  | Cost  |
| -------------------------- | -------- | ----- |
| `'auto' \| 'ltr' \| 'rtl'` | `'auto'` | light |

- **Android:** no-op, as in RN `<Text>`.

### View styles

Every other key, such as `width`, `margin`, `padding`, `backgroundColor`,
`borderRadius` or `opacity`, is applied to the view as on any RN `View`.

- **RN `<Text>`:** on Android, RN clips text to the border box with
  `overflow: 'hidden'`. Plain Text doesn't yet. Only visible with a
  `borderRadius` and text reaching the corners.

## Planned

| Prop / style                                                            | RN `<Text>` compatible |
| ----------------------------------------------------------------------- | ---------------------- |
| `adjustsFontSizeToFit` / `minimumFontScale`                             | To Do                  |
| `selectable` / `selectionColor` / `suppressHighlighting` / `userSelect` | To Do                  |
| `textDecorationColor` / `textDecorationStyle`                           | To Do                  |
| `dynamicTypeRamp`                                                       | To Do                  |

Open an issue for the one you need. Real-world usage sets the priority.

## Not supported

Deliberately excluded:

- nested `<Text>` elements and mixed styles
- press and touch handling: `onPress`, `onLongPress`, `onPressIn`, `onPressOut`,
  `pressRetentionOffset`, and the touch-responder handlers
  (`onStartShouldSetResponderCapture`, `onMoveShouldSetResponder`,
  `onResponderGrant` / `Move` / `Release` / `Terminate`,
  `onResponderTerminationRequest`). Wrap `<PlainText>` in a `Pressable` instead.
- `disabled`: only meaningful alongside press handlers.
- `dataDetectorType`: turns substrings into tappable links, which makes the label interactive.
- `onTextLayout`

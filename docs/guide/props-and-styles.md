# Props and styles

## Supported props

| Prop                                                            | RN `<Text>` compatible | Notes                                                                              |
| --------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------- |
| [`children`](#children)                                         | 🟡                     | Text only: a string, number, bigint, or a flat array of them (`{count} items`).    |
| [`text`](#text)                                                 | ⬆️                     | Alternative to `children`. Use this to [animate text](./recipes#animating-text).   |
| [`numberOfLines`](#numberoflines)                               | ✅                     |                                                                                    |
| [`ellipsizeMode`](#ellipsizemode)                               | ✅                     |                                                                                    |
| [`allowFontScaling`](#allowfontscaling)                         | ✅                     |                                                                                    |
| [`maxFontSizeMultiplier`](#maxfontsizemultiplier)               | ✅                     |                                                                                    |
| [`id`](#view-props)                                             | ✅                     |                                                                                    |
| [`nativeID`](#view-props)                                       | ✅                     |                                                                                    |
| [`testID`](#view-props)                                         | ✅                     |                                                                                    |
| [`onLayout`](#view-props)                                       | ✅                     |                                                                                    |
| [Accessibility props](#view-props)                              | ✅                     | `accessible`, `accessibilityLabel`, `accessibilityRole`, `accessibilityState`, etc |
| [`hyphens`](#hyphens)                                           | ⬆️                     | Not in RN `<Text>`. `'none' \| 'auto'`, default `'none'`. See below.               |
| [`lang`](#lang)                                                 | ⬆️                     | Not in RN `<Text>`. BCP-47 tag (e.g. `'de'`) for hyphenation and line breaking.    |
| [`android_hyphenationFrequency`](#android_hyphenationfrequency) | ✅                     | Android-only, like RN `<Text>`. Only a fallback for when `hyphens` is unset.       |
| [`lineBreakStrategyIOS`](#linebreakstrategyios)                 | ✅                     | iOS-only, like RN `<Text>`. No-op on Android.                                      |
| [`textBreakStrategy`](#textbreakstrategy)                       | ✅                     | Android-only, like RN `<Text>`                                                     |

RN `<Text>` compatibility: ✅ fully compatible · 🟡 partially compatible · ⬆️ added in Plain Text.

## Supported styles

| Style                                             | RN `<Text>` compatible | Notes                                                                                   |
| ------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------- |
| [`color`](#color)                                 | ✅                     |                                                                                         |
| [`fontSize`](#fontsize)                           | ✅                     |                                                                                         |
| [`fontFamily`](#fontfamily)                       | ✅                     |                                                                                         |
| [`fontWeight`](#fontweight)                       | ✅                     |                                                                                         |
| [`fontStyle`](#fontstyle)                         | ✅                     |                                                                                         |
| [`lineHeight`](#lineheight)                       | ✅                     |                                                                                         |
| [`letterSpacing`](#letterspacing)                 | ✅                     |                                                                                         |
| [`textAlign`](#textalign)                         | ✅                     |                                                                                         |
| [`textDecorationLine`](#textdecorationline)       | ✅                     |                                                                                         |
| [`textTransform`](#texttransform)                 | ✅                     |                                                                                         |
| [Every other `ViewStyle` prop](#view-styles)      | ✅                     | `width`, `margin`, `padding`, `backgroundColor`, `opacity`, etc                         |
| [`fontVariant`](#fontvariant)                     | ✅                     |                                                                                         |
| [`fontVariationSettings`](#fontvariationsettings) | ⬆️                     | Not in RN `<Text>`. Variable-font axes in CSS syntax, e.g. `'"wght" 700, "wdth" 87.5'`. |
| [`textAlignVertical`](#textalignvertical)         | ✅ ⬆️                  | Android-only in RN Text. Implemented for both iOS & Android here.                       |
| [`verticalAlign`](#verticalalign)                 | ✅ ⬆️                  | Android-only in RN Text. Implemented for both iOS & Android                             |
| [`textShadowColor`](#textshadowcolor)             | ✅                     |                                                                                         |
| [`textShadowOffset`](#textshadowoffset)           | ✅                     |                                                                                         |
| [`textShadowRadius`](#textshadowradius)           | ✅                     |                                                                                         |
| [`includeFontPadding`](#includefontpadding)       | ✅                     | Android-only, like RN `<Text>`                                                          |
| [`writingDirection`](#writingdirection)           | ✅                     | iOS-only, like RN `<Text>`. No-op on Android.                                           |

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

## Props reference

### Main props

#### `children`

The text to render: a string, a number, or a mix like `{count} items`. `null`,
`undefined` and booleans render nothing.

| Type                                          | Default     | Cost  |
| --------------------------------------------- | ----------- | ----- |
| `PlainTextChild \| readonly PlainTextChild[]` | `undefined` | light |

A single string is the fastest. Mixed children like `{count} items` are joined
into one string on every render.

- **RN `<Text>`:** also accepts nested `<Text>` and other elements. Plain Text
  doesn't, and warns in development. Use the
  [`Text` component](./text-component) to fall back to RN `<Text>`
  automatically.

#### `text`

_Plain Text addition to the standard RN `<Text>` props._

The text to render, as a prop instead of `children`. Wins when both are set.
Use it to animate text with Animated or Reanimated without re-rendering. See
[Animating text](./recipes#animating-text).

| Type   | Default     | Cost  |
| ------ | ----------- | ----- |
| string | `undefined` | light |

#### `numberOfLines`

Limits the text to this many lines and truncates the rest, as set by
[`ellipsizeMode`](#ellipsizemode). `0` means no limit.

| Type   | Default | Cost  |
| ------ | ------- | ----- |
| number | `0`     | light |

#### `ellipsizeMode`

Where text cut off by [`numberOfLines`](#numberoflines) is truncated: at the
start (`'head'`), in the middle (`'middle'`), or at the end (`'tail'`), each
with an ellipsis. `'clip'` cuts the text off without one.

| Type                                     | Default  | Cost  |
| ---------------------------------------- | -------- | ----- |
| `'head' \| 'middle' \| 'tail' \| 'clip'` | `'tail'` | light |

- **Android:** with `numberOfLines` above `1`, only `'tail'` and `'clip'` work.
  Same as RN `<Text>`.

#### `allowFontScaling`

Whether the text follows the user's text-size setting in the OS accessibility
settings. Applies to `fontSize` and `lineHeight`, and updates live when the
setting changes.

| Type    | Default | Cost  |
| ------- | ------- | ----- |
| boolean | `true`  | light |

#### `maxFontSizeMultiplier`

Caps how much the user's text-size setting can enlarge the text. With `2`, a
14pt font grows to at most 28pt. `0`, or any value below `1`, means no cap.

| Type   | Default | Cost  |
| ------ | ------- | ----- |
| number | `0`     | light |

#### View props

`id`, `nativeID`, `testID`, `onLayout` and the accessibility props
(`accessible`, `accessibilityLabel`, `role`, `aria-*` and the rest) work as on
any RN `View`. All are light.

### Misc props

#### `hyphens`

_Plain Text addition to the standard RN `<Text>` props._

Set to `'auto'` to hyphenate words at line breaks. Set [`lang`](#lang) as well
so the right language's hyphenation rules are used.

| Type               | Default  | Cost  |
| ------------------ | -------- | ----- |
| `'none' \| 'auto'` | `'none'` | light |

Soft hyphens (`U+00AD`) in your text are left as they are. iOS breaks lines at
them, Android doesn't.

- **Android:** takes priority over
  [`android_hyphenationFrequency`](#android_hyphenationfrequency) whenever it
  is set. Known issue: with `hyphens="none"` and
  `android_hyphenationFrequency` also set, the text's measured size can
  assume hyphenation that isn't drawn.
- **RN `<Text>`:** has no hyphenation control on iOS.

#### `lang`

_Plain Text addition to the standard RN `<Text>` props._

The text's language as a BCP-47 tag, e.g. `'de'` or `'pl'`. Used for
hyphenation and line breaking. Defaults to the device language.

| Type   | Default     | Cost  |
| ------ | ----------- | ----- |
| string | `undefined` | light |

#### `android_hyphenationFrequency`

_Android only._

How often Android hyphenates words at line breaks. Only applies when
[`hyphens`](#hyphens) is not set. Prefer `hyphens`, which works on both
platforms.

| Type                           | Default  | Cost  |
| ------------------------------ | -------- | ----- |
| `'none' \| 'normal' \| 'full'` | `'none'` | light |

#### `lineBreakStrategyIOS`

_iOS only._

How iOS picks line breaks. `'none'` breaks as soon as a word doesn't fit.
`'push-out'` moves words down to avoid a single word on the last line.
`'hangul-word'` keeps Korean words whole. `'standard'` combines both.

| Type                                                  | Default  | Cost  |
| ----------------------------------------------------- | -------- | ----- |
| `'none' \| 'standard' \| 'hangul-word' \| 'push-out'` | `'none'` | light |

#### `textBreakStrategy`

_Android only._

How Android picks line breaks. `'simple'` breaks as soon as a word doesn't
fit. `'highQuality'` considers the whole paragraph for better-looking breaks.
`'balanced'` makes lines roughly equal in length.

| Type                                      | Default         | Cost  |
| ----------------------------------------- | --------------- | ----- |
| `'simple' \| 'highQuality' \| 'balanced'` | `'highQuality'` | light |

#### `unstable_lineHeightClippingCompat`

_iOS only._

Brings back RN `<Text>`'s iOS [`lineHeight`](#lineheight) rendering, where a
small `lineHeight` clips the top of the text. Use it only if you are migrating
from RN `<Text>` and depend on that exact look. May change or be removed.

| Type    | Default | Cost  |
| ------- | ------- | ----- |
| boolean | `false` | light |

## Styles reference

### Main styles

#### `color`

Text color.

| Type                                         | Default   | Cost  |
| -------------------------------------------- | --------- | ----- |
| [color](https://reactnative.dev/docs/colors) | `'black'` | light |

Stays black when unset, in dark mode too, same as RN `<Text>`.

#### `fontSize`

Font size in points. Grows with the user's text-size setting unless
[`allowFontScaling`](#allowfontscaling) is `false`.

| Type   | Default | Cost  |
| ------ | ------- | ----- |
| number | `14`    | light |

#### `fontFamily`

The font to use. Takes a system font's name or the name of a font bundled
with your app (for example with Expo Font). Defaults to the system font.

| Type   | Default     | Cost   |
| ------ | ----------- | ------ |
| string | `undefined` | medium |

The first node to use a font loads it. Later nodes with the same font reuse
it. On Android, it also has [`fontWeight`](#fontweight)'s extra cost.

#### `fontWeight`

How bold the text is: `'normal'`, `'bold'`, or `'100'` to `'900'`, as a string
or a number.

| Type                                          | Default     | Cost   |
| --------------------------------------------- | ----------- | ------ |
| `'normal' \| 'bold' \| '100'…'900' \| number` | `undefined` | medium |

With a custom `fontFamily`, the text uses the family's closest available
weight. A family without a bold version won't render bold.

- **Android:** setting `fontWeight` or `fontStyle`, even to the default,
  slightly changes glyph positioning and makes mounting about 2.5% slower.
  Same as RN `<Text>`.

#### `fontStyle`

Italic or normal text.

| Type                   | Default     | Cost   |
| ---------------------- | ----------- | ------ |
| `'normal' \| 'italic'` | `undefined` | medium |

Costs the same as [`fontWeight`](#fontweight).

#### `lineHeight`

Height of each line, in points. Unset uses the font's natural line height.
Grows with the user's text-size setting, like `fontSize`.

| Type   | Default     | Cost   |
| ------ | ----------- | ------ |
| number | `undefined` | medium |

- **RN `<Text>`:** on iOS, RN clips the top of the text when `lineHeight` is
  smaller than the font's, and pushes it down when larger
  ([RN#29507](https://github.com/facebook/react-native/issues/29507)). Plain
  Text keeps the text vertically centered on each line. Set
  [`unstable_lineHeightClippingCompat`](#unstable_lineheightclippingcompat) to
  get RN's rendering back.

#### `letterSpacing`

Extra space between characters, in points.

| Type   | Default     | Cost  |
| ------ | ----------- | ----- |
| number | `undefined` | light |

#### `textAlign`

Horizontal alignment. `'auto'` aligns to the start of the text's writing
direction.

| Type                                                   | Default  | Cost  |
| ------------------------------------------------------ | -------- | ----- |
| `'auto' \| 'left' \| 'right' \| 'center' \| 'justify'` | `'auto'` | light |

- **Android:** `'left'` and `'right'` are mirrored in right-to-left layouts.
  `'justify'` needs Android 8 (API 26) or later, and aligns left below that.
  Same as RN `<Text>`.

#### `textDecorationLine`

Underline, strikethrough, or both.

| Type                                                                  | Default  | Cost  |
| --------------------------------------------------------------------- | -------- | ----- |
| `'none' \| 'underline' \| 'line-through' \| 'underline line-through'` | `'none'` | light |

The line has the same color as the text. `textDecorationColor` and
`textDecorationStyle` are [planned](#planned).

- **RN `<Text>`:** on iOS, underlines sit slightly lower than in RN `<Text>`,
  at the position the font itself defines.

#### `textTransform`

Shows the text in uppercase, lowercase, or with each word capitalized. The
string you pass is not changed.

| Type                                                   | Default  | Cost   |
| ------------------------------------------------------ | -------- | ------ |
| `'none' \| 'uppercase' \| 'lowercase' \| 'capitalize'` | `'none'` | medium |

Converts the text on every update. For text that doesn't change, converting
the string yourself once is cheaper.

- **RN `<Text>`:** on iOS, RN's `'capitalize'` also lowercases the rest of each
  word ([RN#34117](https://github.com/facebook/react-native/issues/34117)), so
  `'iPhone'` becomes `'Iphone'`. Plain Text only capitalizes the first letter,
  as on Android and the web.

#### View styles

All other styles, such as `width`, `margin`, `padding`, `backgroundColor`,
`borderRadius` or `opacity`, work as on any RN `View`.

- **RN `<Text>`:** on Android, `overflow: 'hidden'` doesn't clip the text yet.
  Only noticeable with a `borderRadius` and text reaching the corners.

### Misc styles

#### `fontVariant`

Turns on font features such as `'tabular-nums'` (equal-width digits),
`'small-caps'` or `'oldstyle-nums'`. An array, or a space-separated string.

| Type                 | Default     | Cost   |
| -------------------- | ----------- | ------ |
| `string[] \| string` | `undefined` | medium |

Has no effect if the font doesn't support the feature. Many system fonts
support only a few.

- **RN `<Text>`:** RN ignores the ligature and contextual values
  (`common-ligatures`, `discretionary-ligatures`, `historical-ligatures`,
  `contextual` and their `no-` forms). Plain Text applies them. On Android, RN
  also ignores `fontVariant` unless `fontFamily`, `fontWeight` or `fontStyle`
  is set too. Plain Text doesn't need that.

#### `fontVariationSettings`

_Plain Text addition to the standard RN `<Text>` styles._

Sets a variable font's axes, like weight or width, to any value, in CSS
syntax: `'"wght" 700, "wdth" 87.5'`. `'normal'` resets them.

| Type   | Default     | Cost   |
| ------ | ----------- | ------ |
| string | `undefined` | medium |

Needs a variable font bundled with your app. System fonts don't support it. An
invalid value logs a warning and is ignored.

- **Android:** needs Android 8 (API 26) or later. Every node pays the cost
  separately, even with the same font and settings, so it adds up in long
  lists.
- **RN `<Text>`:** added in RN 0.88
  ([RN#57804](https://github.com/facebook/react-native/pull/57804)).

#### `textAlignVertical`

_RN `<Text>` supports this on Android only. Plain Text supports it on both platforms._

Vertical position of the text when the view is taller than the text, e.g.
with a fixed `height` or `flex: 1`. `'auto'` is the same as `'top'`.

| Type                                      | Default  | Cost  |
| ----------------------------------------- | -------- | ----- |
| `'auto' \| 'top' \| 'bottom' \| 'center'` | `'auto'` | light |

#### `verticalAlign`

_RN `<Text>` supports this on Android only. Plain Text supports it on both platforms._

Same as [`textAlignVertical`](#textalignvertical), with `'middle'` instead of
`'center'`. Wins when both are set.

| Type                                      | Default     | Cost  |
| ----------------------------------------- | ----------- | ----- |
| `'auto' \| 'top' \| 'bottom' \| 'middle'` | `undefined` | light |

#### `textShadowColor`

Color of the text shadow.

| Type                                         | Default              | Cost   |
| -------------------------------------------- | -------------------- | ------ |
| [color](https://reactnative.dev/docs/colors) | black at 33% opacity | medium |

Costs the same as [`textShadowOffset`](#textshadowoffset).

#### `textShadowOffset`

How far the text shadow is shifted, in points.

| Type                                | Default     | Cost   |
| ----------------------------------- | ----------- | ------ |
| `{ width: number, height: number }` | `undefined` | medium |

When a shadow appears differs by platform, same as RN `<Text>`:

- **iOS:** only when `textShadowOffset` is set. `{ width: 0, height: 0 }`
  still draws a shadow, which a `textShadowRadius` makes visible.
- **Android:** when the offset or radius is non-zero and the color isn't
  transparent. `textShadowRadius` alone is enough.

#### `textShadowRadius`

How blurred the text shadow is.

| Type   | Default | Cost   |
| ------ | ------- | ------ |
| number | `0`     | medium |

- **Android:** measured in pixels rather than points, so the same value gives
  a sharper shadow than on iOS. Same as RN `<Text>`.

#### `includeFontPadding`

_Android only._

Whether Android adds extra space above and below the text for tall accents
and descenders. Set to `false` to make vertical text position match iOS more
closely.

| Type    | Default | Cost  |
| ------- | ------- | ----- |
| boolean | `true`  | light |

#### `writingDirection`

_iOS only._

Whether the text reads left to right or right to left. With
`textAlign: 'auto'`, it also decides which side the text aligns to.

| Type                       | Default  | Cost  |
| -------------------------- | -------- | ----- |
| `'auto' \| 'ltr' \| 'rtl'` | `'auto'` | light |

## Planned

| Prop / style                                                            | RN `<Text>` compatible |
| ----------------------------------------------------------------------- | ---------------------- |
| `adjustsFontSizeToFit` / `minimumFontScale`                             | To Do                  |
| `selectable` / `selectionColor` / `suppressHighlighting` / `userSelect` | To Do                  |
| `textDecorationColor` / `textDecorationStyle`                           | To Do                  |
| `dynamicTypeRamp`                                                       | To Do                  |

Open an issue for the one you need. Real-world usage sets the priority.

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

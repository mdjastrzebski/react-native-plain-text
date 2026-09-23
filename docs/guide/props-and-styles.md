# Props and styles

## Supported props

| Prop                           | RN `<Text>` compatible | Notes                                                                              |
| ------------------------------ | ---------------------- | ---------------------------------------------------------------------------------- |
| `allowFontScaling`             | ✅                     |                                                                                    |
| `android_hyphenationFrequency` | ✅                     | Android-only, like RN `<Text>`. Only a fallback for when `hyphens` is unset.       |
| `children`                     | 🟡                     | `string` only                                                                      |
| `ellipsizeMode`                | ✅                     |                                                                                    |
| `hyphens`                      | ⬆️                     | Not in RN `<Text>`. `'none' \| 'auto'`, default `'none'`. See below.               |
| `lang`                         | ⬆️                     | Not in RN `<Text>`. BCP-47 tag (e.g. `'de'`) for hyphenation and line breaking.    |
| `lineBreakStrategyIOS`         | ✅                     | iOS-only, like RN `<Text>`. No-op on Android.                                      |
| `maxFontSizeMultiplier`        | ✅                     |                                                                                    |
| `nativeID`                     | ✅                     |                                                                                    |
| `id`                           | ✅                     |                                                                                    |
| `numberOfLines`                | ✅                     |                                                                                    |
| `onLayout`                     | ✅                     |                                                                                    |
| `testID`                       | ✅                     |                                                                                    |
| `text`                         | ⬆️                     | Alternative to `children`. Use this to [animate text](./recipes#animating-text).   |
| `textBreakStrategy`            | ✅                     | Android-only, like RN `<Text>`                                                     |
| Accessibility props            | ✅                     | `accessible`, `accessibilityLabel`, `accessibilityRole`, `accessibilityState`, etc |

RN `<Text>` compatibility: ✅ fully compatible · 🟡 partially compatible · ⬆️ added in Plain Text.

## Supported styles

| Style                        | RN `<Text>` compatible | Notes                                                                                   |
| ---------------------------- | ---------------------- | --------------------------------------------------------------------------------------- |
| `color`                      | ✅                     |                                                                                         |
| `fontFamily`                 | ✅                     |                                                                                         |
| `fontSize`                   | ✅                     |                                                                                         |
| `fontStyle`                  | ✅                     |                                                                                         |
| `fontVariant`                | ✅                     |                                                                                         |
| `fontVariationSettings`      | ⬆️                     | Not in RN `<Text>`. Variable-font axes in CSS syntax, e.g. `'"wght" 700, "wdth" 87.5'`. |
| `fontWeight`                 | ✅                     |                                                                                         |
| `includeFontPadding`         | ✅                     | Android-only, like RN `<Text>`                                                          |
| `letterSpacing`              | ✅                     |                                                                                         |
| `lineHeight`                 | ✅                     |                                                                                         |
| `textAlign`                  | ✅                     |                                                                                         |
| `textAlignVertical`          | ✅ ⬆️                  | Android-only in RN Text. Implemented for both iOS & Android here.                       |
| `textDecorationLine`         | ✅                     |                                                                                         |
| `textShadowColor`            | ✅                     |                                                                                         |
| `textShadowOffset`           | ✅                     |                                                                                         |
| `textShadowRadius`           | ✅                     |                                                                                         |
| `textTransform`              | ✅                     |                                                                                         |
| `verticalAlign`              | ✅ ⬆️                  | Android-only in RN Text. Implemented for both iOS & Android                             |
| `writingDirection`           | ✅                     | iOS-only, like RN `<Text>`. No-op on Android.                                           |
| Every other `ViewStyle` prop | ✅                     | `width`, `margin`, `padding`, `backgroundColor`, `opacity`, etc                         |

RN `<Text>` compatibility: ✅ fully compatible · ⬆️ added in Plain Text

## Notes

- **`textDecorationLine: 'underline'` position on iOS**: PlainText's
  `UILabel` draws the underline at the font's `underlinePosition`.
  RN `<Text>` draws it a bit too high, shifted up about one
  `underlineThickness` above its natural position.

## Improvements over RN Text

Things Plain Text does that RN `<Text>` does not:

- **`fontVariationSettings`**: set variable-font axes in CSS syntax, e.g.
  `'"wght" 700, "wdth" 87.5'`. RN `<Text>` has no such style. Needs a font with
  an `fvar` table (no system font qualifies) and Android API 26+.
- **`verticalAlign` and `textAlignVertical` on iOS**: RN `<Text>` only honors
  these on Android. Plain Text implements them on both platforms.
- **`lineHeight` clipping fix on iOS**: with a large `lineHeight`, iOS TextKit
  clips the first line's ascenders and pushes the text down
  ([RN#29507](https://github.com/facebook/react-native/issues/29507)). Plain
  Text corrects the vertical offset at draw time so the text stays centered in
  its line box.
- **`hyphens` prop**: hyphenation control. RN `<Text>` has no iOS hyphenation
  control at all, and no cross-platform one on either platform. `'none'`
  (default) keeps hyphenation at the platform's own default behavior on both
  iOS and Android — it never strips or otherwise touches an inserted soft
  hyphen (`­`). `'auto'` turns on dictionary-based hyphenation:
  iOS's `usesDefaultHyphenation` (pair with `lang` to pick the dictionary),
  and Android's `Layout.HYPHENATION_FREQUENCY_FULL`
  ([`PlainTextView.kt`](https://github.com/mdjastrzebski/react-native-plain-text/blob/main/android/src/main/java/com/mdjstack/plaintext/PlainTextView.kt)).
  On Android, `hyphens` takes priority over `android_hyphenationFrequency`
  whenever the app sets it at all — including `'none'` — and
  `android_hyphenationFrequency` only applies
  as a fallback when `hyphens` is left unset entirely. **Known gap:** this
  distinction only exists at the mounted view; the off-screen pass used to
  measure/wrap the text can't tell "unset" apart from "explicitly `'none'`"
  (both collapse to the same default before they reach native code), so it
  always falls back to `android_hyphenationFrequency` regardless. For
  `hyphens="none"` combined with a non-default `android_hyphenationFrequency`,
  this means the measured size can assume that frequency while the rendered
  text uses `NONE`.

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

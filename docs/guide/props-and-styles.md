# Props and styles

## Supported props

| Prop                    | RN `<Text>` compatible | Notes                                                                                                              |
| ----------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `adjustsFontSizeToFit`  | 🟡                     | Only takes effect with `numberOfLines={1}` and a definite width. See below.                                        |
| `allowFontScaling`      | ✅                     |                                                                                                                    |
| `children`              | 🟡                     | `string` only                                                                                                      |
| `ellipsizeMode`         | ✅                     |                                                                                                                    |
| `lineBreakStrategyIOS`  | ✅                     | iOS-only, like RN `<Text>`. No-op on Android.                                                                      |
| `maxFontSizeMultiplier` | ✅                     |                                                                                                                    |
| `minimumFontScale`      | ⬆️                     | No-op without `adjustsFontSizeToFit`. RN `<Text>` ignores this prop under Fabric; Plain Text honors it. See below. |
| `nativeID`              | ✅                     |                                                                                                                    |
| `id`                    | ✅                     |                                                                                                                    |
| `numberOfLines`         | ✅                     |                                                                                                                    |
| `onLayout`              | ✅                     |                                                                                                                    |
| `testID`                | ✅                     |                                                                                                                    |
| `text`                  | ⬆️                     | Alternative to `children`. Use this to [animate text](./recipes#animating-text).                                   |
| `textBreakStrategy`     | ✅                     | Android-only, like RN `<Text>`                                                                                     |
| Accessibility props     | ✅                     | `accessible`, `accessibilityLabel`, `accessibilityRole`, `accessibilityState`, etc                                 |

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
| Every other `ViewStyle` prop | ✅                     | `width`, `margin`, `padding`, `backgroundColor`, `opacity`, etc                         |

RN `<Text>` compatibility: ✅ fully compatible · ⬆️ added in Plain Text

## Notes

- **`textDecorationLine: 'underline'` position on iOS**: PlainText's
  `UILabel` draws the underline at the font's `underlinePosition`.
  RN `<Text>` draws it a bit too high, shifted up about one
  `underlineThickness` above its natural position.
- **`adjustsFontSizeToFit` requires `numberOfLines={1}` and a definite width.**
  Outside that shape it's a no-op: the text renders at its normal size instead
  of a wrong or half-shrunk one. This is deliberately narrower than RN
  `<Text>`, which also shrinks multiline text against an indefinite width. The
  two platforms also don't always agree on the exact size they land on.

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
- **`minimumFontScale` actually does something.** RN `<Text>` accepts the prop
  but silently drops it under Fabric (it's only wired up in the legacy,
  non-Fabric renderer). Plain Text honors it, floored at 4pt/4dp either way.

## Planned

| Prop / style                                                            | RN `<Text>` compatible |
| ----------------------------------------------------------------------- | ---------------------- |
| `selectable` / `selectionColor` / `suppressHighlighting` / `userSelect` | To Do                  |
| `textDecorationColor` / `textDecorationStyle`                           | To Do                  |
| `writingDirection`                                                      | To Do                  |
| `dynamicTypeRamp`                                                       | To Do                  |
| `android_hyphenationFrequency`                                          | To Do                  |

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

# Props and styles

## Supported props

| Prop                    | RN `<Text>` compatible | Notes                                                                              |
| ----------------------- | ---------------------- | ---------------------------------------------------------------------------------- |
| `allowFontScaling`      | ✅                     |                                                                                    |
| `children`              | 🟡                     | `string` only                                                                      |
| `ellipsizeMode`         | ✅                     |                                                                                    |
| `maxFontSizeMultiplier` | ✅                     |                                                                                    |
| `nativeID`              | ✅                     |                                                                                    |
| `id`                    | ✅                     |                                                                                    |
| `numberOfLines`         | ✅                     |                                                                                    |
| `onLayout`              | ✅                     |                                                                                    |
| `testID`                | ✅                     |                                                                                    |
| Accessibility props     | ✅                     | `accessible`, `accessibilityLabel`, `accessibilityRole`, `accessibilityState`, etc |

RN `<Text>` compatibility: ✅ fully compatible · 🟡 partially compatible.

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
| `textAlignVertical`          | ✅ ⬆️                  | Anroid-only in RN Text. Implemented for both iOS & Android here.                        |
| `textDecorationLine`         | ✅                     |                                                                                         |
| `textShadowColor`            | ✅                     |                                                                                         |
| `textShadowOffset`           | ✅                     |                                                                                         |
| `textShadowRadius`           | ✅                     |                                                                                         |
| `textTransform`              | ✅                     |                                                                                         |
| `verticalAlign`              | ✅ ⬆️                  | Anroid-only in RN Text. Implemented for both iOS & Android                              |
| Every other `ViewStyle` prop | ✅                     | `width`, `margin`, `padding`, `backgroundColor`, `opacity`, etc                         |

RN `<Text>` compatibility: ✅ fully compatible · ⬆️ added in Plain Text

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

## Planned

| Prop / style                                                                  | RN `<Text>` compatible |
| ----------------------------------------------------------------------------- | ---------------------- |
| `adjustsFontSizeToFit` / `minimumFontScale`                                   | To Do                  |
| `selectable` / `selectionColor` / `suppressHighlighting` / `userSelect`       | To Do                  |
| `textDecorationColor` / `textDecorationStyle`                                 | To Do                  |
| `writingDirection`                                                            | To Do                  |
| `dynamicTypeRamp`                                                             | To Do                  |
| `android_hyphenationFrequency` / `textBreakStrategy` / `lineBreakStrategyIOS` | To Do                  |

Open an issue for the one you need. Real-world usage sets the priority.

## Not supported

Deliberatly excluded:

- nested `<Text>` elements and mixed styles
- press and touch handling: `onPress`, `onLongPress`, `onPressIn`, `onPressOut`,
  `pressRetentionOffset`, and the touch-responder handlers
  (`onStartShouldSetResponderCapture`, `onMoveShouldSetResponder`,
  `onResponderGrant` / `Move` / `Release` / `Terminate`,
  `onResponderTerminationRequest`). Wrap `<PlainText>` in a `Pressable` instead.
- `disabled`: only meaningful alongside press handlers.
- `dataDetectorType`: turns substrings into tappable links, which makes the label interactive.
- `onTextLayout`

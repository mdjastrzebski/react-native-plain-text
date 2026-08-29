# Props and styles

## Supported props

| Prop                    | RN `<Text>` compatible | Notes                                                                                            |
| ----------------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| `allowFontScaling`      | ✅                     |                                                                                                  |
| `children`              | 🟡                     | `string` only                                                                                    |
| `ellipsizeMode`         | ✅                     |                                                                                                  |
| `maxFontSizeMultiplier` | ✅                     |                                                                                                  |
| `nativeID` / `id`       | ✅                     |                                                                                                  |
| `numberOfLines`         | ✅                     |                                                                                                  |
| `onLayout`              | ✅                     |                                                                                                  |
| `testID`                | ✅                     |                                                                                                  |
| Accessibility props     | ✅                     | All of RN's: `accessible`, `accessibilityLabel`, `accessibilityRole`, `accessibilityState`, etc) |

RN `<Text>` compatibility: ✅ fully compatible · 🟡 partially compatible · ❌ not implemented · ⬆️ added in Plain Text

## Supported styles

| Style                                                       | RN `<Text>` compatible | Notes                                                                                                  |
| ----------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `color`                                                     | ✅                     |                                                                                                        |
| `fontFamily`                                                | ✅                     |                                                                                                        |
| `fontSize`                                                  | ✅                     |                                                                                                        |
| `fontStyle`                                                 | ✅                     |                                                                                                        |
| `fontVariant`                                               | ✅                     |                                                                                                        |
| `fontVariationSettings`                                     | ⬆️                     | Not in RN `<Text>`. Variable-font axes in CSS syntax, e.g. `'"wght" 700, "wdth" 87.5'`.                |
| `fontWeight`                                                | ✅                     |                                                                                                        |
| `includeFontPadding`                                        | ✅                     | Android-only, like RN `<Text>`                                                                         |
| `letterSpacing`                                             | ✅                     |                                                                                                        |
| `lineHeight`                                                | ✅                     |                                                                                                        |
| `textAlign`                                                 | ✅                     |                                                                                                        |
| `textAlignVertical`                                         | ✅⬆️                   | Anroid-only in RN Text. Implemented for both iOS & Android here.                                       |
| `textDecorationLine`                                        | ✅                     |                                                                                                        |
| `textShadowColor` / `textShadowOffset` / `textShadowRadius` | ✅                     |                                                                                                        |
| `textTransform`                                             | ✅                     |                                                                                                        |
| `verticalAlign`                                             | ✅⬆️                   | Anroid-only in RN Text. Implemented for both iOS & Android                                             |
| Every other `ViewStyle` prop                                | ✅                     | `width`, `margin`, `padding`, `backgroundColor`, `opacity`, etc are forwarded to the native view as-is |

RN `<Text>` compatibility: ✅ fully compatible · 🟡 partially compatible · ❌ not implemented · ⬆️ added in Plain Text

## Planned

| Prop / style                                                                  | RN `<Text>` compatible | Notes |
| ----------------------------------------------------------------------------- | ---------------------- | ----- |
| `adjustsFontSizeToFit` / `minimumFontScale`                                   | ❌                     |       |
| `selectable` / `selectionColor` / `suppressHighlighting` / `userSelect`       | ❌                     |       |
| `textDecorationColor` / `textDecorationStyle`                                 | ❌                     |       |
| `writingDirection`                                                            | ❌                     |       |
| `dynamicTypeRamp`                                                             | ❌                     |       |
| `android_hyphenationFrequency` / `textBreakStrategy` / `lineBreakStrategyIOS` | ❌                     |       |

RN `<Text>` compatibility: ✅ fully compatible · 🟡 partially compatible · ❌ not implemented · ⬆️ added in Plain Text

Open an issue for the one you need. Real-world usage sets the priority.

## Not supported

Deliberatly excluded:

- nested `<Text>` / multiple styles
- press and touch handling: `onPress`, `onLongPress`, `onPressIn`, `onPressOut`,
  `pressRetentionOffset`, and the touch-responder handlers
  (`onStartShouldSetResponderCapture`, `onMoveShouldSetResponder`,
  `onResponderGrant` / `Move` / `Release` / `Terminate`,
  `onResponderTerminationRequest`). Wrap `PlainText` in a `Pressable` instead.
- `disabled`: only meaningful alongside press handlers.
- `dataDetectorType`: turns substrings into tappable links, which makes the label
  interactive.
- `onTextLayout`

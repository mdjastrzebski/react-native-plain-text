# Props and styles

## Supported props

| Prop                    | RN `<Text>` compatible | Notes                                                                                                                                |
| ----------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `allowFontScaling`      | ✅                     |                                                                                                                                      |
| `children`              | 🟡                     | `string` only                                                                                                                        |
| `ellipsizeMode`         | ✅                     |                                                                                                                                      |
| `maxFontSizeMultiplier` | ✅                     |                                                                                                                                      |
| `nativeID` / `id`       | ✅                     |                                                                                                                                      |
| `numberOfLines`         | ✅                     |                                                                                                                                      |
| `testID`                | ✅                     |                                                                                                                                      |
| Accessibility props     | ✅                     | All of RN's (`accessible`, `accessibilityLabel`, `accessibilityRole`, `accessibilityState`, …), including the platform-specific ones |

RN `<Text>` compatibility: ✅ fully compatible · 🟡 partially compatible · ❌ not implemented · ⬆️ added in Plain Text

## Supported styles

| Style                                                       | RN `<Text>` compatible | Notes                                                                                            |
| ----------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| `color`                                                     | ✅                     |                                                                                                  |
| `fontFamily`                                                | ✅                     |                                                                                                  |
| `fontSize`                                                  | ✅                     |                                                                                                  |
| `fontStyle`                                                 | ✅                     |                                                                                                  |
| `fontVariant`                                               | ✅                     |                                                                                                  |
| `fontVariationSettings`                                     | ⬆️                     | Not in RN `<Text>`. Variable-font axes in CSS syntax, e.g. `'"wght" 700, "wdth" 87.5'`.          |
| `fontWeight`                                                | ✅                     |                                                                                                  |
| `includeFontPadding`                                        | ✅                     | Android-only, like RN `<Text>`                                                                   |
| `letterSpacing`                                             | ✅                     |                                                                                                  |
| `lineHeight`                                                | ✅                     |                                                                                                  |
| `textAlign`                                                 | ✅                     |                                                                                                  |
| `textAlignVertical`                                         | ✅⬆️                   | Anroid-only in RN Text. Implemented for both iOS & Android here.                                 |
| `textDecorationLine`                                        | ✅                     |                                                                                                  |
| `textShadowColor` / `textShadowOffset` / `textShadowRadius` | ✅                     |                                                                                                  |
| `verticalAlign`                                             | ✅⬆️                   | Anroid-only in RN Text. Implemented for both iOS & Android                                       |
| Every other `ViewStyle` prop                                | ✅                     | `width`, `margin`, `padding`, `backgroundColor`, `opacity`, … forwarded to the native view as-is |

RN `<Text>` compatibility: ✅ fully compatible · 🟡 partially compatible · ❌ not implemented · ⬆️ added in Plain Text

## Planned

| Prop                                                     | RN `<Text>` compatible | Notes                                      |
| -------------------------------------------------------- | ---------------------- | ------------------------------------------ |
| `adjustsFontSizeToFit` / `minimumFontScale`              | ❌                     |                                            |
| `selectable` / `selectionColor` / `suppressHighlighting` | ❌                     | Text selection, planned for both platforms |
| `textDecorationColor` / `textDecorationStyle`            | ❌                     |                                            |

RN `<Text>` compatibility: ✅ fully compatible · 🟡 partially compatible · ❌ not implemented · ⬆️ added in Plain Text

No committed order. Open an issue for the one you need. Real-world usage sets
the priority.

## Not supported

Deliberate scope calls, given `PlainText`'s job as a flat, single-style,
non-interactive label. Reconsidered only on strong real-world demand.

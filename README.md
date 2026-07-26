# react-native-plain-text

A lighter-weight `<Text>` for React Native. `PlainText` renders straight to
the platform's native text widget (`UILabel` on iOS, `TextView` on Android)
instead of going through RN's own text layout pipeline, so it uses less
memory and renders faster. The tradeoff: no nested or mixed-style text, just
a single string with one style (see [Compatibility](#compatibility)). That
covers the large majority of real-world `<Text>` usage (body copy, labels,
list and feed content), making `PlainText` a drop-in-*shaped* swap for
perf-conscious apps and design systems alike. It's an early, evolving
library, and feedback drives what gets built next.

Early measurements with the example app's Performance tab (rough,
self-measured, take as directional — see
[MEASURING.md](docs/agent/MEASURING.md) for what the numbers mean and how to
reproduce them):

Memory per mounted view:

| Text size | `PlainText` | RN `Text` |
| --- | --- | --- |
| iOS, small | 28 KB | 56 KB |
| iOS, regular | 43 KB | 83 KB |
| iOS, large | 154 KB | 405 KB |
| Android, typical instance | 38 KB | 51 KB |

Interaction latency — press until 1000 mounted views appear, as reported by
RN's own Event Timing API (Pixel 3a, release build):

| | `PlainText` | RN `Text` |
| --- | --- | --- |
| Android, 1000 views | ~505 ms | ~720 ms\* |

\* the `Text` figure is derived from an earlier measurement rather than read
directly from Event Timing; see [PERFORMANCE.md](docs/agent/PERFORMANCE.md).

## Installation


```sh
npm install react-native-plain-text
```


## Usage

```jsx
import { PlainText } from "react-native-plain-text";

// ...

<PlainText style={{ fontSize: 16 }}>Hello from PlainText 👋</PlainText>
```

### Compatibility

`PlainText` is a drop-in-*shaped* replacement for RN's `<Text>`, but it's an early package and only supports a subset of `<Text>`'s props and styles so far. The tables below track what works today versus what's still on the roadmap.

Legend: ✅ supported · 🔜 planned, not yet available

Planned rows are listed in rough implementation order (top = next up).

#### Style props (via `style={{ ... }}`)

| Style | Status | Notes |
| --- | :---: | --- |
| `fontSize` | ✅ | |
| `color` | ✅ | |
| `fontWeight` | ✅ | |
| `fontFamily` | ✅ | |
| `lineHeight` | ✅ | |
| `fontStyle` | ✅ | `'normal' \| 'italic'` |
| `textAlign` | ✅ | |
| `textDecorationLine` | ✅ | `'none' \| 'underline' \| 'line-through' \| 'underline line-through'` |
| `letterSpacing` | ✅ | |
| `verticalAlign` / `textAlignVertical` | ✅ | Android-only, matching RN `<Text>`; iOS top-aligns like `<Text>`. `'auto' \| 'top' \| 'bottom' \| 'center'` (`verticalAlign`'s `'middle'` maps to `'center'`). |
| `textDecorationColor` / `textDecorationStyle` | 🔜 | Follow-on to `textDecorationLine`. Costs more on Android, which needs a `SpannableString` since plain `TextView` underline ignores color. |
| `textShadowColor` / `textShadowOffset` / `textShadowRadius` | 🔜 | For text-over-image legibility. Ship as one unit since the three props only make sense together. |
| `includeFontPadding` (Android) | 🔜 | |
| `fontVariant` | 🔜 | Small-caps, tabular-nums, and similar OpenType feature toggles. |
| `fontVariationSettings` | 🔜 | Variable-font axis control. Not part of RN `<Text>`'s own style API today, so this would go beyond RN parity rather than match it. |
| All other `ViewStyle` props (`width`, `height`, `margin`, `padding`, `backgroundColor`, `opacity`, etc.) | ✅ | Forwarded to the native view as-is. |

#### Component props

| Prop | Status | Notes |
| --- | :---: | --- |
| `children` | ✅ | Plain `string` only, no nested `<Text>`/styled fragments. |
| `numberOfLines` | ✅ | |
| `ellipsizeMode` | ✅ | `'head' \| 'middle' \| 'tail' \| 'clip'` |
| `allowFontScaling` / `maxFontSizeMultiplier` | ✅ | Accessibility text scaling. |
| `adjustsFontSizeToFit` / `minimumFontScale` | 🔜 | Shrink-to-fit, for matching fixed-size design frames exactly. No native Android equivalent to `adjustsFontSizeToFit`, so this is the most expensive item on the list. |
| `testID` / `accessibilityRole` / other accessibility props | ✅ | The full RN `<Text>` accessibility surface (`accessibilityLabel`, `accessibilityHint`, `accessibilityState`, `accessibilityRole`, `nativeID`, etc.), forwarded through `ViewProps` to the native view. |

> Want a prop or style bumped up the list? Open an issue, since real-world usage drives what gets built next.

#### Intentionally excluded

These are real `<Text>` props and styles that `PlainText` does **not** plan to support. They're not oversights, but deliberate scope calls given `PlainText`'s job as a flat, single-style, non-interactive label. Reconsider only on strong real-world demand.

- **`onPress` / `onLongPress` / `onPressIn` / `onPressOut` / `onResponder*` / `pressRetentionOffset`**: Full gesture-responder wiring is out of scope. `PlainText` renders text, it doesn't handle touch. It's still a plain view, so wrap it in `Pressable` if you need this.
- **`selectable` / `selectionColor` (Android) / `suppressHighlighting` (iOS)**: `UILabel` isn't selectable by design. Supporting this would mean swapping the underlying widget or bolting on a custom selection UI, exactly the complexity this library exists to avoid. Use RN's own `<Text>` if you need selectable text.
- **`dataDetectorType` (Android)**: Auto-linking phone numbers, emails, and URLs requires attributed-text spans (`NSDataDetector` / `Linkify`). That's rich, interactive text, which conflicts with the "flat, single-style" scope.
- **`textTransform`**: Trivially done in plain JS by the caller (`children.toUpperCase()`), so it doesn't earn a native prop.
- **`writingDirection`**: RTL is virtually always handled globally via `I18nManager`, not per-text-node overrides.
- **`textBreakStrategy` (Android) / `lineBreakStrategyIOS` / `android_hyphenationFrequency`**: Real knobs, but almost nobody overrides the defaults in practice.
- **`onTextLayout`**: Useful for custom "read more" UX, but it carries a nontrivial line-metrics payload for a "lite" library. Defer until there's demonstrated demand.
- **`dynamicTypeRamp` (iOS)**: Overlaps with `allowFontScaling`/`maxFontSizeMultiplier` at a much higher cost, and it's iOS-only, which cuts against the both-platforms policy.
- **`disabled` (Android)**: RN's own docs mark this as a testing-only hook, not a real feature.
- **`userSelect`**: Web-only CSS alias. The web fallback already gets this for free via `react-native-web`'s own `<Text>`.

> **Sizing:** `PlainText` measures and sizes itself to its content automatically (no need to set an explicit `width`/`height`), matching how RN's `<Text>` behaves.


## Contributing

- [Measuring performance](docs/agent/MEASURING.md) · [Performance notes](docs/agent/PERFORMANCE.md)
- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)

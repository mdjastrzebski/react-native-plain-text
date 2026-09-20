# React Native Plain Text

[![npm version](https://img.shields.io/npm/v/react-native-plain-text.svg)](https://www.npmjs.com/package/react-native-plain-text)
[![license](https://img.shields.io/npm/l/react-native-plain-text.svg)](./LICENSE)

`PlainText` is a faster, lighter alternative to React Native's built-in `<Text>`
component that focuses on single-style text. This covers most real-world text:
headers, labels, body copy.

It renders straight to the platform's native text views: `UILabel` on iOS,
`TextView` on Android, instead of using React Native's text layout pipeline.

The tradeoff: one style, no nested `<Text>`.

## Should you use it?

For most apps, RN's `<Text>` is a reasonable choice. Two reasons to pick
`PlainText` instead:

1. Performance. On screens that mount a lot of single-style labels at once, like
   feeds and long lists, it mounts faster and uses less memory.
2. Features and bug fixes missing from RN `<Text>`:
   [`verticalAlign` / `textAlignVertical` on iOS and `fontVariationSettings`](https://mdjastrzebski.github.io/react-native-plain-text/guide/props-and-styles#improvements-over-rn-text),
   and [animated text](https://mdjastrzebski.github.io/react-native-plain-text/guide/recipes#animating-text).

You can mix it with `<Text>` in the same screen and only use it where it earns
its place. The [`Text` component](#unified-text-component) is an easy adoption path: a
drop-in replacement for RN `<Text>` that picks `PlainText` for you where it can.
Using `PlainText` directly gives you the best performance.

## Installation

```sh
npm install react-native-plain-text
```

This is a native module, so installing it is not enough. Rebuild the app, running
`pod install` first on iOS. It does not work in Expo Go, so use a dev client or a
bare app.

Requires the New Architecture (Fabric).

## Usage

```jsx
import { PlainText } from 'react-native-plain-text';

<PlainText style={{ fontSize: 16 }}>Hello from PlainText 👋</PlainText>;
```

## Unified `Text` component

For an easy adoption path that doesn't require touching existing `<Text>` call
sites, import `Text` instead of `PlainText`:

```jsx
import { Text } from 'react-native-plain-text';

<Text style={{ fontSize: 16 }}>Hello from Text 👋</Text>;
```

It's a selector component: `PlainText` for simple strings, falling back to RN
`<Text>` for anything `PlainText` doesn't support (nested text, non-string
children). See the
[`Text` component guide](https://mdjastrzebski.github.io/react-native-plain-text/guide/text-component)
for how it decides and how to build the same pattern into your own centralized
Text component.

Using `PlainText` directly still gives you the best performance.

## Props and styles

`children` accepts a plain `string` only. No nested `<Text>`, no elements.

Everything below is API-compatible with RN `<Text>`. Most commonly used:

- **Styles:** `fontSize`, `color`, `fontWeight`, `fontFamily`, `fontStyle`,
  `lineHeight`, `letterSpacing`, `textAlign`, `textDecorationLine`,
  `textTransform`, plus every other `ViewStyle` prop (`width`, `margin`,
  `padding`, `backgroundColor`, `opacity`, …), forwarded to the native view
  as-is.
- **Props:** `numberOfLines`, `ellipsizeMode`, `allowFontScaling`,
  `maxFontSizeMultiplier`, `onLayout`, `testID`, `nativeID` / `id`, and all of
  RN's accessibility props (`accessible`, `accessibilityLabel`,
  `accessibilityRole`, `accessibilityState`, …).

Beyond RN `<Text>`, PlainText adds hyphenation control:

- `hyphens` (prop): `'none' | 'auto'`, default `'none'`. `'none'` keeps the
  platform's default hyphenation behavior — it never touches an inserted soft
  hyphen (`­`) on either platform. `'auto'` hyphenates automatically (pair
  with `lang` on iOS). On Android, `hyphens` wins over
  `android_hyphenationFrequency` whenever the prop is passed at all; omit it
  entirely to let `android_hyphenationFrequency` apply instead.
- `android_hyphenationFrequency` (prop): Android only, like RN `<Text>`:
  `'none' | 'normal' | 'full'`. Only applies as a fallback when `hyphens` is
  left unset.
- `lang` (prop): BCP-47 language tag (e.g. `'de'`), picking the hyphenation
  dictionary and locale-sensitive line breaking.

See
[Props and styles](https://mdjastrzebski.github.io/react-native-plain-text/guide/props-and-styles)
for the full support matrix, platform notes, and additions beyond RN `<Text>`
such as `fontVariationSettings`.

## Not supported

Following are deliberately excluded:

- Nested `<Text>` elements and mixed styles
- Press and touch handling (`onPress`, `onLongPress`, the responder handlers). Wrap `PlainText` in a `Pressable` instead.

Use RN's `<Text>` where you need any of these. See
[Props and styles](https://mdjastrzebski.github.io/react-native-plain-text/guide/props-and-styles)
for the detailed list of what's out of scope and what's planned.

## Performance

Compared with RN `<Text>` rendering the same content on the same device:

|                          | iOS           | Android     |
| ------------------------ | ------------- | ----------- |
| Time to mount 1000 views | 13–21% faster | ~30% faster |
| Memory per mounted view  | 15–25% less   | ~33% less   |

Self-measured from the example app. See
[Performance](https://mdjastrzebski.github.io/react-native-plain-text/guide/performance)
for the method and the per-device numbers behind these percentages.

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

# React Native Plain Text

[![npm version](https://img.shields.io/npm/v/react-native-plain-text.svg)](https://www.npmjs.com/package/react-native-plain-text)
[![license](https://img.shields.io/npm/l/react-native-plain-text.svg)](./LICENSE)

A faster, lower-memory alternative to React Native's `<Text>` for simple,
single-style text. `PlainText` renders straight to the platform's native text
widget (`UILabel` on iOS, `TextView` on Android) instead of going through RN's
text layout pipeline.

The tradeoff: one string, one style. No nested `<Text>`, no mixed styles. That
still covers most real-world text: body copy, labels, list and feed content.

Beta: the API is stable enough to use, and feedback drives what gets built next.

## Should you use it?

For most apps, RN's `<Text>` is a reasonable choice. Two reasons to pick
`PlainText` instead:

1. Performance. On screens that mount a lot of single-style labels at once, like
   feeds and long lists, it mounts faster and uses less memory.
2. Features missing from RN `<Text>`, such as `fontVariationSettings` and
   `verticalAlign` / `textAlignVertical` on iOS. See
   [Improvements over RN Text](https://mdjastrzebski.github.io/react-native-plain-text/guide/props-and-styles#improvements-over-rn-text).

You can mix it with `<Text>` in the same screen and only use it where it earns
its place. The [compatibility wrapper](#rn-text-compatibility-wrapper) below
picks between the two for you.

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

## RN Text compatibility wrapper

`PlainText` is API-compatible with React Native `<Text>`, so a wrapper can pick
one or the other automatically. The one below renders `PlainText` in supported
cases and falls back to RN `<Text>` for anything more advanced (e.g. nested
text).

```tsx
import { use } from 'react';
import { Text as RnText, unstable_TextAncestorContext, type TextProps } from 'react-native';
import { PlainText, type PlainTextProps } from 'react-native-plain-text';

export function CompatText({ children, ...rest }: TextProps) {
  const isNestedText = use(unstable_TextAncestorContext);
  if (!isNestedText && typeof children === 'string') {
    return <PlainText {...(rest as PlainTextProps)}>{children}</PlainText>;
  }
  return <RnText {...rest}>{children}</RnText>;
}
```

RN's `unstable_TextAncestorContext` helps detect cases when `<Text>` is nested
inside another `<Text>`, one of the cases `PlainText` can't handle.

Note: you should tweak this pattern as needed.

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

See
[Props and styles](https://mdjastrzebski.github.io/react-native-plain-text/guide/props-and-styles)
for the full support matrix, platform notes, and additions beyond RN `<Text>`
such as `fontVariationSettings`.

## Not supported

Deliberate scope calls, given `PlainText`'s job as a flat, single-style,
non-interactive label:

- Nested `<Text>` and mixed styles
- Press and touch handling (`onPress`, `onLongPress`, the responder handlers).
  Wrap `PlainText` in a `Pressable` instead.

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

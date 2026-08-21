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

RN's `<Text>` is the right choice for most apps. Reach for `PlainText` when you
want to squeeze the most out of text-heavy screens like long lists and feeds,
where a lot of labels mount at once.

It is not all-or-nothing. Everything `PlainText` supports is API-compatible with
RN `<Text>`, so the two mix freely in one screen. Use `PlainText` for the flat,
single-style labels and plain `<Text>` wherever you need something it doesn't
do, like mixed styles, nested text, press handling or selection.

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

## Supported styles

Via `style={{ ... }}`:

- `fontSize`
- `color`
- `fontWeight`
- `fontFamily`
- `fontStyle`: `'normal' | 'italic'`
- `fontVariant`
- `fontVariationSettings`: variable-font axes in CSS syntax, e.g.
  `'"wght" 700, "wdth" 87.5'`. RN `<Text>` has no such style, so the style type
  is widened (`PlainTextStyle`). Needs a font with an `fvar` table (no system
  font qualifies), and Android API 26+.
- `lineHeight`
- `letterSpacing`
- `textAlign`
- `textDecorationLine`: `'none' | 'underline' | 'line-through' | 'underline line-through'`
- `textShadowColor` / `textShadowOffset` / `textShadowRadius`: like RN `<Text>`,
  iOS only draws a shadow when `textShadowOffset` itself is set, regardless of
  the other two; Android draws one whenever any of the three would produce a
  visible effect.
- `verticalAlign`: Android only, like RN `<Text>`
- `textAlignVertical`: Android only, like RN `<Text>`
- `includeFontPadding`: Android only, like RN `<Text>`
- Every other `ViewStyle` prop (`width`, `margin`, `padding`,
  `backgroundColor`, `opacity`, …), forwarded to the native view as-is

## Supported props

- `children`: plain `string` only
- `numberOfLines`
- `ellipsizeMode`: `'head' | 'middle' | 'tail' | 'clip'`
- `allowFontScaling`
- `maxFontSizeMultiplier`
- `testID`
- `nativeID` / `id`
- All of RN's accessibility props (`accessible`, `accessibilityLabel`,
  `accessibilityRole`, `accessibilityState`, …), including the platform-specific
  ones

## Planned

- `textDecorationColor` / `textDecorationStyle`
- `adjustsFontSizeToFit` / `minimumFontScale`: the most expensive item on the
  list, and the only one that is more than a prop. Shrinking text to fit needs
  the view's final frame, which the measurement pass (the thing that decides
  that frame) never sees. Neither platform's built-in autoshrink helps: both
  work off the view's assigned bounds and neither reports the size it picked, so
  the measurement pass cannot predict either. RN's `<Text>` runs its own shrink
  loop twice, once while measuring and once at draw time, and lets the second
  win. `PlainText` has no channel to pass anything from measurement to the view,
  which is part of why it is faster. Note also that `minimumFontScale` has no
  effect in RN's `<Text>` under the New Architecture, so this is one prop where
  matching RN would mean matching a no-op.

No committed order. Open an issue for the one you need. Real-world usage sets
the priority.

## Not supported

Deliberate scope calls, given `PlainText`'s job as a flat, single-style,
non-interactive label. Reconsidered only on strong real-world demand.

Text selection is the exception: `selectable`, `selectionColor` and
`suppressHighlighting` are missing because `UILabel` isn't selectable by design,
not because of a scope call. Use RN's `<Text>` where you need it.

## Performance

Compared with RN `<Text>` rendering the same content on the same device:

|                          | iOS           | Android     |
| ------------------------ | ------------- | ----------- |
| Time to mount 1000 views | 13–21% faster | ~30% faster |
| Memory per mounted view  | 15–25% less   | ~33% less   |

Time to mount covers input dispatch, React render, Fabric commit, Yoga layout
with text measurement, and native view creation, but not rasterization. It is
the `event` entry duration reported by `PerformanceObserver`, the RN metric
closest to INP on the web. Self-measured from the example app: see
[measuring.md](docs/agent/measuring.md) for the method and
[performance.md](docs/agent/performance.md) for per-run data.

<details>
<summary>Measured numbers behind the percentages</summary>

Time to mount 1000 views, release builds:

|                            | `PlainText` | RN `Text` | Difference |
| -------------------------- | ----------- | --------- | ---------- |
| Android, small (Pixel 3)   | 502 ms      | 716 ms    | 30% faster |
| Android, regular (Pixel 3) | 505 ms      | 724 ms    | 30% faster |
| Android, large (Pixel 3)   | 504 ms      | 718 ms    | 30% faster |
| iOS, small (iPhone 16)     | 142 ms      | 164 ms    | 13% faster |
| iOS, regular (iPhone 16)   | 144 ms      | 171 ms    | 16% faster |
| iOS, large (iPhone 16)     | 165 ms      | 210 ms    | 21% faster |

Memory per mounted view:

| Text size        | `PlainText` | RN `Text` | Difference |
| ---------------- | ----------- | --------- | ---------- |
| iOS, small       | 34.5 KB     | 42.6 KB   | 19% less   |
| iOS, regular     | 49.6 KB     | 58.4 KB   | 15% less   |
| iOS, large       | 148.6 KB    | 197.6 KB  | 25% less   |
| Android, small   | 35.1 KB     | 52.9 KB   | 34% less   |
| Android, regular | 35.4 KB     | 52.7 KB   | 33% less   |
| Android, large   | 35.3 KB     | 53.2 KB   | 34% less   |

Each figure is a mean of 3 runs.

</details>

## Contributing

- [Measuring performance](docs/agent/measuring.md) ·
  [Performance notes](docs/agent/performance.md)
- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

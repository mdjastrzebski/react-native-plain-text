# `Text` component

The library offers two ways of integrating into your app:

- **`PlainText`** is a high-performance, single-style text component. You use it
  directly at the call sites where it fits. This gives the best performance: no
  per-render check, no fallback branch, and no chance of silently landing on RN
  `<Text>`.

- **`Text`** is a drop-in replacement for RN `<Text>`. It automatically renders
  `PlainText` for simple strings and falls back to RN `<Text>` for nested ones.
  Swap the import and get most of Plain Text's performance benefits across the app
  without touching any call sites.

```jsx
import { Text } from 'react-native-plain-text';

<Text style={{ fontSize: 16 }}>Hello there 👋</Text>;
```

Reach for `Text` where an existing call site takes arbitrary `<Text>` children you
don't control, or as a first pass before switching individual call sites to
`PlainText`. See [Should you use it?](./intro#should-you-use-it) for the underlying
tradeoff. The rest of this page covers `Text`.

## How it works

In outline, `Text` does this (simplified, without the development warnings
described below):

```tsx
export function Text({ mode = 'compat', text, children, ...rest }: TextProps) {
  // 1. Is this <Text> nested inside another <Text>?
  const isNestedText = use(unstable_TextAncestorContext);

  // 2. Is the content plain text? `text` wins over `children`.
  const content = text ?? children;
  const isTextContent = isPlainText(content);

  // 3. In compat mode, is a prop PlainText can't reproduce (e.g. onPress) set?
  const needsRNText = mode === 'fallback' || (mode === 'compat' && hasUnsupportedProp(rest));

  // 4. Render PlainText when possible...
  if (!needsRNText && !isNestedText && isTextContent) {
    return <PlainText {...rest}>{content}</PlainText>;
  }

  // 5. ...and fall back to RN <Text> otherwise.
  return <RNText {...rest}>{content}</RNText>;
}
```

The real implementation,
[`src/Text.tsx`](https://github.com/mdjastrzebski/react-native-plain-text/blob/main/src/Text.tsx),
makes the same decision but is tuned for speed: it checks for a plain string
first and renders the native view directly, skipping the `PlainText` wrapper.

`Text` renders `PlainText` only when all of these hold:

- `mode` isn't `"fallback"`, and in the default `"compat"` mode no prop `PlainText`
  can't reproduce is set (see [Modes](#modes) below).
- The content is text: the `text` prop if set, otherwise `children`. That's a
  string, a number (or `bigint`), or a mix like `{count} items` (which JSX passes
  as `[count, ' items']`). Anything containing an element (nested `<Text>`, an
  icon), no children at all, or a lone boolean (`{flag && label}` with `flag`
  false) falls back to RN `<Text>`.
- It isn't itself nested inside another `<Text>` — RN's `unstable_TextAncestorContext`
  is `true` for descendants of a `<Text>`, and `PlainText` doesn't support nested
  `<Text>` composition. Falling back keeps that nesting working.

Whichever branch is taken, all other props are forwarded unchanged, so `Text` is
API-compatible with RN `<Text>`. When it resolves to `PlainText`, only the props and
styles [`PlainText` supports](./props-and-styles) apply.

The props `PlainText` can't reproduce are `onPress`, `onLongPress`, `onPressIn`,
`onPressOut`, `onTextLayout`, `selectable`, `adjustsFontSizeToFit`,
`dataDetectorType` and `dynamicTypeRamp`.

RN `<Text>` in turn drops the `PlainText`-only props `hyphens`, `lang`,
`unstable_lineHeightClippingCompat` and the `fontVariationSettings` style, so
development builds warn once when any fallback drops one of them. The `text` prop
isn't dropped: it's passed to RN `<Text>` as children.

## Modes

The `mode` prop controls how `Text` picks between `PlainText` and RN `<Text>`.
Nested text and non-text children render RN `<Text>` in every mode.

| `mode`               | Plain text with an unsupported prop (e.g. `onPress`)    | Plain text otherwise |
| -------------------- | ------------------------------------------------------- | -------------------- |
| `"compat"` (default) | RN `<Text>`, silently                                   | `PlainText`          |
| `"fast"`             | `PlainText`, which ignores the prop, with a dev warning | `PlainText`          |
| `"fallback"`         | RN `<Text>`                                             | RN `<Text>`          |

- **`"compat"`** keeps `Text` a safe drop-in: an instance using `onPress`,
  `selectable` or another prop `PlainText` can't reproduce keeps working, because it
  renders RN `<Text>`. The price is checking those props on every render, in release
  builds too.
- **`"fast"`** skips that check. Props `PlainText` can't reproduce are ignored, and
  development builds warn once per prop so you can fix the call site.
- **`"fallback"`** always renders RN `<Text>`. Use it for an instance that hits a
  `PlainText` rendering issue.

```jsx
import { Text } from 'react-native-plain-text';

<Text mode="fallback">Hello there 👋</Text>;
```

`mode` itself is never forwarded to either component.

## Using it in your own Text component

You don't need to add a separate `Text` import: an existing centralized Text component,
such as a design system's, can make the same decision. The simplest way is to render
this library's `Text` in place of RN `<Text>`:

```tsx
import { Text, type TextProps } from 'react-native-plain-text';

export function AppText({ style, ...rest }: TextProps) {
  return <Text {...rest} style={[styles.base, style]} />;
}
```

To own the RN `<Text>` fallback yourself, use `unstable_mapTextProps`, the same function
`Text` runs, and honors `mode` the same way. It returns the native props when
`PlainText` can render, or `null` when the content isn't plain text, `mode` is
`"fallback"`, or, in `"compat"` mode, a prop `PlainText` can't reproduce is set. It
doesn't check nesting, so do that first. Like
`unstable_NativePlainText`, which renders its result, its props aren't guaranteed
stable across releases:

```tsx
import { use } from 'react';
import { Text as RNText, unstable_TextAncestorContext } from 'react-native';
import {
  unstable_mapTextProps as mapTextProps,
  unstable_NativePlainText as NativePlainText,
  type TextProps,
} from 'react-native-plain-text';

export function AppText({ style, ...rest }: TextProps) {
  const props = { ...rest, style: [styles.base, style] };
  const isNestedText = use(unstable_TextAncestorContext);
  const nativeProps = isNestedText ? null : mapTextProps(props);
  if (nativeProps !== null) {
    return <NativePlainText {...nativeProps} />;
  }

  return <RNText {...props} />;
}
```

This renders the `NativePlainText` view directly, as `Text` does, skipping the
`PlainText` JS wrapper. In `"fast"` mode `unstable_mapTextProps` gives the same
development warnings for props `PlainText` ignores. The warnings for `PlainText`-only props dropped on
fallback stay in `Text`, and so does passing the `text` prop to RN `<Text>` as
children.

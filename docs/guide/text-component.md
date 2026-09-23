# `Text` component

The library offers ways of integrating into your app:

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

```tsx
import { use } from 'react';
import { Text as RnText, unstable_TextAncestorContext, type TextProps } from 'react-native';
import { PlainText } from 'react-native-plain-text';

function hasUnsupportedProp(props: TextProps): boolean {
  return (
    props.onPress != null ||
    props.onLongPress != null ||
    props.onPressIn != null ||
    props.onPressOut != null ||
    props.onTextLayout != null ||
    !!props.selectable ||
    !!props.adjustsFontSizeToFit ||
    props.dataDetectorType != null
  );
}

export function Text({ children, deopt, ...rest }: TextProps & { deopt?: boolean }) {
  const isNestedText = use(unstable_TextAncestorContext);
  if (!deopt && typeof children === 'string' && !isNestedText && !hasUnsupportedProp(rest)) {
    return <PlainText {...rest}>{children}</PlainText>;
  }

  return <RnText {...rest}>{children}</RnText>;
}
```

`Text` renders `PlainText` only when all of these hold:

- `deopt` isn't set (see below).
- `children` is a plain `string` — anything else (nested `<Text>`, numbers, arrays,
  `null`) falls back to RN `<Text>`, since `PlainText` only supports a plain string.
- It isn't itself nested inside another `<Text>` — RN's `unstable_TextAncestorContext`
  is `true` for descendants of a `<Text>`, and `PlainText` doesn't support nested
  `<Text>` composition. Falling back keeps that nesting working.
- No prop that `PlainText` can't reproduce is set: `onPress`, `onLongPress`,
  `onPressIn`, `onPressOut`, `onTextLayout`, `selectable`, `adjustsFontSizeToFit`, or
  `dataDetectorType`. Any of these falls back to RN `<Text>`, so they keep working.

Whichever branch is taken, all other props are forwarded unchanged, so `Text` is
API-compatible with RN `<Text>`. When it resolves to `PlainText`, only the props and
styles [`PlainText` supports](./props-and-styles) apply.

## Deoptimizing a single instance

`children` shape, text nesting, and the props listed above are handled automatically —
you don't need `deopt` for those. It's for the case automatic detection can't see: a
single-style string that would otherwise take the `PlainText` path, but relies on
something else `PlainText` doesn't support, or hits a `PlainText` rendering issue. Pass `deopt` to skip the selection for that instance and
always render RN `<Text>`:

```jsx
import { Text } from 'react-native-plain-text';

<Text deopt>Hello there 👋</Text>;
```

`deopt` itself is never forwarded to either rendered component.

## Using it in your own Text component

You don't need to add a separate `Text` import: apply the same conditional rendering
(`deopt` included, if you want the same escape hatch) inside an existing centralized Text
component, such as a design system's, instead. Copy the snippet above into it, importing
`PlainText` from `react-native-plain-text`.

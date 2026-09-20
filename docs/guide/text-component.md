# `Text` component

`Text` is a drop-in replacement for RN's `<Text>`: a selector component that renders
`PlainText` for simple strings and falls back to RN `<Text>` for everything else. Swap
the import and get Plain Text's performance benefits across the app without touching
any call sites.

```jsx
import { Text } from 'react-native-plain-text';

<Text style={{ fontSize: 16 }}>Hello there 👋</Text>;
```

This is the easy adoption path. Using `PlainText` directly, where you can, still gives
you the best performance: no per-render check, no fallback branch, no possibility of
silently landing on RN `<Text>`. Reach for `Text` where an existing call site takes
arbitrary `<Text>` children you don't control, or as a first pass before switching
individual call sites to `PlainText`. See [Should you use it?](./intro#should-you-use-it)
for the underlying tradeoff.

## How it works

```tsx
import { use } from 'react';
import { Text as RnText, unstable_TextAncestorContext, type TextProps } from 'react-native';
import { PlainText, type PlainTextProps } from 'react-native-plain-text';

export function Text({ children, deopt, ...rest }: TextProps & { deopt?: boolean }) {
  const isNestedText = use(unstable_TextAncestorContext);
  if (!deopt && typeof children === 'string' && !isNestedText) {
    return <PlainText {...(rest as PlainTextProps)}>{children}</PlainText>;
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

Whichever branch is taken, all other props are forwarded unchanged, so `Text` is
API-compatible with RN `<Text>`: existing `style`, `numberOfLines`, `onPress`,
accessibility props, and so on keep working. When it resolves to `PlainText`, only the
props and styles [`PlainText` supports](./props-and-styles) apply — the rest are simply
not read by `PlainText`, which is generally fine since press handlers, for example,
don't make sense outside the RN `<Text>` fallback branch anyway.

## Deoptimizing a single instance

`children` shape and text nesting are handled automatically — you don't need `deopt` for
those. It's for the case automatic detection can't see: a single-style string that would
otherwise take the `PlainText` path, but needs a prop `PlainText` doesn't support, or hits
a `PlainText` rendering issue. Pass `deopt` to skip the selection for that instance and
always render RN `<Text>`:

```jsx
import { Text } from 'react-native-plain-text';

<Text deopt onPress={handlePress}>
  Hello there 👋
</Text>;
```

`deopt` itself is never forwarded to either rendered component.

## Using it in your own Text component

You don't need to add a separate `Text` import: apply the same conditional rendering
(`deopt` included, if you want the same escape hatch) inside an existing centralized Text
component, such as a design system's, instead. Copy the snippet above into it, importing
`PlainText` from `react-native-plain-text`.

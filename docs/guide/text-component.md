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

export function Text({ children, forceRNText, ...rest }: TextProps & { forceRNText?: boolean }) {
  const isNestedText = use(unstable_TextAncestorContext);
  if (!forceRNText && typeof children === 'string' && !isNestedText) {
    return <PlainText {...(rest as PlainTextProps)}>{children}</PlainText>;
  }

  return <RnText {...rest}>{children}</RnText>;
}
```

`Text` renders `PlainText` only when all of these hold:

- `forceRNText` isn't set (see below).
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

## Forcing RN `<Text>`

Pass `forceRNText` to skip the selection and always render RN `<Text>`, even for a
plain-string, non-nested child:

```jsx
import { Text } from 'react-native-plain-text';

<Text forceRNText>Hello there 👋</Text>;
```

Use it for the cases the automatic check can't see: content that reads as a plain
string today but is expected to grow nested styling, or a call site where you've
independently decided PlainText's limitations (no nested `<Text>`, no press handlers)
aren't a fit. `forceRNText` itself is never forwarded to either rendered component.

## Using it in your own Text component

You don't need to add a separate `Text` import: apply the same conditional rendering
(`forceRNText` included, if you want the same escape hatch) inside an existing
centralized Text component, such as a design system's, instead. Copy the snippet above
into it, importing `PlainText` from `react-native-plain-text`.

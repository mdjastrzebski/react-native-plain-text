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

`Text` is equivalent to this, minus the development warnings described below:

```tsx
import { use } from 'react';
import {
  Text as RNText,
  unstable_TextAncestorContext,
  type TextProps as RNTextProps,
} from 'react-native';
import { PlainText, type PlainTextOwnProps, type PlainTextProps } from 'react-native-plain-text';

export type TextProps = Omit<RNTextProps, keyof PlainTextOwnProps> &
  PlainTextOwnProps & { deopt?: boolean };

export function Text({ deopt, text, children, ...rest }: TextProps) {
  const isNestedText = use(unstable_TextAncestorContext);
  const content = text ?? children;

  // PlainText takes text children: a string, or a flat array of strings, numbers,
  // bigints, null and booleans (`{count} items`). Anything else goes to RN <Text>.
  const isTextContent = Array.isArray(content)
    ? content.every((child) => child === null || typeof child !== 'object')
    : content != null && typeof content !== 'object';

  if (!deopt && !isNestedText && isTextContent) {
    return (
      <PlainText {...(rest as PlainTextProps)}>{content as PlainTextProps['children']}</PlainText>
    );
  }

  return <RNText {...rest}>{content}</RNText>;
}
```

`Text` renders `PlainText` only when all of these hold:

- `deopt` isn't set (see below).
- The content is text: the `text` prop if set, otherwise `children`. That's a
  string, a number (or `bigint`), or a mix like `{count} items` (which JSX passes
  as `[count, ' items']`). Anything containing an element (nested `<Text>`, an
  icon) or no children at all falls back to RN `<Text>`.
- It isn't itself nested inside another `<Text>` — RN's `unstable_TextAncestorContext`
  is `true` for descendants of a `<Text>`, and `PlainText` doesn't support nested
  `<Text>` composition. Falling back keeps that nesting working.

Whichever branch is taken, all other props are forwarded unchanged, so `Text` is
API-compatible with RN `<Text>`. When it resolves to `PlainText`, only the props and
styles [`PlainText` supports](./props-and-styles) apply.

Props are never inspected to pick a branch, so release builds pay nothing for them.
Instead, in development `Text` warns once per prop when it renders `PlainText` with a
prop `PlainText` can't reproduce: `onPress`, `onLongPress`, `onPressIn`, `onPressOut`,
`onTextLayout`, `selectable`, `adjustsFontSizeToFit`, `dataDetectorType`, or
`dynamicTypeRamp`. Add `deopt` to those instances.

The reverse applies on fallback: RN `<Text>` drops the `PlainText`-only props
`hyphens`, `lang`, `unstable_lineHeightClippingCompat` and the
`fontVariationSettings` style, so development builds warn once when a fallback
(automatic or via `deopt`) drops one of them. The `text` prop isn't dropped: it's
passed to RN `<Text>` as children.

## Deoptimizing a single instance

`children` shape and text nesting are handled automatically — you don't need `deopt`
for those. It's for a single-style string that would otherwise take the `PlainText`
path, but relies on a prop `PlainText` doesn't support (such as `onPress`, see the
development warning above) or hits a `PlainText` rendering issue. Pass `deopt` to
skip the selection for that instance and always render RN `<Text>`:

```jsx
import { Text } from 'react-native-plain-text';

<Text deopt>Hello there 👋</Text>;
```

`deopt` itself is never forwarded to RN `<Text>`. An explicit `deopt={false}` reaches
the native `PlainText` view as an ignored prop, since stripping it would cost every
render. Omit `deopt` rather than setting it to `false`.

## Using it in your own Text component

You don't need to add a separate `Text` import: apply the same conditional rendering
(`deopt` included, if you want the same escape hatch) inside an existing centralized Text
component, such as a design system's, instead. Copy the snippet above into it: it only
uses the public `PlainText`, which joins text children like `{count} items` itself.

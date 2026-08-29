# Installation

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

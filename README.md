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
its place. A [unified `Text` component](#unified-text-component) uses conditional
rendering to pick between the two for you.

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

`PlainText` is API-compatible with React Native `<Text>`, so you can define a
selector component: `PlainText` for simple strings, falling back to RN `<Text>`
for nested text. Use it anywhere you'd use `<Text>`.

This pattern gives you `PlainText`'s performance benefits across the app without
changing any call sites.

```tsx
import { use } from 'react';
import { Text as RnText, unstable_TextAncestorContext, type TextProps } from 'react-native';
import { PlainText, type PlainTextProps } from 'react-native-plain-text';

export function Text({ children, ...rest }: TextProps) {
  const isNestedText = use(unstable_TextAncestorContext);
  if (typeof children === 'string' && !isNestedText) {
    return <PlainText {...(rest as PlainTextProps)}>{children}</PlainText>;
  }

  return <RnText {...rest}>{children}</RnText>;
}
```

You can also apply this conditional rendering inside an existing centralized Text
component (e.g. design system) instead of adding a separate component.

RN's `unstable_TextAncestorContext` is `true` when the text renders inside
another `<Text>`.

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

## Visual regression testing

The example app has a dedicated visual regression testing (VRT) screen. Set
`VRT_ENABLED=1` while building the release app to include it. A deep link can
then select an individual specimen by its `testID`.

The VRT command configures an already-running Android VRT emulator, or creates
the configured iOS simulator, builds the Release app through the example
workspace's Expo commands, installs it, verifies cold and warm deep links with
agent-device, and captures every applicable specimen:

```sh
yarn vrt android
yarn vrt ios
```

Android setup creates and boots the `plaintext_vrt_api36_pixel9` AVD when it is
missing or stopped. It uses the pinned emulator and system-image versions and
the same hardware and launch parameters as CI. The emulator window is visible
locally. Set `ANDROID_HEADLESS=1` to run it without a window, as CI does.
Individual stages can be rerun without repeating the entire pipeline:

```sh
yarn vrt android setup
yarn vrt android build
yarn vrt android install
yarn vrt android verify
yarn vrt android e2e
yarn vrt android capture
```

The `e2e` stage always runs `verify` first. Verification is read-only and fails
before launching the app if the pinned SDK, emulator or simulator, device
hardware profile, locale, display, font scale, appearance, rotation, or
animation settings do not match the VRT profile. Its observed values are saved
under `build/vrt/environment/`.

Expo's Release output is copied to a stable location before installation and
testing:

```text
build/vrt/apps/android/app-release.apk
build/vrt/apps/ios/PlainTextExample.app
```

Each copied app records a fingerprint of its native and JavaScript build inputs.
The install, E2E, and capture stages stop with a rebuild or reinstall command if
the artifact or installed app no longer matches the source tree.

### iOS

Build and install the VRT app on the configured simulator:

```sh
yarn vrt ios setup
yarn vrt ios build
yarn vrt ios install
```

Verify the installation:

```sh
xcrun simctl get_app_container \
  "$(cat build/vrt/devices/ios-udid)" plaintext.example app
```

Open a specimen using its deep link:

```sh
xcrun simctl openurl \
  "$(cat build/vrt/devices/ios-udid)" \
  'exp+react-native-plain-text-example://vrt?testID=vrt-capture-features-font-size-48'
```

### Android

Configure the running VRT emulator, then build and install the VRT app:

```sh
yarn vrt android setup
yarn vrt android build
yarn vrt android install
```

Stop the app, then open a specimen using its deep link:

```sh
android_serial="$(cat build/vrt/devices/android-serial)"
adb -s "$android_serial" shell 'am force-stop plaintext.example'

adb -s "$android_serial" shell 'am start -W \
  -a android.intent.action.VIEW \
  -c android.intent.category.BROWSABLE \
  -d "exp+react-native-plain-text-example://vrt?testID=vrt-capture-features-font-size-48" \
  -p plaintext.example'
```

Release builds use the direct app URL above. Do not use the
`/expo-development-client/?url=...` URL, which is for development-client
builds.

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

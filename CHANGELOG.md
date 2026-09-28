# Changelog

## [0.9.0](https://github.com/mdjastrzebski/react-native-plain-text/compare/v0.8.2...v0.9.0) (2026-09-25)

### ✨ Features

- add unified Text component ([#30](https://github.com/mdjastrzebski/react-native-plain-text/issues/30)) ([c6c0798](https://github.com/mdjastrzebski/react-native-plain-text/commit/c6c07986d3dd34029ecbf406ee8261ce06fc71eb))
- `hypens` and `lang` props ([#9](https://github.com/mdjastrzebski/react-native-plain-text/issues/9)) ([0377138](https://github.com/mdjastrzebski/react-native-plain-text/commit/0377138bbc24f4f26b4bed4836424bbd128f2f36))
- `lineBreakStrategyIOS` prop ([#26](https://github.com/mdjastrzebski/react-native-plain-text/issues/26)) ([80c9435](https://github.com/mdjastrzebski/react-native-plain-text/commit/80c94351374043afcc9bf414364c303b0c7f6a6c))
- **android:** `android_hyphenationFrequency` prop ([#31](https://github.com/mdjastrzebski/react-native-plain-text/issues/31)) ([4552307](https://github.com/mdjastrzebski/react-native-plain-text/commit/45523074353190ad267e815d56b64e8b179d6e5d))
- **android:** `textBreakStrategy` prop ([#25](https://github.com/mdjastrzebski/react-native-plain-text/issues/25)) ([4d39ffb](https://github.com/mdjastrzebski/react-native-plain-text/commit/4d39ffba2361f9c2f1f3b34cb0ad1db9df0e005a))
- **ios:** `writingDirection` style prop ([#27](https://github.com/mdjastrzebski/react-native-plain-text/issues/27)) ([9587d72](https://github.com/mdjastrzebski/react-native-plain-text/commit/9587d721d3a02d241fb0415be6d95b4c8e0784c4))

### 🐛 Bug Fixes

- **android:** sizing with multiple lines and ellipsize mode ([953c2d8](https://github.com/mdjastrzebski/react-native-plain-text/commit/953c2d8c92b4c3f51dc3391133006d1380079aa9))
- **example:** fix update color opereration with color prop ([3af4ca4](https://github.com/mdjastrzebski/react-native-plain-text/commit/3af4ca45803d1682b6bf5c66788ba0758da554c2))

### ♻️ Code Refactoring

- code structure ([#23](https://github.com/mdjastrzebski/react-native-plain-text/issues/23)) ([52dc11c](https://github.com/mdjastrzebski/react-native-plain-text/commit/52dc11cdbc6d671597c68c39f531c6263c5773ac))
- rename unstable_lineHeightClippingCompat ([8265fea](https://github.com/mdjastrzebski/react-native-plain-text/commit/8265fea84a51598cf992e6df9b57bbd33f558993))

### 📝 Documentation

- caching ([33d3c83](https://github.com/mdjastrzebski/react-native-plain-text/commit/33d3c830a2df39a80178e316a620277edac997b0))
- document underline position on iOS ([bcd14f4](https://github.com/mdjastrzebski/react-native-plain-text/commit/bcd14f4a0a1ef75cb9462a2b225d4a6b2bf7703f))

## [0.8.2](https://github.com/mdjastrzebski/react-native-plain-text/compare/v0.8.1...v0.8.2) (2026-09-02)

### ✨ Features

- expose `text` prop for animated text ([b1a47f1](https://github.com/mdjastrzebski/react-native-plain-text/commit/b1a47f14b2d1912c5929c142cbc006d153b7ccd4))

### ⚡ Performance

- reduce props processing in JS ([6078748](https://github.com/mdjastrzebski/react-native-plain-text/commit/6078748765130958e42b5ee4b70bf64ad714665c))

## [0.8.1](https://github.com/mdjastrzebski/react-native-plain-text/compare/v0.8.0...v0.8.1) (2026-08-31)

### ✨ Features

- text shadow styles ([#13](https://github.com/mdjastrzebski/react-native-plain-text/issues/13)) ([fe274c2](https://github.com/mdjastrzebski/react-native-plain-text/commit/fe274c218cd9132d6c5b4d599c9910c26e9918c9))

### 🐛 Bug Fixes

- **android:** glyph rendering (subpixel/linear text) to match RN's `<Text>` ([#14](https://github.com/mdjastrzebski/react-native-plain-text/issues/14)) ([f86ca24](https://github.com/mdjastrzebski/react-native-plain-text/commit/f86ca241e4618c9300f5ef4bbd69d876e2e6b1b7))
- **android:** scope test configuration to source builds ([#19](https://github.com/mdjastrzebski/react-native-plain-text/issues/19)) ([ee93a65](https://github.com/mdjastrzebski/react-native-plain-text/commit/ee93a65beddbb6da0365eaebaf62af473a4ec8a8))
- fix typo in props-and-styles docs ([#20](https://github.com/mdjastrzebski/react-native-plain-text/issues/20)) ([be5f9f4](https://github.com/mdjastrzebski/react-native-plain-text/commit/be5f9f4362d5af527344e1bccaea0d4224c91af2))
- **package:** export native component ([#15](https://github.com/mdjastrzebski/react-native-plain-text/issues/15)) ([1d1e718](https://github.com/mdjastrzebski/react-native-plain-text/commit/1d1e7180c4d1c7105d9aabccf3ba7cd2e9c8b5a3))

### ♻️ Code Refactoring

- **codegen:** replace companion flags with optional props ([#16](https://github.com/mdjastrzebski/react-native-plain-text/issues/16)) ([2105ad7](https://github.com/mdjastrzebski/react-native-plain-text/commit/2105ad7f72e7b538e1abf38254e3b45c241b3151))
- remove unstable compat API ([1981115](https://github.com/mdjastrzebski/react-native-plain-text/commit/1981115518819e537d7281dea550051b6f9bae2c))

### 📝 Documentation

- contributing docs ([bce31b8](https://github.com/mdjastrzebski/react-native-plain-text/commit/bce31b8caf0a5739eb7009de0cd0469d0ca5c297))

### 🙌 New Contributors

- @hannojg made their first contribution in [#15](https://github.com/mdjastrzebski/react-native-plain-text/pull/15), [#16](https://github.com/mdjastrzebski/react-native-plain-text/pull/16) and [#19](https://github.com/mdjastrzebski/react-native-plain-text/pull/19)
- @krozniata made their first contribution in [#20](https://github.com/mdjastrzebski/react-native-plain-text/pull/20)

## [0.8.0](https://github.com/mdjastrzebski/react-native-plain-text/compare/v0.7.2...v0.8.0) (2026-08-20)

### ✨ Features

- `includeFontPadding` prop ([d73447c](https://github.com/mdjastrzebski/react-native-plain-text/commit/d73447ccd396662570dfc02566b5e4f0f18c6957))
- `textTransform` style ([#10](https://github.com/mdjastrzebski/react-native-plain-text/issues/10)) ([802e7e3](https://github.com/mdjastrzebski/react-native-plain-text/commit/802e7e3766b0f60d347569a719f2122447deba45))

### 🐛 Bug Fixes

- **android:** seed LayoutParams in PlainTextView constructor to prevent setText NPE ([#11](https://github.com/mdjastrzebski/react-native-plain-text/issues/11)) ([ae22a4f](https://github.com/mdjastrzebski/react-native-plain-text/commit/ae22a4f577ca20ea6230889f91ce9e827068ae8a))

### 🙌 New Contributors

- @AndreiCalazans made their first contribution in [#11](https://github.com/mdjastrzebski/react-native-plain-text/pull/11)

## [0.7.2](https://github.com/mdjastrzebski/react-native-plain-text/compare/v0.7.1...v0.7.2) (2026-08-18)

### 🐛 Bug Fixes

- baseline flexbox alignment ([beb21f6](https://github.com/mdjastrzebski/react-native-plain-text/commit/beb21f6b9d6a42c973bf9e361f66c8f242a8fc88))
- **iOS:** control size drift with font scaling ([8b55f7d](https://github.com/mdjastrzebski/react-native-plain-text/commit/8b55f7d92d290a8128167d7fcaac06330809e948))

### 📝 Documentation

- CompatText wrapper ([654fe7d](https://github.com/mdjastrzebski/react-native-plain-text/commit/654fe7dec8f4aed39c35e1157b37084d9c364e61))

## [0.7.1](https://github.com/mdjastrzebski/react-native-plain-text/compare/v0.7.0...v0.7.1) (2026-08-17)

### 🐛 Bug Fixes

- **ios:** fix zero letterSpacing layout drift ([9ccccda](https://github.com/mdjastrzebski/react-native-plain-text/commit/9ccccda456b02c8195c8a7fd8aef19956f46878a))
- **ios:** conditionally disable iOS line height clipping fix ([e59f63d](https://github.com/mdjastrzebski/react-native-plain-text/commit/e59f63d9e587ea6f324d124d16c49e6c93befa27))

## [0.7.0](https://github.com/mdjastrzebski/react-native-plain-text/compare/v0.6.1...v0.7.0) (2026-08-12)

### ✨ Features

- **ios:** `verticalAlign`/`textAlignVertical` styles ([#7](https://github.com/mdjastrzebski/react-native-plain-text/issues/7)) ([4890949](https://github.com/mdjastrzebski/react-native-plain-text/commit/4890949ffb14fb47e3fc90d925771f55220a6705))

### 🐛 Bug Fixes

- **ios:** line height clipping ([#8](https://github.com/mdjastrzebski/react-native-plain-text/issues/8)) ([3e1e134](https://github.com/mdjastrzebski/react-native-plain-text/commit/3e1e13415004c4b4215d14152d28a99e88826811))
- **ios:** tiny text misalignment vs RN Text with font scaling ([cf1ae5a](https://github.com/mdjastrzebski/react-native-plain-text/commit/cf1ae5a1722e00103f58612614e12e24be810fdf))

## [0.6.1](https://github.com/mdjastrzebski/react-native-plain-text/compare/v0.6.0...v0.6.1) (2026-08-08)

### ⚡ Performance

- **android:** shared layout view ([#5](https://github.com/mdjastrzebski/react-native-plain-text/pull/5))
- **android:** font variation typeface cache ([#6](https://github.com/mdjastrzebski/react-native-plain-text/pull/6))

## [0.6.0](https://github.com/mdjastrzebski/react-native-plain-text/compare/v0.5.1...v0.6.0) (2026-08-06)

### ✨ Features

- font variant ([#2](https://github.com/mdjastrzebski/react-native-plain-text/issues/2)) ([496d6b9](https://github.com/mdjastrzebski/react-native-plain-text/commit/496d6b924c7511b223dc5eb70cafb0c43f33fed5))
- font variation settings ([#3](https://github.com/mdjastrzebski/react-native-plain-text/issues/3)) ([a85b6c7](https://github.com/mdjastrzebski/react-native-plain-text/commit/a85b6c769951e22eb6f298961c5be8dacc671a9c))
- example app improvements ([0885f1e](https://github.com/mdjastrzebski/react-native-plain-text/commit/0885f1e61cd3990d519b3e91e02dc223ff287e0f))
- **example app:** minor improvements ([adba4cf](https://github.com/mdjastrzebski/react-native-plain-text/commit/adba4cf1e5dc3ee1ddf4f6f8749e0f7e5ddd3a06))

### 🐛 Bug Fixes

- **android:** borders support ([2743fae](https://github.com/mdjastrzebski/react-native-plain-text/commit/2743fae7919cf7367a213a4d529ffbcb63bfd33f))
- **android:** text padding ([e84e9cf](https://github.com/mdjastrzebski/react-native-plain-text/commit/e84e9cf6fbf7a6d1fdd60ec4648770a1f5572fd4))
- **ios:** enable view recycling ([ceba9d0](https://github.com/mdjastrzebski/react-native-plain-text/commit/ceba9d031e766ae4d8ff00a100e8faca00c0cd47))
- **ios:** resolve fontFamily through the family's font names ([#4](https://github.com/mdjastrzebski/react-native-plain-text/issues/4)) ([de2f28a](https://github.com/mdjastrzebski/react-native-plain-text/commit/de2f28a8eb147b2f646edf4caf00987ef981bfed))
- **ios:** underline location with custom line height ([be4e6aa](https://github.com/mdjastrzebski/react-native-plain-text/commit/be4e6aa94eb782363ec4d527fc3cc6895a762015))

### 🙌 New Contributors

- @AlshehriAli0 made their first contribution in [#4](https://github.com/mdjastrzebski/react-native-plain-text/pull/4)

## [0.5.2](https://github.com/mdjastrzebski/react-native-plain-text/compare/v0.5.1...v0.5.2) (2026-08-03)

### 🐛 Bug Fixes

- **android:** borders support ([2743fae](https://github.com/mdjastrzebski/react-native-plain-text/commit/2743fae7919cf7367a213a4d529ffbcb63bfd33f))
- **android:** text padding ([e84e9cf](https://github.com/mdjastrzebski/react-native-plain-text/commit/e84e9cf6fbf7a6d1fdd60ec4648770a1f5572fd4))
- **ios:** disable view recycling ([7283b92](https://github.com/mdjastrzebski/react-native-plain-text/commit/7283b92eed5153815cff80bda909ac337a508b93))
- **ios:** underline location with custom line height ([be4e6aa](https://github.com/mdjastrzebski/react-native-plain-text/commit/be4e6aa94eb782363ec4d527fc3cc6895a762015))

## [0.5.1](https://github.com/mdjastrzebski/react-native-plain-text/compare/v0.5.0...v0.5.1) (2026-07-29)

### 🐛 Bug Fixes

- **ios:** text wrapping discrepancy ([5750492](https://github.com/mdjastrzebski/react-native-plain-text/commit/5750492e1a2b424e63b66572c1ac457860aae295))
- react to text scale changes after render ([e53081e](https://github.com/mdjastrzebski/react-native-plain-text/commit/e53081e7ddec02253416a8ad59769dd9b15a097b))

## [0.5.0](https://github.com/mdjastrzebski/react-native-plain-text/releases/tag/v0.5.0) (2026-07-28)

Initial public release 🎉

`PlainText` renders a single string straight to the platform's native text
widget (`UILabel` on iOS, `TextView` on Android) instead of going through
React Native's own text layout pipeline.

### ⚡ Performance vs RN `<Text>`

Release builds, mean of 3 runs, measured with the example app's Performance
tab. Compare each figure against RN `<Text>` on the same device and text size.
See [measuring.md](docs/contributing/measuring.md) for the method.

|                          | iOS           | Android     |
| ------------------------ | ------------- | ----------- |
| Memory per mounted view  | 15–25% lower  | ~33% lower  |
| Time to mount 1000 views | 13–21% faster | ~30% faster |

### ✅ What's supported

**Styles**

- `fontSize`
- `color`
- `fontWeight`
- `fontFamily`
- `lineHeight`
- `fontStyle`: `'normal' | 'italic'`
- `textAlign`
- `textDecorationLine`: `'none' | 'underline' | 'line-through' | 'underline line-through'`
- `letterSpacing`
- `verticalAlign` / `textAlignVertical`: Android only, matching RN `<Text>`
- Every other `ViewStyle` prop (`width`, `height`, `margin`, `padding`, `backgroundColor`, `opacity`, …), forwarded to the native view as-is

**Props**

- `children`: plain `string` only
- `numberOfLines`
- `ellipsizeMode`: `'head' | 'middle' | 'tail' | 'clip'`
- `allowFontScaling` / `maxFontSizeMultiplier`: accessibility text scaling
- `testID`, `accessibilityRole`, `accessibilityLabel`, `accessibilityHint`, `accessibilityState`, `nativeID` and the rest of the accessibility props
- Self-sizing: views measure to their content, so no explicit `width` / `height` is needed

### 🚫 Not supported

Deliberately excluded at the time of this release. Some of these were added later, see the entries above.

- **Nested `<Text>` and mixed-style fragments**: one string, one style
- **`onPress` / `onLongPress` / `onResponder*`**: wrap it in `Pressable`
- **`selectable` / `selectionColor` / `suppressHighlighting`**: `UILabel` isn't selectable by design, use RN's `<Text>`
- **`dataDetectorType`**: auto-linking needs attributed text spans
- **`textTransform`**: do it in JS (`children.toUpperCase()`)
- **`writingDirection`**: RTL belongs in `I18nManager`, globally
- **`textBreakStrategy` / `lineBreakStrategyIOS` / `android_hyphenationFrequency`**
- **`onTextLayout`**: heavy line-metrics payload, deferred until there's demand

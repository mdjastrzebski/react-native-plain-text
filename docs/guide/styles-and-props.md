# Styles and props

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

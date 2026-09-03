import { StyleSheet, type AccessibilityProps, type StyleProp, type TextStyle } from 'react-native';
import type { ComponentRef, Ref } from 'react';
import PlainTextViewNativeComponent, { type NativeProps } from './PlainTextViewNativeComponent';

// RN's TextStyle plus the two text styles it has no entry for. Widened, not
// replaced, so a plain TextStyle stays assignable and each key can be dropped
// if RN adds it.
export type PlainTextStyle = TextStyle & {
  // A style rather than a prop because two upstream attempts to add it
  // (react/react-native#44685, #44667) never merged.
  fontVariationSettings?: string;
  // CSS's `hyphens` property (RN's TextStyle has no hyphenation key on any
  // platform). 'manual' (default) breaks only at a soft hyphen (U+00AD), 'none'
  // strips them, 'auto' hyphenates via the platform dictionary (pair with
  // `lang` on iOS). On Android, 'none'/'auto' win over the
  // `android_hyphenationFrequency` prop; 'manual' is iOS-only (see
  // PlainTextViewNativeComponent.ts).
  hyphens?: 'none' | 'manual' | 'auto';
};

// Accessibility, testID, and nativeID/id are ViewProps that the native view
// already applies; `...accessibilityProps` just forwards them through.
export type PlainTextProps = AccessibilityProps & {
  children?: string;
  // Use instead of `children` when driving text from
  // `Animated.createAnimatedComponent` (RN core or Reanimated): both push
  // per-frame updates straight onto the host ref via a prop name, bypassing
  // PlainText's render entirely, so animating `children` is silently
  // dropped. Wins over `children` when both are set.
  text?: string;
  style?: StyleProp<PlainTextStyle>;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  allowFontScaling?: boolean;
  maxFontSizeMultiplier?: number;
  // `hyphens` is a style, see PlainTextStyle above.
  //
  // Android-only, same name and values as RN <Text>'s prop, kept for RN <Text>
  // compat. iOS ignores it. On Android the `hyphens` style's 'none'/'auto' win
  // over this when set.
  android_hyphenationFrequency?: 'none' | 'normal' | 'full';
  // BCP-47 language tag (e.g. 'de', 'de-DE') for the text, driving the
  // hyphenation dictionary and locale-sensitive line breaking/glyph selection.
  lang?: string;
  // When true, reverts iOS's lineHeight vertical centering to RN <Text>'s
  // ascent-clipping behavior (RN#29507) for this instance. Unset uses
  // PlainText's fix. `unstable_` marks that its shape/default may change
  // without a major version bump. No-op on Android.
  unstable_lineHeightClippingIos?: boolean;
  testID?: string;
  nativeID?: string;
  id?: string;
};

const FONT_VARIANT_SEPARATORS = /[\s,]+/;

const warnedOnceKeys = new Set<string>();

function warnOnce(key: string, message: string): void {
  if (warnedOnceKeys.has(key)) {
    return;
  }
  warnedOnceKeys.add(key);
  console.warn(message);
}

// RN accepts fontVariant as either an array or a CSS-style string; the native
// prop only takes the array, so the string form is split here. The array form
// is returned as-is (not copied) to avoid allocating in the common case.
function resolveFontVariant(fontVariant: TextStyle['fontVariant']): readonly string[] | undefined {
  if (typeof fontVariant !== 'string') {
    return fontVariant;
  }
  const variants = fontVariant
    .split(FONT_VARIANT_SEPARATORS)
    .filter((variant) => variant.length > 0);
  return variants.length > 0 ? variants : undefined;
}

export function mapPlainTextProps({
  children,
  text,
  style,
  numberOfLines,
  ellipsizeMode,
  allowFontScaling,
  maxFontSizeMultiplier,
  android_hyphenationFrequency,
  lang,
  unstable_lineHeightClippingIos,
  ...accessibilityProps
}: PlainTextProps): NativeProps {
  if (__DEV__ && text != null && children != null) {
    warnOnce(
      'plain-text-text-and-children',
      'PlainText: both `text` and `children` were set; `text` takes precedence. Pass only one.'
    );
  }

  // Text-style props don't flow through the native ViewProps, so pull them
  // out of the flattened style and pass them explicitly.
  const {
    color,
    fontSize,
    fontFamily,
    fontWeight,
    fontStyle,
    fontVariant,
    fontVariationSettings,
    textAlign,
    textAlignVertical,
    verticalAlign,
    textDecorationLine,
    textTransform,
    hyphens,
    lineHeight,
    letterSpacing,
    includeFontPadding,
    textShadowColor,
    textShadowOffset,
    textShadowRadius,
    ...viewStyle
  } = StyleSheet.flatten(style) ?? {};

  return {
    ...accessibilityProps,
    text: text ?? children,
    color,
    fontSize,
    fontFamily,
    fontWeight: fontWeight != null ? String(fontWeight) : undefined,
    fontStyle,
    fontVariant: resolveFontVariant(fontVariant),
    fontVariationSettings,
    textAlign,
    textAlignVertical,
    verticalAlign,
    textDecorationLine,
    textTransform,
    textShadowColor,
    textShadowOffsetWidth: textShadowOffset?.width,
    textShadowOffsetHeight: textShadowOffset?.height,
    textShadowRadius,
    lineHeight,
    letterSpacing,
    numberOfLines,
    ellipsizeMode,
    allowFontScaling,
    maxFontSizeMultiplier,
    hyphens,
    android_hyphenationFrequency,
    lang,
    includeFontPadding,
    lineHeightClippingIos: unstable_lineHeightClippingIos,
    style: viewStyle,
  };
}

type PlainTextRef = ComponentRef<typeof PlainTextViewNativeComponent>;

// React 19: `ref` is a plain prop, no `forwardRef` needed. Kept off
// `PlainTextProps` so it never reaches `mapPlainTextProps`.
export function PlainText({ ref, ...props }: PlainTextProps & { ref?: Ref<PlainTextRef> }) {
  const nativeProps = mapPlainTextProps(props);
  return <PlainTextViewNativeComponent {...nativeProps} ref={ref} />;
}

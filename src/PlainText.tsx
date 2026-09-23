import { StyleSheet, type AccessibilityProps, type StyleProp, type TextStyle } from 'react-native';
import type { ComponentRef, Ref } from 'react';
import PlainTextViewNativeComponent, { type NativeProps } from './PlainTextViewNativeComponent';
import { normalizeFontVariant } from './utils';

// RN's TextStyle plus a key it has no entry for. Widened, not replaced, so a
// plain TextStyle stays assignable.
export type PlainTextStyle = TextStyle & {
  // Upstream attempts to add it (react/react-native#44685, #44667) never merged.
  fontVariationSettings?: string;
};

export type PlainTextProps = AccessibilityProps & {
  children?: string;
  /// Alias to `children`, to be used for animating text with Animated/Reanimated
  text?: string;
  style?: StyleProp<PlainTextStyle>;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  lineBreakStrategyIOS?: 'none' | 'standard' | 'hangul-word' | 'push-out';
  /// Android-only, like RN <Text>.
  textBreakStrategy?: 'simple' | 'highQuality' | 'balanced';
  /// Android-only, like RN <Text>'s prop of the same name. iOS ignores it.
  /// Only a fallback on Android, used whenever `hyphens` is left unset.
  android_hyphenationFrequency?: 'none' | 'normal' | 'full';
  /// Not in RN <Text>. `'none'` (default) keeps the platform's default
  /// hyphenation behavior; `'auto'` turns on dictionary-based hyphenation.
  /// On Android, whichever one is set here wins over
  /// `android_hyphenationFrequency`, even `'none'`; leave `hyphens` unset to
  /// let `android_hyphenationFrequency` apply instead. `'none'` never strips
  /// or otherwise touches an inserted soft hyphen (U+00AD) on either
  /// platform.
  hyphens?: 'none' | 'auto';
  allowFontScaling?: boolean;
  maxFontSizeMultiplier?: number;
  /// BCP-47 language tag (e.g. 'de'); picks the hyphenation dictionary and
  /// locale-sensitive line breaking.
  lang?: string;
  testID?: string;
  nativeID?: string;
  id?: string;

  /// When true, reverts iOS's lineHeight vertical centering to RN <Text>'s
  /// ascent-clipping behavior (RN#29507) for this instance.
  // SYNC: renamed to the bare lineHeightClippingCompat past this file — see
  // docs/contributing/sync-points.md#set-13--lineheightclippingcompat-one-prop-renamed-at-the-js-boundary.
  unstable_lineHeightClippingCompat?: boolean;
};

export function mapPlainTextProps({
  children,
  text,
  style,
  numberOfLines,
  ellipsizeMode,
  lineBreakStrategyIOS,
  textBreakStrategy,
  android_hyphenationFrequency,
  allowFontScaling,
  maxFontSizeMultiplier,
  hyphens,
  lang,
  unstable_lineHeightClippingCompat,
  ...accessibilityProps
}: PlainTextProps): NativeProps {
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
    writingDirection,
    textDecorationLine,
    textTransform,
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
    fontVariant: normalizeFontVariant(fontVariant),
    fontVariationSettings,
    textAlign,
    textAlignVertical,
    verticalAlign,
    writingDirection,
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
    lineBreakStrategyIOS,
    textBreakStrategy,
    android_hyphenationFrequency,
    allowFontScaling,
    maxFontSizeMultiplier,
    hyphens,
    lang,
    includeFontPadding,
    lineHeightClippingCompat: unstable_lineHeightClippingCompat,
    style: viewStyle,
  };
}

type PlainTextRef = ComponentRef<typeof PlainTextViewNativeComponent>;

export function PlainText({ ref, ...props }: PlainTextProps & { ref?: Ref<PlainTextRef> }) {
  const nativeProps = mapPlainTextProps(props);
  return <PlainTextViewNativeComponent {...nativeProps} ref={ref} />;
}

import { StyleSheet, type AccessibilityProps, type StyleProp, type TextStyle } from 'react-native';
import type { ComponentRef, Ref } from 'react';
import PlainTextViewNativeComponent, { type NativeProps } from './PlainTextViewNativeComponent';
import { normalizeFontVariant } from './utils';

export type PlainTextStyle = TextStyle & { fontVariationSettings?: string };

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
  /// Android-only, like RN <Text>.
  android_hyphenationFrequency?: 'none' | 'normal' | 'full';
  allowFontScaling?: boolean;
  maxFontSizeMultiplier?: number;
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

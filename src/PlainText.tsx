import { StyleSheet, type AccessibilityProps, type StyleProp, type TextStyle } from 'react-native';
import type { ComponentRef, Ref } from 'react';
import PlainTextViewNativeComponent, { type NativeProps } from './PlainTextViewNativeComponent';
import { normalizeFontVariant, warnOnce } from './utils';

export type PlainTextStyle = TextStyle & { fontVariationSettings?: string };

export type PlainTextProps = AccessibilityProps & {
  children?: string;
  /// Alias to `children`, to be used for animating text with Animated/Reanimated
  text?: string;
  style?: StyleProp<PlainTextStyle>;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  allowFontScaling?: boolean;
  maxFontSizeMultiplier?: number;
  testID?: string;
  nativeID?: string;
  id?: string;

  /// When true, reverts iOS's lineHeight vertical centering to RN <Text>'s
  /// ascent-clipping behavior (RN#29507) for this instance.
  unstable_lineHeightClippingIos?: boolean;
};

export function mapPlainTextProps({
  children,
  text,
  style,
  numberOfLines,
  ellipsizeMode,
  allowFontScaling,
  maxFontSizeMultiplier,
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
    includeFontPadding,
    lineHeightClippingIos: unstable_lineHeightClippingIos,
    style: viewStyle,
  };
}

type PlainTextRef = ComponentRef<typeof PlainTextViewNativeComponent>;

export function PlainText({ ref, ...props }: PlainTextProps & { ref?: Ref<PlainTextRef> }) {
  const nativeProps = mapPlainTextProps(props);
  return <PlainTextViewNativeComponent {...nativeProps} ref={ref} />;
}

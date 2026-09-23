import { StyleSheet, type StyleProp, type TextProps, type TextStyle } from 'react-native';
import type { ComponentRef, Ref } from 'react';
import PlainTextViewNativeComponent, { type NativeProps } from './PlainTextViewNativeComponent';
import { normalizeFontVariant } from './utils';

/** RN's `TextStyle` plus `fontVariationSettings`. Any `TextStyle` is assignable. */
export type PlainTextStyle = TextStyle & {
  /** Variable-font axes in CSS syntax, e.g. `'"wght" 700, "wdth" 87.5'`. Added to RN in v0.88 (facebook/react-native#57804). */
  fontVariationSettings?: string;
};

/** Props PlainText adds to RN's TextProps. */
export type PlainTextOwnProps = {
  /** Alias for `children`, for animating text with Animated/Reanimated. */
  text?: string;
  /** RN's `TextStyle` plus `fontVariationSettings`. */
  style?: StyleProp<PlainTextStyle>;
  /**
   * `'auto'` enables dictionary-based hyphenation; `'none'` (default) keeps the
   * platform default. On Android, overrides `android_hyphenationFrequency`.
   */
  hyphens?: 'none' | 'auto';
  /** BCP-47 language tag (e.g. `'pl'`, `'de'`) for hyphenation and line breaking. */
  lang?: string;

  // SYNC: renamed to the bare lineHeightClippingCompat past this file — see
  // docs/contributing/sync-points.md#set-13--lineheightclippingcompat-one-prop-renamed-at-the-js-boundary.
  /**
   * Reverts iOS's `lineHeight` vertical centering to RN `<Text>`'s
   * buggy ascent-clipping behavior (RN#29507).
   */
  unstable_lineHeightClippingCompat?: boolean;
};

// RN's own props PlainText doesn't support are accepted but ignored: only keys
// in the native view config reach the native view.
export type PlainTextProps = Omit<TextProps, keyof PlainTextOwnProps | 'children'> &
  PlainTextOwnProps & {
    /** Text to render. Only a plain string: no nested `<Text>`. */
    children?: string;
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
  ...rest
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
    ...rest,
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

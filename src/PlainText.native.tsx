import { StyleSheet, type AccessibilityProps, type StyleProp, type TextStyle } from 'react-native';
import { getTextCompatConfig } from './compat';
import PlainTextViewNativeComponent from './PlainTextViewNativeComponent';

// RN's TextStyle plus the one text style it has no entry for.
// `fontVariationSettings` is a style rather than a prop because two upstream
// attempts to add it (facebook/react-native#44685, #44667) never merged, so
// the type is widened here instead. Widened, not replaced, so a plain
// TextStyle stays assignable and this can be dropped if RN adds the key.
export type PlainTextStyle = TextStyle & { fontVariationSettings?: string };

// Accessibility, testID, and nativeID/id are ViewProps that the native view
// already applies; `...accessibilityProps` just forwards them through.
export type PlainTextProps = AccessibilityProps & {
  children?: string;
  style?: StyleProp<PlainTextStyle>;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  allowFontScaling?: boolean;
  maxFontSizeMultiplier?: number;
  // Per-instance override for unstable_configureTextCompat's lineHeightClippingIos.
  // Unset defers to the global config. Set here, it wins regardless of it.
  unstable_lineHeightClippingIos?: boolean;
  testID?: string;
  nativeID?: string;
  id?: string;
};

// Despite the CSS name, `verticalAlign` is Android-only in RN as well: Text.js
// aliases it onto `textAlignVertical` in JS, before either reaches native.
// Mirroring that here means closing `textAlignVertical` on iOS closes
// `verticalAlign` for free. `verticalAlign` wins when both are set (matches RN
// <Text>), and its 'middle' maps to the native prop's 'center'.
function resolveTextAlignVertical(
  textAlignVertical: TextStyle['textAlignVertical'],
  verticalAlign: TextStyle['verticalAlign']
): 'auto' | 'top' | 'bottom' | 'center' | undefined {
  if (verticalAlign != null) {
    return verticalAlign === 'middle' ? 'center' : verticalAlign;
  }
  return textAlignVertical;
}

const FONT_VARIANT_SEPARATORS = /[\s,]+/;

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

export function PlainText({
  children,
  style,
  numberOfLines,
  ellipsizeMode,
  allowFontScaling,
  maxFontSizeMultiplier,
  unstable_lineHeightClippingIos,
  ...accessibilityProps
}: PlainTextProps) {
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
    ...viewStyle
  } = StyleSheet.flatten(style) ?? {};

  return (
    <PlainTextViewNativeComponent
      text={children}
      color={color}
      fontSize={fontSize}
      fontFamily={fontFamily}
      fontWeight={fontWeight != null ? String(fontWeight) : undefined}
      fontStyle={fontStyle}
      fontVariant={resolveFontVariant(fontVariant)}
      fontVariationSettings={fontVariationSettings}
      textAlign={textAlign}
      textAlignVertical={resolveTextAlignVertical(textAlignVertical, verticalAlign)}
      textDecorationLine={textDecorationLine}
      textTransform={textTransform}
      lineHeight={lineHeight}
      letterSpacing={letterSpacing}
      hasLetterSpacing={letterSpacing !== undefined}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      lineHeightClippingIos={
        unstable_lineHeightClippingIos ?? getTextCompatConfig().lineHeightClippingIos
      }
      style={viewStyle}
      {...accessibilityProps}
    />
  );
}

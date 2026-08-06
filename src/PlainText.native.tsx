import { StyleSheet, type AccessibilityProps, type StyleProp, type TextStyle } from 'react-native';
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
  testID?: string;
  nativeID?: string;
  id?: string;
};

// RN <Text> supports both the Android-specific `textAlignVertical` and the
// CSS-standard `verticalAlign` style — but despite the cross-platform name,
// `verticalAlign` is Android-only too: RN's own Text.js maps it onto
// `textAlignVertical` in JS, before either ever reaches native, so it was
// never a second gap, just an alias for the same one (see
// docs/agent/workflow.md#when-rn-itself-has-the-platform-gap). Mirroring that
// JS-side mapping here means PlainText's iOS native side closing
// `textAlignVertical` (PlainTextViewNativeComponent.ts) closes `verticalAlign`
// on iOS for free, with no native change of its own. When both props are set,
// `verticalAlign` wins (matching RN's own override order), and its 'middle'
// value maps to the native prop's 'center'.
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
      lineHeight={lineHeight}
      letterSpacing={letterSpacing}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={viewStyle}
      {...accessibilityProps}
    />
  );
}

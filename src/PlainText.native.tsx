import { StyleSheet, type AccessibilityProps, type StyleProp, type TextStyle } from 'react-native';
import PlainTextViewNativeComponent from './PlainTextViewNativeComponent';

// RN's TextStyle plus the one text style it has no entry for.
//
// - `fontVariationSettings` is a style rather than a prop because that is the
//   shape RN itself reached for, twice: facebook/react-native#44685 (iOS) and
//   #44667 (Android) both added it to StyleSheetTypes and threaded it through
//   TextAttributes. Neither merged, so the key never shipped and the type has to
//   be widened here.
// - Widened rather than replaced, so anything already typed as TextStyle stays
//   assignable, and the key disappears from here without a break if RN adds it.
export type PlainTextStyle = TextStyle & { fontVariationSettings?: string };

// Accessibility, testID, and nativeID/id are all part of RN's ViewProps, which
// the native component's codegen spec extends — so the base native view
// (RCTViewComponentView on iOS, BaseViewManager on Android) already applies
// them. They just need forwarding from here, which the `...accessibilityProps`
// rest below does. This mirrors RN <Text>'s accessibility surface.
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
// cross-platform `verticalAlign` style. When both are set, `verticalAlign`
// wins (RN applies it as an override), and its 'middle' value maps to the
// native prop's 'center'. Mirror that here so the native side sees one value.
function resolveTextAlignVertical(
  textAlignVertical: TextStyle['textAlignVertical'],
  verticalAlign: TextStyle['verticalAlign']
): 'auto' | 'top' | 'bottom' | 'center' | undefined {
  if (verticalAlign != null) {
    return verticalAlign === 'middle' ? 'center' : verticalAlign;
  }
  return textAlignVertical;
}

// Module scope so the string path doesn't allocate a RegExp per call: a regex
// literal evaluates to a new object every time control reaches it.
const FONT_VARIANT_SEPARATORS = /[\s,]+/;

// RN types fontVariant as either an array of variant names or a CSS-style
// `font-variant` string, and accepts both (ReactCommon's
// parseUnprocessedFontVariant). The native prop takes only the array, so split
// the string form on the separators CSS allows — the token names are the same
// either way, so nothing else has to know which form arrived.
//
// The array form is returned as-is rather than copied, so the common case adds no
// allocation and the prop keeps its identity across renders.
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
  // color/fontSize/fontFamily/fontWeight/fontStyle/textAlign are text-style
  // props, so they don't flow through the native ViewProps. Pull them out of
  // the flattened style and pass them explicitly.
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

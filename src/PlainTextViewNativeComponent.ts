import {
  codegenNativeComponent,
  type CodegenTypes,
  type ColorValue,
  type ViewProps,
} from 'react-native';

// SYNC: this spec is the source of truth for props. Adding or changing one
// touches several files that nothing checks automatically — see
// docs/agent/sync-points.md, or `grep -rn "SYNC:"` for the sites themselves.
export interface NativeProps extends ViewProps {
  text?: string;
  color?: ColorValue;
  fontSize?: CodegenTypes.WithDefault<CodegenTypes.Float, 14>;
  fontFamily?: string;
  // A free string rather than a literal union: codegen enums are C++ enum
  // members named after each value, and members can't start with a digit
  // (as the '100'..'900' weights would), so it's parsed on the native side
  // instead (mirrors how RN's own <Text> types AndroidTextInputNativeComponent's
  // fontWeight as plain `string`).
  fontWeight?: string;
  fontStyle?: CodegenTypes.WithDefault<'normal' | 'italic', 'normal'>;
  // Points. 0 means unset (matches RN <Text>, where lineHeight defaults to the
  // font's natural line height); any positive value overrides it.
  lineHeight?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  // Points. 0 means unset/no extra tracking (RN <Text> default), matching the
  // platform default, so it doubles as the sentinel for "not provided".
  letterSpacing?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  textAlign?: CodegenTypes.WithDefault<
    'auto' | 'left' | 'right' | 'center' | 'justify',
    'auto'
  >;
  // Vertical alignment of the text within the view's box. Android-only (matches
  // RN <Text>: iOS ignores it). RN's cross-platform `verticalAlign` style maps
  // onto this on the JS side ('middle' -> 'center'), so the native prop only
  // ever sees the textAlignVertical value set.
  textAlignVertical?: CodegenTypes.WithDefault<
    'auto' | 'top' | 'bottom' | 'center',
    'auto'
  >;
  // A free string rather than a literal union: the 'underline line-through'
  // value contains a space, which codegen would turn into an invalid C++ enum
  // member (getEnumName only splits on '-'), so it's parsed on the native side
  // instead (same reasoning as fontWeight above).
  textDecorationLine?: string;
  // 0 means unlimited (matches RN <Text>). Caps rendered lines and the
  // intrinsic height computed by the shadow node's measure pass.
  numberOfLines?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;
  ellipsizeMode?: CodegenTypes.WithDefault<
    'head' | 'middle' | 'tail' | 'clip',
    'tail'
  >;
  // Whether the font scales with the OS accessibility text-size setting
  // (Dynamic Type on iOS, font scale on Android). Matches RN <Text>'s default
  // of true; when false the text renders at its literal point size.
  allowFontScaling?: CodegenTypes.WithDefault<boolean, true>;
  // Caps the accessibility scale when allowFontScaling is on. 0 means no cap
  // (RN <Text> default); a value >= 1 clamps the multiplier, and anything else
  // (including the invalid 0 < x < 1 range) is treated as no cap.
  maxFontSizeMultiplier?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
}

export default codegenNativeComponent<NativeProps>('RNPlainText');

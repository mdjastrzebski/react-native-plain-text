import {
  codegenNativeComponent,
  type CodegenTypes,
  type ColorValue,
  type ViewProps,
} from 'react-native';

// SYNC: this spec is the source of truth for props. Changing one touches several
// other files that nothing checks automatically. See
// docs/contributing/sync-points.md#set-1--any-prop-the-four-layer-flow.
//
// `Cost:` lines rate a prop that is *set*, per docs/contributing/performance.md#prop-cost-policy.
// Unmarked props are light, and a set prop left at default still costs a check.
export interface NativeProps extends ViewProps {
  text?: string;
  color?: ColorValue;
  fontSize?: CodegenTypes.WithDefault<CodegenTypes.Float, 14>;

  // Cost: medium. Font lookup, cached per family/size after the first resolution.
  fontFamily?: string;

  // Free string, not a literal union: codegen enums can't start with a digit ('100'..'900').
  // Cost: medium. Android only: setting it, even to the font's default value, pushes
  // measurement onto the unhinted glyph path (matches RN <Text>), ~2.5% extra mount cost.
  fontWeight?: string;

  // Free string, not WithDefault<enum>: iOS needs to tell "normal" apart from unset,
  // which codegen's enum collapsing can't express.
  // Cost: medium. Same Android unhinted-glyph-path cost as fontWeight above.
  fontStyle?: string;

  // Cost: medium. Font-cache-miss descriptor round trip on iOS, unguarded paint write on Android.
  fontVariant?: ReadonlyArray<string>;

  // Variable-font axes, CSS `font-variation-settings` syntax (e.g. '"wght" 700, "wdth" 87.5').
  // Cost: medium. CTFont copy on an iOS font-cache miss, Android derives a new Typeface on change.
  fontVariationSettings?: string;

  // Points, 0 means unset.
  // Cost: medium. Forces iOS's attributed-string path and an Android line-height span.
  lineHeight?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;

  // Points. null keeps unset distinct from an explicit 0 in generated C++.
  // Cost: medium. Forces iOS's attributed-string path, plus one paint write on Android.
  letterSpacing?: CodegenTypes.WithDefault<CodegenTypes.Float, null>;

  textAlign?: CodegenTypes.WithDefault<'auto' | 'left' | 'right' | 'center' | 'justify', 'auto'>;
  textAlignVertical?: CodegenTypes.WithDefault<'auto' | 'top' | 'bottom' | 'center', 'auto'>;
  verticalAlign?: string;

  // Free string: 'underline line-through' has a space, which codegen enums can't represent.
  // Cost: medium. Forces iOS's attributed-string path and two Android paint flags.
  textDecorationLine?: string;

  // Cost: medium. Forces the iOS attributed-string path; the Android side is one paint write.
  textShadowColor?: ColorValue;
  textShadowOffsetWidth?: CodegenTypes.WithDefault<CodegenTypes.Float, null>;
  textShadowOffsetHeight?: CodegenTypes.WithDefault<CodegenTypes.Float, null>;
  textShadowRadius?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;

  // Cost: medium. Allocates a transformed copy of the string per apply on both platforms.
  textTransform?: CodegenTypes.WithDefault<
    'none' | 'uppercase' | 'lowercase' | 'capitalize',
    'none'
  >;

  numberOfLines?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;
  ellipsizeMode?: CodegenTypes.WithDefault<'head' | 'middle' | 'tail' | 'clip', 'tail'>;

  // iOS only, no-op on Android. Matches RN <Text>'s values/default.
  lineBreakStrategyIOS?: CodegenTypes.WithDefault<
    'none' | 'standard' | 'hangul-word' | 'push-out',
    'none'
  >;

  allowFontScaling?: CodegenTypes.WithDefault<boolean, true>;
  maxFontSizeMultiplier?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;

  // Internal prop used for experiments. No-op in public releases.
  experiment?: CodegenTypes.WithDefault<boolean, false>;
  lineHeightClippingCompat?: CodegenTypes.WithDefault<boolean, false>;
  includeFontPadding?: CodegenTypes.WithDefault<boolean, true>;

  // Android only, no-op on iOS. Matches RN <Text>'s values/default.
  textBreakStrategy?: CodegenTypes.WithDefault<
    'simple' | 'highQuality' | 'balanced',
    'highQuality'
  >;
}

export default codegenNativeComponent<NativeProps>('RNPlainText', {
  // @ts-expect-error React Native's public export omits this supported codegen option.
  generateOptionalProperties: true,
});

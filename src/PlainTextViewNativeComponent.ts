import {
  codegenNativeComponent,
  type CodegenTypes,
  type ColorValue,
  type ViewProps,
} from 'react-native';

// SYNC: this spec is the source of truth for props. Changing one touches several
// other files that nothing checks automatically (see docs/agent/sync-points.md).
//
// `Cost:` lines rate a prop that is *set*, per docs/agent/performance.md#prop-cost-policy.
// Unmarked props are light, and a set prop left at default still costs a check.
export interface NativeProps extends ViewProps {
  text?: string;
  color?: ColorValue;
  fontSize?: CodegenTypes.WithDefault<CodegenTypes.Float, 14>;
  // Cost: medium. Font lookup, cached per family/size after the first resolution.
  fontFamily?: string;
  // Free string, not a literal union: codegen enums can't start with a digit ('100'..'900').
  fontWeight?: string;
  // Free string, not WithDefault<enum>: iOS needs to tell "normal" apart from unset,
  // which codegen's enum collapsing can't express.
  fontStyle?: string;
  // OpenType feature toggles (RN <Text>'s fontVariant); string array because codegen
  // turns enum arrays into a bitmask enum. Empty means no features set.
  //
  // Cost: medium. Font-cache-miss descriptor round trip on iOS, unguarded paint write on Android.
  fontVariant?: ReadonlyArray<string>;
  // Variable-font axes, CSS `font-variation-settings` syntax (e.g. '"wght" 700, "wdth" 87.5').
  // Not in RN's TextStyle, so PlainText.native.tsx widens the style type (PlainTextStyle).
  //
  // Cost: medium. CTFont copy on an iOS font-cache miss, Android derives a new Typeface on change.
  fontVariationSettings?: string;
  // Points, 0 means unset.
  //
  // Cost: medium. Forces iOS's attributed-string path and an Android line-height span.
  lineHeight?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  // Points. "Set or not" is carried separately in hasLetterSpacing, since 0
  // is both the default and a legitimate value.
  //
  // Cost: medium. Forces iOS's attributed-string path, plus one paint write on Android.
  letterSpacing?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  // Internal. iOS's kerning attribute treats "unset" and "0" differently
  // (auto kerning vs. disabled), so this carries that bit explicitly.
  // Android has no such distinction and ignores it, like `experiment` below.
  hasLetterSpacing?: CodegenTypes.WithDefault<boolean, false>;
  textAlign?: CodegenTypes.WithDefault<'auto' | 'left' | 'right' | 'center' | 'justify', 'auto'>;
  // Android-only in RN <Text>, but PlainText closes that gap on iOS too (see
  // docs/agent/workflow.md#when-rn-itself-has-the-platform-gap). JS maps the
  // cross-platform verticalAlign style onto this ('middle' -> 'center').
  textAlignVertical?: CodegenTypes.WithDefault<'auto' | 'top' | 'bottom' | 'center', 'auto'>;
  // Free string: 'underline line-through' has a space, which codegen enums can't represent.
  //
  // Cost: medium. Forces iOS's attributed-string path and two Android paint flags.
  textDecorationLine?: string;
  // Undefined falls back to RN <Text>'s native per-platform default (a
  // translucent black), matching NSShadow/DEFAULT_TEXT_SHADOW_COLOR.
  //
  // Cost: medium. Forces the iOS attributed-string path; the Android side is one paint write.
  textShadowColor?: ColorValue;
  // DIP each. Flattened rather than a single {width, height} object, matching
  // this spec's other flat-scalar props.
  textShadowOffsetWidth?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  textShadowOffsetHeight?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  // "Set or not" for textShadowOffset, carried separately since {0, 0} is a
  // legitimate offset distinct from unset. RN <Text> on iOS only draws a
  // shadow when textShadowOffset itself was provided, regardless of
  // textShadowRadius/textShadowColor; Android has no such distinction and
  // ignores this, like hasLetterSpacing.
  hasTextShadow?: CodegenTypes.WithDefault<boolean, false>;
  textShadowRadius?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  // Transforms the text content itself, so it feeds both what's drawn and what's
  // measured (case changes can change width).
  //
  // Cost: medium. Allocates a transformed copy of the string per apply on both platforms.
  textTransform?: CodegenTypes.WithDefault<
    'none' | 'uppercase' | 'lowercase' | 'capitalize',
    'none'
  >;
  // 0 means unlimited. Caps rendered lines and the shadow node's measured intrinsic height.
  numberOfLines?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;
  ellipsizeMode?: CodegenTypes.WithDefault<'head' | 'middle' | 'tail' | 'clip', 'tail'>;
  // OS accessibility text-size scaling (Dynamic Type / font scale).
  allowFontScaling?: CodegenTypes.WithDefault<boolean, true>;
  // Caps the accessibility scale when allowFontScaling is on. 0 or values in (0, 1) mean no cap.
  maxFontSizeMultiplier?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  // Internal, not part of PlainText's public props. One generic on/off switch
  // for the perf suite's current A/B test: false is baseline, true is
  // whatever is being tried. What it does is platform- and experiment-
  // specific. A platform with no experiment wired up ignores it. Currently
  // read only by Android's measure(). See docs/agent/sync-points.md.
  experiment?: CodegenTypes.WithDefault<boolean, false>;
  // Internal, not part of PlainText's public props. Driven by
  // unstable_configureTextCompat (src/compat.ts), forwarded on every render
  // rather than only when it changes. iOS-only concern: when true, reverts
  // applyContentFromProps's lineHeight vertical shift to RN <Text>'s current
  // ascent-clipping bug instead of PlainText's fix. No-op on Android.
  lineHeightClippingIos?: CodegenTypes.WithDefault<boolean, false>;
  // Android-only, matching RN <Text>: UILabel has no equivalent extra
  // line-height padding to turn off, so this stays a real platform gap.
  includeFontPadding?: CodegenTypes.WithDefault<boolean, true>;
}

export default codegenNativeComponent<NativeProps>('RNPlainText');

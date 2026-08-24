import {
  codegenNativeComponent,
  type CodegenTypes,
  type ColorValue,
  type ViewProps,
} from 'react-native';

// SYNC: this spec is the source of truth for props. Changing one touches several
// other files that nothing checks automatically (see docs/contributing/sync-points.md).
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
  //
  // Cost: medium. Android only: setting it, even to the font's default value, pushes
  // measurement onto the unhinted glyph path (matches RN <Text>), ~2.5% extra mount cost.
  fontWeight?: string;
  // Free string, not WithDefault<enum>: iOS needs to tell "normal" apart from unset,
  // which codegen's enum collapsing can't express.
  //
  // Cost: medium. Same Android unhinted-glyph-path cost as fontWeight above.
  fontStyle?: string;
  // OpenType feature toggles (RN <Text>'s fontVariant); string array because codegen
  // turns enum arrays into a bitmask enum. Empty means no features set.
  //
  // Cost: medium. Font-cache-miss descriptor round trip on iOS, unguarded paint write on Android.
  fontVariant?: ReadonlyArray<string>;
  // Variable-font axes, CSS `font-variation-settings` syntax (e.g. '"wght" 700, "wdth" 87.5').
  // Not in RN's TextStyle, so PlainText.tsx widens the style type (PlainTextStyle).
  //
  // Cost: medium. CTFont copy on an iOS font-cache miss, Android derives a new Typeface on change.
  fontVariationSettings?: string;
  // Points, 0 means unset.
  //
  // Cost: medium. Forces iOS's attributed-string path and an Android line-height span.
  lineHeight?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  // Points. null keeps unset distinct from an explicit 0 in generated C++.
  //
  // Cost: medium. Forces iOS's attributed-string path, plus one paint write on Android.
  letterSpacing?: CodegenTypes.WithDefault<CodegenTypes.Float, null>;
  textAlign?: CodegenTypes.WithDefault<'auto' | 'left' | 'right' | 'center' | 'justify', 'auto'>;
  // Android-only in RN <Text>, but PlainText closes that gap on iOS too (see
  // docs/contributing/workflow.md#when-rn-itself-has-the-platform-gap).
  textAlignVertical?: CodegenTypes.WithDefault<'auto' | 'top' | 'bottom' | 'center', 'auto'>;
  // The cross-platform verticalAlign style, passed through raw (unlike RN <Text>'s
  // Text.js, which aliases it onto textAlignVertical in JS): 'middle' -> 'center' and
  // "wins over textAlignVertical when set" are both native-side decisions now, per
  // docs/contributing/performance.md#prop-cost-policy. Free string rather than
  // WithDefault, since an empty string (unset) has to be distinguishable from an
  // explicit 'auto'. Kept in sync across platforms by the SYNC comments on
  // PlainTextView.kt's applyVerticalAlignGravity and RNPlainText.mm's
  // RNPlainTextResolveVerticalAlign.
  verticalAlign?: string;
  // Free string: 'underline line-through' has a space, which codegen enums can't represent.
  //
  // Cost: medium. Forces iOS's attributed-string path and two Android paint flags.
  textDecorationLine?: string;
  // Undefined falls back to RN <Text>'s native per-platform default (a
  // translucent black), matching NSShadow/DEFAULT_TEXT_SHADOW_COLOR.
  //
  // Cost: medium. Forces the iOS attributed-string path; the Android side is one paint write.
  textShadowColor?: ColorValue;
  // DIP each. null keeps an explicitly set {0, 0} distinct from unset in
  // generated C++. Flattened rather than a single {width, height} object,
  // matching this spec's other flat-scalar props.
  textShadowOffsetWidth?: CodegenTypes.WithDefault<CodegenTypes.Float, null>;
  textShadowOffsetHeight?: CodegenTypes.WithDefault<CodegenTypes.Float, null>;
  textShadowRadius?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  // Transforms the text content itself, so it feeds both what's drawn and what's
  // measured (case changes can change width).
  //
  // Cost: medium. Allocates a transformed copy of the string per apply on both platforms.
  textTransform?: CodegenTypes.WithDefault<
    'none' | 'uppercase' | 'lowercase' | 'capitalize',
    'none'
  >;
  // Web-like `hyphens`. iOS: 'manual' (default) is UILabel's natural state, no
  // cost; 'none' strips soft hyphens (U+00AD) to match Android/Web; 'auto' sets
  // usesDefaultHyphenation=true. Android: 'none'/'auto' resolve into
  // android_hyphenationFrequency below (PlainTextView.kt); 'manual' defers to it.
  //
  // Known gap: 'manual' works on iOS but not Android. Android's line breaker
  // only honors an embedded U+00AD when hyphenationFrequency is off NONE, and
  // even then only as a fallback for languages with no hyphenation-pattern
  // dictionary — for a language it has patterns for (most), it re-derives its
  // own break points instead of respecting the ones placed in the string.
  // There is no Android setting that gives "break only where I put ­".
  //
  // Cost: medium. 'auto' forces iOS's attributed-string path; 'none' allocates
  // a stripped copy of the text.
  hyphens?: CodegenTypes.WithDefault<'none' | 'manual' | 'auto', 'manual'>;
  // Android-only, like RN <Text>'s prop of the same name, kept for RN <Text>
  // compat. iOS ignores it.
  android_hyphenationFrequency?: CodegenTypes.WithDefault<'none' | 'normal' | 'full', 'none'>;
  // BCP-47 language tag (e.g. 'de', 'de-DE') for the text itself, driving the
  // hyphenation dictionary and locale-sensitive line breaking/glyph selection.
  // RN <Text> has no counterpart on either native platform. Empty means unset:
  // the platform infers (iOS) or uses the view's default locale (Android).
  //
  // Cost: medium. Forces iOS's attributed-string path.
  lang?: string;
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
  // specific. A platform with no experiment wired up ignores it.
  //
  // Currently unread: no experiment is live. See docs/contributing/perf-experiments.md.
  experiment?: CodegenTypes.WithDefault<boolean, false>;
  // PlainText's unstable_lineHeightClippingIos, prefix dropped past the JS
  // wrapper. iOS-only concern: when true, reverts applyContentFromProps's
  // lineHeight vertical shift to RN <Text>'s current ascent-clipping bug
  // (RN#29507) instead of PlainText's fix. No-op on Android.
  lineHeightClippingIos?: CodegenTypes.WithDefault<boolean, false>;
  // Android-only, matching RN <Text>: UILabel has no equivalent extra
  // line-height padding to turn off, so this stays a real platform gap.
  includeFontPadding?: CodegenTypes.WithDefault<boolean, true>;
}

export default codegenNativeComponent<NativeProps>('RNPlainText', {
  // @ts-expect-error React Native's public export omits this supported codegen option.
  generateOptionalProperties: true,
});

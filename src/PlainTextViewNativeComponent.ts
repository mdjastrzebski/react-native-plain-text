import {
  codegenNativeComponent,
  type CodegenTypes,
  type ColorValue,
  type ViewProps,
} from 'react-native';

// SYNC: this spec is the source of truth for props. Adding or changing one
// touches several files that nothing checks automatically — see
// docs/agent/sync-points.md, or `grep -rn "SYNC:"` for the sites themselves.
//
// The `Cost:` lines below rate a prop that is *set*, per
// docs/agent/performance.md#prop-cost-policy. Only medium and heavy are marked,
// so an unmarked prop is light. A prop left at its default costs a check on
// either platform, whatever its rating, and a new prop that can't manage that
// is a design problem rather than a note to write.
export interface NativeProps extends ViewProps {
  text?: string;
  color?: ColorValue;
  fontSize?: CodegenTypes.WithDefault<CodegenTypes.Float, 14>;
  // Cost: medium. First resolution hits the system font database on iOS and the
  // asset lookup on Android, then it is cached per family and size.
  fontFamily?: string;
  // A free string rather than a literal union: codegen enums are C++ enum
  // members named after each value, and members can't start with a digit
  // (as the '100'..'900' weights would), so it's parsed on the native side
  // instead (mirrors how RN's own <Text> types AndroidTextInputNativeComponent's
  // fontWeight as plain `string`).
  fontWeight?: string;
  fontStyle?: CodegenTypes.WithDefault<'normal' | 'italic', 'normal'>;
  // OpenType feature toggles, as RN <Text>'s fontVariant: variant names, each
  // mapping to one or more font features. Strings rather than a literal union
  // because codegen turns an array of enums into a bitmask enum; plain strings
  // arrive as a ReadableArray on Android, which is what RN's own
  // ReactTypefaceUtils.parseFontVariant takes. Empty means no features set.
  //
  // Cost: medium. A descriptor round trip on an iOS font-cache miss, and a
  // freshly allocated string plus a deliberately unguarded paint write per apply
  // on Android (see the rejected guard in docs/agent/performance.md).
  fontVariant?: ReadonlyArray<string>;
  // Variable-font axis values, in CSS `font-variation-settings` syntax:
  // `'"wght" 700, "wdth" 87.5'`.
  //
  // - The grammar is four-character tags, each wrapped in single or double
  //   quotes, comma-separated. That is Android's
  //   FontVariationAxis.fromFontVariationSettings, which the iOS parser mirrors
  //   so a string means the same thing on both platforms. Empty means no axes;
  //   a malformed string sets none of them, on either platform.
  // - Reaches here from `style`, like every other font value, but RN's TextStyle
  //   has no key for it: the two upstream attempts that would have added one
  //   both stalled (see docs/agent/native-gotchas.md). PlainText.native.tsx
  //   widens the style type itself, in PlainTextStyle.
  // - Cost: medium. A CTFont copy on an iOS font-cache miss. On Android it
  //   derives a new Typeface, and any typeface change re-derives it.
  fontVariationSettings?: string;
  // Points. 0 means unset (matches RN <Text>, where lineHeight defaults to the
  // font's natural line height); any positive value overrides it.
  //
  // Cost: medium. Forces the iOS attributed-string path, and an Android
  // SpannableString carrying a line-height span in place of a plain string.
  lineHeight?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  // Points. 0 means unset/no extra tracking (RN <Text> default), matching the
  // platform default, so it doubles as the sentinel for "not provided".
  //
  // Cost: medium. Forces the iOS attributed-string path. One paint write on
  // Android.
  letterSpacing?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  textAlign?: CodegenTypes.WithDefault<'auto' | 'left' | 'right' | 'center' | 'justify', 'auto'>;
  // Vertical alignment of the text within the view's box. Android-only (matches
  // RN <Text>: iOS ignores it). RN's cross-platform `verticalAlign` style maps
  // onto this on the JS side ('middle' -> 'center'), so the native prop only
  // ever sees the textAlignVertical value set.
  textAlignVertical?: CodegenTypes.WithDefault<'auto' | 'top' | 'bottom' | 'center', 'auto'>;
  // A free string rather than a literal union: the 'underline line-through'
  // value contains a space, which codegen would turn into an invalid C++ enum
  // member (getEnumName only splits on '-'), so it's parsed on the native side
  // instead (same reasoning as fontWeight above).
  //
  // Cost: medium. Forces the iOS attributed-string path. Two paint flags on
  // Android. Free on top of lineHeight or letterSpacing, which force the same
  // path.
  textDecorationLine?: string;
  // 0 means unlimited (matches RN <Text>). Caps rendered lines and the
  // intrinsic height computed by the shadow node's measure pass.
  numberOfLines?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;
  ellipsizeMode?: CodegenTypes.WithDefault<'head' | 'middle' | 'tail' | 'clip', 'tail'>;
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

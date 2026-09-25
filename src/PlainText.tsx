import {
  StyleSheet,
  type AccessibilityProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
} from 'react-native';
import type { ComponentRef, Ref } from 'react';
import PlainTextViewNativeComponent, { type NativeProps } from './PlainTextViewNativeComponent';
import { joinTextChildren, normalizeFontVariant, warnOnUnsupportedChildren } from './utils';

/** RN's `TextStyle` plus `fontVariationSettings`. Any `TextStyle` is assignable. */
export type PlainTextStyle = TextStyle & {
  /** Variable-font axes in CSS syntax, e.g. `'"wght" 700, "wdth" 87.5'`. Added to RN in v0.88 (facebook/react-native#57804). */
  fontVariationSettings?: string;
};

/** Props PlainText adds to RN's TextProps. */
// SYNC: findPlainTextOnlyProp (utils.ts) checks each one RN <Text> drops — see
// docs/contributing/sync-points.md#set-17--plaintext-props-rn-text-drops.
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
  /**
   * BCP-47 language tag (e.g. `'pl'`, `'de'`) for hyphenation and line breaking.
   * Also the screen-reader language unless `accessibilityLanguage` is set.
   */
  lang?: string;

  // SYNC: renamed to the bare lineHeightClippingCompat past this file — see
  // docs/contributing/sync-points.md#set-13--lineheightclippingcompat-one-prop-renamed-at-the-js-boundary.
  /**
   * Reverts iOS's `lineHeight` vertical centering to RN `<Text>`'s
   * buggy ascent-clipping behavior (RN#29507).
   */
  unstable_lineHeightClippingCompat?: boolean;
};

/** RN `<Text>` props PlainText forwards to the native view. */
type SupportedTextProps =
  | 'numberOfLines'
  | 'ellipsizeMode'
  | 'allowFontScaling'
  | 'maxFontSizeMultiplier'
  | 'lineBreakStrategyIOS'
  | 'textBreakStrategy'
  | 'android_hyphenationFrequency'
  | 'id'
  | 'nativeID'
  | 'testID'
  | 'onLayout';

/** A child RN `<Text>` renders as text. `null`, `undefined` and booleans render nothing. */
export type PlainTextChild = string | number | bigint | boolean | null | undefined;

export type PlainTextProps = Pick<TextProps, SupportedTextProps> &
  AccessibilityProps &
  PlainTextOwnProps & {
    /**
     * Text to render: a string, or text-like children such as `{count} items`, joined
     * into one string. No nested `<Text>` or other elements.
     */
    children?: PlainTextChild | readonly PlainTextChild[];
  };

// How a `style` key is handled. Anything not listed stays in `style` as a view style.
const PASS = 1; // lifted to a top-level native prop unchanged
const STRINGIFY = 2; // lifted as a string (e.g. numeric fontWeight 600 → "600")
const FONT_VARIANT = 3;
const TEXT_SHADOW_OFFSET = 4;

// Text-style keys aren't RN `ViewProps`, so they go to native as top-level props.
// Null prototype: a style key like `constructor` must not hit `Object.prototype`.
const TEXT_STYLE_KEYS: Record<string, number | undefined> = Object.assign(Object.create(null), {
  color: PASS,
  fontSize: PASS,
  fontFamily: PASS,
  fontStyle: PASS,
  fontVariationSettings: PASS,
  textAlign: PASS,
  textAlignVertical: PASS,
  verticalAlign: PASS,
  writingDirection: PASS,
  textDecorationLine: PASS,
  textTransform: PASS,
  lineHeight: PASS,
  letterSpacing: PASS,
  includeFontPadding: PASS,
  textShadowColor: PASS,
  textShadowRadius: PASS,
  fontWeight: STRINGIFY,
  fontVariant: FONT_VARIANT,
  textShadowOffset: TEXT_SHADOW_OFFSET,
});

type PlainTextRef = ComponentRef<typeof PlainTextViewNativeComponent>;

export function PlainText({ ref, ...props }: PlainTextProps & { ref?: Ref<PlainTextRef> }) {
  const nativeProps = mapPlainTextProps(props);
  return <PlainTextViewNativeComponent {...nativeProps} ref={ref} />;
}

export function mapPlainTextProps({
  children,
  text,
  style,
  unstable_lineHeightClippingCompat,
  ...rest
}: PlainTextProps): NativeProps {
  // `rest` is a fresh object, so it doubles as the native props. Add only keys that
  // hold a value: Fabric's prop diff walks every key, `undefined` ones included.
  const nativeProps: Record<string, unknown> = rest;

  const content = text ?? children;

  // Hot path
  if (typeof content === 'string') {
    nativeProps.text = content;
  }
  // Slow path: JSX passes `{count} items` as `[count, ' items']`.
  else if (content != null) {
    const joined = joinTextChildren(content);
    if (joined !== undefined) {
      nativeProps.text = joined;
    } else if (__DEV__) {
      warnOnUnsupportedChildren(content);
    }
  }

  if (unstable_lineHeightClippingCompat !== undefined) {
    nativeProps.lineHeightClippingCompat = unstable_lineHeightClippingCompat;
  }

  // No null guard: `for...in` over a missing style runs zero times.
  const flatStyle = StyleSheet.flatten(style) as Record<string, unknown>;

  // Visit only the keys actually set (usually a handful), not every text-style key.
  let viewStyle: Record<string, unknown> | undefined;
  for (const key in flatStyle) {
    const value = flatStyle[key];
    if (value == null) {
      continue;
    }

    switch (TEXT_STYLE_KEYS[key]) {
      case undefined:
        (viewStyle ??= {})[key] = value;
        break;
      case PASS:
        nativeProps[key] = value;
        break;
      case STRINGIFY:
        nativeProps[key] = String(value);
        break;
      case FONT_VARIANT: {
        // A separator-only string normalizes to `undefined`.
        const fontVariant = normalizeFontVariant(value as TextStyle['fontVariant']);
        if (fontVariant !== undefined) {
          nativeProps.fontVariant = fontVariant;
        }
        break;
      }
      case TEXT_SHADOW_OFFSET: {
        const offset = value as NonNullable<TextStyle['textShadowOffset']>;
        nativeProps.textShadowOffsetWidth = offset.width;
        nativeProps.textShadowOffsetHeight = offset.height;
        break;
      }
    }
  }

  if (viewStyle !== undefined) {
    nativeProps.style = viewStyle;
  }

  return nativeProps as NativeProps;
}

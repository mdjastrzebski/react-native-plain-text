import {
  processColor,
  StyleSheet,
  type AccessibilityProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
} from 'react-native';
import { getHostComponent } from 'react-native-nitro-modules';
import NitroPlainTextConfig from '../nitrogen/generated/shared/json/NitroPlainTextConfig.json';
import type {
  NitroPlainTextMethods,
  NitroPlainTextProps as NativeProps,
} from './specs/NitroPlainText.nitro';

export type { NativeProps as NativeNitroPlainTextProps };

/**
 * The bare Nitro host component, props in native shape (colors pre-processed with
 * `processColor`). Counterpart of `unstable_NativePlainText`.
 *
 * No intrinsic size: Nitro Views have no custom shadow node to measure text, so give
 * it an explicit height (or flex).
 */
export const NativeNitroPlainText = getHostComponent<NativeProps, NitroPlainTextMethods>(
  'NitroPlainText',
  () => NitroPlainTextConfig
);

type SupportedTextProps =
  | 'numberOfLines'
  | 'ellipsizeMode'
  | 'allowFontScaling'
  | 'maxFontSizeMultiplier'
  | 'nativeID'
  | 'testID'
  | 'onLayout';

type Child = string | number | bigint | boolean | null | undefined;

export type NitroPlainTextProps = Pick<TextProps, SupportedTextProps> &
  AccessibilityProps & {
    text?: string;
    children?: Child | readonly Child[];
    style?: StyleProp<TextStyle>;
    hyphens?: 'none' | 'auto';
    lang?: string;
  };

// How a `style` key is handled, mirroring src/PlainText.tsx. Anything not listed
// stays in `style` as a view style, and text-style keys the Nitro spec lacks are
// dropped.
const PASS = 1;
const STRINGIFY = 2;
const COLOR = 3;
const TEXT_SHADOW_OFFSET = 4;
const DROP = 5;

const TEXT_STYLE_KEYS: Record<string, number | undefined> = Object.assign(Object.create(null), {
  color: COLOR,
  fontSize: PASS,
  fontFamily: PASS,
  fontStyle: PASS,
  textAlign: PASS,
  textDecorationLine: PASS,
  textTransform: PASS,
  lineHeight: PASS,
  letterSpacing: PASS,
  textShadowColor: COLOR,
  textShadowRadius: PASS,
  fontWeight: STRINGIFY,
  textShadowOffset: TEXT_SHADOW_OFFSET,
  fontVariant: DROP,
  fontVariationSettings: DROP,
  textAlignVertical: DROP,
  verticalAlign: DROP,
  writingDirection: DROP,
  includeFontPadding: DROP,
  textDecorationColor: DROP,
  textDecorationStyle: DROP,
});

/**
 * Temporary Nitro Views port of `PlainText`, for benchmarking. Supports a subset of
 * PlainText's props, see `specs/NitroPlainText.nitro.ts`.
 *
 * No intrinsic size: Nitro Views have no custom shadow node to measure text, so give
 * it an explicit height (or flex).
 */
export function NitroPlainText(props: NitroPlainTextProps) {
  return <NativeNitroPlainText {...mapNitroPlainTextProps(props)} />;
}

export function mapNitroPlainTextProps({
  children,
  text,
  style,
  ...rest
}: NitroPlainTextProps): NativeProps {
  const nativeProps: Record<string, unknown> = rest;

  const content = text ?? children;
  if (typeof content === 'string') {
    nativeProps.text = content;
  } else if (content != null) {
    nativeProps.text = joinChildren(content);
  }

  const flatStyle = StyleSheet.flatten(style) as Record<string, unknown>;
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
      case COLOR: {
        // PlatformColor/DynamicColorIOS process to objects, which the spec can't take.
        const processed = processColor(value as TextStyle['color']);
        if (typeof processed === 'number') {
          nativeProps[key] = processed;
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

function joinChildren(content: Child | readonly Child[]): string {
  const parts = Array.isArray(content) ? content : [content];
  let result = '';
  for (const part of parts) {
    if (part != null && typeof part !== 'boolean') {
      result += String(part);
    }
  }
  return result;
}

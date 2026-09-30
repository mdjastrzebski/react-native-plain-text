import { StyleSheet, type TextProps, type TextStyle } from 'react-native';
import type { PlainTextOwnProps, PlainTextStyle } from './PlainText';

const FONT_VARIANT_SEPARATORS = /[\s,]+/;

const warnedOnceKeys = new Set<string>();

export function warnOnce(key: string, message: string, ...details: unknown[]): void {
  if (warnedOnceKeys.has(key)) {
    return;
  }
  warnedOnceKeys.add(key);
  console.warn(message, ...details);
}

// JSX never joins children: `{n} items` arrives as `[n, ' items']`. Joins them the
// way RN <Text> renders them; undefined for an element or a nested array.
export function joinTextChildren(children: unknown): string | undefined {
  if (typeof children === 'string') return children;
  if (typeof children === 'number' || typeof children === 'bigint') return String(children);
  if (!Array.isArray(children)) return undefined;

  let text = '';
  for (const child of children) {
    if (typeof child === 'string' || typeof child === 'number' || typeof child === 'bigint') {
      text += child;
    } else if (child != null && typeof child !== 'boolean') {
      return undefined;
    }
  }
  return text;
}

// RN accepts fontVariant as either an array or a CSS-style string, while the native
// prop only takes the array.
export function normalizeFontVariant(
  fontVariant: TextStyle['fontVariant']
): readonly string[] | undefined {
  if (typeof fontVariant !== 'string') {
    return fontVariant;
  }

  const variants = fontVariant
    .split(FONT_VARIANT_SEPARATORS)
    .filter((variant) => variant.length > 0);
  return variants.length > 0 ? variants : undefined;
}

// For children `joinTextChildren` rejects. A lone boolean renders nothing in RN <Text>
// either, so only an element or a nested array warns.
export function warnOnUnsupportedChildren(children: unknown): void {
  if (typeof children === 'object') {
    warnOnce(
      'PlainText.unsupportedChildren',
      'PlainText: children must be a string, number or bigint, ' +
        'or a flat array of those, null and booleans. Use RN <Text> or the unified <Text> ' +
        'instead. Received unsupported value:',
      children
    );
  }
}

export function warnOnUnsupportedProp(props: TextProps): void {
  const propName = findUnsupportedProp(props);
  if (propName != null) {
    warnOnce(
      `Text.unsupportedProp.${propName}`,
      `PlainText: unified <Text> rendered <PlainText>, which ignores \`${propName}\`. ` +
        `Remove \`mode="fast"\` to render RN <Text> instead. Props:`,
      props
    );
  }
}

// RN <Text> props that change behavior PlainText can't reproduce. The unified Text
// falls back to RN <Text> for them in `compat` mode and warns in `fast` mode. Props that only
// matter alongside one of these (selectionColor, disabled, suppressHighlighting,
// minimumFontScale, pressRetentionOffset) aren't listed.
// SYNC: every RN <Text> prop missing from NativeProps belongs here — see
// docs/contributing/sync-points.md#set-16--rn-text-props-plaintext-cant-honor.
export function findUnsupportedProp(props: TextProps): string | undefined {
  if (props.onPress != null) return 'onPress';
  if (props.onLongPress != null) return 'onLongPress';
  if (props.onPressIn != null) return 'onPressIn';
  if (props.onPressOut != null) return 'onPressOut';
  if (props.onTextLayout != null) return 'onTextLayout';
  if (props.selectable) return 'selectable';
  if (props.adjustsFontSizeToFit) return 'adjustsFontSizeToFit';
  if (props.dataDetectorType != null) return 'dataDetectorType';
  if (props.dynamicTypeRamp != null) return 'dynamicTypeRamp';

  return undefined;
}

export function warnOnPlainTextOnlyProp(props: PlainTextOwnProps, reason: string): void {
  const plainTextOnlyProp = findPlainTextOnlyProp(props);
  if (plainTextOnlyProp != null) {
    warnOnce(
      `Text.plainTextOnlyProp.${plainTextOnlyProp}.${reason}`,
      `PlainText: unified <Text> rendered RN <Text> because ${reason}, ` +
        `and RN <Text> does not support \`${plainTextOnlyProp}\`. Props:`,
      props
    );
  }
}

// PlainText props RN <Text> drops on fallback. `text` isn't listed: Text passes it
// to RN <Text> as children.
// SYNC: covers every PlainTextOwnProps (PlainText.tsx) key RN <Text> drops — see
// docs/contributing/sync-points.md#set-17--plaintext-props-rn-text-drops.
function findPlainTextOnlyProp(props: PlainTextOwnProps): string | undefined {
  // hyphens="none" and a false compat flag match RN <Text>'s behavior, so no warning.
  if (props.hyphens != null && props.hyphens !== 'none') return 'hyphens';
  if (props.lang != null) return 'lang';
  if (props.unstable_lineHeightClippingCompat) return 'unstable_lineHeightClippingCompat';

  const flatStyle = StyleSheet.flatten(props.style) as PlainTextStyle | undefined;
  if (flatStyle?.fontVariationSettings != null) return 'style.fontVariationSettings';

  return undefined;
}

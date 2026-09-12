import type { TextStyle } from 'react-native';

const FONT_VARIANT_SEPARATORS = /[\s,]+/;

const warnedOnceKeys = new Set<string>();

export function warnOnce(key: string, message: string): void {
  if (warnedOnceKeys.has(key)) {
    return;
  }
  warnedOnceKeys.add(key);
  console.warn(message);
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

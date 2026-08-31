// Internal state read by PlainText.tsx on every render and forwarded
// as a hidden native prop (lineHeightClippingIos in PlainTextViewNativeComponent.ts),
// so it rides the existing Fabric props diff instead of needing its own native
// module/bridge for a single flag.
export type TextCompatConfig = {
  // Reverts to matching RN <Text>'s current ascent-clipping bug (RN#29507)
  // when lineHeight is tighter than the font's natural line height, instead
  // of PlainText's fix for it (RNPlainText.mm, RN#46884's centering
  // algorithm). iOS only: Android's TextView never had this bug.
  lineHeightClippingIos?: boolean;
};

let compatConfig: Required<TextCompatConfig> = {
  lineHeightClippingIos: false,
};

// Unstable: shape and defaults may change without a major version bump.
// For apps migrating from RN <Text> that want to preserve its exact
// rendering for a known difference, rather than adopt PlainText's fix
// immediately.
export function unstable_configureTextCompat(config: TextCompatConfig): void {
  compatConfig = { ...compatConfig, ...config };
}

export function getTextCompatConfig(): Readonly<TextCompatConfig> {
  return compatConfig;
}

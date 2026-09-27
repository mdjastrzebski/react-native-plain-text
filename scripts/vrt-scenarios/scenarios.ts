import { getVrtExamples } from '../../example/src/vrt/examples';

export const VRT_PLATFORMS = ['ios', 'android'] as const;
export type VrtPlatform = (typeof VRT_PLATFORMS)[number];

// Specimens that groups.tsx renders but no scenario captures, so nothing
// compares them. Adding to this list is how a coverage gap becomes invisible:
// prefer letting the specimen become a scenario and reviewing its baseline.
// Paying a gap off means deleting its entry here.
export const SKIPPED_SCENARIOS: Record<VrtPlatform, string[]> = {
  android: [
    'vrt-features-text-break-strategy-simple',
    'vrt-features-text-break-strategy-highquality',
    'vrt-features-text-break-strategy-balanced',
    'vrt-features-text-shadow-offset-only',
    'vrt-features-text-shadow-blurred',
    'vrt-features-text-shadow-colored',
    'vrt-features-text-shadow-radius-only-no-ios-shadow',
    'vrt-features-text-align-vertical-top',
    'vrt-features-text-align-vertical-center',
    'vrt-features-text-align-vertical-bottom',
    'vrt-features-vertical-align-overrides-text-align-vertical',
  ],
  ios: [
    'vrt-features-writing-direction-ltr',
    'vrt-features-writing-direction-rtl',
    'vrt-features-line-break-strategy-none',
    'vrt-features-line-break-strategy-push-out',
    'vrt-features-line-break-strategy-standard',
    'vrt-features-line-break-strategy-korean-none',
    'vrt-features-line-break-strategy-hangul-word',
    'vrt-features-text-shadow-offset-only',
    'vrt-features-text-shadow-blurred',
    'vrt-features-text-shadow-colored',
    'vrt-features-text-shadow-radius-only-no-ios-shadow',
    'vrt-features-text-align-vertical-top',
    'vrt-features-text-align-vertical-center',
    'vrt-features-text-align-vertical-bottom',
    'vrt-features-vertical-align-overrides-text-align-vertical',
  ],
};

// Every specimen the VRT app renders on `platform`, in render order, minus the
// skipped ones above. These are the scenarios: capture-vrt.sh opens each ID and
// compare-vrt.sh requires exactly these images on both sides.
export function getVrtScenarioIDs(platform: VrtPlatform): string[] {
  const skipped = new Set(SKIPPED_SCENARIOS[platform]);
  return getVrtExamples(platform)
    .map(({ testID }) => testID)
    .filter((testID) => !skipped.has(testID));
}

import { getVrtExamples } from '../../example/src/vrt/examples';

export const VRT_PLATFORMS = ['ios', 'android'] as const;
export type VrtPlatform = (typeof VRT_PLATFORMS)[number];

// Every specimen the VRT app renders on `platform`, in render order. These are
// the scenarios: capture-vrt.sh opens each ID and compare-vrt.sh requires exactly
// these images on both sides. To leave a specimen out, remove it from groups.tsx.
export function getVrtScenarioIDs(platform: VrtPlatform): string[] {
  return getVrtExamples(platform).map(({ testID }) => testID);
}

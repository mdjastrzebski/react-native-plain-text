import { getVrtScenarios } from '../../example/src/vrt/scenarios';
import type { VrtSuite } from '../../example/src/vrt/utils';

export { VRT_SUITES, type VrtSuite } from '../../example/src/vrt/utils';
export const VRT_PLATFORMS = ['ios', 'android'] as const;
export type VrtPlatform = (typeof VRT_PLATFORMS)[number];

// Every specimen the VRT app renders on `platform` in `suite`, in render order.
// These are the scenarios: capture-vrt.sh opens each ID and compare-vrt.sh
// requires exactly these images on both sides. To leave a specimen out, remove
// it from groups.tsx.
export function getVrtScenarioIDs(platform: VrtPlatform, suite: VrtSuite): string[] {
  return getVrtScenarios(platform)
    .filter((scenario) => scenario.suite === suite)
    .map(({ testID }) => testID);
}

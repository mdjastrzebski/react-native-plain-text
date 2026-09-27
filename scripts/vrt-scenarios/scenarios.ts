import { getVrtScenarios } from '../../example/src/vrt/scenarios';
import type { VrtSuite } from '../../example/src/vrt/utils';

export { VRT_SUITES, type VrtSuite } from '../../example/src/vrt/utils';
export const VRT_PLATFORMS = ['ios', 'android'] as const;
export type VrtPlatform = (typeof VRT_PLATFORMS)[number];

// Every specimen the VRT app renders on `platform` in `suite`, in render order:
// the IDs capture-vrt.sh opens and compare-vrt.sh requires images for.
export function getVrtScenarioIDs(platform: VrtPlatform, suite: VrtSuite): string[] {
  return getVrtScenarios(platform)
    .filter((scenario) => scenario.suite === suite)
    .map(({ testID }) => testID);
}

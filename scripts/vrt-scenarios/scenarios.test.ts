import { expect, it } from '@jest/globals';
import { VRT_PLATFORMS } from './scenarios';
import { loadVrtScenarios } from './loadScenarios';

// Mirrors the acceptance rules in scripts/compare-vrt.sh. Failing here costs
// seconds instead of a VRT run.
it.each(VRT_PLATFORMS)('%s scenario IDs are well-formed', (platform) => {
  const { scenarioIDs } = loadVrtScenarios(platform);
  expect(scenarioIDs.filter((id) => !/^vrt-[a-z0-9-]+$/.test(id))).toEqual([]);
});

it.each(VRT_PLATFORMS)('%s scenario IDs are unique', (platform) => {
  const { scenarioIDs } = loadVrtScenarios(platform);
  expect(scenarioIDs.filter((id, index) => scenarioIDs.indexOf(id) !== index)).toEqual([]);
});

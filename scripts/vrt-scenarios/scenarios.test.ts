import { expect, it } from '@jest/globals';
import { VRT_PLATFORMS, VRT_SUITES } from './scenarios';
import { loadVrtScenarios } from './loadScenarios';

const cases = VRT_PLATFORMS.flatMap((platform) =>
  VRT_SUITES.map((suite) => [platform, suite] as const)
);

// Mirrors the acceptance rules in scripts/compare-vrt.sh. Failing here costs
// seconds instead of a VRT run.
it.each(cases)('%s %s scenario IDs are well-formed', (platform, suite) => {
  const { scenarioIDs } = loadVrtScenarios(platform, suite);
  expect(scenarioIDs.filter((id) => !/^vrt-[a-z0-9-]+$/.test(id))).toEqual([]);
});

it.each(cases)('%s %s has scenarios', (platform, suite) => {
  expect(loadVrtScenarios(platform, suite).scenarioIDs.length).toBeGreaterThan(0);
});

// Across suites too: the VRT app finds a specimen by its ID alone.
it.each(VRT_PLATFORMS)('%s rendered IDs are unique', (platform) => {
  const { renderedIDs } = loadVrtScenarios(platform, 'default');
  expect(renderedIDs.filter((id, index) => renderedIDs.indexOf(id) !== index)).toEqual([]);
});

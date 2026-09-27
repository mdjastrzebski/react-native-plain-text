import { expect, it } from '@jest/globals';
import { SKIPPED_SCENARIOS, VRT_PLATFORMS } from './scenarios';
import { loadVrtScenarios } from './loadScenarios';

// Mirrors the acceptance rules in scripts/compare-vrt.sh. Failing here costs
// seconds instead of a VRT run.
it.each(VRT_PLATFORMS)('%s scenario IDs are well-formed', (platform) => {
  const { scenarioIDs } = loadVrtScenarios(platform);
  expect(scenarioIDs.filter((id) => !/^vrt-capture-[a-z0-9-]+$/.test(id))).toEqual([]);
});

it.each(VRT_PLATFORMS)('%s scenario IDs are unique', (platform) => {
  const { scenarioIDs } = loadVrtScenarios(platform);
  expect(scenarioIDs.filter((id, index) => scenarioIDs.indexOf(id) !== index)).toEqual([]);
});

// A skipped entry whose specimen was renamed or removed would silently stop meaning
// anything, and a renamed specimen would then be captured without anyone noticing.
it.each(VRT_PLATFORMS)('%s skipped scenarios name specimens that are rendered', (platform) => {
  const { renderedIDs } = loadVrtScenarios(platform);
  const rendered = new Set(renderedIDs);
  expect(SKIPPED_SCENARIOS[platform].filter((id) => !rendered.has(id))).toEqual([]);
});

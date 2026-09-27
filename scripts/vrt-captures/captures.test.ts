import { expect, it } from '@jest/globals';
import { UNCAPTURED_SPECIMENS, VRT_PLATFORMS } from './captures';
import { loadVrtCaptures } from './loadCaptures';

// Mirrors the acceptance rules in scripts/compare-vrt.sh. Failing here costs
// seconds instead of a VRT run.
it.each(VRT_PLATFORMS)('%s capture IDs are well-formed', (platform) => {
  const { captureIDs } = loadVrtCaptures(platform);
  expect(captureIDs.filter((id) => !/^vrt-capture-[a-z0-9-]+$/.test(id))).toEqual([]);
});

it.each(VRT_PLATFORMS)('%s capture IDs are unique', (platform) => {
  const { captureIDs } = loadVrtCaptures(platform);
  expect(captureIDs.filter((id, index) => captureIDs.indexOf(id) !== index)).toEqual([]);
});

// A gap entry whose specimen was renamed or removed would silently stop meaning
// anything, and a renamed specimen would then be captured without anyone noticing.
it.each(VRT_PLATFORMS)('%s known gaps name specimens that are rendered', (platform) => {
  const { renderedIDs } = loadVrtCaptures(platform);
  const rendered = new Set(renderedIDs);
  expect(UNCAPTURED_SPECIMENS[platform].filter((id) => !rendered.has(id))).toEqual([]);
});

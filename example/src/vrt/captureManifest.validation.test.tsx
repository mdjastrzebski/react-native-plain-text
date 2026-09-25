import fs from 'node:fs';
import path from 'node:path';
import { expect, it, jest } from '@jest/globals';

const captureIdPattern = /^vrt-capture-[a-z0-9-]+$/;
const manifestPlatforms = ['all', 'android', 'ios'];
const platforms = ['ios', 'android'] as const;

const manifestLines = fs
  .readFileSync(path.join(__dirname, '../../../.agent-device/vrt-captures.txt'), 'utf8')
  .split('\n');

type Capture = { platform: string; id: string };

// Specimens that groups.tsx renders but no capture covers, so nothing compares
// them. Adding to this list is how a coverage gap becomes invisible: prefer a
// manifest line plus a reviewed baseline. The check below requires equality, so
// paying a gap off means deleting the entry here.
const specimensWithoutCaptures: Record<(typeof platforms)[number], string[]> = {
  android: [
    'vrt-capture-features-text-break-strategy-simple',
    'vrt-capture-features-text-break-strategy-highquality',
    'vrt-capture-features-text-break-strategy-balanced',
    'vrt-capture-features-text-shadow-offset-only',
    'vrt-capture-features-text-shadow-blurred',
    'vrt-capture-features-text-shadow-colored',
    'vrt-capture-features-text-shadow-radius-only-no-ios-shadow',
    'vrt-capture-features-text-align-vertical-top',
    'vrt-capture-features-text-align-vertical-center',
    'vrt-capture-features-text-align-vertical-bottom',
    'vrt-capture-features-vertical-align-overrides-text-align-vertical',
  ],
  ios: [
    'vrt-capture-features-writing-direction-ltr',
    'vrt-capture-features-writing-direction-rtl',
    'vrt-capture-features-line-break-strategy-none',
    'vrt-capture-features-line-break-strategy-push-out',
    'vrt-capture-features-line-break-strategy-standard',
    'vrt-capture-features-line-break-strategy-korean-none',
    'vrt-capture-features-line-break-strategy-hangul-word',
    'vrt-capture-features-text-shadow-offset-only',
    'vrt-capture-features-text-shadow-blurred',
    'vrt-capture-features-text-shadow-colored',
    'vrt-capture-features-text-shadow-radius-only-no-ios-shadow',
    'vrt-capture-features-text-align-vertical-top',
    'vrt-capture-features-text-align-vertical-center',
    'vrt-capture-features-text-align-vertical-bottom',
    'vrt-capture-features-vertical-align-overrides-text-align-vertical',
  ],
};

// Mirrors the acceptance rules in scripts/compare-vrt.sh: one platform and one
// capture ID per line. Failing here costs seconds instead of a VRT run.
function parseManifest() {
  const captures: Capture[] = [];
  const invalid: string[] = [];

  manifestLines.forEach((raw, index) => {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) return;

    const fields = line.split(/\s+/);
    const platform = fields[0] ?? '';
    const id = fields[1] ?? '';
    if (
      fields.length !== 2 ||
      !manifestPlatforms.includes(platform) ||
      !captureIdPattern.test(id)
    ) {
      invalid.push(`line ${index + 1}: "${raw}"`);
      return;
    }
    captures.push({ platform, id });
  });

  return { captures, invalid };
}

function manifestIDs(captures: Capture[], platform: (typeof platforms)[number]) {
  return captures
    .filter(({ platform: entryPlatform }) => entryPlatform === 'all' || entryPlatform === platform)
    .map(({ id }) => id);
}

function loadRenderedIDs(platform: (typeof platforms)[number]): string[] {
  jest.resetModules();
  jest.doMock('react-native-plain-text', () => ({ PlainText: 'PlainText' }), {
    virtual: true,
  });
  jest.doMock('react-native', () => ({
    Platform: {
      OS: platform,
      select: <T,>(options: { ios?: T; android?: T; native?: T; default?: T }) =>
        options[platform] ?? options.native ?? options.default,
    },
    StyleSheet: {
      create: <T,>(styles: T) => styles,
    },
    Text: 'Text',
    View: 'View',
  }));

  const { getVrtExamples } = require('./examples') as typeof import('./examples');

  return getVrtExamples(platform).map(({ testID }) => testID);
}

const { captures: manifestCaptures, invalid: invalidManifestLines } = parseManifest();

it('manifest contains only well-formed capture entries', () => {
  expect(invalidManifestLines).toEqual([]);
});

it.each(platforms)('%s capture IDs are not duplicated in the manifest', (platform) => {
  const ids = manifestIDs(manifestCaptures, platform);
  expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
});

it.each(platforms)('%s capture IDs exist in the VRT groups', (platform) => {
  const renderedIDs = new Set(loadRenderedIDs(platform));
  const missingIDs = manifestIDs(manifestCaptures, platform).filter(
    (testID) => !renderedIDs.has(testID)
  );

  expect(missingIDs).toEqual([]);
});

// Without this a specimen can be added to groups.tsx and never be captured,
// which only shows up as a missing baseline forty minutes into a VRT run.
it.each(platforms)('%s VRT specimens are either captured or known gaps', (platform) => {
  const capturedIDs = new Set(manifestIDs(manifestCaptures, platform));
  const uncapturedIDs = loadRenderedIDs(platform).filter((testID) => !capturedIDs.has(testID));

  expect(uncapturedIDs.sort()).toEqual([...specimensWithoutCaptures[platform]].sort());
});

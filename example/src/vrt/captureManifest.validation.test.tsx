import fs from 'node:fs';
import path from 'node:path';
import { expect, it, jest } from '@jest/globals';

const featureCaptures = fs
  .readFileSync(path.join(__dirname, '../../../.agent-device/vrt-captures.txt'), 'utf8')
  .split('# use-cases')[0]!;

function manifestFeatureIDs(platform: 'ios' | 'android') {
  return featureCaptures
    .split('\n')
    .filter((line) => line.startsWith('all ') || line.startsWith(`${platform} `))
    .map((line) => line.split(' ')[1]!);
}

function loadRenderedFeatureIDs(platform: 'ios' | 'android') {
  jest.resetModules();
  jest.doMock('react-native-plain-text', () => ({ PlainText: 'PlainText' }));
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

it.each(['ios', 'android'] as const)(
  '%s feature capture IDs exist in the VRT groups',
  (platform) => {
    const renderedIDs = new Set(loadRenderedFeatureIDs(platform));
    const missingIDs = manifestFeatureIDs(platform).filter((testID) => !renderedIDs.has(testID));

    expect(missingIDs).toEqual([]);
  }
);

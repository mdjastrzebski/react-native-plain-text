import fs from 'node:fs';
import path from 'node:path';
import { expect, it, jest } from '@jest/globals';

const captures = fs
  .readFileSync(path.join(__dirname, '../../../.agent-device/vrt-captures.txt'), 'utf8')
  .split('\n');

function manifestIDs(platform: 'ios' | 'android') {
  return captures
    .filter((line) => line.startsWith('all ') || line.startsWith(`${platform} `))
    .map((line) => line.split(' ')[1]!);
}

function loadRenderedIDs(platform: 'ios' | 'android') {
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

it.each(['ios', 'android'] as const)('%s capture IDs exist in the VRT groups', (platform) => {
  const renderedIDs = new Set(loadRenderedIDs(platform));
  const missingIDs = manifestIDs(platform).filter((testID) => !renderedIDs.has(testID));

  expect(missingIDs).toEqual([]);
});

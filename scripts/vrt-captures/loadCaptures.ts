import { jest } from '@jest/globals';
import type { VrtPlatform } from './captures';

// Loads the VRT groups as `platform` would render them. Only runs under Jest:
// groups.tsx imports react-native, which is stubbed here down to what the groups
// read at module scope, with `Platform.OS` pinned to the requested platform.
export function loadVrtCaptures(platform: VrtPlatform) {
  jest.resetModules();
  jest.doMock('react-native-plain-text', () => ({ PlainText: 'PlainText' }));
  jest.doMock('react-native', () => ({
    Platform: {
      OS: platform,
      select: <T>(options: { ios?: T; android?: T; native?: T; default?: T }) =>
        options[platform] ?? options.native ?? options.default,
    },
    StyleSheet: {
      create: <T>(styles: T) => styles,
    },
    Text: 'Text',
    View: 'View',
  }));

  const { getVrtCaptureIDs } = require('./captures') as typeof import('./captures');
  const { getVrtExamples } =
    require('../../example/src/vrt/examples') as typeof import('../../example/src/vrt/examples');

  return {
    captureIDs: getVrtCaptureIDs(platform),
    renderedIDs: getVrtExamples(platform).map(({ testID }) => testID),
  };
}

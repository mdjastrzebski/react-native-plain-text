import { expect, it } from '@jest/globals';
import * as publicApi from '..';
import PlainTextViewNativeComponent from '../PlainTextViewNativeComponent';

it('exposes the documented public surface', () => {
  expect(Object.keys(publicApi).sort()).toEqual([
    'PlainText',
    'Text',
    'unstable_NativePlainText',
    'unstable_mapTextProps',
  ]);
});

it('re-exports unstable_NativePlainText as the bare codegen component', () => {
  expect(publicApi.unstable_NativePlainText).toBe(PlainTextViewNativeComponent);
});

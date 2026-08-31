import { expect, it } from '@jest/globals';
import * as publicApi from '..';
import PlainTextViewNativeComponent from '../PlainTextViewNativeComponent';
import { unstable_configureTextCompat } from '../compat';

it('exposes the documented public surface', () => {
  expect(Object.keys(publicApi).sort()).toEqual([
    'PlainText',
    'unstable_NativePlainText',
    'unstable_configureTextCompat',
  ]);
});

it('re-exports unstable_NativePlainText as the bare codegen component', () => {
  expect(publicApi.unstable_NativePlainText).toBe(PlainTextViewNativeComponent);
});

it('re-exports unstable_configureTextCompat from compat', () => {
  expect(publicApi.unstable_configureTextCompat).toBe(unstable_configureTextCompat);
});

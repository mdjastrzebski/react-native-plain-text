import { expect, it } from '@jest/globals';
import { unstable_NativePlainText, unstable_mapPlainTextProps } from '..';

it('maps PlainText props to native component props', () => {
  expect(unstable_NativePlainText).toBeDefined();

  const nativeProps = unstable_mapPlainTextProps({
    accessibilityLabel: 'Greeting',
    children: 'Hello',
    numberOfLines: 2,
    style: {
      fontVariant: 'small-caps, tabular-nums',
      fontWeight: 600,
      letterSpacing: 0,
      padding: 4,
      textShadowOffset: { width: 1, height: 2 },
      verticalAlign: 'middle',
    },
  });

  expect(nativeProps).toMatchObject({
    accessibilityLabel: 'Greeting',
    fontVariant: ['small-caps', 'tabular-nums'],
    fontWeight: '600',
    hasLetterSpacing: true,
    hasTextShadow: true,
    letterSpacing: 0,
    lineHeightClippingIos: false,
    numberOfLines: 2,
    style: { padding: 4 },
    text: 'Hello',
    textAlignVertical: 'center',
    textShadowOffsetHeight: 2,
    textShadowOffsetWidth: 1,
  });
});

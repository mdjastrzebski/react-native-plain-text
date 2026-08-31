import { afterEach, describe, expect, it } from '@jest/globals';
import type { TextStyle } from 'react-native';
import {
  unstable_NativePlainText,
  unstable_configureTextCompat,
  unstable_mapPlainTextProps,
} from '..';

afterEach(() => {
  // unstable_configureTextCompat mutates module-level state; restore the default.
  unstable_configureTextCompat({ lineHeightClippingIos: false });
});

it('exposes the unstable native component', () => {
  expect(unstable_NativePlainText).toBeDefined();
});

it('maps PlainText props to native component props', () => {
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

describe('unstable_mapPlainTextProps', () => {
  it('maps children to text', () => {
    expect(unstable_mapPlainTextProps({ children: 'Hello' }).text).toBe('Hello');
    expect(unstable_mapPlainTextProps({}).text).toBeUndefined();
  });

  it('forwards non-style props unchanged', () => {
    expect(
      unstable_mapPlainTextProps({
        numberOfLines: 3,
        ellipsizeMode: 'middle',
        allowFontScaling: false,
        maxFontSizeMultiplier: 1.4,
      })
    ).toMatchObject({
      numberOfLines: 3,
      ellipsizeMode: 'middle',
      allowFontScaling: false,
      maxFontSizeMultiplier: 1.4,
    });
  });

  it('forwards plain text-style props unchanged', () => {
    const nativeProps = unstable_mapPlainTextProps({
      style: {
        color: '#f00',
        fontSize: 18,
        fontFamily: 'Georgia',
        fontStyle: 'italic',
        fontVariationSettings: "'wght' 700",
        textAlign: 'center',
        textDecorationLine: 'underline',
        textTransform: 'uppercase',
        lineHeight: 24,
        letterSpacing: 1.5,
        includeFontPadding: false,
        textShadowColor: '#00f',
        textShadowRadius: 3,
      },
    });

    expect(nativeProps).toMatchObject({
      color: '#f00',
      fontSize: 18,
      fontFamily: 'Georgia',
      fontStyle: 'italic',
      fontVariationSettings: "'wght' 700",
      textAlign: 'center',
      textDecorationLine: 'underline',
      textTransform: 'uppercase',
      lineHeight: 24,
      letterSpacing: 1.5,
      includeFontPadding: false,
      textShadowColor: '#00f',
      textShadowRadius: 3,
    });
  });

  describe('fontWeight', () => {
    it('stringifies a numeric weight', () => {
      expect(unstable_mapPlainTextProps({ style: { fontWeight: 600 } }).fontWeight).toBe('600');
    });

    it('passes a string weight through', () => {
      expect(unstable_mapPlainTextProps({ style: { fontWeight: 'bold' } }).fontWeight).toBe('bold');
    });

    it('is undefined when unset', () => {
      expect(unstable_mapPlainTextProps({}).fontWeight).toBeUndefined();
    });
  });

  describe('fontVariant', () => {
    it('splits a comma-separated string', () => {
      expect(
        unstable_mapPlainTextProps({ style: { fontVariant: 'small-caps, tabular-nums' } })
          .fontVariant
      ).toEqual(['small-caps', 'tabular-nums']);
    });

    it('splits a space-separated string', () => {
      expect(
        unstable_mapPlainTextProps({ style: { fontVariant: 'small-caps tabular-nums' } })
          .fontVariant
      ).toEqual(['small-caps', 'tabular-nums']);
    });

    it('collapses mixed and repeated separators and trims edges', () => {
      expect(
        unstable_mapPlainTextProps({ style: { fontVariant: ' small-caps ,, tabular-nums ' } })
          .fontVariant
      ).toEqual(['small-caps', 'tabular-nums']);
    });

    it('maps a separator-only string to undefined', () => {
      expect(
        unstable_mapPlainTextProps({ style: { fontVariant: '  ' } }).fontVariant
      ).toBeUndefined();
    });

    it('passes an array through by reference (no copy)', () => {
      const fontVariant: TextStyle['fontVariant'] = ['small-caps', 'tabular-nums'];
      expect(unstable_mapPlainTextProps({ style: { fontVariant } }).fontVariant).toBe(fontVariant);
    });

    it('is undefined when unset', () => {
      expect(unstable_mapPlainTextProps({}).fontVariant).toBeUndefined();
    });
  });

  describe('textAlignVertical / verticalAlign', () => {
    it('passes textAlignVertical through when verticalAlign is unset', () => {
      expect(
        unstable_mapPlainTextProps({ style: { textAlignVertical: 'bottom' } }).textAlignVertical
      ).toBe('bottom');
    });

    it('uses verticalAlign when it is the only one set', () => {
      expect(
        unstable_mapPlainTextProps({ style: { verticalAlign: 'top' } }).textAlignVertical
      ).toBe('top');
    });

    it("maps verticalAlign 'middle' to the native 'center'", () => {
      expect(
        unstable_mapPlainTextProps({ style: { verticalAlign: 'middle' } }).textAlignVertical
      ).toBe('center');
    });

    it('lets verticalAlign win when both are set', () => {
      expect(
        unstable_mapPlainTextProps({
          style: { textAlignVertical: 'bottom', verticalAlign: 'top' },
        }).textAlignVertical
      ).toBe('top');
    });

    it('is undefined when neither is set', () => {
      expect(unstable_mapPlainTextProps({}).textAlignVertical).toBeUndefined();
    });

    it('does not forward verticalAlign through style', () => {
      expect(unstable_mapPlainTextProps({ style: { verticalAlign: 'middle' } }).style).toEqual({});
    });
  });

  describe('text shadow', () => {
    it('splits textShadowOffset into width/height and flags hasTextShadow', () => {
      expect(
        unstable_mapPlainTextProps({ style: { textShadowOffset: { width: 1, height: 2 } } })
      ).toMatchObject({
        textShadowOffsetWidth: 1,
        textShadowOffsetHeight: 2,
        hasTextShadow: true,
      });
    });

    it('treats a zero offset as a shadow (offset present)', () => {
      expect(
        unstable_mapPlainTextProps({ style: { textShadowOffset: { width: 0, height: 0 } } })
      ).toMatchObject({
        textShadowOffsetWidth: 0,
        textShadowOffsetHeight: 0,
        hasTextShadow: true,
      });
    });

    it('reports no shadow when the offset is absent', () => {
      expect(
        unstable_mapPlainTextProps({ style: { textShadowColor: '#000', textShadowRadius: 4 } })
      ).toMatchObject({
        textShadowOffsetWidth: undefined,
        textShadowOffsetHeight: undefined,
        hasTextShadow: false,
        textShadowColor: '#000',
        textShadowRadius: 4,
      });
    });
  });

  describe('letterSpacing', () => {
    it('flags hasLetterSpacing and forwards the value when set, including 0', () => {
      expect(unstable_mapPlainTextProps({ style: { letterSpacing: 0 } })).toMatchObject({
        letterSpacing: 0,
        hasLetterSpacing: true,
      });
      expect(unstable_mapPlainTextProps({ style: { letterSpacing: 2 } })).toMatchObject({
        letterSpacing: 2,
        hasLetterSpacing: true,
      });
    });

    it('reports hasLetterSpacing false when unset', () => {
      expect(unstable_mapPlainTextProps({})).toMatchObject({
        letterSpacing: undefined,
        hasLetterSpacing: false,
      });
    });
  });

  describe('lineHeightClippingIos', () => {
    it('defaults to the global compat config', () => {
      expect(unstable_mapPlainTextProps({}).lineHeightClippingIos).toBe(false);

      unstable_configureTextCompat({ lineHeightClippingIos: true });
      expect(unstable_mapPlainTextProps({}).lineHeightClippingIos).toBe(true);
    });

    it('lets the per-instance prop override the global config', () => {
      unstable_configureTextCompat({ lineHeightClippingIos: true });
      expect(
        unstable_mapPlainTextProps({ unstable_lineHeightClippingIos: false }).lineHeightClippingIos
      ).toBe(false);

      unstable_configureTextCompat({ lineHeightClippingIos: false });
      expect(
        unstable_mapPlainTextProps({ unstable_lineHeightClippingIos: true }).lineHeightClippingIos
      ).toBe(true);
    });
  });

  describe('style splitting', () => {
    it('pulls text-style keys out and keeps layout styles in style', () => {
      const nativeProps = unstable_mapPlainTextProps({
        style: {
          color: 'red',
          fontSize: 12,
          padding: 4,
          margin: 8,
          flex: 1,
          backgroundColor: 'blue',
        },
      });

      expect(nativeProps.color).toBe('red');
      expect(nativeProps.fontSize).toBe(12);
      expect(nativeProps.style).toEqual({
        padding: 4,
        margin: 8,
        flex: 1,
        backgroundColor: 'blue',
      });
    });

    it('flattens an array style (last value wins)', () => {
      const nativeProps = unstable_mapPlainTextProps({
        style: [
          { fontSize: 10, padding: 1 },
          { fontSize: 20, margin: 2 },
        ],
      });

      expect(nativeProps.fontSize).toBe(20);
      expect(nativeProps.style).toEqual({ padding: 1, margin: 2 });
    });

    it('defaults to an empty style object when no style is given', () => {
      expect(unstable_mapPlainTextProps({}).style).toEqual({});
    });
  });

  describe('pass-through of remaining props', () => {
    it('forwards accessibility and identifier props', () => {
      expect(
        unstable_mapPlainTextProps({
          accessibilityLabel: 'Greeting',
          accessibilityRole: 'header',
          accessibilityState: { disabled: true },
          testID: 'greeting',
          nativeID: 'greeting-native',
          id: 'greeting-id',
        })
      ).toMatchObject({
        accessibilityLabel: 'Greeting',
        accessibilityRole: 'header',
        accessibilityState: { disabled: true },
        testID: 'greeting',
        nativeID: 'greeting-native',
        id: 'greeting-id',
      });
    });

    it('does not leak consumed props into the output', () => {
      const nativeProps = unstable_mapPlainTextProps({
        children: 'x',
        unstable_lineHeightClippingIos: true,
        style: { fontSize: 10 },
      });

      expect(nativeProps).not.toHaveProperty('children');
      expect(nativeProps).not.toHaveProperty('unstable_lineHeightClippingIos');
      expect(nativeProps.style).toEqual({});
    });
  });
});

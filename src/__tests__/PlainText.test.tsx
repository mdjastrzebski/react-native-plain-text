import { describe, expect, it, jest } from '@jest/globals';
import { createRef, type ComponentRef } from 'react';
import type { TextStyle } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import {
  PlainText,
  mapPlainTextProps,
  type PlainTextOwnProps,
  type PlainTextProps,
} from '../PlainText';
import PlainTextViewNativeComponent, { type NativeProps } from '../PlainTextViewNativeComponent';

it('maps PlainText props to native component props', () => {
  const nativeProps = mapPlainTextProps({
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
    letterSpacing: 0,
    numberOfLines: 2,
    style: { padding: 4 },
    text: 'Hello',
    verticalAlign: 'middle',
    textShadowOffsetHeight: 2,
    textShadowOffsetWidth: 1,
  });
});

describe('<PlainText />', () => {
  it('renders the native component with the mapped native props', async () => {
    await render(
      <PlainText numberOfLines={2} style={{ fontSize: 12, padding: 4 }}>
        Hello
      </PlainText>
    );

    // `text` and `fontSize` are native-only props produced by the mapper;
    // seeing them on the host element means the wrapper ran end to end.
    expect(screen.root).toHaveProp('text', 'Hello');
    expect(screen.root).toHaveProp('fontSize', 12);
    expect(screen.root).toHaveProp('numberOfLines', 2);
    // Text-style keys are pulled out of `style`; layout keys stay behind.
    expect(screen.root).toHaveProp('style', { padding: 4 });

    expect(screen.toJSON()).toMatchInlineSnapshot(`
<RNPlainText
  fontSize={12}
  numberOfLines={2}
  style={
    {
      "padding": 4,
    }
  }
  text="Hello"
/>
`);
  });

  it('renders with the text prop', async () => {
    await render(<PlainText text="Hello" />);

    expect(screen.root).toHaveProp('text', 'Hello');
  });

  describe('interpolated children', () => {
    const n = 3;

    it('joins JSX interpolation (an array) into one string', async () => {
      const element = <PlainText>{n} items</PlainText>;

      // JSX never concatenates: each `{expr}` and text run is its own child.
      expect(element.props.children).toEqual([3, ' items']);

      await render(element);

      expect(screen.root).toHaveProp('text', '3 items');
      expect(screen.toJSON()).toMatchInlineSnapshot(`
<RNPlainText
  text="3 items"
/>
`);
    });

    it('renders number and bigint children as text', async () => {
      await render(<PlainText>{0}</PlainText>);
      expect(screen.root).toHaveProp('text', '0');

      await render(<PlainText>{3n} items</PlainText>);
      expect(screen.root).toHaveProp('text', '3 items');
    });

    it('skips null and boolean children, like RN <Text>', async () => {
      const isNew = false;
      await render(
        <PlainText>
          {n} items{null}
          {isNew && ' (new)'}
        </PlainText>
      );

      expect(screen.root).toHaveProp('text', '3 items');
    });

    it('renders nothing and warns in dev for element children', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const children = ['Hello ', <PlainText key="world">world</PlainText>];

      // @ts-expect-error elements aren't text children.
      await render(<PlainText>{children}</PlainText>);

      expect(screen.root).not.toHaveProp('text');
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Received unsupported value:'),
        children
      );
      warn.mockRestore();
    });

    it('renders a template literal as a single string', async () => {
      await render(<PlainText>{`${n} items`}</PlainText>);

      expect(screen.root).toHaveProp('text', '3 items');
      expect(screen.toJSON()).toMatchInlineSnapshot(`
<RNPlainText
  text="3 items"
/>
`);
    });
  });

  it('forwards ref to the underlying native view', async () => {
    const ref = createRef<ComponentRef<typeof PlainTextViewNativeComponent>>();

    await render(<PlainText ref={ref}>Hello</PlainText>);

    expect(ref.current).not.toBeNull();
  });

  // Type-level only: `tsc` fails if any of these lines compiles.
  it('rejects RN <Text> props it cannot honor', () => {
    const elements = [
      // @ts-expect-error `onPress` is unsupported.
      <PlainText onPress={() => {}}>Hello</PlainText>,
      // @ts-expect-error `selectable` is unsupported.
      <PlainText selectable>Hello</PlainText>,
      // @ts-expect-error `selectionColor` only matters with `selectable`.
      <PlainText selectionColor="red">Hello</PlainText>,
      // @ts-expect-error `dynamicTypeRamp` is unsupported.
      <PlainText dynamicTypeRamp="body">Hello</PlainText>,
    ];

    expect(elements).toHaveLength(4);
  });

  // Type-level only: a PlainText prop missing from the native spec would be silently dropped.
  it('forwards every prop to the native view', () => {
    type Unforwarded = Exclude<
      keyof PlainTextProps,
      keyof NativeProps | keyof PlainTextOwnProps | 'children'
    >;
    const allForwarded: [Unforwarded] extends [never] ? true : Unforwarded = true;

    expect(allForwarded).toBe(true);
  });
});

describe('mapPlainTextProps', () => {
  it('maps children to text', () => {
    expect(mapPlainTextProps({ children: 'Hello' }).text).toBe('Hello');
    expect(mapPlainTextProps({}).text).toBeUndefined();
  });

  it('maps the text prop directly', () => {
    expect(mapPlainTextProps({ text: 'Hello' }).text).toBe('Hello');
  });

  it('forwards non-style props unchanged', () => {
    expect(
      mapPlainTextProps({
        numberOfLines: 3,
        ellipsizeMode: 'middle',
        lineBreakStrategyIOS: 'hangul-word',
        allowFontScaling: false,
        maxFontSizeMultiplier: 1.4,
      })
    ).toMatchObject({
      numberOfLines: 3,
      ellipsizeMode: 'middle',
      lineBreakStrategyIOS: 'hangul-word',
      allowFontScaling: false,
      maxFontSizeMultiplier: 1.4,
    });
  });

  it('forwards plain text-style props unchanged', () => {
    const nativeProps = mapPlainTextProps({
      style: {
        color: '#f00',
        fontSize: 18,
        fontFamily: 'Georgia',
        fontStyle: 'italic',
        fontVariationSettings: "'wght' 700",
        textAlign: 'center',
        writingDirection: 'rtl',
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
      writingDirection: 'rtl',
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
      expect(mapPlainTextProps({ style: { fontWeight: 600 } }).fontWeight).toBe('600');
    });

    it('passes a string weight through', () => {
      expect(mapPlainTextProps({ style: { fontWeight: 'bold' } }).fontWeight).toBe('bold');
    });

    it('is undefined when unset', () => {
      expect(mapPlainTextProps({}).fontWeight).toBeUndefined();
    });
  });

  describe('fontVariant', () => {
    it('splits a comma-separated string', () => {
      expect(
        mapPlainTextProps({ style: { fontVariant: 'small-caps, tabular-nums' } }).fontVariant
      ).toEqual(['small-caps', 'tabular-nums']);
    });

    it('splits a space-separated string', () => {
      expect(
        mapPlainTextProps({ style: { fontVariant: 'small-caps tabular-nums' } }).fontVariant
      ).toEqual(['small-caps', 'tabular-nums']);
    });

    it('collapses mixed and repeated separators and trims edges', () => {
      expect(
        mapPlainTextProps({ style: { fontVariant: ' small-caps ,, tabular-nums ' } }).fontVariant
      ).toEqual(['small-caps', 'tabular-nums']);
    });

    it('omits a separator-only string', () => {
      expect(mapPlainTextProps({ style: { fontVariant: ' ,, ' } })).not.toHaveProperty(
        'fontVariant'
      );
    });

    it('passes an array through by reference (no copy)', () => {
      const fontVariant: TextStyle['fontVariant'] = ['small-caps', 'tabular-nums'];
      expect(mapPlainTextProps({ style: { fontVariant } }).fontVariant).toBe(fontVariant);
    });

    it('is undefined when unset', () => {
      expect(mapPlainTextProps({}).fontVariant).toBeUndefined();
    });
  });

  describe('textAlignVertical / verticalAlign', () => {
    // The merge (verticalAlign wins when set, its 'middle' maps to 'center') is
    // native-side now, per docs/contributing/performance.md#prop-cost-policy.
    // JS only has to forward both raw values unmodified; the merge itself is
    // covered by the native tests (PlainTextViewTest.kt / RNPlainTextTests.mm).
    it('passes textAlignVertical through unmodified', () => {
      expect(mapPlainTextProps({ style: { textAlignVertical: 'bottom' } }).textAlignVertical).toBe(
        'bottom'
      );
    });

    it('passes verticalAlign through unmodified', () => {
      expect(mapPlainTextProps({ style: { verticalAlign: 'middle' } }).verticalAlign).toBe(
        'middle'
      );
    });

    it('is undefined when neither is set', () => {
      expect(mapPlainTextProps({}).textAlignVertical).toBeUndefined();
      expect(mapPlainTextProps({}).verticalAlign).toBeUndefined();
    });

    it('does not forward verticalAlign through style', () => {
      expect(mapPlainTextProps({ style: { verticalAlign: 'middle' } }).style).toBeUndefined();
    });
  });

  describe('text shadow', () => {
    it('splits textShadowOffset into width/height', () => {
      expect(
        mapPlainTextProps({ style: { textShadowOffset: { width: 1, height: 2 } } })
      ).toMatchObject({
        textShadowOffsetWidth: 1,
        textShadowOffsetHeight: 2,
      });
    });

    it('keeps a zero offset (present, not dropped to undefined)', () => {
      expect(
        mapPlainTextProps({ style: { textShadowOffset: { width: 0, height: 0 } } })
      ).toMatchObject({
        textShadowOffsetWidth: 0,
        textShadowOffsetHeight: 0,
      });
    });

    it('leaves width/height unset when the offset is absent', () => {
      const nativeProps = mapPlainTextProps({
        style: { textShadowColor: '#000', textShadowRadius: 4 },
      });

      expect(nativeProps).toMatchObject({ textShadowColor: '#000', textShadowRadius: 4 });
      expect(nativeProps).not.toHaveProperty('textShadowOffsetWidth');
      expect(nativeProps).not.toHaveProperty('textShadowOffsetHeight');
    });
  });

  describe('letterSpacing', () => {
    it('forwards the value when set, including 0', () => {
      expect(mapPlainTextProps({ style: { letterSpacing: 0 } })).toMatchObject({
        letterSpacing: 0,
      });
      expect(mapPlainTextProps({ style: { letterSpacing: 2 } })).toMatchObject({
        letterSpacing: 2,
      });
    });

    it('leaves letterSpacing unset when unset', () => {
      expect(mapPlainTextProps({})).not.toHaveProperty('letterSpacing');
    });
  });

  describe('lineHeightClippingCompat', () => {
    it('forwards unstable_lineHeightClippingCompat under the native name', () => {
      expect(
        mapPlainTextProps({ unstable_lineHeightClippingCompat: true }).lineHeightClippingCompat
      ).toBe(true);
      expect(
        mapPlainTextProps({ unstable_lineHeightClippingCompat: false }).lineHeightClippingCompat
      ).toBe(false);
    });

    it('is undefined when unset (native WithDefault applies)', () => {
      expect(mapPlainTextProps({}).lineHeightClippingCompat).toBeUndefined();
    });
  });

  describe('style splitting', () => {
    it('pulls text-style keys out and keeps layout styles in style', () => {
      const nativeProps = mapPlainTextProps({
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
      const nativeProps = mapPlainTextProps({
        style: [
          { fontSize: 10, padding: 1 },
          { fontSize: 20, margin: 2 },
        ],
      });

      expect(nativeProps.fontSize).toBe(20);
      expect(nativeProps.style).toEqual({ padding: 1, margin: 2 });
    });

    it('omits style when no view style is given', () => {
      expect(mapPlainTextProps({}).style).toBeUndefined();
      expect(mapPlainTextProps({ style: { fontSize: 12 } }).style).toBeUndefined();
    });
  });

  describe('pass-through of remaining props', () => {
    it('forwards accessibility and identifier props', () => {
      expect(
        mapPlainTextProps({
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

    it('emits only the keys that hold a value', () => {
      expect(Object.keys(mapPlainTextProps({ children: 'Hi' }))).toEqual(['text']);
      expect(
        Object.keys(
          mapPlainTextProps({ children: 'Hi', style: { color: null, padding: undefined } })
        )
      ).toEqual(['text']);
    });

    it('keeps style keys that only look like prototype members in style', () => {
      const style = { constructor: 1 } as unknown as TextStyle;
      expect(mapPlainTextProps({ style }).style).toEqual({ constructor: 1 });
    });

    it('does not leak consumed props into the output', () => {
      const nativeProps = mapPlainTextProps({
        children: 'x',
        unstable_lineHeightClippingCompat: true,
        style: { fontSize: 10 },
      });

      expect(nativeProps).not.toHaveProperty('children');
      expect(nativeProps).not.toHaveProperty('unstable_lineHeightClippingCompat');
      expect(nativeProps).not.toHaveProperty('style');
    });
  });
});

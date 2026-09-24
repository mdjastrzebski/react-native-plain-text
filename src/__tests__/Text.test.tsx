import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { createRef } from 'react';
import { Text as RNText, unstable_TextAncestorContext, type HostInstance } from 'react-native';
import type { PlainTextOwnProps } from '../PlainText';
import { Text, type TextProps } from '../Text';

describe('<Text />', () => {
  it('renders a string child as PlainText', async () => {
    await render(<Text style={{ fontSize: 12 }}>Hello</Text>);

    expect(screen.root).toHaveProp('text', 'Hello');
    expect(screen.root).toHaveProp('fontSize', 12);
  });

  it('renders non-string children (e.g. an element) as RN <Text>', async () => {
    await render(
      <Text>
        <RNText>Hello</RNText>
      </Text>
    );

    expect(screen.root).not.toHaveProp('text');
  });

  it('renders interpolated children (an array) as PlainText', async () => {
    const n = 3;
    await render(<Text>{n} items</Text>);

    expect(screen.root).toHaveProp('text', '3 items');
    expect(screen.toJSON()).toMatchInlineSnapshot(`
<RNPlainText
  text="3 items"
/>
`);
  });

  it('skips null and boolean children when joining, like RN <Text>', async () => {
    const isNew = false;
    await render(
      <Text>
        {3} items{null}
        {isNew && ' (new)'}
      </Text>
    );

    expect(screen.root).toHaveProp('text', '3 items');
  });

  it('renders a number child as PlainText', async () => {
    await render(<Text>{3}</Text>);

    expect(screen.root).toHaveProp('text', '3');
  });

  it('renders a bigint child as PlainText', async () => {
    await render(<Text>{3n}</Text>);

    expect(screen.root).toHaveProp('text', '3');
  });

  it('joins bigint children with text, like RN <Text>', async () => {
    await render(<Text>{3n} items</Text>);

    expect(screen.root).toHaveProp('text', '3 items');
  });

  it('renders children mixing text and an element as RN <Text>', async () => {
    await render(
      <Text>
        Hello <RNText>world</RNText>
      </Text>
    );

    expect(screen.root).not.toHaveProp('text');
  });

  it('renders a template literal child as PlainText', async () => {
    const n = 3;
    await render(<Text>{`${n} items`}</Text>);

    expect(screen.root).toHaveProp('text', '3 items');
    expect(screen.toJSON()).toMatchInlineSnapshot(`
<RNPlainText
  text="3 items"
/>
`);
  });

  it('renders undefined children as RN <Text>', async () => {
    await render(<Text testID="empty" />);

    expect(screen.getByTestId('empty')).not.toHaveProp('text');
  });

  it('renders as RN <Text> when nested inside another <Text> (via the ancestor context)', async () => {
    await render(
      <unstable_TextAncestorContext.Provider value={true}>
        <Text>Hello</Text>
      </unstable_TextAncestorContext.Provider>
    );

    expect(screen.root).not.toHaveProp('text');
  });

  it('renders as RN <Text> when deopt is set, even for a plain string child', async () => {
    await render(<Text deopt>Hello</Text>);

    expect(screen.root).not.toHaveProp('text');
  });

  it.each([
    ['onPress', { onPress: () => {} }],
    ['onLongPress', { onLongPress: () => {} }],
    ['onPressIn', { onPressIn: () => {} }],
    ['onPressOut', { onPressOut: () => {} }],
    ['onTextLayout', { onTextLayout: () => {} }],
    ['selectable', { selectable: true }],
    ['adjustsFontSizeToFit', { adjustsFontSizeToFit: true }],
    ['dataDetectorType', { dataDetectorType: 'link' }],
    ['dynamicTypeRamp', { dynamicTypeRamp: 'body' }],
  ] satisfies [string, TextProps][])(
    'still renders PlainText but warns in dev when %s is set',
    async (name, props) => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await render(<Text {...props}>Hello</Text>);

      expect(screen.root).toHaveProp('text', 'Hello');
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining(`\`${name}\``), expect.any(Object));
      warn.mockRestore();
    }
  );

  it('does not warn about unsupported props when deopt is set', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await render(
      <Text deopt onPress={() => {}}>
        Hello
      </Text>
    );

    expect(screen.root).not.toHaveProp('text');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it.each([
    ['onPress={undefined}', { onPress: undefined }],
    ['selectable={false}', { selectable: false }],
    ['adjustsFontSizeToFit={false}', { adjustsFontSizeToFit: false }],
  ] satisfies [string, TextProps][])(
    'renders PlainText without warning when %s',
    async (_, props) => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await render(<Text {...props}>Hello</Text>);

      expect(screen.root).toHaveProp('text', 'Hello');
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    }
  );

  it('renders PlainText when deopt is false', async () => {
    await render(<Text deopt={false}>Hello</Text>);

    expect(screen.root).toHaveProp('text', 'Hello');
  });

  it('does not forward deopt to the rendered element', async () => {
    await render(<Text deopt testID="deopted" />);

    expect(screen.getByTestId('deopted')).not.toHaveProp('deopt');
  });

  it('forwards ref to the PlainText host element', async () => {
    const ref = createRef<HostInstance>();

    await render(<Text ref={ref}>Hello</Text>);

    expect(screen.root).toHaveProp('text', 'Hello');
    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.measure).toBe('function');
  });

  it('forwards ref to the RN <Text> host element on fallback', async () => {
    const ref = createRef<HostInstance>();

    await render(
      <Text ref={ref} deopt>
        Hello
      </Text>
    );

    expect(screen.root).not.toHaveProp('text');
    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.measure).toBe('function');
  });

  it('forwards PlainText own props to PlainText', async () => {
    await render(
      <Text
        style={{ fontSize: 12, fontVariationSettings: '"wght" 700' }}
        hyphens="auto"
        lang="pl"
        unstable_lineHeightClippingCompat
      >
        Hello
      </Text>
    );

    expect(screen.root).toHaveProp('text', 'Hello');
    expect(screen.root).toHaveProp('fontSize', 12);
    expect(screen.root).toHaveProp('fontVariationSettings', '"wght" 700');
    expect(screen.root).toHaveProp('hyphens', 'auto');
    expect(screen.root).toHaveProp('lang', 'pl');
    expect(screen.root).toHaveProp('lineHeightClippingCompat', true);
    expect(screen.toJSON()).toMatchInlineSnapshot(`
<RNPlainText
  fontSize={12}
  fontVariationSettings=""wght" 700"
  hyphens="auto"
  lang="pl"
  lineHeightClippingCompat={true}
  text="Hello"
/>
`);
  });

  it('accepts a PlainTextStyle array in style', async () => {
    await render(
      <Text style={[{ fontSize: 12 }, { fontVariationSettings: '"wdth" 87.5' }]}>Hello</Text>
    );

    expect(screen.root).toHaveProp('fontSize', 12);
    expect(screen.root).toHaveProp('fontVariationSettings', '"wdth" 87.5');
  });

  it('prefers the text prop over children, like PlainText', async () => {
    await render(<Text text="From prop">From children</Text>);

    expect(screen.root).toHaveProp('text', 'From prop');
  });

  it('renders the text prop as PlainText when there are no children', async () => {
    await render(<Text text="Hello" />);

    expect(screen.root).toHaveProp('text', 'Hello');
  });

  it('passes the text prop to RN <Text> as children on fallback', async () => {
    await render(<Text deopt text="Hello" />);

    expect(screen.root).not.toHaveProp('text');
    expect(screen.getByText('Hello')).toBeOnTheScreen();
  });

  it.each([
    ['hyphens', { hyphens: 'auto' }],
    ['lang', { lang: 'pl' }],
    ['unstable_lineHeightClippingCompat', { unstable_lineHeightClippingCompat: true }],
    ['style.fontVariationSettings', { style: [{ fontVariationSettings: '"wght" 700' }] }],
  ] satisfies [string, TextProps][])(
    'warns in dev when %s is dropped by the RN <Text> fallback',
    async (name, props) => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await render(
        <Text deopt {...props}>
          Hello
        </Text>
      );

      expect(screen.root).not.toHaveProp('text');
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining(`\`${name}\``), expect.any(Object));
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('`deopt` is set'),
        expect.any(Object)
      );
      warn.mockRestore();
    }
  );

  it('warns about PlainText-only props on automatic fallback too', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await render(
      <unstable_TextAncestorContext.Provider value={true}>
        <Text lang="de">Hello</Text>
      </unstable_TextAncestorContext.Provider>
    );

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('nested inside another <Text>'),
      expect.any(Object)
    );
    warn.mockRestore();
  });

  it.each([
    ['hyphens="none"', { hyphens: 'none' }],
    ['unstable_lineHeightClippingCompat={false}', { unstable_lineHeightClippingCompat: false }],
  ] satisfies [string, TextProps][])(
    'does not warn on fallback when %s (matches RN <Text>)',
    async (_, props) => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await render(
        <Text deopt {...props}>
          Hello
        </Text>
      );

      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    }
  );

  it('accepts every PlainText own prop at the type level', async () => {
    const ownProps: PlainTextOwnProps = {
      text: 'Hello',
      style: [{ fontSize: 12 }, { fontVariationSettings: '"wght" 700' }],
      hyphens: 'auto',
      lang: 'pl',
      unstable_lineHeightClippingCompat: true,
    };
    const props: TextProps = ownProps;
    await render(<Text {...props}>Hello</Text>);

    expect(screen.root).toHaveProp('fontVariationSettings', '"wght" 700');
  });

  it('rejects invalid PlainText own prop values at the type level', () => {
    // @ts-expect-error hyphens only accepts 'none' | 'auto'
    const badHyphens = <Text hyphens="manual">Hello</Text>;
    // @ts-expect-error fontVariationSettings must be a string
    const badStyle = <Text style={{ fontVariationSettings: 700 }}>Hello</Text>;

    // @ts-expect-error ref must target a host element
    const badRef = <Text ref={createRef<string>()}>Hello</Text>;

    expect([badHyphens, badStyle, badRef]).toHaveLength(3);
  });
});

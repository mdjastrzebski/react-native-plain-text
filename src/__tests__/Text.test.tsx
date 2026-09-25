import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { createRef, use } from 'react';
import { Text as RNText, unstable_TextAncestorContext, type HostInstance } from 'react-native';
import type { PlainTextOwnProps } from '../PlainText';
import PlainTextViewNativeComponent from '../PlainTextViewNativeComponent';
import { mapTextProps, Text, type TextProps } from '../Text';

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

  it('renders as RN <Text> in fallback mode, even for a plain string child', async () => {
    await render(<Text mode="fallback">Hello</Text>);

    expect(screen.root).not.toHaveProp('text');
  });

  const unsupportedProps = [
    ['onPress', { onPress: () => {} }],
    ['onLongPress', { onLongPress: () => {} }],
    ['onPressIn', { onPressIn: () => {} }],
    ['onPressOut', { onPressOut: () => {} }],
    ['onTextLayout', { onTextLayout: () => {} }],
    ['selectable', { selectable: true }],
    ['adjustsFontSizeToFit', { adjustsFontSizeToFit: true }],
    ['dataDetectorType', { dataDetectorType: 'link' }],
    ['dynamicTypeRamp', { dynamicTypeRamp: 'body' }],
  ] satisfies [string, TextProps][];

  it.each(unsupportedProps)(
    'renders RN <Text> without warning when %s is set (default compat mode)',
    async (_, props) => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await render(<Text {...props}>Hello</Text>);

      expect(screen.root).not.toHaveProp('text');
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    }
  );

  it.each(unsupportedProps)(
    'renders RN <Text> in compat mode when %s is set with interpolated children',
    async (_, props) => {
      await render(
        <Text mode="compat" {...props}>
          {3} items
        </Text>
      );

      expect(screen.root).not.toHaveProp('text');
    }
  );

  it.each(unsupportedProps)(
    'still renders PlainText but warns in dev when %s is set in fast mode',
    async (name, props) => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await render(
        <Text mode="fast" {...props}>
          Hello
        </Text>
      );

      expect(screen.root).toHaveProp('text', 'Hello');
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining(`\`${name}\``), expect.any(Object));
      warn.mockRestore();
    }
  );

  it('does not warn about unsupported props in fallback mode', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await render(
      <Text mode="fallback" onPress={() => {}}>
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

  it.each(['compat', 'fast'] as const)('renders PlainText in %s mode', async (mode) => {
    await render(<Text mode={mode}>Hello</Text>);

    expect(screen.root).toHaveProp('text', 'Hello');
  });

  it.each(['compat', 'fast'] as const)(
    'does not forward mode to PlainText in %s mode',
    async (mode) => {
      await render(<Text mode={mode}>Hello</Text>);

      expect(screen.root).not.toHaveProp('mode');
    }
  );

  it('does not forward mode to RN <Text>', async () => {
    await render(<Text mode="fallback" testID="fallback" />);

    expect(screen.getByTestId('fallback')).not.toHaveProp('mode');
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
      <Text ref={ref} mode="fallback">
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
    await render(<Text mode="fallback" text="Hello" />);

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
        <Text mode="fallback" {...props}>
          Hello
        </Text>
      );

      expect(screen.root).not.toHaveProp('text');
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining(`\`${name}\``), expect.any(Object));
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('`mode="fallback"` is set'),
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

  it('names the unsupported prop when compat mode drops a PlainText-only prop', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await render(
      <Text selectable lang="da">
        Hello
      </Text>
    );

    expect(screen.root).not.toHaveProp('text');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('`selectable` is set'),
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
        <Text mode="fallback" {...props}>
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

describe('mapTextProps', () => {
  it('maps a string child to native props', () => {
    expect(mapTextProps({ children: 'Hello', style: { fontSize: 12, padding: 4 } })).toEqual({
      text: 'Hello',
      fontSize: 12,
      style: { padding: 4 },
    });
  });

  it('joins interpolated children', () => {
    expect(mapTextProps({ children: [3, ' items'] })).toEqual({ text: '3 items' });
  });

  it('prefers the text prop over children', () => {
    expect(mapTextProps({ text: 'Hi', children: <RNText>ignored</RNText> })).toEqual({
      text: 'Hi',
    });
  });

  it('returns null for element children', () => {
    expect(mapTextProps({ children: <RNText>Hello</RNText> })).toBeNull();
  });

  it('returns null for missing children', () => {
    expect(mapTextProps({})).toBeNull();
  });

  it('returns null in fallback mode', () => {
    expect(mapTextProps({ mode: 'fallback', children: 'Hello' })).toBeNull();
  });

  it('returns null for an unsupported prop in compat mode', () => {
    expect(mapTextProps({ onPress: () => {}, children: 'Hello' })).toBeNull();
  });

  it('maps an unsupported prop in fast mode, without the mode prop', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(mapTextProps({ mode: 'fast', selectable: true, children: 'Hello' })).toEqual({
      text: 'Hello',
      selectable: true,
    });
    warn.mockRestore();
  });

  function AppText({ bold, ...props }: TextProps & { bold?: boolean }) {
    const style = [{ fontSize: 14, fontWeight: bold ? 'bold' : undefined } as const, props.style];
    const isNested = use(unstable_TextAncestorContext);
    const nativeProps = isNested ? null : mapTextProps({ ...props, style });
    if (nativeProps !== null) {
      return <PlainTextViewNativeComponent {...nativeProps} />;
    }

    return <RNText {...props} style={style} />;
  }

  it('lets a custom Text render PlainText for a plain string', async () => {
    await render(<AppText bold>Hello</AppText>);

    expect(screen.toJSON()).toMatchInlineSnapshot(`
<RNPlainText
  fontSize={14}
  fontWeight="bold"
  text="Hello"
/>
`);
  });

  // The jest preset's RN <Text> mock never provides the ancestor context real RN
  // <Text> does, so nesting is simulated with the provider.
  it('lets a custom Text fall back to RN <Text> when nested', async () => {
    await render(
      <unstable_TextAncestorContext.Provider value={true}>
        <AppText bold>world</AppText>
      </unstable_TextAncestorContext.Provider>
    );

    expect(screen.root).not.toHaveProp('text');
    expect(screen.root).toHaveProp('style', [{ fontSize: 14, fontWeight: 'bold' }, undefined]);
  });
});

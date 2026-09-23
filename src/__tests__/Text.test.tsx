import { describe, expect, it } from '@jest/globals';
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
  style={{}}
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

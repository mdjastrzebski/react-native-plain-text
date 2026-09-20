import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { Text as RNText, unstable_TextAncestorContext } from 'react-native';
import { Text } from '../Text';

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
});

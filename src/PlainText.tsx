import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';
import { forwardRef, type ComponentRef, type ForwardedRef } from 'react';

// Same widened type as PlainText.native.tsx, see there for why.
export type PlainTextStyle = TextStyle & { fontVariationSettings?: string };

export type PlainTextProps = Omit<TextProps, 'children' | 'style'> & {
  children?: string;
  style?: StyleProp<PlainTextStyle>;
  // No-op here: the bug it works around (RN#29507) is iOS-only, so there is
  // nothing for it to override on web. Kept in the type so call sites don't
  // need a platform branch just to pass it.
  unstable_lineHeightClippingIos?: boolean;
};

// Web / fallback implementation. No translation needed: CSS supports
// `font-variation-settings` natively and react-native-web passes unrecognized
// style keys through to it.
type PlainTextRef = ComponentRef<typeof Text>;

function PlainTextComponent(
  {
    children,
    style,
    unstable_lineHeightClippingIos: _unstable_lineHeightClippingIos,
    ...rest
  }: PlainTextProps,
  ref: ForwardedRef<PlainTextRef>
) {
  return (
    <Text ref={ref} style={style as StyleProp<TextStyle>} {...rest}>
      {children}
    </Text>
  );
}

export const PlainText = forwardRef(PlainTextComponent);

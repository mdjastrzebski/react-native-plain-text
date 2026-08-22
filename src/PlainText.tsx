import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

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
export function PlainText({
  children,
  style,
  unstable_lineHeightClippingIos: _unstable_lineHeightClippingIos,
  ...rest
}: PlainTextProps) {
  return (
    <Text style={style as StyleProp<TextStyle>} {...rest}>
      {children}
    </Text>
  );
}

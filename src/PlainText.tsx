import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

// RN's TextStyle plus the one text style it has no entry for. See
// PlainText.native.tsx, which defines the same type and explains why RN lacks
// the key.
export type PlainTextStyle = TextStyle & { fontVariationSettings?: string };

export type PlainTextProps = Omit<TextProps, 'children' | 'style'> & {
  children?: string;
  style?: StyleProp<PlainTextStyle>;
};

// Web / fallback implementation.
//
// The widened style needs no translation here: CSS carries
// `font-variation-settings` natively and react-native-web passes unrecognized
// style keys through to it. Only the cast, which is the same widening the type
// above does.
export function PlainText({ children, style, ...rest }: PlainTextProps) {
  return (
    <Text style={style as StyleProp<TextStyle>} {...rest}>
      {children}
    </Text>
  );
}

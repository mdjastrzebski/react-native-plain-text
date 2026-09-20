import { use } from 'react';
import { Text as RNText, unstable_TextAncestorContext, type TextProps } from 'react-native';
import { PlainText, type PlainTextProps } from './PlainText';

export type UnifiedTextProps = TextProps & {
  /// Skips the PlainText/RNText selection and always renders RN <Text>, e.g.
  /// for children with mixed styles that PlainText can't represent.
  forceRNText?: boolean;
};

export function Text({ children, forceRNText, ...rest }: UnifiedTextProps) {
  const isNestedText = use(unstable_TextAncestorContext);
  if (!forceRNText && typeof children === 'string' && !isNestedText) {
    return <PlainText {...(rest as PlainTextProps)}>{children}</PlainText>;
  }

  return <RNText {...rest}>{children}</RNText>;
}

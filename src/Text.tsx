import { use } from 'react';
import { Text as RNText, unstable_TextAncestorContext, type TextProps } from 'react-native';
import { PlainText, type PlainTextProps } from './PlainText';

export function Text({ children, ...rest }: TextProps) {
  const isNestedText = use(unstable_TextAncestorContext);
  if (typeof children === 'string' && !isNestedText) {
    return <PlainText {...(rest as PlainTextProps)}>{children}</PlainText>;
  }

  return <RNText {...rest}>{children}</RNText>;
}

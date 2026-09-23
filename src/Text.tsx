import { use } from 'react';
import {
  Text as RNText,
  unstable_TextAncestorContext,
  type TextProps as RNTextProps,
} from 'react-native';
import { PlainText, type PlainTextProps } from './PlainText';

export type TextProps = RNTextProps & {
  /// Always render RN <Text>, even for a plain string. Escape hatch for props
  /// PlainText doesn't support or PlainText rendering issues.
  deopt?: boolean;
};

export function Text({ children, deopt, ...rest }: TextProps) {
  const isNestedText = use(unstable_TextAncestorContext);
  if (!deopt && typeof children === 'string' && !isNestedText) {
    return <PlainText {...(rest as PlainTextProps)}>{children}</PlainText>;
  }

  return <RNText {...rest}>{children}</RNText>;
}

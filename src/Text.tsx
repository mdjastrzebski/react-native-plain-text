import { use } from 'react';
import { Text as RNText, unstable_TextAncestorContext, type TextProps } from 'react-native';
import { PlainText, type PlainTextProps } from './PlainText';

export type UnifiedTextProps = TextProps & {
  /// Deoptimizes: skips PlainText even for a plain, non-nested string, and
  /// always renders RN <Text>. For a single-style string that needs a prop
  /// PlainText doesn't support, or hits a PlainText rendering issue.
  deopt?: boolean;
};

export function Text({ children, deopt, ...rest }: UnifiedTextProps) {
  const isNestedText = use(unstable_TextAncestorContext);
  if (!deopt && typeof children === 'string' && !isNestedText) {
    return <PlainText {...(rest as PlainTextProps)}>{children}</PlainText>;
  }

  return <RNText {...rest}>{children}</RNText>;
}

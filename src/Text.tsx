import { use, type Ref } from 'react';
import {
  Text as RNText,
  unstable_TextAncestorContext,
  type HostInstance,
  type TextProps as RNTextProps,
} from 'react-native';
import { PlainText, type PlainTextOwnProps } from './PlainText';

export type TextProps = Omit<RNTextProps, keyof PlainTextOwnProps> &
  PlainTextOwnProps & {
    /** Always render RN <Text>, even for a plain string. Escape hatch for props
     * PlainText doesn't support or PlainText rendering issues.*/
    deopt?: boolean;
    /** Host element of whichever component renders: PlainText's or RN `<Text>`'s. */
    ref?: Ref<HostInstance>;
  };

export function Text({ children, deopt, ...rest }: TextProps) {
  const isNestedText = use(unstable_TextAncestorContext);
  if (!deopt && typeof children === 'string' && !isNestedText) {
    return <PlainText {...rest}>{children}</PlainText>;
  }

  return <RNText {...rest}>{children}</RNText>;
}

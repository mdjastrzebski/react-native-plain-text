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

// RN <Text> props that change behavior PlainText can't reproduce. Props that only
// matter alongside one of these (selectionColor, disabled, suppressHighlighting)
// aren't listed. Plain property reads: no allocation on the hot path.
function hasUnsupportedProp(props: RNTextProps): boolean {
  return (
    props.onPress != null ||
    props.onLongPress != null ||
    props.onPressIn != null ||
    props.onPressOut != null ||
    props.onTextLayout != null ||
    !!props.selectable ||
    !!props.adjustsFontSizeToFit ||
    props.dataDetectorType != null
  );
}

export function Text({ children, deopt, ...rest }: TextProps) {
  const isNestedText = use(unstable_TextAncestorContext);
  if (!deopt && typeof children === 'string' && !isNestedText && !hasUnsupportedProp(rest)) {
    return <PlainText {...rest}>{children}</PlainText>;
  }

  return <RNText {...rest}>{children}</RNText>;
}

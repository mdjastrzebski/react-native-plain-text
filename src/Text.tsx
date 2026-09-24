import { use, type Ref } from 'react';
import {
  Text as RNText,
  unstable_TextAncestorContext,
  type HostInstance,
  type TextProps as RNTextProps,
} from 'react-native';
import { mapPlainTextProps, type PlainTextOwnProps, type PlainTextProps } from './PlainText';
import PlainTextViewNativeComponent from './PlainTextViewNativeComponent';
import { joinTextChildren, warnOnPlainTextOnlyProp, warnOnUnsupportedProp } from './utils';

export type TextProps = Omit<RNTextProps, keyof PlainTextOwnProps> &
  PlainTextOwnProps & {
    /**
     * Always render RN `<Text>`, even for a plain string. Escape hatch for props or
     * rendering PlainText doesn't support.
     */
    deopt?: boolean;
    /** Host element of whichever component renders: PlainText's or RN `<Text>`'s. */
    ref?: Ref<HostInstance>;
  };

export function Text(props: TextProps) {
  const isNestedText = use(unstable_TextAncestorContext);
  if (!props.deopt && !isNestedText) {
    // `text` wins over `children`, as in PlainText.
    const content = props.text ?? props.children;

    // Hot path
    if (typeof content === 'string') {
      if (__DEV__) {
        warnOnUnsupportedProp(props);
      }

      const nativeProps = mapPlainTextProps(props as PlainTextProps);
      return <PlainTextViewNativeComponent {...nativeProps} />;
    }

    // Slow path
    const text = joinTextChildren(content);
    if (text !== undefined) {
      if (__DEV__) {
        warnOnUnsupportedProp(props);
      }

      const nativeProps = mapPlainTextProps({ ...props, text } as PlainTextProps);
      return <PlainTextViewNativeComponent {...nativeProps} />;
    }
  }

  if (__DEV__) {
    warnOnPlainTextOnlyProp(
      props,
      props.deopt
        ? '`deopt` is set'
        : isNestedText
          ? 'it is nested inside another <Text>'
          : 'its children are not plain text'
    );
  }

  // RN <Text> ignores `text`, so it goes in as children.
  const { deopt, text, ...rnTextProps } = props;
  return <RNText {...rnTextProps}>{text ?? props.children}</RNText>;
}

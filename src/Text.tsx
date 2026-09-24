import { use, type Ref } from 'react';
import {
  Text as RNText,
  unstable_TextAncestorContext,
  type HostInstance,
  type TextProps as RNTextProps,
} from 'react-native';
import { mapPlainTextProps, type PlainTextOwnProps, type PlainTextProps } from './PlainText';
import PlainTextViewNativeComponent, { type NativeProps } from './PlainTextViewNativeComponent';
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
  const nativeProps = isNestedText ? null : mapTextProps(props);
  if (nativeProps !== null) {
    return <PlainTextViewNativeComponent {...nativeProps} />;
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

/**
 * Maps RN `<Text>` props to `unstable_NativePlainText` props.
 *
 * Returns `null` only when `deopt` is set or the content isn't plain text; render RN
 * `<Text>` then. Props PlainText can't reproduce (`onPress`, `selectable`, …) still
 * map, with only a dev warning: pass `deopt` for those.
 *
 * Doesn't check nesting: skip it inside another `<Text>` (`unstable_TextAncestorContext`).
 */
export function mapTextProps(props: TextProps): NativeProps | null {
  if (props.deopt) {
    return null;
  }

  // `text` wins over `children`, as in PlainText.
  const content = props.text ?? props.children;

  // Hot path
  if (typeof content === 'string') {
    if (__DEV__) {
      warnOnUnsupportedProp(props);
    }

    return mapPlainTextProps(props as PlainTextProps);
  }

  // Slow path
  const text = joinTextChildren(content);
  if (text === undefined) {
    return null;
  }

  if (__DEV__) {
    warnOnUnsupportedProp(props);
  }

  return mapPlainTextProps({ ...props, text } as PlainTextProps);
}

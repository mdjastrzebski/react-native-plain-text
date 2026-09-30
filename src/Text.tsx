import { use, type Ref } from 'react';
import {
  Text as RNText,
  unstable_TextAncestorContext,
  type HostInstance,
  type TextProps as RNTextProps,
} from 'react-native';
import { mapPlainTextProps, type PlainTextOwnProps, type PlainTextProps } from './PlainText';
import PlainTextViewNativeComponent, { type NativeProps } from './PlainTextViewNativeComponent';
import {
  findUnsupportedProp,
  joinTextChildren,
  warnOnPlainTextOnlyProp,
  warnOnUnsupportedProp,
} from './utils';

/**
 * How the unified `Text` picks between PlainText and RN `<Text>`:
 *
 * - `'compat'` (default): PlainText, unless a prop PlainText can't reproduce (`onPress`,
 *   `selectable`, …) is set; then RN `<Text>`.
 * - `'fast'`: PlainText whenever the content is plain text. Unsupported props are
 *   ignored, with a dev warning.
 * - `'fallback'`: always RN `<Text>`.
 *
 * Nested text and non-text children render RN `<Text>` in every mode.
 */
export type TextMode = 'compat' | 'fast' | 'fallback';

export type TextProps = Omit<RNTextProps, keyof PlainTextOwnProps> &
  PlainTextOwnProps & {
    /** How to pick between PlainText and RN `<Text>`. Defaults to `'compat'`. */
    mode?: TextMode;
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
    warnOnPlainTextOnlyProp(props, getFallbackReason(props, isNestedText));
  }

  // RN <Text> ignores `text`, so it goes in as children.
  const { mode, text, ...rnTextProps } = props;
  return <RNText {...rnTextProps}>{text ?? props.children}</RNText>;
}

/**
 * Maps RN `<Text>` props to `unstable_NativePlainText` props.
 *
 * Returns `null` when RN `<Text>` should render instead: `mode="fallback"`, content
 * that isn't plain text, or, in the default `compat` mode, a prop PlainText can't
 * reproduce (`onPress`, `selectable`, …). In `fast` mode those props still map, with
 * only a dev warning.
 *
 * Doesn't check nesting: skip it inside another `<Text>` (`unstable_TextAncestorContext`).
 */
export function mapTextProps(props: TextProps): NativeProps | null {
  const mode = props.mode;
  if (mode === 'fallback') {
    return null;
  }

  // `text` wins over `children`, as in PlainText.
  const content = props.text ?? props.children;

  // Hot path
  let text: string | undefined;
  if (typeof content !== 'string') {
    // Slow path
    text = joinTextChildren(content);
    if (text === undefined) {
      return null;
    }
  }

  if (mode === 'fast') {
    if (__DEV__) {
      warnOnUnsupportedProp(props);
    }
  } else if (findUnsupportedProp(props) !== undefined) {
    return null;
  }

  return mapPlainTextProps((text === undefined ? props : { ...props, text }) as PlainTextProps);
}

function getFallbackReason(props: TextProps, isNestedText: boolean): string {
  if (props.mode === 'fallback') return '`mode="fallback"` is set';
  if (isNestedText) return 'it is nested inside another <Text>';
  if (joinTextChildren(props.text ?? props.children) === undefined) {
    return 'its children are not plain text';
  }
  return `\`${findUnsupportedProp(props)}\` is set, which PlainText can't reproduce`;
}

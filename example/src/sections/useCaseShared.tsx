import { StyleSheet, Text, View, type TextStyle } from 'react-native';
import { PlainText } from 'react-native-plain-text';
import { CompareBox, screenStyles, TextItem } from '../components/Specimen';
import { COLOR } from '../theme';

// A row that varies several props stacked in one style, the way UseCaseRow
// renders it: one PlainText, one string.
export type Combination = {
  kind?: undefined;
  label: string;
  text: string;
  style: TextStyle;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  allowFontScaling?: boolean;
  maxFontSizeMultiplier?: number;
};

// A row that is several PlainTexts sharing one `alignItems: "baseline"` line,
// the shape a Combination's single string/style can't express: a price beside
// its VAT note, a heading beside its badge. `label` still names the row, but
// there is no single `style`/`text` to spread onto one PlainText.
export type BaselineCombination = {
  kind: 'baseline';
  label: string;
  parts: { text: string; style: TextStyle }[];
};

export type UseCaseItem = Combination | BaselineCombination;

// Renders one group item, whichever shape it is: a plain Combination through
// UseCaseRow, or a BaselineCombination through UseCaseBaselineRow. Every
// section component maps its items through this, so a group can mix the two
// shapes without repeating the branch itself.
export function UseCaseItemRow({ item, showText }: { item: UseCaseItem; showText: boolean }) {
  return item.kind === 'baseline' ? (
    <UseCaseBaselineRow showText={showText} {...item} />
  ) : (
    <UseCaseRow showText={showText} {...item} />
  );
}

// The rows carry no label caption (a use case is a whole shape rather than one
// value), so `label` is only the key and the name to talk about it by.
function UseCaseRow({
  showText,
  label: _label,
  text,
  style,
  ...props
}: Combination & { showText: boolean }) {
  return (
    <TextItem
      showText={showText}
      // The platform default is pure black, which reads harder than anything else
      // on the page. Every row starts from the palette's ink instead, so the rows
      // that set no color of their own still belong to the same ramp as the
      // headings and the labels around them.
      style={[useCaseStyles.base, style]}
      // A row that takes the full measure needs the grey box to stretch with it
      // instead of shrink-wrapping. Read off the style rather than flagged per
      // row: it was a hand-maintained `wide: true` on all 52 of them, which is 52
      // chances for the flag and the width to disagree. A row with an explicit
      // point width (the avatar, the narrow box) needs nothing: the box already
      // shrink-wraps to exactly that.
      containerStyle={style.width === '100%' ? screenStyles.wideRow : undefined}
      {...props}
    >
      {text}
    </TextItem>
  );
}

// Renders a BaselineCombination: several PlainText siblings on one
// `alignItems: "baseline"` row, with the same siblings as real RN `<Text>`s
// overlaid in scarlet, since RN's `<Text>` has always gotten baseline
// alignment right and is exactly what PlainText's own baseline function
// (`BaselineYogaNode`, both shadow nodes) now has to match.
function UseCaseBaselineRow({
  showText,
  label,
  parts,
}: BaselineCombination & { showText: boolean }) {
  return (
    <CompareBox
      label={label}
      showText={showText}
      containerStyle={[useCaseStyles.baselineRow, screenStyles.wideRow]}
      overlay={
        <View style={useCaseStyles.baselineRow}>
          {parts.map((part, index) => (
            <Text key={index} style={[part.style, useCaseStyles.baselineOverlayText]}>
              {part.text}
            </Text>
          ))}
        </View>
      }
    >
      {parts.map((part, index) => (
        <PlainText key={index} style={[part.style, showText && useCaseStyles.baselineCompareText]}>
          {part.text}
        </PlainText>
      ))}
    </CompareBox>
  );
}

const useCaseStyles = StyleSheet.create({
  base: {
    color: COLOR.ink,
  },
  baselineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  // Same treatment Specimen.tsx's own `overlayText`/`compareText` give a
  // single-string TextItem, reproduced here because a baseline row's overlay
  // is several sibling `<Text>`s rather than one, so it can't go through
  // TextItem at all.
  baselineOverlayText: {
    backgroundColor: COLOR.wash,
    color: COLOR.scarlet,
  },
  // Mirrors `baselineOverlayText`'s wash, since `row` no longer supplies one.
  baselineCompareText: {
    color: COLOR.cobalt,
    backgroundColor: COLOR.wash,
  },
});

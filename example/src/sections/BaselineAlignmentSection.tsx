import { StyleSheet, Text, View } from 'react-native';
import { PlainText } from 'react-native-plain-text';
import { CompareBox, Section } from '../components/Specimen';
import { COLOR } from '../theme';

// Three glyphs are chosen for what they do at the baseline, not for being a
// word: "H" is flat-bottomed and sits exactly on it, "g" has a bowl that also
// sits on it but a tail that drops below, and "x" is an x-height letter with
// nothing above or below the line at all. A ruler makes that line itself
// visible rather than asking the eye to find it: a plain `View`, not a
// `PlainText`, so it has no baseline function of its own. Yoga's fallback for
// that (`calculateBaseline` in yoga/algorithm/Baseline.cpp) is to report a
// childless node's own height as its baseline, which means a hairline view's
// *bottom edge* is what the baseline layout lines up here, for free, on every
// child that opts out of having a real one. "H" and "x" should look planted
// on it, and only "g"'s tail should cross it.
//
// The overlay is the same three glyphs as real RN `<Text>`s in the same row,
// since RN's `<Text>` has always gotten this right and is exactly what
// PlainText now has to match. It carries no ruler of its own: the ruler is a
// fixed reference for the eye, not part of the PlainText/RN comparison.
// Realistic shapes built on top of this (a price beside its VAT note, a
// heading beside its badge) live on the Use Cases screen.
const BASELINE_ALIGNMENT_GLYPHS: { text: string; fontSize: number }[] = [
  { text: 'H', fontSize: 56 },
  { text: 'g', fontSize: 32 },
  { text: 'x', fontSize: 18 },
];

export function BaselineAlignmentSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Baseline alignment">
      <CompareBox
        label="H / g / x, ruled at the baseline"
        showText={showText}
        containerStyle={styles.baselineRow}
        overlay={
          <View style={styles.baselineRow}>
            {BASELINE_ALIGNMENT_GLYPHS.map(({ text, fontSize }, index) => (
              <Text
                key={text}
                style={[{ fontSize, marginLeft: index === 0 ? 0 : 10 }, styles.overlayInline]}
              >
                {text}
              </Text>
            ))}
          </View>
        }
      >
        {BASELINE_ALIGNMENT_GLYPHS.map(({ text, fontSize }, index) => (
          <PlainText
            key={text}
            style={[
              { fontSize, marginLeft: index === 0 ? 0 : 10 },
              showText && styles.compareTextInline,
            ]}
          >
            {text}
          </PlainText>
        ))}
        <View style={styles.baselineRuler} />
      </CompareBox>
    </Section>
  );
}

const styles = StyleSheet.create({
  // Same treatment CompareBox's own overlayText gets (see Specimen.tsx): grey
  // background matching the row, scarlet ink, multiplied against the PlainText
  // layer underneath so this one-off composite overlay reads as part of the
  // same comparison as every TextItem row.
  overlayInline: {
    backgroundColor: COLOR.wash,
    color: COLOR.scarlet,
  },
  // Mirrors `compareText` in Specimen.tsx: full-opacity cobalt plus the same
  // wash `overlayInline` carries, since `row` no longer supplies one.
  compareTextInline: {
    color: COLOR.cobalt,
    backgroundColor: COLOR.wash,
  },
  baselineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  // A plain View, not a PlainText: it has no baseline function of its own, so
  // Yoga's fallback (a childless node's baseline is its own height) puts this
  // view's bottom edge exactly on the row's shared baseline. That makes it a
  // ruler for the eye rather than another thing under comparison.
  baselineRuler: {
    width: 28,
    height: 2,
    marginLeft: 10,
    backgroundColor: COLOR.indigo,
  },
});

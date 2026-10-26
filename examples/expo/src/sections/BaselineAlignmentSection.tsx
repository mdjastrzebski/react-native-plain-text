import { StyleSheet, Text, View } from 'react-native';
import { PlainText } from 'react-native-plain-text';
import { CompareBox, Section } from '../components/Specimen';
import { COLOR } from '../theme';

// H (flat-bottomed), g (bowl + descending tail), and x (x-height only) cover
// the baseline cases. The ruler is a plain View, not a PlainText: Yoga's
// fallback baseline for a childless node is its own height, so its bottom
// edge lands exactly on the row's shared baseline for free.
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
  // Same treatment CompareBox's own overlayText gets (see Specimen.tsx),
  // reproduced here since this overlay is a composite of several Texts.
  overlayInline: {
    backgroundColor: COLOR.wash,
    color: COLOR.scarlet,
  },
  compareTextInline: {
    color: COLOR.cobalt,
    backgroundColor: COLOR.wash,
  },
  baselineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  baselineRuler: {
    width: 28,
    height: 2,
    marginLeft: 10,
    backgroundColor: COLOR.indigo,
  },
});

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { PlainText } from 'react-native-plain-text';
import { Section, screenStyles, TextItem } from '../components/Specimen';
import { COLOR } from '../theme';
import { PARAGRAPH, SPECIMEN, sharedStyles } from './shared';

// One row per distinct path; ltr is every other section's default, center never
// depends on direction, and right is left's mirror through the same code.
// - left: the explicit swap, on both platforms.
// - justify: swaps on Android (start edge + inter-word), stays justified on iOS.
// - auto: Android's start edge vs iOS's natural alignment.
// - auto, Hebrew: telling only under ltr, where RN Android puts RTL script on the
//   left (paragraph direction wins over script); the old PlainText mapping
//   (NO_GRAVITY -> START, relative to the script) put it on the right.
// Short text, so the side it lands on is visible in the full-width box; justify
// instead wraps to a short last line, which justification leaves at the start edge.
const ROWS = [
  ['left', 'left', SPECIMEN],
  ['justify', 'justify', `${PARAGRAPH} ${SPECIMEN}`],
  ['auto', 'auto', SPECIMEN],
  ['auto / hebrew', 'auto', 'השועל החום המהיר'],
] as const;

export function DirectionSection({ showText }: { showText: boolean }) {
  // Starts rtl, so a fresh mount covers the direction landing after the props;
  // flipping covers it changing later on the same views, with no prop change.
  const [direction, setDirection] = useState<'ltr' | 'rtl'>('rtl');

  return (
    <Section
      title="Direction"
      footer="Tap the direction button twice: every row should match <Text> on mount and after each toggle."
    >
      <Pressable
        onPress={() => setDirection((d) => (d === 'rtl' ? 'ltr' : 'rtl'))}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        testID="direction-flip"
      >
        <PlainText style={styles.buttonLabel}>
          {`Direction: ${direction.toUpperCase()}`}
        </PlainText>
      </Pressable>
      <View style={{ direction }}>
        {ROWS.map(([label, textAlign, text]) => (
          <TextItem
            key={label}
            label={`${direction} / ${label}`}
            showText={showText}
            style={[sharedStyles.body, { textAlign }]}
            containerStyle={screenStyles.wideRow}
          >
            {text}
          </TextItem>
        ))}
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderRadius: 6,
    backgroundColor: COLOR.indigoWash,
  },
  buttonPressed: {
    opacity: 0.4,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.indigo,
  },
});

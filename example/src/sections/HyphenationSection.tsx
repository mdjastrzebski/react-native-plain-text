import { Platform } from 'react-native';
import { Section, TextItem } from '../components/Specimen';
import { sharedStyles } from './shared';

const HYPHENATION_FREQUENCIES = ['none', 'normal', 'full'] as const;

// Irregular compound words, not the shared pangram: only these make the three frequencies visibly diverge.
const HYPHENATION_FREQUENCY_SPECIMEN =
  'Extraordinarily meticulous engineers occasionally debug astonishingly trivial issues quite carefully today, especially near release day, right before shipping.';

export function HyphenationSection({ showText }: { showText: boolean }) {
  if (Platform.OS !== 'android') return null;

  return (
    <Section title="Hyphenation (Android-only)">
      {HYPHENATION_FREQUENCIES.map((android_hyphenationFrequency) => (
        <TextItem
          key={android_hyphenationFrequency}
          label={android_hyphenationFrequency}
          showText={showText}
          android_hyphenationFrequency={android_hyphenationFrequency}
          style={[sharedStyles.body, { width: 320 }]}
        >
          {HYPHENATION_FREQUENCY_SPECIMEN}
        </TextItem>
      ))}
    </Section>
  );
}

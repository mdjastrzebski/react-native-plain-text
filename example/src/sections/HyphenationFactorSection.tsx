import { Platform } from 'react-native';
import { Section, TextItem } from '../components/Specimen';
import { sharedStyles } from './shared';

const HYPHENATION_FACTORS = [0, 0.5, 1] as const;

// Same irregular compound words as HyphenationSection: only these make hyphenation
// visibly kick in instead of just wrapping at a space.
const HYPHENATION_FACTOR_SPECIMEN =
  'Extraordinarily meticulous engineers occasionally debug astonishingly trivial issues quite carefully today, especially near release day, right before shipping.';

// RN <Text> has no hyphenation control on iOS at all, so the comparison overlay
// never hyphenates here (see Specimen.tsx's TextItem: hyphenationFactor isn't
// forwarded to it), unlike android_hyphenationFrequency's HyphenationSection.
export function HyphenationFactorSection({ showText }: { showText: boolean }) {
  if (Platform.OS !== 'ios') return null;

  return (
    <Section title="Hyphenation Factor (iOS-only)">
      {HYPHENATION_FACTORS.map((hyphenationFactor) => (
        <TextItem
          key={hyphenationFactor}
          label={String(hyphenationFactor)}
          showText={showText}
          hyphenationFactor={hyphenationFactor}
          style={[sharedStyles.body, { width: 320 }]}
        >
          {HYPHENATION_FACTOR_SPECIMEN}
        </TextItem>
      ))}
    </Section>
  );
}

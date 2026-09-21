import { Platform } from 'react-native';
import { Section, TextItem } from '../components/Specimen';
import { sharedStyles } from './shared';

const HYPHENATION_FREQUENCIES = ['none', 'normal', 'full'] as const;

// Irregular compound words, not the shared pangram: only these make the three frequencies visibly diverge.
const HYPHENATION_FREQUENCY_SPECIMEN =
  'Extraordinarily meticulous engineers occasionally debug astonishingly trivial issues quite carefully today, especially near release day, right before shipping.';

// Mostly long compound nouns, not a natural sentence: short words all have an
// obvious break point (a space) regardless of lang, so only words this long
// can show a wrap-point difference.
const HYPHENATION_LANG_SPECIMEN =
  'Rechtsschutzversicherungsgesellschaften, Kraftfahrzeughaftpflichtversicherungsprämien und Grundstücksverkehrsgenehmigungszuständigkeiten.';

export function HyphenationSection({ showText }: { showText: boolean }) {
  const isAndroid = Platform.OS === 'android';

  return (
    <Section title="Hyphenation">
      {isAndroid &&
        HYPHENATION_FREQUENCIES.map((android_hyphenationFrequency) => (
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
      {/* Android: without lang, German text hyphenates against the device's
          default locale, which can pick the wrong dictionary. iOS never
          hyphenates (hyphenationFactor isn't exposed here); lang only moves
          where these long compound words wrap. */}
      <TextItem
        label="no lang"
        showText={showText}
        android_hyphenationFrequency={isAndroid ? 'full' : undefined}
        style={[sharedStyles.body, { width: 320 }]}
      >
        {HYPHENATION_LANG_SPECIMEN}
      </TextItem>
      <TextItem
        label='lang="de"'
        showText={showText}
        lang="de"
        android_hyphenationFrequency={isAndroid ? 'full' : undefined}
        style={[sharedStyles.body, { width: 320 }]}
      >
        {HYPHENATION_LANG_SPECIMEN}
      </TextItem>
    </Section>
  );
}

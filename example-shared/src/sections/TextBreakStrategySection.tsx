import { Platform } from 'react-native';
import { Section, TextItem } from '../components/Specimen';
import { sharedStyles } from './shared';

const TEXT_BREAK_STRATEGIES = ['simple', 'highQuality', 'balanced'] as const;

// Irregular word lengths (not the shared pangram): the strategies only
// visibly diverge on text like this.
const TEXT_BREAK_STRATEGY_SPECIMEN =
  'Extraordinarily meticulous engineers occasionally debug astonishingly trivial issues quite carefully today, especially near release day, right before shipping.';

export function TextBreakStrategySection({ showText }: { showText: boolean }) {
  if (Platform.OS !== 'android') return null;

  return (
    <Section title="Text Break Strategy (Android-only)">
      {TEXT_BREAK_STRATEGIES.map((textBreakStrategy) => (
        <TextItem
          key={textBreakStrategy}
          label={textBreakStrategy}
          showText={showText}
          textBreakStrategy={textBreakStrategy}
          style={[sharedStyles.body, { width: 300 }]}
        >
          {TEXT_BREAK_STRATEGY_SPECIMEN}
        </TextItem>
      ))}
    </Section>
  );
}

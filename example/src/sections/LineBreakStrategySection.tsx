import { Platform } from 'react-native';
import { Section, TextItem } from '../components/Specimen';
import { sharedStyles } from './shared';

const ORPHAN_SPECIMEN = 'The last word of this text does not fit.';
const KOREAN_WORD_WRAP_SPECIMEN = '한글개행 한글개행 한글개행 한글개행 한글개행';

export function LineBreakStrategySection({ showText }: { showText: boolean }) {
  if (Platform.OS !== 'ios') return null;

  return (
    <Section title="Line Break Strategy (iOS-only)">
      {(['none', 'push-out', 'standard'] as const).map((s) => (
        <TextItem
          key={s}
          label={s}
          showText={showText}
          lineBreakStrategyIOS={s}
          style={[sharedStyles.body, { width: 300 }]}
        >
          {ORPHAN_SPECIMEN}
        </TextItem>
      ))}
      {(['none', 'hangul-word'] as const).map((s) => (
        <TextItem
          key={s}
          label={s}
          showText={showText}
          lineBreakStrategyIOS={s}
          style={[sharedStyles.body, { width: 220 }]}
        >
          {KOREAN_WORD_WRAP_SPECIMEN}
        </TextItem>
      ))}
    </Section>
  );
}

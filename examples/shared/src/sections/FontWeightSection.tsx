import { Section, TextItem } from '../components/Specimen';
import { SHORT_ROW_SIZE, SPECIMEN } from './shared';

const FONT_WEIGHTS = ['normal', 'bold', '100', '300', '500', '700', '900'] as const;

export function FontWeightSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Font Weight">
      {FONT_WEIGHTS.map((fontWeight) => (
        <TextItem
          key={fontWeight}
          label={fontWeight}
          showText={showText}
          style={{ fontSize: SHORT_ROW_SIZE, fontWeight }}
        >
          {SPECIMEN}
        </TextItem>
      ))}
    </Section>
  );
}

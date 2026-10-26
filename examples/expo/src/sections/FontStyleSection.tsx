import { Section, TextItem } from '../components/Specimen';
import { SHORT_ROW_SIZE, SPECIMEN } from './shared';

export function FontStyleSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Font Style">
      <TextItem
        label="italic"
        showText={showText}
        style={{ fontSize: SHORT_ROW_SIZE, fontStyle: 'italic' }}
      >
        {SPECIMEN}
      </TextItem>
      <TextItem
        label="bold italic"
        showText={showText}
        style={{ fontSize: SHORT_ROW_SIZE, fontWeight: 'bold', fontStyle: 'italic' }}
      >
        {SPECIMEN}
      </TextItem>
    </Section>
  );
}

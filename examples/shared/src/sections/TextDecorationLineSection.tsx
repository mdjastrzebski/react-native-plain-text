import { Section, TextItem } from '../components/Specimen';
import { SHORT_ROW_SIZE, SPECIMEN } from './shared';

const TEXT_DECORATION_LINES = [
  'none',
  'underline',
  'line-through',
  'underline line-through',
] as const;

export function TextDecorationLineSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Text Decoration Line">
      {TEXT_DECORATION_LINES.map((textDecorationLine) => (
        <TextItem
          key={textDecorationLine}
          label={textDecorationLine}
          showText={showText}
          style={{ fontSize: SHORT_ROW_SIZE, textDecorationLine }}
        >
          {SPECIMEN}
        </TextItem>
      ))}
    </Section>
  );
}

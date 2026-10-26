import { Section, TextItem } from '../components/Specimen';
import { SHORT_ROW_SIZE, SPECIMEN } from './shared';

const LETTER_SPACINGS = [-2, 0, 2, 6];

export function LetterSpacingSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Letter Spacing">
      {LETTER_SPACINGS.map((letterSpacing) => (
        <TextItem
          key={letterSpacing}
          label={`${letterSpacing > 0 ? '+' : ''}${letterSpacing}`}
          showText={showText}
          style={{ fontSize: SHORT_ROW_SIZE, letterSpacing }}
        >
          {SPECIMEN}
        </TextItem>
      ))}
    </Section>
  );
}

import { Section, TextItem } from '../components/Specimen';
import { SPECIMEN } from './shared';

const FONT_SIZES = [48, 40, 32, 26, 20, 16, 13, 10];

export function FontSizeSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Font Size">
      {FONT_SIZES.map((fontSize) => (
        <TextItem
          key={fontSize}
          label={`${fontSize}pt`}
          showText={showText}
          style={{ fontSize }}
          // Clipped rather than wrapped, so sizes stay comparable down the column.
          numberOfLines={1}
          ellipsizeMode="clip"
        >
          {SPECIMEN}
        </TextItem>
      ))}
    </Section>
  );
}

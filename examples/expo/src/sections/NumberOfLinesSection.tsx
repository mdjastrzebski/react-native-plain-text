import { Section, screenStyles, TextItem } from '../components/Specimen';
import { PARAGRAPH_LONG, sharedStyles } from './shared';

export function NumberOfLinesSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Number of Lines">
      {[1, 2, 3].map((numberOfLines) => (
        <TextItem
          key={numberOfLines}
          label={`${numberOfLines} line${numberOfLines === 1 ? '' : 's'}`}
          showText={showText}
          numberOfLines={numberOfLines}
          style={sharedStyles.body}
          containerStyle={screenStyles.wideRow}
        >
          {PARAGRAPH_LONG}
        </TextItem>
      ))}
    </Section>
  );
}

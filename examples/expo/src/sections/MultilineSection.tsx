import { Section, screenStyles, TextItem } from '../components/Specimen';
import { PARAGRAPH_LONG, sharedStyles } from './shared';

export function MultilineSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Multiline">
      <TextItem
        label="wrap"
        showText={showText}
        style={sharedStyles.body}
        containerStyle={screenStyles.wideRow}
      >
        {PARAGRAPH_LONG}
      </TextItem>
    </Section>
  );
}

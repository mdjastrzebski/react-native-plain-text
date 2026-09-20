import { Section, screenStyles, TextItem } from '../components/Specimen';
import { PARAGRAPH, PARAGRAPH_LONG, sharedStyles } from './shared';

// padding is a Yoga layout prop, not a text-style one: the grey box and the
// glyphs should grow/shift together if it's applied correctly.
export function PaddingSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Padding">
      <TextItem
        label="none"
        showText={showText}
        style={sharedStyles.body}
        containerStyle={screenStyles.wideRow}
      >
        {PARAGRAPH}
      </TextItem>
      <TextItem
        label="vertical 16"
        showText={showText}
        style={[sharedStyles.body, { paddingVertical: 16 }]}
        containerStyle={screenStyles.wideRow}
      >
        {PARAGRAPH}
      </TextItem>
      <TextItem
        label="top 28 bottom 4"
        showText={showText}
        style={[sharedStyles.body, { paddingTop: 28, paddingBottom: 4 }]}
        containerStyle={screenStyles.wideRow}
      >
        {PARAGRAPH}
      </TextItem>
      {/* Wrapping string: padding shrinks available width, so a padding-blind
        measure pass clips or overflows the last line. */}
      <TextItem
        label="all 20, wrapped"
        showText={showText}
        style={[sharedStyles.body, { padding: 20 }]}
        containerStyle={screenStyles.wideRow}
      >
        {PARAGRAPH_LONG}
      </TextItem>
    </Section>
  );
}

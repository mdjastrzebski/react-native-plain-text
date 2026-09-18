import { Section, screenStyles, TextItem } from '../components/Specimen';
import { PARAGRAPH, PARAGRAPH_LONG, sharedStyles } from './shared';

// padding isn't a text-style prop: it stays in the style handed to the native
// view, so Yoga lays it out around the self-measured text. What to look at is
// the grey box growing while the glyphs move down with it: a box that grew
// but glyphs that stayed put means the space was reserved and nothing
// insetted the text.
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
      {/* On a wrapping string: padding shrinks the width left for text, so
        this is where a padding-blind measure pass shows up as a clipped or
        overflowing last line. */}
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

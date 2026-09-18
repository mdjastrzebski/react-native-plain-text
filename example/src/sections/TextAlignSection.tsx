import { Section, screenStyles, TextItem } from '../components/Specimen';
import { PARAGRAPH, PARAGRAPH_LONG, sharedStyles } from './shared';

// 'auto' is left out: it resolves to the writing direction's own start edge, so on
// an LTR device it renders identically to the 'left' row above it.
const TEXT_ALIGNS = ['left', 'center', 'right', 'justify'] as const;

export function TextAlignSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Text Align">
      {TEXT_ALIGNS.map((textAlign) => (
        <TextItem
          key={textAlign}
          label={textAlign}
          showText={showText}
          style={[sharedStyles.body, { textAlign }]}
          containerStyle={screenStyles.wideRow}
        >
          {/* Justify only shows itself on text long enough to stretch more
            than one line to the full measure. */}
          {textAlign === 'justify' ? PARAGRAPH_LONG : PARAGRAPH}
        </TextItem>
      ))}
    </Section>
  );
}

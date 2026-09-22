import { Section, screenStyles, TextItem } from '../components/Specimen';
import { PARAGRAPH, PARAGRAPH_LONG, sharedStyles } from './shared';

// 'auto' omitted: on an LTR device it renders identically to 'left' above.
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
          {/* Justify only shows on text long enough to span more than one line. */}
          {textAlign === 'justify' ? PARAGRAPH_LONG : PARAGRAPH}
        </TextItem>
      ))}
    </Section>
  );
}

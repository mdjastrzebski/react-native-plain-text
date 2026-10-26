import { Section, screenStyles, TextItem } from '../components/Specimen';
import { PARAGRAPH_LONG } from './shared';

const LINE_HEIGHTS = [18, 26, 36];

export function LineHeightSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Line Height">
      {LINE_HEIGHTS.map((lineHeight) => (
        <TextItem
          key={lineHeight}
          label={`${lineHeight} / 18`}
          showText={showText}
          style={{ fontSize: 18, lineHeight }}
          containerStyle={screenStyles.wideRow}
        >
          {PARAGRAPH_LONG}
        </TextItem>
      ))}
    </Section>
  );
}

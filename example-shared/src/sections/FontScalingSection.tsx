import { Platform } from 'react-native';
import { Section, TextItem } from '../components/Specimen';
import { SHORT_ROW_SIZE, SPECIMEN } from './shared';

// Name only the path the reader can actually go and change.
const FONT_SCALING_FOOTER = Platform.select({
  ios: 'Settings ▸ Accessibility ▸ Display & Text Size ▸ Larger Text. Only the first row follows it.',
  default: 'Settings ▸ Display ▸ Display size and text ▸ Font size. Only the first row follows it.',
});

export function FontScalingSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Font Scaling" footer={FONT_SCALING_FOOTER}>
      <TextItem label="default" showText={showText} style={{ fontSize: SHORT_ROW_SIZE }}>
        {SPECIMEN}
      </TextItem>
      <TextItem
        label="disabled"
        showText={showText}
        style={{ fontSize: SHORT_ROW_SIZE }}
        allowFontScaling={false}
      >
        {SPECIMEN}
      </TextItem>
      <TextItem
        label="max 1.5x"
        showText={showText}
        style={{ fontSize: SHORT_ROW_SIZE }}
        maxFontSizeMultiplier={1.5}
      >
        {SPECIMEN}
      </TextItem>
    </Section>
  );
}

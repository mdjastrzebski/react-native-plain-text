import { Platform } from 'react-native';
import { featureCaptureTestID, Section, TextItem } from '../components/Specimen';
import { SHORT_ROW_SIZE, SPECIMEN } from './shared';

// Name only the path the reader can actually go and change.
const FONT_SCALING_FOOTER = Platform.select({
  ios: 'Settings ▸ Accessibility ▸ Display & Text Size ▸ Larger Text. Only the first row follows it.',
  default: 'Settings ▸ Display ▸ Display size and text ▸ Font size. Only the first row follows it.',
});

export function FontScalingSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Font Scaling" footer={FONT_SCALING_FOOTER}>
      <TextItem
        testID={featureCaptureTestID('font-scaling', 'default')}
        label="default"
        showText={showText}
        style={{ fontSize: SHORT_ROW_SIZE }}
      >
        {SPECIMEN}
      </TextItem>
      <TextItem
        testID={featureCaptureTestID('font-scaling', 'disabled')}
        label="disabled"
        showText={showText}
        style={{ fontSize: SHORT_ROW_SIZE }}
        allowFontScaling={false}
      >
        {SPECIMEN}
      </TextItem>
      <TextItem
        testID={featureCaptureTestID('font-scaling', 'max-1-5x')}
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

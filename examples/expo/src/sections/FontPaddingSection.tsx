import { Platform } from 'react-native';
import { Section, screenStyles, TextItem } from '../components/Specimen';
import { PARAGRAPH, sharedStyles } from './shared';

const FONT_PADDING_FOOTER =
  'The second row should sit noticeably tighter against the padding edge than the first.';

// Paired with padding since that's where the effect is visible.
export function FontPaddingSection({ showText }: { showText: boolean }) {
  if (Platform.OS !== 'android') return null;

  return (
    <Section title="Font Padding (Android-only)" footer={FONT_PADDING_FOOTER}>
      <TextItem
        label="default, padding 4"
        showText={showText}
        style={[sharedStyles.body, { padding: 4 }]}
        containerStyle={screenStyles.wideRow}
      >
        {PARAGRAPH}
      </TextItem>
      <TextItem
        label="includeFontPadding false, padding 4"
        showText={showText}
        style={[sharedStyles.body, { padding: 4, includeFontPadding: false }]}
        containerStyle={screenStyles.wideRow}
      >
        {PARAGRAPH}
      </TextItem>
    </Section>
  );
}

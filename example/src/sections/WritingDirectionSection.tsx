import { Platform } from 'react-native';
import { Section, screenStyles, TextItem } from '../components/Specimen';
import { PARAGRAPH, sharedStyles } from './shared';

// 'auto' textAlign resolves to the writing direction's own start edge (see the
// TEXT_ALIGNS comment in TextAlignSection), so pinning writingDirection is the
// cleanest way to see it move without needing bidirectional text.
export function WritingDirectionSection({ showText }: { showText: boolean }) {
  if (Platform.OS !== 'ios') return null;

  return (
    <Section title="Writing Direction (iOS-only)">
      {(['ltr', 'rtl'] as const).map((writingDirection) => (
        <TextItem
          key={writingDirection}
          label={writingDirection}
          showText={showText}
          style={[sharedStyles.body, { textAlign: 'auto', writingDirection }]}
          containerStyle={screenStyles.wideRow}
        >
          {PARAGRAPH}
        </TextItem>
      ))}
    </Section>
  );
}

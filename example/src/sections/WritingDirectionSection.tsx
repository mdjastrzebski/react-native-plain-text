import { Platform } from 'react-native';
import { Section, screenStyles, TextItem } from '../components/Specimen';
import { PARAGRAPH, sharedStyles } from './shared';

// 'auto' textAlign follows writingDirection's start edge (see TEXT_ALIGNS in
// TextAlignSection), so pinning writingDirection shows it move without
// needing bidirectional text.
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

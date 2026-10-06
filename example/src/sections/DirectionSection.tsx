import { View } from 'react-native';
import { Section, screenStyles, TextItem } from '../components/Specimen';
import { PARAGRAPH, PARAGRAPH_LONG, sharedStyles } from './shared';

// The paragraph direction Yoga computes for these rows (the wrapper View's
// `direction` style, inherited like every other Yoga style) is what textAlign
// resolves against: left/right swap sides under rtl, and 'auto' follows the
// start edge. RN's own <Text> resolves it the same way (from the layout
// direction, not the prop), so the rtl rows should align identically. See
// docs/contributing/sync-points.md#set-18--paragraph-direction-and-text-alignment.
const TEXT_ALIGNS = ['left', 'center', 'right', 'justify', 'auto'] as const;

export function DirectionSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Direction">
      {(['rtl', 'ltr'] as const).map((direction) => (
        <View key={direction} style={{ direction }}>
          {TEXT_ALIGNS.map((textAlign) => (
            <TextItem
              key={textAlign}
              label={`${direction} / ${textAlign}`}
              showText={showText}
              style={[sharedStyles.body, { textAlign }]}
              containerStyle={screenStyles.wideRow}
            >
              {/* Justify only shows on text long enough to span more than one line. */}
              {textAlign === 'justify' ? PARAGRAPH_LONG : PARAGRAPH}
            </TextItem>
          ))}
        </View>
      ))}
    </Section>
  );
}

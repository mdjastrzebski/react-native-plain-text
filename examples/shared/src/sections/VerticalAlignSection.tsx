import { Platform } from 'react-native';
import { Section, screenStyles, TextItem } from '../components/Specimen';
import { SHORT_ROW_SIZE, SPECIMEN } from './shared';

const VERTICAL_ALIGNS = ['top', 'middle', 'bottom'] as const;

// textAlignVertical's names for the same three positions ('center', not
// 'middle'). 'auto' omitted: it's the unset default, already shown elsewhere.
const TEXT_ALIGN_VERTICALS = ['top', 'center', 'bottom'] as const;

const VERTICAL_ALIGN_FOOTER = Platform.select({
  ios: 'RN Text: Android-only ',
});

// Closed on iOS (Android-only in RN <Text>; see
// workflow.md#when-rn-itself-has-the-platform-gap). textAlignVertical and
// verticalAlign both map to the same native gravity and are resolved
// natively, not in JS — the merge rows below exercise that native logic directly.
export function VerticalAlignSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Vertical Align" footer={VERTICAL_ALIGN_FOOTER}>
      {VERTICAL_ALIGNS.map((verticalAlign) => (
        <TextItem
          key={verticalAlign}
          label={`verticalAlign: ${verticalAlign}`}
          showText={showText}
          style={{ width: '100%', height: 72, fontSize: SHORT_ROW_SIZE, verticalAlign }}
          containerStyle={screenStyles.wideRow}
        >
          {SPECIMEN}
        </TextItem>
      ))}
      {/* Same three positions via the other prop: should land identically to
        verticalAlign's rows above. */}
      {TEXT_ALIGN_VERTICALS.map((textAlignVertical) => (
        <TextItem
          key={textAlignVertical}
          label={`textAlignVertical: ${textAlignVertical}`}
          showText={showText}
          style={{ width: '100%', height: 72, fontSize: SHORT_ROW_SIZE, textAlignVertical }}
          containerStyle={screenStyles.wideRow}
        >
          {SPECIMEN}
        </TextItem>
      ))}
      {/* Both set, disagreeing: verticalAlign wins (matches RN Text.js) —
        should match "verticalAlign: bottom" above. */}
      <TextItem
        label="both set: textAlignVertical top, verticalAlign bottom"
        showText={showText}
        style={{
          width: '100%',
          height: 72,
          fontSize: SHORT_ROW_SIZE,
          textAlignVertical: 'top',
          verticalAlign: 'bottom',
        }}
        containerStyle={screenStyles.wideRow}
      >
        {SPECIMEN}
      </TextItem>
    </Section>
  );
}

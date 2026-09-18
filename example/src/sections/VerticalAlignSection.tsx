import { Platform } from 'react-native';
import { Section, screenStyles, TextItem } from '../components/Specimen';
import { SHORT_ROW_SIZE, SPECIMEN } from './shared';

const VERTICAL_ALIGNS = ['top', 'middle', 'bottom'] as const;

// textAlignVertical's own names for the same three positions ('center' rather
// than verticalAlign's 'middle'). 'auto' is left out: it is the unset default,
// already shown implicitly by every other section's rows.
const TEXT_ALIGN_VERTICALS = ['top', 'center', 'bottom'] as const;

const VERTICAL_ALIGN_FOOTER = Platform.select({
  ios: 'RN Text: Android-only ',
});

// Android-only in RN <Text>, closed on iOS here (see
// docs/contributing/workflow.md#when-rn-itself-has-the-platform-gap). Each box
// is taller than its text so the position is visible. Two native props reach
// the same gravity, and both get their own rows: `textAlignVertical` (the
// Android-native name) and `verticalAlign` (RN's cross-platform CSS name,
// which RN's own Text.js aliases onto textAlignVertical). PlainText passes
// both straight to native rather than resolving one from the other in JS
// (see docs/contributing/performance.md#prop-cost-policy), so the merge
// rows below exercise PlainTextView.kt's applyVerticalAlignGravity and
// PlainTextProps.mm's plainTextResolveVerticalAlign directly.
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
      {/* Same three positions, driven by the other prop, so a row here should
        land identically to its verticalAlign counterpart above: 'center' is
        textAlignVertical's own name for what 'middle' means to verticalAlign. */}
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
      {/* Both set, disagreeing: verticalAlign wins (matches RN <Text>'s
        Text.js), so this should render identically to the "verticalAlign:
        bottom" row above despite asking textAlignVertical for the opposite. */}
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

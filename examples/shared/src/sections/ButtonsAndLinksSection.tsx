import { Section, screenStyles, TextItem } from '../components/Specimen';
import { COLOR } from '../theme';

export function ButtonsAndLinksSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Buttons and Links">
      {/* button-label */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          fontSize: 16,
          fontWeight: '600',
          color: COLOR.paper,
          backgroundColor: COLOR.indigo,
          textAlign: 'center',
          paddingVertical: 14,
          borderRadius: 10,
        }}
        containerStyle={screenStyles.wideRow}
        numberOfLines={1}
      >
        Continue to checkout
      </TextItem>
      {/* button-disabled */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          fontSize: 16,
          fontWeight: '600',
          color: COLOR.disabled,
          backgroundColor: COLOR.wash,
          textAlign: 'center',
          paddingVertical: 14,
          borderRadius: 10,
        }}
        containerStyle={screenStyles.wideRow}
      >
        Continue to checkout
      </TextItem>
      {/* link */}
      <TextItem
        showText={showText}
        style={{ fontSize: 16, color: COLOR.indigo, textDecorationLine: 'underline' }}
      >
        Read the migration guide
      </TextItem>
      {/* tab-label-active */}
      <TextItem
        showText={showText}
        style={{
          fontSize: 15,
          fontWeight: '600',
          color: COLOR.indigo,
          paddingVertical: 8,
          paddingHorizontal: 4,
          borderBottomWidth: 2,
          borderBottomColor: COLOR.indigo,
        }}
        maxFontSizeMultiplier={1.3}
      >
        Overview
      </TextItem>
    </Section>
  );
}

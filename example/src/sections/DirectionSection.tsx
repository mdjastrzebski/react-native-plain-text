import { View } from 'react-native';
import { Section, screenStyles, TextItem } from '../components/Specimen';
import { PARAGRAPH, PARAGRAPH_LONG, sharedStyles } from './shared';

const TEXT_ALIGNS = ['left', 'center', 'right', 'justify', 'auto'] as const;

export function DirectionSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Direction">
      {(['rtl', 'ltr'] as const).map((direction) => (
        <View key={direction} style={{ direction }}>
          {TEXT_ALIGNS.map((textAlign, index) => (
            <TextItem
              key={textAlign}
              label={`${direction} / ${textAlign}`}
              showText={showText}
              style={[sharedStyles.body, { textAlign }]}
              containerStyle={screenStyles.wideRow}
              accessibilityProps={{ testID: `pt-${direction}-${textAlign}-${index}` }}
            >
              {`${direction}-${textAlign} ${textAlign === 'justify' ? PARAGRAPH_LONG : PARAGRAPH}`}
            </TextItem>
          ))}
        </View>
      ))}
    </Section>
  );
}

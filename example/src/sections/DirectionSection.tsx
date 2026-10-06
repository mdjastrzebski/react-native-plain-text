import { Text, View } from 'react-native';
import { Section, screenStyles, TextItem } from '../components/Specimen';
import { PARAGRAPH, PARAGRAPH_LONG, sharedStyles } from './shared';

const TEXT_ALIGNS = ['left', 'center', 'right', 'justify', 'auto'] as const;

export function DirectionSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Direction">
      {(['rtl', 'ltr'] as const).map((direction) => (
        <View key={direction} style={{ direction }}>
          {TEXT_ALIGNS.map((textAlign, index) => (
            <View key={textAlign}>
              <TextItem
                label={`${direction} / ${textAlign}`}
                showText={showText}
                style={[sharedStyles.body, { textAlign }]}
                containerStyle={screenStyles.wideRow}
                accessibilityProps={{ testID: `pt-${direction}-${textAlign}-${index}` }}
              >
                {`${direction}-${textAlign} ${textAlign === 'justify' ? PARAGRAPH_LONG : PARAGRAPH}`}
              </TextItem>
              <Text
                testID={`rn-text-${direction}-${textAlign}-${index}`}
                style={[sharedStyles.body, { textAlign }, { borderColor: 'red', borderWidth: 1 }]}
              >
                {`${direction}-${textAlign} ${textAlign === 'justify' ? PARAGRAPH_LONG : PARAGRAPH}`}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </Section>
  );
}

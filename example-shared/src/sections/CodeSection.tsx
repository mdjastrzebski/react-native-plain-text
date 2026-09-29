import { Section, screenStyles, TextItem } from '../components/Specimen';
import { COLOR, MONO } from '../theme';

export function CodeSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Code">
      {/* code-inline */}
      <TextItem
        showText={showText}
        style={{
          fontSize: 14,
          fontFamily: MONO,
          color: COLOR.plum,
          backgroundColor: COLOR.plumWash,
          paddingVertical: 3,
          paddingHorizontal: 6,
          borderRadius: 4,
        }}
      >
        yarn add react-native-plain-text
      </TextItem>
      {/* code-block */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          fontSize: 13,
          fontFamily: MONO,
          color: COLOR.paperDim,
          backgroundColor: COLOR.inkSurface,
          lineHeight: 20,
          padding: 14,
          borderRadius: 8,
        }}
        containerStyle={screenStyles.wideRow}
      >
        {'const styles = StyleSheet.create({\n  title: { fontSize: 22 },\n});'}
      </TextItem>
      {/* file-path */}
      <TextItem
        showText={showText}
        style={{ width: '100%', fontSize: 13, fontFamily: MONO, color: COLOR.muted }}
        containerStyle={screenStyles.wideRow}
        numberOfLines={1}
        ellipsizeMode="head"
      >
        ios/PlainTextView/PlainTextShadowNode.mm
      </TextItem>
    </Section>
  );
}

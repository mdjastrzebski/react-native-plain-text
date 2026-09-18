import { Section, screenStyles, TextItem } from '../components/Specimen';
import { COLOR, MONO } from '../theme';

// Monospace, which measures unlike every other row here: no proportional widths
// to collapse, hard line breaks the code block has to keep, and a path with no
// spaces in it to break at.
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

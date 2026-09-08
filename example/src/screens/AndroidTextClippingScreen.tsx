import { ScrollView, StyleSheet, Text, View, type TextStyle } from 'react-native';
import { PlainText } from 'react-native-plain-text';
import { Cover, Section, screenStyles } from '../components/Specimen';
import { COLOR } from '../theme';

type FontFace = {
  name: string;
  fontFamily: string;
  fontStyle?: TextStyle['fontStyle'];
};

// Kept in the same order as react/react-native#56402's reproducer. Each face is
// a separate bundled font file rather than one family selected through
// fontWeight, which preserves the exact glyph metrics that expose the bug.
const FONT_FACES: FontFace[] = [
  { name: 'ExtraLight (200)', fontFamily: 'NotoSans-ExtraLight' },
  {
    name: 'ExtraLight (200) Italic',
    fontFamily: 'NotoSans-ExtraLightItalic',
    fontStyle: 'italic',
  },
  { name: 'Light (300)', fontFamily: 'NotoSans-Light' },
  { name: 'Light (300) Italic', fontFamily: 'NotoSans-LightItalic', fontStyle: 'italic' },
  { name: 'Regular (400)', fontFamily: 'NotoSans-Regular' },
  {
    name: 'Regular (400) Italic',
    fontFamily: 'NotoSans-RegularItalic',
    fontStyle: 'italic',
  },
  { name: 'Medium (500)', fontFamily: 'NotoSans-Medium' },
  { name: 'Medium (500) Italic', fontFamily: 'NotoSans-MediumItalic', fontStyle: 'italic' },
  { name: 'SemiBold (600)', fontFamily: 'NotoSans-SemiBold' },
  {
    name: 'SemiBold (600) Italic',
    fontFamily: 'NotoSans-SemiBoldItalic',
    fontStyle: 'italic',
  },
  { name: 'Bold (700)', fontFamily: 'NotoSans-Bold' },
  { name: 'Bold (700) Italic', fontFamily: 'NotoSans-BoldItalic', fontStyle: 'italic' },
  { name: 'ExtraBold (800)', fontFamily: 'NotoSans-ExtraBold' },
];

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 22, 24];
const SPECIMEN = 'Prison Break';

function FontSizeRow({ face }: { face: FontFace }) {
  return (
    <ScrollView horizontal style={styles.sizeRow} showsHorizontalScrollIndicator={false}>
      {FONT_SIZES.map((fontSize) => {
        const fontStyle = face.fontStyle ?? 'normal';
        const lineHeight = fontSize * 1.75;
        const textStyle = {
          fontFamily: face.fontFamily,
          fontStyle: face.fontStyle,
          fontSize,
          lineHeight,
        };
        const testID = (renderer: 'plain-text' | 'rn-text') =>
          [
            renderer,
            `fontFamily-${face.fontFamily}`,
            `fontStyle-${fontStyle}`,
            `fontSize-${fontSize}`,
            `lineHeight-${lineHeight}`,
          ].join('-');

        return (
          <View key={fontSize} style={styles.cell}>
            <View style={styles.overlaidCell}>
              <PlainText testID={testID('plain-text')} style={[textStyle, styles.plainText]}>
                {SPECIMEN}
              </PlainText>
              <Text testID={testID('rn-text')} style={[textStyle, styles.rnText]}>
                {SPECIMEN}
              </Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

export default function AndroidTextClippingScreen() {
  return (
    <ScrollView style={screenStyles.scroll} contentContainerStyle={screenStyles.container}>
      {/* More context https://github.com/react/react-native/issues/56402 */}
      <Cover blurb="The react/react-native#56402 Android 15 and 16 clipping repro, paired with the same text rendered by PlainText. PlainText is blue and RN Text is red. Run on Android 15 or 16 with an app targeting API 35 or newer" />
      <Section title="Noto Sans local fonts">
        {FONT_FACES.map((face) => (
          <View key={face.fontFamily} style={styles.face}>
            <PlainText style={styles.faceTitle}>{face.name}</PlainText>
            <FontSizeRow face={face} />
          </View>
        ))}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  face: {
    alignSelf: 'stretch',
  },
  faceTitle: {
    width: '100%',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: COLOR.inkSoft,
    marginBottom: 4,
  },
  overlaidCell: {
    position: 'relative',
  },
  plainText: {
    color: COLOR.cobalt,
  },
  rnText: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    color: COLOR.scarlet,
  },
  sizeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  cell: {
    maxWidth: '100%',
    minWidth: 48,
    paddingHorizontal: 8,
  },
});

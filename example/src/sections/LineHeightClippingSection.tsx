import { Platform, StyleSheet } from 'react-native';
import { Section, screenStyles, TextItem } from '../components/Specimen';
import type { PlainTextStyle } from 'react-native-plain-text';

// Paired 1:1 with REALWORLD_FONTS by index.
const REALWORLD_FONT_SIZES = [16, 20, 24, 32, 40];

// Varied ascender/descender/leading, to exercise the shift formula in
// applyContentFromProps beyond the one font it was written against.
const REALWORLD_FONTS: { label: string; style: PlainTextStyle }[] = Platform.select({
  ios: [
    { label: 'System', style: {} },
    { label: 'Georgia', style: { fontFamily: 'Georgia' } },
    { label: 'Helvetica Neue', style: { fontFamily: 'Helvetica Neue' } },
    { label: 'Baskerville', style: { fontFamily: 'Baskerville' } },
    { label: 'Inter SemiBold', style: { fontFamily: 'Inter_600SemiBold' } },
  ],
  default: [
    { label: 'System', style: {} },
    { label: 'serif', style: { fontFamily: 'serif' } },
    { label: 'sans-serif-medium', style: { fontFamily: 'sans-serif-medium' } },
    { label: 'cursive', style: { fontFamily: 'cursive' } },
    { label: 'Inter SemiBold', style: { fontFamily: 'Inter_600SemiBold' } },
  ],
});

// Repro for RN issue #29507: tight lineHeight clipped by the row's box, across a few font families.
export function LineHeightClippingSection({ showText }: { showText: boolean }) {
  return (
    <Section
      title="Line Height Clipping"
      footer="RN Text has broken line height clipping on iOS. See RN issue #29507."
    >
      {REALWORLD_FONTS.map((font, index) => {
        const fontSize = REALWORLD_FONT_SIZES[index]!;
        const lineHeight = Math.round(fontSize * 0.8);
        return (
          <TextItem
            key={font.label}
            label={`${lineHeight} / ${fontSize}`}
            showText={showText}
            style={[font.style, { fontSize, lineHeight }]}
            containerStyle={[screenStyles.wideRow, styles.clippingRow]}
          >
            {font.label}
          </TextItem>
        );
      })}
    </Section>
  );
}

const styles = StyleSheet.create({
  // iOS needs explicit clipping to reproduce the bug (off by default);
  // Android's TextView already clips to its bounds.
  clippingRow: Platform.select({ ios: { overflow: 'hidden' }, default: {} }),
});

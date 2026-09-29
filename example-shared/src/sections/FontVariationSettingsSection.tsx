import { Platform } from 'react-native';
import type { PlainTextStyle } from 'react-native-plain-text';
import { Section, TextItem } from '../components/Specimen';
import { VARIABLE } from '../theme';
import { SHORT_ROW_SIZE, SPECIMEN } from './shared';

// VARIABLE, not a system face: only a font file with an fvar table can move.
const variableFontRow: PlainTextStyle = {
  fontSize: SHORT_ROW_SIZE,
  fontFamily: VARIABLE,
};

const FONT_VARIATION_SETTINGS: { label: string; fontVariationSettings?: string }[] = [
  // Baseline: the font's default instance, and where the <Text> overlay stays.
  { label: 'default' },
  // Interpolated, not snapped: 550 is a real instance, unlike fontWeight,
  // which can only name the nine hundred-steps and picks the nearest face.
  { label: '"wght" 300', fontVariationSettings: '"wght" 300' },
  { label: '"wght" 550', fontVariationSettings: '"wght" 550' },
  { label: '"wght" 800', fontVariationSettings: '"wght" 800' },
  // Open Sans only condenses (75-100), so this axis moves in one direction.
  { label: '"wdth" 87.5', fontVariationSettings: '"wdth" 87.5' },
  { label: '"wdth" 75', fontVariationSettings: '"wdth" 75' },
  // Two axes at once, comma-separated: the form both platforms' parsers take.
  { label: '"wght" 800, "wdth" 75', fontVariationSettings: '"wght" 800, "wdth" 75' },
];

const FONT_VARIATION_FOOTER = Platform.select({
  android: 'RN <Text> has no fontVariationSettings. Variable fonts need API 26+.',
  default: 'RN <Text> has no fontVariationSettings style.',
});

// RN <Text> has no fontVariationSettings on either platform (react/react-native
// #44685, #44667, both unmerged) — the overlay stays at the default instance
// throughout. Uses the bundled Open Sans (VARIABLE, wght 300-800/wdth 75-100)
// since no system font is usably variable (SF keeps its axes private; Roboto
// only from Android 12). If every row looks identical, suspect a failed font
// resolution before the prop: a bad family silently falls back to SF (no axes,
// so nothing moves) or to Roboto (variable, so it looks like it worked).
export function FontVariationSettingsSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Font Variation Settings" footer={FONT_VARIATION_FOOTER}>
      {FONT_VARIATION_SETTINGS.map(({ label, fontVariationSettings }) => (
        <TextItem
          key={label}
          label={label}
          showText={showText}
          style={{ ...variableFontRow, fontVariationSettings }}
        >
          {SPECIMEN}
        </TextItem>
      ))}
    </Section>
  );
}

import { Platform } from 'react-native';
import type { PlainTextStyle } from 'react-native-plain-text';
import { Section, TextItem } from '../components/Specimen';
import { VARIABLE } from '../theme';
import { SHORT_ROW_SIZE, SPECIMEN } from './shared';

// VARIABLE, not a system face: only a font file with an fvar table can move, and
// the theme comment says why none of the built-in ones qualify.
const variableFontRow: PlainTextStyle = {
  fontSize: SHORT_ROW_SIZE,
  fontFamily: VARIABLE,
};

// The value is the label: the point of the section is which string produces
// which instance, and the CSS syntax is the API.
const FONT_VARIATION_SETTINGS: { label: string; fontVariationSettings?: string }[] = [
  // Baseline. The font's default instance, which is what every row below is read
  // against, and what the <Text> overlay is stuck at on all of them.
  { label: 'default' },
  // The weight axis, the one people actually reach for. Interpolated, not
  // snapped: 550 is a real instance, unlike fontWeight, which can only name the
  // nine hundred-steps and picks the nearest face.
  { label: '"wght" 300', fontVariationSettings: '"wght" 300' },
  { label: '"wght" 550', fontVariationSettings: '"wght" 550' },
  { label: '"wght" 800', fontVariationSettings: '"wght" 800' },
  // Width. Open Sans only condenses (75-100), so this axis moves in one
  // direction. A font with a wider upper bound would move both ways.
  { label: '"wdth" 87.5', fontVariationSettings: '"wdth" 87.5' },
  { label: '"wdth" 75', fontVariationSettings: '"wdth" 75' },
  // Two axes at once, comma-separated. The form both platforms' parsers take.
  { label: '"wght" 800, "wdth" 75', fontVariationSettings: '"wght" 800, "wdth" 75' },
];

const FONT_VARIATION_FOOTER = Platform.select({
  android: 'RN <Text> has no fontVariationSettings. Variable fonts need API 26+.',
  default: 'RN <Text> has no fontVariationSettings style.',
});

// Three things about this section:
//
// - It is the one with nothing to compare against. RN <Text> has no
//   fontVariationSettings on either platform, so the scarlet overlay sits at
//   the font's default instance on every row while the grey box moves.
//   Two PRs tried to add it to core and both went stale unmerged
//   (react/react-native#44685 for iOS, #44667 for Android). See
//   docs/contributing/native-gotchas.md.
// - Every row needs a font whose file carries an fvar table, which no
//   system font usably does: SF keeps its axes private, and Roboto is
//   only variable from Android 12. Hence the bundled Open Sans (see
//   VARIABLE in ../theme), with wght 300-800 and wdth 75-100.
// - If every row looks identical, suspect the font before the prop. A
//   family that failed to resolve falls back silently, to SF on iOS (no
//   usable axes, so nothing moves) and to Roboto on Android (variable, so
//   the axes still apply and it looks like it worked). That asymmetry is
//   exactly how this section first read as iOS-only-broken.
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

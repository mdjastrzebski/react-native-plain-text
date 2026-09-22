import { Platform, type TextStyle } from 'react-native';
import { Section, TextItem } from '../components/Specimen';
import { SHORT_ROW_SIZE } from './shared';

// Own specimen: needs the ff/ffl ligature pairs and a full run of figures,
// which the pangram doesn't carry.
const FONT_VARIANT_SPECIMEN = 'Waffle office 0123456789';

// SF forms no ff/ffi/ffl ligatures and ships no oldstyle figures, so rows
// needing those features run in a serif (Baskerville, verified for small
// caps/oldstyle figures/ligatures) on iOS instead. Scoped to those rows only:
// SF handles tabular/proportional figures correctly, and a serif can
// reorganize its figure sets under 'tnum'/'pnum' in ways that read backwards
// (Hoefler Text does exactly that).
//
// Android needs no override: Roboto already carries the ff ligatures and 'onum'.
const FONT_VARIANT_FEATURE_FAMILY = Platform.select({ ios: 'Baskerville', default: undefined });

// `fontStyle: 'normal'` is not cosmetic: RN only attaches the span carrying
// fontFeatureSettings when fontStyle/fontWeight/fontFamily is also set, so
// fontVariant alone renders unchanged on Android's <Text> overlay (see
// docs/contributing/native-gotchas.md). Applied to both sides for an
// apples-to-apples comparison; it's a no-op for PlainText.
const fontVariantRow: TextStyle = { fontSize: SHORT_ROW_SIZE, fontStyle: 'normal' };

// The figure-spacing rows use fontVariantRow above; everything else uses this.
const fontVariantFeatureRow: TextStyle = {
  ...fontVariantRow,
  fontFamily: FONT_VARIANT_FEATURE_FAMILY,
};

// Same number of digits per row, differing only in which ones.
const TABULAR_FIGURE_ROWS = ['1111111111', '0123456789'];

// Typed against TextStyle rather than inferred: the literal unions are what make
// each entry assignable to the style prop's FontVariant[].
const FONT_VARIANTS: { label: string; fontVariant?: TextStyle['fontVariant'] }[] = [
  // Every row here must be able to *move*: 'lining-nums' and 'common-ligatures'
  // are defaults in both faces, so they were dropped as always-identical.
  { label: 'small-caps', fontVariant: ['small-caps'] },
  // Figure shape, not spacing (that's the tabular rows). Both faces default to
  // lining, so oldstyle is the direction that renders. Verified on both
  // platforms: Baskerville carries 'onum' on iOS, Roboto on Android.
  { label: 'oldstyle-nums', fontVariant: ['oldstyle-nums'] },
  // The one row that turns a default-on feature *off*: "Waffle office" loses
  // its ffl/ffi ligatures, so PlainText should differ from the overlay here.
  { label: 'no-common-ligatures', fontVariant: ['no-common-ligatures'] },
  // Exercises the array form with more than one entry.
  { label: 'small-caps + oldstyle-nums', fontVariant: ['small-caps', 'oldstyle-nums'] },
];

const FONT_VARIANT_FOOTER = Platform.select({
  ios: 'RN <Text> ignores the ligature values. (no-common-ligatures row)',
  default:
    'RN <Text> ignores the ligature values, and all of fontVariant unless another ' +
    "font prop is set (hence fontStyle 'normal').",
});

export function FontVariantSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Font Variant" footer={FONT_VARIANT_FOOTER}>
      <TextItem label="default" showText={showText} style={fontVariantRow}>
        {FONT_VARIANT_SPECIMEN}
      </TextItem>
      {/* Tabular figures make same-digit-count rows equally wide; proportional
        ones don't. Compare within a pair, never across. */}
      {TABULAR_FIGURE_ROWS.map((digits) => (
        <TextItem
          key={`tabular-${digits}`}
          label="tabular-nums"
          showText={showText}
          style={{ ...fontVariantRow, fontVariant: ['tabular-nums'] }}
        >
          {digits}
        </TextItem>
      ))}
      {TABULAR_FIGURE_ROWS.map((digits) => (
        <TextItem
          key={`proportional-${digits}`}
          label="proportional-nums"
          showText={showText}
          style={{ ...fontVariantRow, fontVariant: ['proportional-nums'] }}
        >
          {digits}
        </TextItem>
      ))}
      {/* Second baseline, in the serif the feature rows below use. */}
      <TextItem label="default" showText={showText} style={fontVariantFeatureRow}>
        {FONT_VARIANT_SPECIMEN}
      </TextItem>
      {FONT_VARIANTS.map(({ label, fontVariant }) => (
        <TextItem
          key={label}
          label={label}
          showText={showText}
          style={{ ...fontVariantFeatureRow, fontVariant }}
        >
          {FONT_VARIANT_SPECIMEN}
        </TextItem>
      ))}
    </Section>
  );
}

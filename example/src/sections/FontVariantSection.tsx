import { Platform, type TextStyle } from 'react-native';
import { Section, TextItem } from '../components/Specimen';
import { SHORT_ROW_SIZE } from './shared';

// Its own specimen: the Font Variant rows need the ff/ffl ligature pairs and a
// full run of figures in one string, and the pangram carries neither.
const FONT_VARIANT_SPECIMEN = 'Waffle office 0123456789';

// The section needs a font that actually carries the features, and SF does not:
// it forms no ff/ffi/ffl ligatures and ships no oldstyle figures, so those rows
// couldn't move on iOS no matter which side applied the value. So the rows that
// need those features run in a serif on iOS.
//
// Scoped to those rows only, and deliberately not to the figure-spacing ones. SF
// gets tabular/proportional right, whereas a serif can reorganize its figure sets
// under 'tnum'/'pnum' in ways that make the pair read backwards. Hoefler Text did
// exactly that, rendering its tabular row proportional and vice versa. Feature
// coverage varies face to face, so if a row here goes flat after a font change, try
// the next candidate before suspecting the prop: Palatino, Iowan Old Style, Charter,
// Didot. Baskerville is verified for small caps, oldstyle figures and the ff/ffi/ffl
// ligatures.
//
// Android needs no override. Roboto carries the ff ligatures and 'onum' both, so
// every row that can move there does. Naming a family would be harmless rather than
// forbidden: the CustomStyleSpan gate is already satisfied by the fontStyle 'normal'
// these rows carry.
const FONT_VARIANT_FEATURE_FAMILY = Platform.select({ ios: 'Baskerville', default: undefined });

// `fontStyle: 'normal'` is not cosmetic: it is what makes the scarlet <Text> overlay
// show any of this on Android. RN only attaches the span that carries
// fontFeatureSettings when fontStyle, fontWeight or fontFamily is set too, so
// fontVariant on its own renders unchanged there (see
// docs/contributing/native-gotchas.md). Applied to both sides rather than to the overlay
// alone, so the comparison stays apples-to-apples: it is a no-op for PlainText,
// which already resolves fontStyle 'normal' the same as unset. It does nudge RN's
// own paint (the span also sets isSubpixelText/isLinearText), which is
// unavoidable, since that span is RN's only carrier for the features.
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
  // Ordered by how often the value actually gets used in app UIs, commonest first.
  // The section renders the baseline row and the two figure-spacing values
  // (tabular-nums, proportional-nums) ahead of this list: those are the ones
  // reached for most, and they need paired rows to show anything, so they can't be
  // driven from here.
  //
  // Every row here has to be able to *move*. A value that asks a font for what it
  // already does renders identically to the baseline row above it by construction,
  // so it can never fail and reading it teaches nothing: 'lining-nums' and
  // 'common-ligatures' are both defaults in both faces, and both were dropped.
  //
  // Everyday: headers, labels, acronyms set at text size.
  { label: 'small-caps', fontVariant: ['small-caps'] },
  // Editorial/serif typography. This is the figure *shape*, not the spacing the
  // tabular rows cover. Lining figures all sit on the baseline at cap height
  // (1234567890). Oldstyle ones vary, with 3456789 dropping below it and 68 rising
  // above, so digits blend into lowercase the way a printed book sets them. Both
  // faces default to lining, so asking for oldstyle is the direction that renders.
  // Verified on both platforms: Baskerville carries 'onum' on iOS, Roboto on Android.
  { label: 'oldstyle-nums', fontVariant: ['oldstyle-nums'] },
  // Niche, but the one row that turns a default-on feature *off*, which is the only
  // way a ligature value can be seen at all: "Waffle office" loses its ffl/ffi
  // ligatures. Both fonts here carry them, so this is where PlainText's box should
  // differ from the <Text> overlay on either platform.
  { label: 'no-common-ligatures', fontVariant: ['no-common-ligatures'] },
  // Not a real-world combination. Here so the array form is exercised with more
  // than one entry.
  { label: 'small-caps + oldstyle-nums', fontVariant: ['small-caps', 'oldstyle-nums'] },
];

// Per-platform: the RN <Text> gaps and the fonts differ. Detail in
// docs/contributing/native-gotchas.md.
const FONT_VARIANT_FOOTER = Platform.select({
  ios: 'RN <Text> ignores the ligature values. (no-common-ligatures row)',
  default:
    'RN <Text> ignores the ligature values, and all of fontVariant unless another ' +
    "font prop is set (hence fontStyle 'normal').",
});

// fontVariant turns OpenType features on, so a row only changes if the font
// actually carries the feature, which is why iOS runs these rows in a serif
// rather than SF, from the second baseline row down. See
// FONT_VARIANT_FEATURE_FAMILY. The figure-spacing rows above it stay on the
// system font, which handles tabular/proportional correctly. A row that
// looks like its baseline is usually a missing feature, not a broken prop.
export function FontVariantSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Font Variant" footer={FONT_VARIANT_FOOTER}>
      {/* Baseline to compare every row below against. */}
      <TextItem label="default" showText={showText} style={fontVariantRow}>
        {FONT_VARIANT_SPECIMEN}
      </TextItem>
      {/* Figure spacing first: the pair of values people actually reach for.
        It shows up as width: the two rows of each pair have the same digit
        count, so tabular figures make them equally wide (each row
        shrink-wraps to its text) and proportional ones do not. Compare
        within a pair, never across. The value name sits in the label gutter
        rather than in the string, so the row measures the digits and nothing
        else. */}
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
      {/* Second baseline, in the serif the feature rows below use, so they have
        something to differ from. On Android it is the same font as the first
        baseline: that platform stays on the system font throughout. */}
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

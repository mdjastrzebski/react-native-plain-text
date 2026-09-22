import { Platform, type TextStyle } from 'react-native';
import { Section, TextItem } from '../components/Specimen';

// fontFamily is required (not optional) so a row's content can't come out empty.
type FontFamilyRow = { label: string; style: TextStyle & { fontFamily: string } };

// Each row exercises a branch of the iOS resolution in ios/PlainTextFont.mm
// (weight matching, single-cut families, face names, etc). Names are verified
// present in the iOS 26.5 simulator runtime.
//
// Face name vs Unresolvable is the key pair: resolution used to match only
// UIFontDescriptorFamilyAttribute, so a face name silently fell back to the
// system font — indistinguishable from a typo. Both should match the scarlet
// <Text> overlay.
//
// Android resolves fontFamily via Typeface family names (no weight matching),
// so its rows are analogs rather than the same cases.
const PLATFORM_FONT_ROWS: FontFamilyRow[] = Platform.select({
  ios: [
    { label: 'System', style: { fontSize: 26, fontFamily: 'System' } },
    { label: 'Georgia', style: { fontSize: 26, fontFamily: 'Georgia' } },
    { label: 'Menlo', style: { fontSize: 26, fontFamily: 'Menlo' } },
    { label: 'Courier', style: { fontSize: 26, fontFamily: 'Courier' } },
    {
      // Renders in the Ultra Light cut, not a system font at weight 100.
      label: 'Family and weight',
      style: { fontSize: 26, fontFamily: 'Avenir Next', fontWeight: '100' },
    },
    {
      // Zapfino has one cut, so bold has nothing to resolve to and stays Zapfino.
      label: 'Single-cut family',
      style: { fontSize: 26, fontFamily: 'Zapfino', fontWeight: 'bold' },
    },
    {
      // RCTGetFontWeight matches by name suffix, tested in order: "ultralight"
      // must precede "light" or this would resolve to UltraLight instead.
      label: 'Weight with a real cut',
      style: { fontSize: 26, fontFamily: 'Helvetica Neue', fontWeight: '200' },
    },
    {
      // Same cut as above, named directly: no family matches this string, so
      // it resolves as a face instead.
      label: 'Weight suffix in the name',
      style: { fontSize: 26, fontFamily: 'HelveticaNeue-Thin' },
    },
    {
      // Copperplate has no italic cut, so the slant filter rejects every face,
      // the first one is taken, and the slant is synthesized on top.
      label: 'Slant with no cut',
      style: { fontSize: 26, fontFamily: 'Copperplate', fontStyle: 'italic' },
    },
    {
      // A face carries its own slant, so nothing here is synthesized.
      label: 'Face name',
      style: { fontSize: 26, fontFamily: 'Georgia-BoldItalic' },
    },
    {
      // The family path filters out condensed faces, so a face name is the
      // only way to reach them.
      label: 'Condensed face',
      style: { fontSize: 26, fontFamily: 'HelveticaNeue-CondensedBlack' },
    },
  ],
  default: [
    { label: 'System', style: { fontSize: 26, fontFamily: 'System' } },
    { label: 'serif', style: { fontSize: 26, fontFamily: 'serif' } },
    { label: 'monospace', style: { fontSize: 26, fontFamily: 'monospace' } },
    {
      label: 'sans-serif-condensed',
      style: { fontSize: 26, fontFamily: 'sans-serif-condensed' },
    },
    {
      // Renders in the Thin cut.
      label: 'Family and weight',
      style: { fontSize: 26, fontFamily: 'sans-serif', fontWeight: '100' },
    },
    {
      label: 'Single-cut family',
      style: { fontSize: 26, fontFamily: 'cursive' },
    },
    {
      label: 'Condensed face',
      style: { fontSize: 26, fontFamily: 'sans-serif-condensed-light' },
    },
    {
      // Light rather than Thin, so distinguishable from the row above.
      label: 'Weight with a real cut',
      style: { fontSize: 26, fontFamily: 'sans-serif', fontWeight: '300' },
    },
    {
      label: 'Weight suffix in the name',
      style: { fontSize: 26, fontFamily: 'sans-serif-light' },
    },
    {
      // Synthesized here too: the family carries no italic cut.
      label: 'Slant with no cut',
      style: { fontSize: 26, fontFamily: 'monospace', fontStyle: 'italic' },
    },
    {
      label: 'Named cut',
      style: { fontSize: 26, fontFamily: 'sans-serif-medium' },
    },
  ],
});

// Custom fonts loaded via expo-font (App.tsx). On iOS, expo-font swizzles
// +fontNames(forFamilyName:) so an unknown family retries as an alias and
// returns the resolved PostScript name — UIFontDescriptorFamilyAttribute
// matching doesn't call it, which is why these rows used to fall back to the
// system font. (An earlier fix checking for a 0-length result never worked:
// the swizzle returns one name, not none.)
//
// Android needs no such workaround: expo-font registers the aliases into
// ReactFontManager, which PlainTextView.applyTypeface already resolves through.
const CUSTOM_FONT_ROWS: FontFamilyRow[] = [
  {
    label: 'expo-font alias',
    style: { fontSize: 26, fontFamily: 'Inter_400Regular' },
  },
  {
    // Each cut is loaded under its own alias, so weight lives in the name
    // rather than in fontWeight: no sibling cut to match against.
    label: 'expo-font alias, heavier cut',
    style: { fontSize: 26, fontFamily: 'Inter_600SemiBold' },
  },
  {
    // Slant in the name too, for the same reason. Face is already italic, so
    // nothing is synthesized.
    label: 'expo-font alias, light italic',
    style: { fontSize: 26, fontFamily: 'Inter_300Light_Italic' },
  },
];

const UNRESOLVABLE_FONT_ROW: FontFamilyRow = {
  label: 'Unresolvable name',
  style: { fontSize: 26, fontFamily: 'NoSuchFont-Regular' },
};

const FONT_FAMILY_RESOLUTION: FontFamilyRow[] = [
  ...PLATFORM_FONT_ROWS,
  ...CUSTOM_FONT_ROWS,
  UNRESOLVABLE_FONT_ROW,
];

const FONT_FAMILY_RESOLUTION_FOOTER = Platform.select({
  ios: 'Compare Text should agree on every row. Inter_* are expo-font aliases, one per cut.',
  default: 'The built-in rows are Android analogs. Inter_* are expo-font aliases, one per cut.',
});

export function FontFamilySection({ showText }: { showText: boolean }) {
  return (
    <Section title="Font Family" footer={FONT_FAMILY_RESOLUTION_FOOTER}>
      {FONT_FAMILY_RESOLUTION.map(({ label, style }) => (
        <TextItem key={label} label={label} showText={showText} style={style}>
          {style.fontFamily}
        </TextItem>
      ))}
    </Section>
  );
}

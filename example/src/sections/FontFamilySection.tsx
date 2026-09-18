import { Platform, type TextStyle } from 'react-native';
import { Section, TextItem } from '../components/Specimen';

// Each row renders its own fontFamily value as its content, so what you read is
// what was passed. There is no second copy of the name to fall out of step with
// the style, and fontFamily is required rather than optional so the content
// can't come out empty.
type FontFamilyRow = { label: string; style: TextStyle & { fontFamily: string } };

// The first rows are plain registered family names, which resolve the easy way.
// The rest take the names that don't, a row per branch of the iOS resolution in
// ios/PlainTextFont.mm: weight matching inside a family, a family carrying a
// single cut, a name that is neither family nor face, a face the family path
// can't reach, a weight met by a real cut, the same cut named outright, a slant
// met by none, and a face name.
//
// Every face and family here is verified present in the iOS 26.5 simulator
// runtime, and the PostScript names are read from its font files rather than
// guessed. A name that isn't installed renders as the system font, which is
// what the Unresolvable row is for, so a wrong name elsewhere would quietly read
// as a passing row.
//
// The Face name and Unresolvable rows are the pair worth watching together.
// Resolution used to match UIFontDescriptorFamilyAttribute, which takes a
// registered family name and nothing else, so a face name silently produced the
// system font, the very thing an unresolvable name produces, which is what made
// the bug hard to see: a loaded custom font and a typo rendered identically.
// They should look different now, and both should match the scarlet <Text> overlay.
//
// Android resolves fontFamily through Typeface family names, with no PostScript
// names and no weight matching to do, so its rows are the nearest analogs rather
// than the same cases.
const PLATFORM_FONT_ROWS: FontFamilyRow[] = Platform.select({
  ios: [
    // The straightforward ones first: a registered family name, which is the
    // only thing the resolution this section exercises never had trouble with.
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
      // One cut in the family, so the bold has nothing to resolve to and must
      // leave the row in Zapfino rather than fall back.
      label: 'Single-cut family',
      style: { fontSize: 26, fontFamily: 'Zapfino', fontWeight: 'bold' },
    },
    {
      // HelveticaNeue-Thin, picked because RCTGetFontWeight reads the name suffix:
      // a weight trait alone would not have singled it out. Also the order in
      // that suffix list earning its keep: the family carries UltraLight, Thin
      // and Light, and "ultralight" has to be tested before "light" or the
      // UltraLight face would answer to weight 300.
      label: 'Weight with a real cut',
      style: { fontSize: 26, fontFamily: 'Helvetica Neue', fontWeight: '200' },
    },
    {
      // The same cut, asked for by name instead of by weight. Renders identically
      // to the row above, by a different branch: no family matches this string, so
      // it resolves as a face.
      label: 'Weight suffix in the name',
      style: { fontSize: 26, fontFamily: 'HelveticaNeue-Thin' },
    },
    {
      // Copperplate ships Regular, Light and Bold, and no italic. So the slant
      // filter rejects every cut, the first face is taken instead, and the slant
      // on top of it is synthesized. Contrast with the Georgia row, which has a
      // real italic to find.
      label: 'Slant with no cut',
      style: { fontSize: 26, fontFamily: 'Copperplate', fontStyle: 'italic' },
    },
    {
      // A face carries its own slant, so fontStyle stays out of this row:
      // nothing in it is synthesized.
      label: 'Face name',
      style: { fontSize: 26, fontFamily: 'Georgia-BoldItalic' },
    },
    {
      // Both Condensed cuts sit in family "Helvetica Neue", but the family path
      // filters condensed faces out, so no weight reaches them there: a face
      // name is the only way in. The two branches are not interchangeable.
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
      // Light rather than Thin, so this pair stays distinguishable from the
      // family-and-weight row above.
      label: 'Weight with a real cut',
      style: { fontSize: 26, fontFamily: 'sans-serif', fontWeight: '300' },
    },
    {
      label: 'Weight suffix in the name',
      style: { fontSize: 26, fontFamily: 'sans-serif-light' },
    },
    {
      // Android synthesizes the slant here too, for the same reason: the family
      // carries no italic cut.
      label: 'Slant with no cut',
      style: { fontSize: 26, fontFamily: 'monospace', fontStyle: 'italic' },
    },
    {
      label: 'Named cut',
      style: { fontSize: 26, fontFamily: 'sans-serif-medium' },
    },
  ],
});

// Custom fonts, as against the platform built-ins above, and the only rows in
// this section that are the same on iOS and Android, because the name is ours
// rather than the platform's. Loaded in App.tsx via expo-font, which is how most
// apps get a custom font, and the reason this section exists: it is the case the
// old resolution failed on hardest.
//
// What expo-font does on iOS, in its own words (ios/UIFont+FontFamilyAlias.swift):
// it swizzles +fontNames(forFamilyName:) so that an unknown family name gets
// retried as an alias, and when the alias resolves to a PostScript name that is
// not itself a family, it answers with that one name in a one-element array.
// So resolution reaches the face only if it goes through that method:
// UIFontDescriptorFamilyAttribute matching does not call it, which is why every
// row here used to come out as the system font.
//
// It is also why the earlier attempt at this fix, which special-cased
// `fontNamesForFamilyName:.count == 0`, could never have worked in an Expo app:
// the swizzle returns one name, not none.
//
// On Android the same aliases resolve without any of this: expo-font registers
// them into ReactFontManager (android FontLoaderModule.kt), which is what
// PlainTextView.applyTypeface already resolves through.
const CUSTOM_FONT_ROWS: FontFamilyRow[] = [
  {
    label: 'expo-font alias',
    style: { fontSize: 26, fontFamily: 'Inter_400Regular' },
  },
  {
    // Each cut is loaded under its own alias, so weight lives in the name here
    // rather than in fontWeight: one alias is a one-face family, and there is
    // no sibling cut for a weight to match against.
    label: 'expo-font alias, heavier cut',
    style: { fontSize: 26, fontFamily: 'Inter_600SemiBold' },
  },
  {
    // Slant in the name too, and for the same reason. Nothing synthesized: the
    // face is already italic, so plainTextFont's italic round-trip is skipped.
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

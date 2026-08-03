import { Platform } from 'react-native';

// One palette for the whole app, so the specimens on every screen read as pages
// of a single printed book rather than a swatch test.
//
// The neutrals carry the page: ink through line is a single cool-grey ramp, and
// everything structural (cover, headings, labels, rules, row backgrounds) comes
// from it alone.
//
// The accents are named after pigments, not after the screen's primaries, because
// nothing here has to prove that the color *blue* works — only that a color prop
// does. So they're chosen as a set that sits with the grey page: all five land in
// the same narrow lightness band, dark enough to read as text on white and to hold
// a hairline border, light enough not to compete with the ink.
//
// Lightness is what holds the set together, so chroma is free to be high, and it
// is: these are saturated pigments, not muted ones. What UI default palettes get
// wrong for this screen isn't saturation, it's the spread — a #3e63dd blue against
// a #30a46c mint puts a mid-tone next to a light one, and the pair reads as two
// unrelated signals shouting over the type. Indigo is the deepest of the five, but
// only by the same margin a blue needs to match the others in lightness.
//
// Each accent has one `…Wash` tint mixed toward the neutral ramp rather than toward
// its own hue, so a tinted box sits at about the same lightness as the plain grey
// row next to it, and the two `…Ink` values are the darkened versions used for text
// set on the matching wash.
export const COLOR = {
  // Neutral ramp, dark to light.
  ink: '#11181c',
  inkSoft: '#3a3f42',
  muted: '#687076',
  faint: '#889096',
  disabled: '#b8bcbf',
  line: '#d7dbdf',
  wash: '#f0f2f4',
  paper: '#ffffff',
  // Reversed-out pairing: near-black surface and the off-white set on it.
  inkSurface: '#1c2024',
  paperDim: '#e6e8eb',
  // Accents.
  indigo: '#2f55c0',
  indigoWash: '#ebeff9',
  oxblood: '#a92435',
  oxbloodInk: '#6b1a24',
  oxbloodWash: '#f8eeef',
  moss: '#4a8530',
  mossInk: '#34611f',
  mossWash: '#eef4e9',
  ochre: '#ad7100',
  ochreWash: '#f9f2e3',
  plum: '#77399f',
  plumWash: '#f3edf8',
  // The "Vs <Text>" overlay, and deliberately not one of the accents above. Aged
  // brass says both halves of what the overlay is: RN's own <Text> is the reference
  // every specimen is measured against, and it is also the older of the two ways to
  // draw a string. Red said only "error".
  //
  // It sits in the accents' lightness band, between moss and ochre, so it reads as
  // part of the same printed page. It is kept out of the accent set because the
  // accents are what the specimens demo `color` with, and an overlay that could be
  // any row's own text color is not a comparison. Hue is pushed olive of ochre's, far
  // enough that the two never read as one pigment. Chroma is the one place it can't
  // match: at this lightness sRGB has no more saturated gold, so it runs a shade
  // quieter than the five, which for a translucent overlay is the right direction
  // anyway.
  brass: '#847526',
} as const;

// Font family names aren't portable across platforms, so the rows that need a
// monospace or a serif face by name pick the equivalent built-in for each.
export const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });
export const SERIF = Platform.select({ ios: 'Georgia', default: 'serif' });

// The one bundled face, and the only one `fontVariationSettings` can move: it is
// bundled at build time by the expo-font config plugin (example/app.json) from
// assets/fonts/OpenSans.ttf, the variable release, with a wght axis (300-800,
// default 400) and a wdth axis (75-100, default 100). No system font usably has
// an fvar table — SF keeps its axes private, and Roboto is variable only from
// Android 12 — so every row that varies an axis has to name this family.
//
// Unlike MONO and SERIF the two names are the same font file. They differ
// because RN resolves a bundled family differently per platform: from the asset
// file name on Android (ReactFontManager.createAssetTypeface), from the family
// name inside the font file on iOS. They would coincide if the file were named
// after the family, and "Open Sans" has a space in it.
//
// Adding this font is why the sections that use it need a native rebuild rather
// than a Metro reload.
export const VARIABLE = Platform.select({ ios: 'Open Sans', default: 'OpenSans' });

import { Section } from '../components/Specimen';
import { COLOR, MONO, SERIF } from '../theme';
import { UseCaseItemRow, type Combination } from './useCaseShared';

// Fixed, hand-written lists (never generated, never shuffled) so two runs of
// the app render byte-identical rows and screenshots diff cleanly.
//
// Arbitrary stacks of three to five props, there to catch interactions the
// realistic use-case rows happen to avoid. Several are ugly, and some are
// outright broken layouts (padding taller than the box, a radius larger than
// half the height, text that outgrows a fixed height at 4x scaling), but each
// one is a shape a real app can end up in by accident. Combinations that cannot
// occur outside a test harness, and so tell us nothing when they render wrong,
// don't belong here.
//
// Each row is named for the one thing it probes, and no two probe the same thing.
// A row that is another row's stack minus a prop is not a second data point: it
// costs a screenful of scrolling and, when the pair disagrees with the overlay
// together, twice the reading to reach the one conclusion. So a new row has to
// name something no existing row already covers: a right-aligned tracked serif,
// display type clipped at one line, a clamp that does not bite, and a centered
// head-truncated line are each here exactly once.
//
// Color in this section carries one meaning rather than one per row. Every row is
// the neutral ramp unless it needs a tint to make its own subject visible, and then
// there are only two: indigo where a surface is there to show a box's extents
// (the leading, the padding, the corner radii, the whitespace) and oxblood on the
// rows whose box is wrong on purpose (glyphs taller than the line, padding taller
// than the box, a radius past half the height, text left free to outgrow its
// height). Borders that are only structure stay on the ramp. Cycling five pigments
// down the list made each row look like a statement about its color, which is the
// one thing none of them is about.
//
// Rendered after every other group in the screen, for the same reason it is a
// single section here rather than several: it is the one group whose rows no
// app would deliberately write.
const ITEMS: Combination[] = [
  {
    label: 'tracked-serif-right',
    text: 'Negative tracking on a thin serif face, right-aligned in a wide box.',
    style: {
      width: '100%',
      fontSize: 21,
      fontFamily: SERIF,
      fontWeight: '300',
      letterSpacing: -1.2,
      textAlign: 'right',
    },
  },
  {
    label: 'dashed-clamped-middle',
    text: 'Dashed border, generous padding, centered, clamped to one line and truncated in the middle.',
    style: {
      width: '100%',
      fontSize: 15,
      textAlign: 'center',
      padding: 14,
      borderWidth: 2,
      borderColor: COLOR.faint,
      borderStyle: 'dashed',
    },
    numberOfLines: 1,
    ellipsizeMode: 'middle',
  },
  {
    label: 'leading-far-over-size',
    text: 'lineHeight 44 under a 13pt font, underlined, on a background so the leading is visible.',
    style: {
      width: '100%',
      fontSize: 13,
      lineHeight: 44,
      textDecorationLine: 'underline',
      color: COLOR.indigo,
      backgroundColor: COLOR.indigoWash,
    },
  },
  {
    label: 'valign-bottom-justified',
    text: 'verticalAlign bottom in a 90pt box, italic, justified',
    style: {
      width: '100%',
      height: 90,
      fontSize: 15,
      fontStyle: 'italic',
      textAlign: 'justify',
      verticalAlign: 'bottom',
      color: COLOR.indigo,
      backgroundColor: COLOR.indigoWash,
    },
  },
  {
    label: 'valign-middle-asym-padding',
    text: 'verticalAlign middle, 6pt left border, asymmetric padding, weight 100',
    style: {
      width: '100%',
      height: 80,
      fontSize: 17,
      fontWeight: '100',
      verticalAlign: 'middle',
      paddingLeft: 24,
      paddingRight: 4,
      borderLeftWidth: 6,
      borderLeftColor: COLOR.faint,
    },
  },
  {
    label: 'break-then-clamped-run',
    text: 'Hard break then a long run:\nborder + padding + three-line clamp on a wrapping string that has to spill past the limit.',
    style: {
      width: '100%',
      fontSize: 14,
      lineHeight: 21,
      padding: 10,
      borderWidth: 3,
      borderColor: COLOR.faint,
      borderRadius: 8,
    },
    numberOfLines: 3,
  },
  {
    label: 'reversed-head-truncated',
    text: 'Reversed out, 2pt tracking, centered, no font scaling, one line, head-truncated when it overflows.',
    style: {
      width: '100%',
      fontSize: 15,
      color: COLOR.paper,
      backgroundColor: COLOR.inkSurface,
      letterSpacing: 2,
      textAlign: 'center',
    },
    numberOfLines: 1,
    ellipsizeMode: 'head',
    allowFontScaling: false,
  },
  {
    label: 'clamp-cuts-hard-breaks',
    text: 'A\nBB\nCCC (three hard-broken lines under a two-line clamp, monospace, centered)',
    style: { width: '100%', fontSize: 14, fontFamily: MONO, textAlign: 'center', lineHeight: 26 },
    numberOfLines: 2,
    ellipsizeMode: 'tail',
  },
  {
    label: 'intrinsic-padded-pill',
    text: 'No width set: intrinsic sizing with padding, border radius and italic serif.',
    style: {
      fontSize: 16,
      fontFamily: SERIF,
      fontStyle: 'italic',
      color: COLOR.indigo,
      backgroundColor: COLOR.indigoWash,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 999,
    },
  },
  {
    label: 'valign-top-bordered',
    text: 'verticalAlign top in a 100pt box with a 4pt border and 18pt padding, weight 700, underlined.',
    style: {
      width: '100%',
      height: 100,
      fontSize: 16,
      fontWeight: '700',
      textDecorationLine: 'underline',
      verticalAlign: 'top',
      padding: 18,
      borderWidth: 4,
      borderColor: COLOR.faint,
    },
  },
  {
    label: 'justified-mono',
    text: 'Justified monospace with a dashed bottom border, negative tracking and no scaling at all.',
    style: {
      width: '100%',
      fontSize: 13,
      fontFamily: MONO,
      textAlign: 'justify',
      letterSpacing: -0.5,
      lineHeight: 24,
      paddingBottom: 10,
      borderBottomWidth: 2,
      borderBottomColor: COLOR.faint,
      borderStyle: 'dashed',
    },
    allowFontScaling: false,
  },
  {
    label: 'everything-at-once',
    text: 'Everything at once: serif bold italic, underlined, centered, tracked, bordered, padded, capped at 1.4x and clamped to three lines on a string long enough to actually hit that clamp.',
    style: {
      width: '100%',
      fontSize: 17,
      fontFamily: SERIF,
      fontWeight: 'bold',
      fontStyle: 'italic',
      color: COLOR.indigo,
      backgroundColor: COLOR.indigoWash,
      textAlign: 'center',
      textDecorationLine: 'underline',
      letterSpacing: 0.8,
      lineHeight: 26,
      padding: 12,
      borderWidth: 2,
      borderColor: COLOR.indigo,
      borderRadius: 10,
    },
    numberOfLines: 3,
    maxFontSizeMultiplier: 1.4,
  },
  {
    label: 'per-corner-radii',
    text: 'Per-corner radii on a padded background: 24 top-left, 0 top-right, 24 bottom-right, 0 bottom-left.',
    style: {
      width: '100%',
      fontSize: 15,
      color: COLOR.indigo,
      backgroundColor: COLOR.indigoWash,
      padding: 14,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 0,
      borderBottomRightRadius: 24,
      borderBottomLeftRadius: 0,
    },
  },
  {
    label: 'four-edge-borders',
    // Four edges resolved independently, which is the point, so they differ by
    // width and by step on the neutral ramp rather than by hue. Four pigments read
    // as a swatch test and said nothing the four widths do not.
    text: 'Four borders, four different widths and tones, with matching asymmetric padding.',
    style: {
      width: '100%',
      fontSize: 14,
      lineHeight: 22,
      paddingTop: 4,
      paddingRight: 20,
      paddingBottom: 16,
      paddingLeft: 8,
      borderTopWidth: 1,
      borderTopColor: COLOR.ink,
      borderRightWidth: 5,
      borderRightColor: COLOR.muted,
      borderBottomWidth: 3,
      borderBottomColor: COLOR.faint,
      borderLeftWidth: 8,
      borderLeftColor: COLOR.line,
    },
  },
  {
    label: 'zero-width-space',
    text: 'Zero-width space test​between​words with a two-line clamp and tail ellipsis on a long enough string to reach it.',
    style: { width: '100%', fontSize: 15, lineHeight: 22, color: COLOR.inkSoft },
    numberOfLines: 2,
    ellipsizeMode: 'tail',
  },
  {
    label: 'overlong-words-wrapped',
    text: 'Supercalifragilisticexpialidocious-antidisestablishmentarianism-pneumonoultramicroscopicsilicovolcanoconiosis',
    style: {
      width: '100%',
      fontSize: 16,
      fontFamily: MONO,
      padding: 8,
      color: COLOR.inkSoft,
      backgroundColor: COLOR.wash,
    },
  },
  {
    label: 'unbreakable-word-truncated',
    text: 'One unbreakable word, one line, middle-truncated: Donaudampfschiffahrtselektrizitaetenhauptbetriebswerkbauunterbeamtengesellschaft',
    style: { width: '100%', fontSize: 14, letterSpacing: 0.5 },
    numberOfLines: 1,
    ellipsizeMode: 'middle',
  },
  {
    label: 'mixed-scripts',
    text: 'Mixed scripts in one run: English · Ελληνικά · Кириллица · العربية · 日本語 · 한국어 · עברית',
    style: { width: '100%', fontSize: 17, lineHeight: 28 },
  },
  {
    label: 'emoji-clusters',
    text: 'Emoji at 28pt with tracking: 🎯 ✨ 🚀 👩‍👩‍👧‍👦 🇵🇱 🏳️‍🌈 (clamped to one line)',
    style: { width: '100%', fontSize: 28, letterSpacing: 3, lineHeight: 40 },
    numberOfLines: 1,
    ellipsizeMode: 'tail',
  },
  {
    label: 'rtl-arabic',
    text: 'ثم نص عربي طويل بمحاذاة يمينية داخل صندوق عريض مع حشوة وحدود.',
    style: {
      width: '100%',
      fontSize: 18,
      textAlign: 'right',
      padding: 12,
      borderWidth: 1,
      borderColor: COLOR.faint,
    },
  },
  {
    label: 'combining-diacritics',
    text: 'Combining diacritics stacked: éééé àààà ñññ ẛ̣ ǫ̈, with a tight 14pt line height under 20pt glyphs.',
    style: {
      width: '100%',
      fontSize: 20,
      lineHeight: 14,
      color: COLOR.oxbloodInk,
      backgroundColor: COLOR.oxbloodWash,
    },
  },
  {
    label: 'edge-whitespace',
    text: '   Leading and trailing whitespace   ',
    style: {
      fontSize: 16,
      fontFamily: MONO,
      color: COLOR.indigo,
      backgroundColor: COLOR.indigoWash,
      borderWidth: 1,
      borderColor: COLOR.indigo,
    },
  },
  {
    label: 'leading-newlines',
    text: '\n\nThree leading newlines before any glyph, inside a bordered box.',
    style: {
      width: '100%',
      fontSize: 14,
      lineHeight: 20,
      padding: 8,
      borderWidth: 2,
      borderColor: COLOR.faint,
      borderRadius: 6,
    },
  },
  {
    label: 'tab-separated',
    text: 'Tab\tseparated\tcolumns\tin\tmonospace under a one-line clip.',
    style: { width: '100%', fontSize: 13, fontFamily: MONO, letterSpacing: 1 },
    numberOfLines: 1,
    ellipsizeMode: 'clip',
  },
  {
    label: 'single-glyph',
    text: '·',
    style: {
      fontSize: 12,
      color: COLOR.ink,
      backgroundColor: COLOR.wash,
      textAlign: 'center',
      padding: 2,
      borderRadius: 999,
    },
  },
  {
    label: 'display-clipped',
    text: '72pt uppercase with -4 tracking, clipped',
    style: {
      width: '100%',
      fontSize: 72,
      fontWeight: '800',
      letterSpacing: -4,
      color: COLOR.ink,
      lineHeight: 68,
    },
    numberOfLines: 1,
    ellipsizeMode: 'clip',
  },
  {
    label: 'glyphs-taller-than-box',
    text: 'Fixed 40pt box holding 26pt text: the glyphs are taller than the line box allows.',
    style: {
      width: '100%',
      height: 40,
      fontSize: 26,
      color: COLOR.oxbloodInk,
      backgroundColor: COLOR.oxbloodWash,
      verticalAlign: 'middle',
    },
    numberOfLines: 1,
  },
  {
    label: 'padding-taller-than-box',
    // How an app actually reaches this: a row pinned to a fixed height by design,
    // and a vertical padding token that outgrows it. 60-inside-70 said the same
    // thing but only a test harness would type it.
    text: 'A 36pt fixed row with the 20pt padding token on both edges: the padding alone is taller than the box.',
    style: {
      width: '100%',
      height: 36,
      fontSize: 14,
      paddingVertical: 20,
      color: COLOR.oxbloodInk,
      backgroundColor: COLOR.oxbloodWash,
      borderWidth: 1,
      borderColor: COLOR.oxblood,
    },
  },
  {
    label: 'radius-past-half-height',
    text: 'Border radius 40 on a box only 30pt tall: the radius is larger than half the height.',
    style: {
      width: '100%',
      height: 30,
      fontSize: 13,
      textAlign: 'center',
      verticalAlign: 'middle',
      color: COLOR.oxbloodInk,
      backgroundColor: COLOR.oxbloodWash,
      borderWidth: 2,
      borderColor: COLOR.oxblood,
      borderRadius: 40,
    },
    numberOfLines: 1,
  },
  {
    label: 'rgba-on-rgba',
    text: 'Semi-transparent color over a semi-transparent background, both rgba, with a 3pt rgba border.',
    style: {
      width: '100%',
      fontSize: 16,
      // The palette's own ink and indigo with an alpha, so the only thing new on
      // this row is the transparency.
      color: 'rgba(17, 24, 28, 0.45)',
      backgroundColor: 'rgba(47, 85, 192, 0.13)',
      padding: 12,
      borderWidth: 3,
      borderColor: 'rgba(47, 85, 192, 0.5)',
    },
  },
  {
    label: 'unlimited-lines-narrow-box',
    text: 'numberOfLines 0 means unlimited: this string wraps as far as it needs to inside a narrow padded box with a dashed border and a serif face.',
    style: {
      width: 180,
      fontSize: 14,
      fontFamily: SERIF,
      lineHeight: 20,
      padding: 8,
      borderWidth: 2,
      borderColor: COLOR.faint,
      borderStyle: 'dashed',
    },
    numberOfLines: 0,
  },
  {
    label: 'scaling-capped-at-1x',
    text: 'Scaling capped at exactly 1.0, so this row must not grow at any accessibility text size.',
    style: {
      width: '100%',
      fontSize: 18,
      fontWeight: '600',
      color: COLOR.indigo,
      backgroundColor: COLOR.indigoWash,
      padding: 10,
    },
    maxFontSizeMultiplier: 1,
  },
  {
    label: 'scaling-outgrows-box',
    text: 'Scaling uncapped at 4x with a fixed 60pt height: the text is allowed to outgrow its own box.',
    style: {
      width: '100%',
      height: 60,
      fontSize: 15,
      verticalAlign: 'top',
      color: COLOR.oxbloodInk,
      backgroundColor: COLOR.oxbloodWash,
      paddingHorizontal: 8,
    },
    maxFontSizeMultiplier: 4,
  },
];

export function RandomCombinationsSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Random Combinations">
      {ITEMS.map((item) => (
        <UseCaseItemRow key={item.label} item={item} showText={showText} />
      ))}
    </Section>
  );
}

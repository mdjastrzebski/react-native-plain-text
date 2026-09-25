import type { TextStyle } from 'react-native';
import { COLOR, MONO, SERIF } from '../theme';

// A row that varies several props stacked in one style, rendered by VrtUseCase
// as one PlainText with one string.
export type Combination = {
  kind?: undefined;
  label: string;
  text: string;
  style: TextStyle;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  allowFontScaling?: boolean;
  maxFontSizeMultiplier?: number;
};

// A row with several PlainTexts sharing one `alignItems: "baseline"` line,
// which a Combination's single string/style can't express: a price beside
// its VAT note, a heading beside its badge. `label` still names the row, but
// there is no single `style`/`text` to spread onto one PlainText.
export type BaselineCombination = {
  kind: 'baseline';
  label: string;
  parts: { text: string; style: TextStyle }[];
};

export type UseCaseItem = Combination | BaselineCombination;

// A group preserves the original fixture ordering for stable VRT screenshots.
type UseCaseGroup = {
  title: string;
  items: UseCaseItem[];
};

// Fixed, hand-written lists (never generated, never shuffled) so two runs of
// the app render byte-identical rows and screenshots diff cleanly.
//
// Every color comes from `COLOR`, and a row that sets a tinted background takes
// its text color from the same pigment (`…Ink` where the palette has one), so a
// tinted row sits at the page's lightness instead of putting arbitrary black type
// on a colored box. Only the rgba row spells values out, and those are the
// palette's own hexes with an alpha.
//
// The groups below are shapes that show up in real UIs, ordered by how often the
// shape is reached for: headings and body text first, then the controls, then the
// narrower cases. So a reader who stops scrolling a third of the way down has
// still seen the shapes their own app is mostly made of, and a regression in the
// rows that matter most is the first thing on the screen rather than the last.
// RANDOM_USE_CASES is rendered after all of them, for the same reason: it is the
// one group whose rows no app would deliberately write.
export const USE_CASE_GROUPS: UseCaseGroup[] = [
  // Display type: the biggest thing on a screen, the title inside a card, and the
  // tracked cap-height label that separates two groups of rows.
  {
    title: 'Headings',
    items: [
      {
        label: 'hero-heading',
        text: 'Native text, measured once by the platform',
        style: {
          width: '100%',
          fontSize: 32,
          fontWeight: '800',
          lineHeight: 38,
          letterSpacing: -0.8,
        },
      },
      {
        label: 'card-title',
        text: 'Quarterly revenue is up',
        style: { fontSize: 22, fontWeight: '700', color: COLOR.ink, letterSpacing: -0.4 },
      },
      {
        label: 'section-header',
        text: 'ACCOUNT SETTINGS',
        style: { fontSize: 12, fontWeight: '600', color: COLOR.muted, letterSpacing: 1.4 },
      },
    ],
  },
  // Running text, where the wrap points and the leading are the whole point:
  // whether it runs to its natural end or gets clamped after a line or two, which
  // is the same prose with a truncation rule on top rather than a different kind
  // of row.
  {
    title: 'Body Copy',
    items: [
      {
        label: 'body-paragraph',
        text:
          'PlainText renders with the platform text widget directly, so it measures ' +
          'once and lays out where the OS would put it, with no round trip through ' +
          'the shadow tree.',
        style: { width: '100%', fontSize: 16, color: COLOR.ink, lineHeight: 25 },
      },
      {
        label: 'body-justified',
        text:
          'Justified body copy stretches every line but the last to the full ' +
          'measure, which makes any disagreement about the available width show up ' +
          'as a ragged right edge instead of a subtle reflow.',
        style: { width: '100%', fontSize: 15, textAlign: 'justify', lineHeight: 23 },
      },
      {
        label: 'notification-preview',
        text:
          'Alex commented on your pull request: this looks good to me, though I ' +
          'would pull the measurement cache out into its own module first.',
        style: { width: '100%', fontSize: 14, color: COLOR.inkSoft, lineHeight: 20 },
        numberOfLines: 2,
        ellipsizeMode: 'tail',
      },
      {
        label: 'list-row-primary',
        text: 'Annual infrastructure review meeting with the platform team',
        style: { width: '100%', fontSize: 17, color: COLOR.ink },
        numberOfLines: 1,
        ellipsizeMode: 'tail',
      },
      {
        label: 'pull-quote',
        text: '“We swapped one component and the long list stopped dropping frames.”',
        style: {
          width: '100%',
          fontSize: 20,
          fontFamily: SERIF,
          fontStyle: 'italic',
          color: COLOR.inkSoft,
          lineHeight: 30,
          paddingLeft: 16,
          borderLeftWidth: 3,
          borderLeftColor: COLOR.line,
        },
      },
      {
        label: 'legal-fine-print',
        text:
          'By continuing you agree to the terms of service and acknowledge the ' +
          'privacy policy, including how measurement data is retained.',
        style: { width: '100%', fontSize: 11, color: COLOR.faint, lineHeight: 16 },
        allowFontScaling: false,
      },
    ],
  },
  // Set small and quiet next to something else that carries the meaning: the line
  // under a list row's title, the caption, the timestamp. Small type is where a wrong
  // measurement is hardest to see and easiest to ship, so they sit together, high
  // on the page, rather than being scattered through the sections they support.
  {
    title: 'Labels',
    items: [
      {
        label: 'card-subtitle',
        text: 'Updated 3 minutes ago by the sync service',
        style: { width: '100%', fontSize: 14, color: COLOR.muted, lineHeight: 20 },
        numberOfLines: 2,
      },
      {
        label: 'list-row-secondary',
        text: 'Conference room B · 14:00 – 15:30 · 6 attendees',
        style: { width: '100%', fontSize: 13, color: COLOR.faint, letterSpacing: 0.2 },
        numberOfLines: 1,
      },
      {
        label: 'caption',
        text: 'Figure 1. Measured width on a 390pt viewport',
        style: { fontSize: 12, color: COLOR.faint, fontStyle: 'italic', letterSpacing: 0.1 },
      },
      {
        label: 'timestamp',
        text: '2026-07-31 09:14',
        style: { fontSize: 12, fontFamily: MONO, color: COLOR.faint, letterSpacing: 0.4 },
      },
    ],
  },
  // Tappable labels. These are the rows most likely to be centered inside a fixed
  // box, so a measurement that comes back a point wide is visible immediately.
  {
    title: 'Buttons and Links',
    items: [
      {
        label: 'button-label',
        text: 'Continue to checkout',
        style: {
          width: '100%',
          fontSize: 16,
          fontWeight: '600',
          color: COLOR.paper,
          backgroundColor: COLOR.indigo,
          textAlign: 'center',
          paddingVertical: 14,
          borderRadius: 10,
        },
        numberOfLines: 1,
      },
      {
        label: 'button-disabled',
        text: 'Continue to checkout',
        style: {
          width: '100%',
          fontSize: 16,
          fontWeight: '600',
          color: COLOR.disabled,
          backgroundColor: COLOR.wash,
          textAlign: 'center',
          paddingVertical: 14,
          borderRadius: 10,
        },
      },
      {
        label: 'link',
        text: 'Read the migration guide',
        style: { fontSize: 16, color: COLOR.indigo, textDecorationLine: 'underline' },
      },
      {
        label: 'tab-label-active',
        text: 'Overview',
        style: {
          fontSize: 15,
          fontWeight: '600',
          color: COLOR.indigo,
          paddingVertical: 8,
          paddingHorizontal: 4,
          borderBottomWidth: 2,
          borderBottomColor: COLOR.indigo,
        },
        maxFontSizeMultiplier: 1.3,
      },
    ],
  },
  // Monospace, which measures unlike every other row here: no proportional widths
  // to collapse, hard line breaks the code block has to keep, and a path with no
  // spaces in it to break at.
  {
    title: 'Code',
    items: [
      {
        label: 'code-inline',
        text: 'yarn add react-native-plain-text',
        style: {
          fontSize: 14,
          fontFamily: MONO,
          color: COLOR.plum,
          backgroundColor: COLOR.plumWash,
          paddingVertical: 3,
          paddingHorizontal: 6,
          borderRadius: 4,
        },
      },
      {
        label: 'code-block',
        text: 'const styles = StyleSheet.create({\n  title: { fontSize: 22 },\n});',
        style: {
          width: '100%',
          fontSize: 13,
          fontFamily: MONO,
          color: COLOR.paperDim,
          backgroundColor: COLOR.inkSurface,
          lineHeight: 20,
          padding: 14,
          borderRadius: 8,
        },
      },
      {
        label: 'file-path',
        text: 'ios/PlainTextView/PlainTextShadowNode.mm',
        style: { width: '100%', fontSize: 13, fontFamily: MONO, color: COLOR.muted },
        numberOfLines: 1,
        ellipsizeMode: 'head',
      },
    ],
  },
  // Figures at display sizes, where negative tracking and the digit widths matter.
  {
    title: 'Numerals',
    items: [
      {
        label: 'price-large',
        text: '$1,249.00',
        style: { fontSize: 34, fontWeight: '800', color: COLOR.ink, letterSpacing: -1 },
      },
      {
        label: 'price-struck',
        text: '$1,799.00',
        style: { fontSize: 16, color: COLOR.faint, textDecorationLine: 'line-through' },
      },
      {
        label: 'stat-value',
        text: '98.4%',
        style: { fontSize: 40, fontWeight: '300', color: COLOR.ink, letterSpacing: -1.5 },
      },
      // A price and its tax note sharing one line, set at different sizes:
      // needs `alignItems: "baseline"` on the row to sit together the way a
      // real price tag does, rather than lining up on the row's own edges.
      {
        kind: 'baseline',
        label: 'price-with-vat-note',
        parts: [
          { text: '€169.90', style: { fontSize: 32, fontWeight: '800', color: COLOR.ink } },
          { text: ' incl. VAT', style: { fontSize: 13, color: COLOR.muted, marginLeft: 6 } },
        ],
      },
      // Three siblings, not two: baseline alignment is a property of the
      // whole row, not just a pair, so a fix that only special-cases the
      // first/last child would still show a gap here.
      {
        kind: 'baseline',
        label: 'stat-with-unit-and-delta',
        parts: [
          { text: '98.4', style: { fontSize: 40, fontWeight: '300', color: COLOR.ink } },
          { text: '%', style: { fontSize: 20, color: COLOR.muted, marginLeft: 2 } },
          { text: ' +2.1 today', style: { fontSize: 13, color: COLOR.moss, marginLeft: 8 } },
        ],
      },
      // Same font size on both sides, so a size-only fix could pass the two
      // rows above and still fail this one: the first span pins a lineHeight
      // far taller than its own font, which only shifts where its baseline
      // lands if the extra leading above it is accounted for too.
      {
        kind: 'baseline',
        label: 'total-with-pinned-line-height',
        parts: [
          {
            text: 'Total',
            style: {
              fontSize: 16,
              lineHeight: 44,
              color: COLOR.ink,
              backgroundColor: COLOR.indigoWash,
              paddingHorizontal: 6,
            },
          },
          {
            text: '€42.00',
            style: { fontSize: 16, fontWeight: '600', color: COLOR.ink, marginLeft: 8 },
          },
        ],
      },
    ],
  },
  // Short strings inside a shape: the padding and the radius are doing as much work
  // as the type, and each one shrink-wraps to its own text.
  {
    title: 'Badges',
    items: [
      {
        label: 'badge-new',
        text: 'NEW',
        style: {
          fontSize: 11,
          fontWeight: '700',
          color: COLOR.paper,
          backgroundColor: COLOR.moss,
          letterSpacing: 1,
          paddingVertical: 3,
          paddingHorizontal: 8,
          borderRadius: 10,
        },
      },
      {
        label: 'badge-outline',
        text: 'BETA',
        style: {
          fontSize: 11,
          fontWeight: '600',
          color: COLOR.indigo,
          letterSpacing: 1.2,
          paddingVertical: 3,
          paddingHorizontal: 8,
          borderWidth: 1,
          borderColor: COLOR.indigo,
          borderRadius: 4,
        },
      },
      {
        label: 'avatar-initials',
        text: 'MJ',
        style: {
          fontSize: 18,
          fontWeight: '700',
          color: COLOR.paper,
          backgroundColor: COLOR.plum,
          textAlign: 'center',
          width: 44,
          height: 44,
          lineHeight: 44,
          borderRadius: 22,
        },
      },
      // A heading beside a badge: different size and weight, plus a badge
      // with its own padding and border radius. Yoga folds a baseline
      // child's own padding into where its box sits before aligning, so this
      // also exercises that the offset survives padding, not just a bare
      // span of text.
      {
        kind: 'baseline',
        label: 'heading-with-badge',
        parts: [
          { text: 'New Season', style: { fontSize: 24, fontWeight: '700', color: COLOR.ink } },
          {
            text: 'SALE',
            style: {
              fontSize: 11,
              fontWeight: '700',
              color: COLOR.paper,
              backgroundColor: COLOR.oxblood,
              letterSpacing: 1,
              paddingHorizontal: 6,
              paddingVertical: 3,
              borderRadius: 4,
              marginLeft: 8,
            },
          },
        ],
      },
    ],
  },
  // What the app says when something went wrong, went right, or is empty.
  {
    title: 'Status and Feedback',
    items: [
      {
        label: 'error-inline',
        text: 'That email address is already registered.',
        style: { width: '100%', fontSize: 13, color: COLOR.oxblood, lineHeight: 18 },
      },
      {
        label: 'error-banner',
        text: 'We could not reach the server. Check your connection and try again.',
        style: {
          width: '100%',
          fontSize: 15,
          color: COLOR.oxbloodInk,
          backgroundColor: COLOR.oxbloodWash,
          lineHeight: 22,
          padding: 12,
          borderLeftWidth: 4,
          borderLeftColor: COLOR.oxblood,
          borderRadius: 6,
        },
      },
      {
        label: 'success-toast',
        text: 'Settings saved',
        style: {
          fontSize: 15,
          fontWeight: '500',
          color: COLOR.paper,
          backgroundColor: COLOR.inkSurface,
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderRadius: 20,
        },
      },
      {
        label: 'empty-state',
        text: 'Nothing here yet.\nPull down to refresh.',
        style: {
          width: '100%',
          fontSize: 16,
          color: COLOR.faint,
          textAlign: 'center',
          lineHeight: 24,
          paddingVertical: 24,
        },
      },
    ],
  },
];

// RANDOM_USE_CASES are arbitrary stacks of three to five props, there to catch
// interactions the realistic rows happen to avoid. Several are ugly, and some
// are outright broken layouts (padding taller than the box, a radius larger than
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
export const RANDOM_USE_CASES: Combination[] = [
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

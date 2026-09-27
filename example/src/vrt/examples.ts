import type { TextStyle } from 'react-native';
import { COLOR, MONO, SERIF } from '../theme';

// A row that varies several props stacked in one style, rendered by VrtExample
// as one PlainText with one string.
type Combination = {
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
type BaselineCombination = {
  kind: 'baseline';
  label: string;
  parts: { text: string; style: TextStyle }[];
};

export type ExampleItem = Combination | BaselineCombination;

// A group preserves the original fixture ordering for stable VRT screenshots.
type ExampleGroup = {
  title: string;
  items: ExampleItem[];
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
export const EXAMPLE_GROUPS: ExampleGroup[] = [
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

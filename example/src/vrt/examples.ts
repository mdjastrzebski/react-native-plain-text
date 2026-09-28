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
};

// Several PlainTexts on one `alignItems: "baseline"` row, which a
// Combination's single text/style can't express.
type BaselineCombination = {
  kind: 'baseline';
  label: string;
  parts: { text: string; style: TextStyle }[];
};

export type ExampleItem = Combination | BaselineCombination;

type ExampleGroup = {
  title: string;
  items: ExampleItem[];
};

// Hand-written and never shuffled, so runs render byte-identical rows.
//
// Colors come only from `COLOR`; a tinted row takes its text color from the same
// pigment (`…Ink` where one exists).
//
// Groups are ordered by how common the shape is in real UIs, so the rows that
// matter most come first.
export const EXAMPLE_GROUPS: ExampleGroup[] = [
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
  // Running text: wrap points and leading, natural or clamped.
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
      },
    ],
  },
  // Small type, where a wrong measurement is hardest to see, so it sits high up.
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
  // Often centered in a fixed box, where a measurement 1pt off shows immediately.
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
      },
    ],
  },
  // Monospace: no proportional widths, hard line breaks to keep, and a path with
  // no spaces to break at.
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
      {
        kind: 'baseline',
        label: 'price-with-vat-note',
        parts: [
          { text: '€169.90', style: { fontSize: 32, fontWeight: '800', color: COLOR.ink } },
          { text: ' incl. VAT', style: { fontSize: 13, color: COLOR.muted, marginLeft: 6 } },
        ],
      },
      // Three siblings: catches a fix that only special-cases the first/last child.
      {
        kind: 'baseline',
        label: 'stat-with-unit-and-delta',
        parts: [
          { text: '98.4', style: { fontSize: 40, fontWeight: '300', color: COLOR.ink } },
          { text: '%', style: { fontSize: 20, color: COLOR.muted, marginLeft: 2 } },
          { text: ' +2.1 today', style: { fontSize: 13, color: COLOR.moss, marginLeft: 8 } },
        ],
      },
      // Same font size on both sides, but the first span's tall lineHeight moves its
      // baseline: catches a size-only fix.
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
  // Padding and radius matter as much as the type; each shrink-wraps its text.
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
      // Yoga folds a baseline child's padding into its position before aligning;
      // checks the offset survives the badge's padding.
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

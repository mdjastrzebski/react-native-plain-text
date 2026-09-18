import { Section } from '../components/Specimen';
import { COLOR, SERIF } from '../theme';
import { UseCaseItemRow, type Combination } from './useCaseShared';

// Running text, where the wrap points and the leading are the whole point:
// whether it runs to its natural end or gets clamped after a line or two, which
// is the same prose with a truncation rule on top rather than a different kind
// of row.
const ITEMS: Combination[] = [
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
];

export function BodyCopySection({ showText }: { showText: boolean }) {
  return (
    <Section title="Body Copy">
      {ITEMS.map((item) => (
        <UseCaseItemRow key={item.label} item={item} showText={showText} />
      ))}
    </Section>
  );
}

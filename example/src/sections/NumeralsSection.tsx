import { Section } from '../components/Specimen';
import { COLOR } from '../theme';
import { ExampleItemRow, type ExampleItem } from './exampleShared';

// Figures at display sizes, where negative tracking and the digit widths matter.
const ITEMS: ExampleItem[] = [
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
  // A price and its tax note sharing one line, set at different sizes: needs
  // `alignItems: "baseline"` on the row to sit together the way a real price
  // tag does, rather than lining up on the row's own edges.
  {
    kind: 'baseline',
    label: 'price-with-vat-note',
    parts: [
      { text: '€169.90', style: { fontSize: 32, fontWeight: '800', color: COLOR.ink } },
      { text: ' incl. VAT', style: { fontSize: 13, color: COLOR.muted, marginLeft: 6 } },
    ],
  },
  // Three siblings, not two: baseline alignment is a property of the whole
  // row, not just a pair, so a fix that only special-cases the first/last
  // child would still show a gap here.
  {
    kind: 'baseline',
    label: 'stat-with-unit-and-delta',
    parts: [
      { text: '98.4', style: { fontSize: 40, fontWeight: '300', color: COLOR.ink } },
      { text: '%', style: { fontSize: 20, color: COLOR.muted, marginLeft: 2 } },
      { text: ' +2.1 today', style: { fontSize: 13, color: COLOR.moss, marginLeft: 8 } },
    ],
  },
  // Same font size on both sides, so a size-only fix could pass the two rows
  // above and still fail this one: the first span pins a lineHeight far
  // taller than its own font, which only shifts where its baseline lands if
  // the extra leading above it is accounted for too.
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
];

export function NumeralsSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Numerals">
      {ITEMS.map((item) => (
        <ExampleItemRow key={item.label} item={item} showText={showText} />
      ))}
    </Section>
  );
}

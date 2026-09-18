import { Section } from '../components/Specimen';
import { COLOR } from '../theme';
import { ExampleItemRow, type ExampleItem } from './exampleShared';

// Short strings inside a shape: the padding and the radius are doing as much work
// as the type, and each one shrink-wraps to its own text.
const ITEMS: ExampleItem[] = [
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
  // A heading beside a badge: different size and weight, plus a badge with
  // its own padding and border radius. Yoga folds a baseline child's own
  // padding into where its box sits before aligning, so this also exercises
  // that the offset survives padding, not just a bare span of text.
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
];

export function BadgesSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Badges">
      {ITEMS.map((item) => (
        <ExampleItemRow key={item.label} item={item} showText={showText} />
      ))}
    </Section>
  );
}

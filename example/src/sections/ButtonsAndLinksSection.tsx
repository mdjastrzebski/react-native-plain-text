import { Section } from '../components/Specimen';
import { COLOR } from '../theme';
import { ExampleItemRow, type Combination } from './exampleShared';

// Tappable labels. These are the rows most likely to be centered inside a fixed
// box, so a measurement that comes back a point wide is visible immediately.
const ITEMS: Combination[] = [
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
];

export function ButtonsAndLinksSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Buttons and Links">
      {ITEMS.map((item) => (
        <ExampleItemRow key={item.label} item={item} showText={showText} />
      ))}
    </Section>
  );
}

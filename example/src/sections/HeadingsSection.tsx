import { Section } from '../components/Specimen';
import { COLOR } from '../theme';
import { UseCaseItemRow, type Combination } from './useCaseShared';

// Display type: the biggest thing on a screen, the title inside a card, and the
// tracked cap-height label that separates two groups of rows.
const ITEMS: Combination[] = [
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
];

export function HeadingsSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Headings">
      {ITEMS.map((item) => (
        <UseCaseItemRow key={item.label} item={item} showText={showText} />
      ))}
    </Section>
  );
}

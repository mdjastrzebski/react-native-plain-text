import { Section } from '../components/Specimen';
import { COLOR, MONO } from '../theme';
import { ExampleItemRow, type Combination } from './exampleShared';

// Set small and quiet next to something else that carries the meaning: the line
// under a list row's title, the caption, the timestamp. Small type is where a wrong
// measurement is hardest to see and easiest to ship, so they sit together, high
// on the page, rather than being scattered through the sections they support.
const ITEMS: Combination[] = [
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
];

export function LabelsSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Labels">
      {ITEMS.map((item) => (
        <ExampleItemRow key={item.label} item={item} showText={showText} />
      ))}
    </Section>
  );
}

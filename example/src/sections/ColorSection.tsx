import { Section, TextItem } from '../components/Specimen';
import { COLOR } from '../theme';
import { SHORT_ROW_SIZE, SPECIMEN } from './shared';

// The section only has to show that `color` is honored, so these are the screen's
// own accents in palette order rather than red/green/blue: same job, and the column
// stays part of the page instead of turning into a primaries test. Labeled with the
// pigment name each value is, which is also what it's called in COLOR.
const COLORS = [
  { label: 'Indigo', color: COLOR.indigo },
  { label: 'Plum', color: COLOR.plum },
  { label: 'Oxblood', color: COLOR.oxblood },
  { label: 'Ochre', color: COLOR.ochre },
  { label: 'Moss', color: COLOR.moss },
];

export function ColorSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Color">
      {COLORS.map(({ label, color }) => (
        <TextItem
          key={label}
          label={label}
          showText={showText}
          style={{ fontSize: SHORT_ROW_SIZE, color }}
        >
          {SPECIMEN}
        </TextItem>
      ))}
      <TextItem
        label="inverse"
        showText={showText}
        style={{
          fontSize: SHORT_ROW_SIZE,
          color: COLOR.paper,
          backgroundColor: COLOR.inkSurface,
        }}
      >
        {SPECIMEN}
      </TextItem>
    </Section>
  );
}

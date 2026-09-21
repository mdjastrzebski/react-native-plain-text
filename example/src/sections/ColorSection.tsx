import { featureCaptureTestID, Section, TextItem } from '../components/Specimen';
import { COLOR } from '../theme';
import { SHORT_ROW_SIZE, SPECIMEN } from './shared';

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
          testID={featureCaptureTestID('color', label)}
          label={label}
          showText={showText}
          style={{ fontSize: SHORT_ROW_SIZE, color }}
        >
          {SPECIMEN}
        </TextItem>
      ))}
      <TextItem
        testID={featureCaptureTestID('color', 'inverse')}
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

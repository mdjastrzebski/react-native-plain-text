import { Section, TextItem } from '../components/Specimen';
import { SHORT_ROW_SIZE } from './shared';

const TEXT_TRANSFORMS = ['none', 'lowercase', 'uppercase', 'capitalize'] as const;

// Mid-word caps ("BROWN") diverge from iOS's <Text> overlay: see TEXT_TRANSFORM_FOOTER.
const TEXT_TRANSFORM_SPECIMEN = 'Quick BROWN fox';

// A digit has no uppercase form, so capitalize leaves it alone.
const TEXT_TRANSFORM_ORDINAL_SPECIMEN = '3rd place winner';

// Apostrophes stay inside the word rather than starting a new one.
const TEXT_TRANSFORM_CONTRACTION_SPECIMEN = "it's a trap, don't panic";

const TEXT_TRANSFORM_FOOTER = "RN <Text>'s capitalize has a bug on iOS (react/react-native#34117).";

export function TextTransformSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Text Transform" footer={TEXT_TRANSFORM_FOOTER}>
      {TEXT_TRANSFORMS.map((textTransform) => (
        <TextItem
          key={textTransform}
          label={textTransform}
          showText={showText}
          style={{ fontSize: SHORT_ROW_SIZE, textTransform }}
        >
          {TEXT_TRANSFORM_SPECIMEN}
        </TextItem>
      ))}
      {/* capitalize's two gotchas: a digit-led word and a contraction. */}
      <TextItem
        label="capitalize, digit-led word"
        showText={showText}
        style={{ fontSize: SHORT_ROW_SIZE, textTransform: 'capitalize' }}
      >
        {TEXT_TRANSFORM_ORDINAL_SPECIMEN}
      </TextItem>
      <TextItem
        label="capitalize, contraction"
        showText={showText}
        style={{ fontSize: SHORT_ROW_SIZE, textTransform: 'capitalize' }}
      >
        {TEXT_TRANSFORM_CONTRACTION_SPECIMEN}
      </TextItem>
    </Section>
  );
}

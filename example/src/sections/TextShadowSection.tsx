import type { TextStyle } from 'react-native';
import { Section, TextItem } from '../components/Specimen';
import { COLOR } from '../theme';
import { SHORT_ROW_SIZE, SPECIMEN } from './shared';

// "offset only" shows iOS drawing with no radius set, since its gate is
// textShadowOffset alone. "radius only" is the asymmetric case: no shadow on
// iOS, but Android still draws (see the platform note on the offset props in
// PlainTextViewNativeComponent.ts).
//
// textShadowColor is excluded from compareText/overlayText (Specimen.tsx): a
// shadow sits behind the glyphs, so flattening it there would fight the
// overlay's multiply blend. "colored" keeps its own indigo instead.
const TEXT_SHADOWS: { label: string; style: TextStyle }[] = [
  { label: 'offset only', style: { textShadowOffset: { width: 2, height: 2 } } },
  {
    label: 'blurred',
    style: { textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 },
  },
  {
    label: 'colored',
    style: {
      textShadowOffset: { width: 2, height: 2 },
      textShadowRadius: 2,
      textShadowColor: COLOR.indigo,
    },
  },
  { label: 'radius only (no iOS shadow)', style: { textShadowRadius: 4 } },
];

export function TextShadowSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Text Shadow">
      {TEXT_SHADOWS.map(({ label, style }) => (
        <TextItem
          key={label}
          label={label}
          showText={showText}
          style={{ fontSize: SHORT_ROW_SIZE, ...style }}
        >
          {SPECIMEN}
        </TextItem>
      ))}
    </Section>
  );
}

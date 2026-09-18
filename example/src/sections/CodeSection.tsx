import { Section } from '../components/Specimen';
import { COLOR, MONO } from '../theme';
import { UseCaseItemRow, type Combination } from './useCaseShared';

// Monospace, which measures unlike every other row here: no proportional widths
// to collapse, hard line breaks the code block has to keep, and a path with no
// spaces in it to break at.
const ITEMS: Combination[] = [
  {
    label: 'code-inline',
    text: 'yarn add react-native-plain-text',
    style: {
      fontSize: 14,
      fontFamily: MONO,
      color: COLOR.plum,
      backgroundColor: COLOR.plumWash,
      paddingVertical: 3,
      paddingHorizontal: 6,
      borderRadius: 4,
    },
  },
  {
    label: 'code-block',
    text: 'const styles = StyleSheet.create({\n  title: { fontSize: 22 },\n});',
    style: {
      width: '100%',
      fontSize: 13,
      fontFamily: MONO,
      color: COLOR.paperDim,
      backgroundColor: COLOR.inkSurface,
      lineHeight: 20,
      padding: 14,
      borderRadius: 8,
    },
  },
  {
    label: 'file-path',
    text: 'ios/PlainTextView/PlainTextShadowNode.mm',
    style: { width: '100%', fontSize: 13, fontFamily: MONO, color: COLOR.muted },
    numberOfLines: 1,
    ellipsizeMode: 'head',
  },
];

export function CodeSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Code">
      {ITEMS.map((item) => (
        <UseCaseItemRow key={item.label} item={item} showText={showText} />
      ))}
    </Section>
  );
}

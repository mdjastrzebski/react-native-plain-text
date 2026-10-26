import { Section, screenStyles, TextItem } from '../components/Specimen';
import { PARAGRAPH_LONG, sharedStyles } from './shared';

const ELLIPSIZE_MODES = ['head', 'middle', 'tail', 'clip'] as const;

export function EllipsizeModeSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Ellipsize Mode">
      {ELLIPSIZE_MODES.map((ellipsizeMode) => (
        <TextItem
          key={ellipsizeMode}
          label={ellipsizeMode}
          showText={showText}
          numberOfLines={1}
          ellipsizeMode={ellipsizeMode}
          style={sharedStyles.body}
          containerStyle={screenStyles.wideRow}
        >
          {PARAGRAPH_LONG}
        </TextItem>
      ))}
    </Section>
  );
}

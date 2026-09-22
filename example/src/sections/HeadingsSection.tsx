import { Section, screenStyles, TextItem } from '../components/Specimen';
import { COLOR } from '../theme';

export function HeadingsSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Headings">
      {/* hero-heading */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          fontSize: 32,
          fontWeight: '800',
          lineHeight: 38,
          letterSpacing: -0.8,
          color: COLOR.ink,
        }}
        containerStyle={screenStyles.wideRow}
      >
        Native text, measured once by the platform
      </TextItem>
      {/* card-title */}
      <TextItem
        showText={showText}
        style={{ fontSize: 22, fontWeight: '700', color: COLOR.ink, letterSpacing: -0.4 }}
      >
        Quarterly revenue is up
      </TextItem>
      {/* section-header */}
      <TextItem
        showText={showText}
        style={{ fontSize: 12, fontWeight: '600', color: COLOR.muted, letterSpacing: 1.4 }}
      >
        ACCOUNT SETTINGS
      </TextItem>
    </Section>
  );
}

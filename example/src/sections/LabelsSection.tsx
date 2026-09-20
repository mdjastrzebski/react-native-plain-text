import { Section, TextItem } from '../components/Specimen';
import { COLOR, MONO } from '../theme';

export function LabelsSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Labels">
      {/* card-subtitle */}
      <TextItem
        showText={showText}
        style={{ width: '100%', fontSize: 14, color: COLOR.muted, lineHeight: 20 }}
        numberOfLines={2}
      >
        Updated 3 minutes ago by the sync service
      </TextItem>
      {/* list-row-secondary */}
      <TextItem
        showText={showText}
        style={{ width: '100%', fontSize: 13, color: COLOR.faint, letterSpacing: 0.2 }}
        numberOfLines={1}
      >
        Conference room B · 14:00 – 15:30 · 6 attendees
      </TextItem>
      {/* caption */}
      <TextItem
        showText={showText}
        style={{ fontSize: 12, color: COLOR.faint, fontStyle: 'italic', letterSpacing: 0.1 }}
      >
        Figure 1. Measured width on a 390pt viewport
      </TextItem>
      {/* timestamp */}
      <TextItem
        showText={showText}
        style={{ fontSize: 12, fontFamily: MONO, color: COLOR.faint, letterSpacing: 0.4 }}
      >
        2026-07-31 09:14
      </TextItem>
    </Section>
  );
}

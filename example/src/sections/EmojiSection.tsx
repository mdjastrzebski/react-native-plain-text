import { Section, TextItem } from '../components/Specimen';

const EMOJI_SPECIMEN = 'Quick brown 🦊 jumps over the lazy 🐶';

// Emoji glyphs force color-emoji fallback regardless of fontFamily.
export function EmojiSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Emoji">
      <TextItem label="mixed" showText={showText}>
        {EMOJI_SPECIMEN}
      </TextItem>
    </Section>
  );
}

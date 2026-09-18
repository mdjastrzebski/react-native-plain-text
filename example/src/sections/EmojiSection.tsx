import { Section, TextItem } from '../components/Specimen';

const EMOJI_SPECIMEN = 'Quick brown 🦊 jumps over the lazy 🐶';

// Emoji glyphs sit outside every text font's own glyph table, so drawing one
// forces color-emoji fallback regardless of fontFamily. Nothing here to tune,
// just a line to check nothing drops the glyph or clips its line height.
export function EmojiSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Emoji">
      <TextItem label="mixed" showText={showText}>
        {EMOJI_SPECIMEN}
      </TextItem>
    </Section>
  );
}

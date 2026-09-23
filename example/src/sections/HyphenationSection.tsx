import { Platform, StyleSheet } from 'react-native';
import { Section, Subsection, TextItem } from '../components/Specimen';

const SOFT_HYPHEN_SPECIMEN =
  'Die Rei­se­kran­ken­ver­si­che­rung war früh­er nur et­was für Ge­schäfts­rei­sen­de, heu­te nut­zen sie auch ganz nor­ma­le Fa­mi­li­en.';

const SPECIMEN = SOFT_HYPHEN_SPECIMEN.replaceAll('­', '');

export function HyphenationSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Hyphenation">
      <Subsection title='"hyphens" prop' footer='"hyphens" prop is PlainText-only'>
        <TextItem
          label='"none"'
          showText={showText}
          style={styles.hyphenationRow}
          hyphens="none"
        >
          {SPECIMEN}
        </TextItem>
        <TextItem
          label='"none": with manual soft hyphens'
          showText={showText}
          style={styles.hyphenationRow}
          hyphens="none"
        >
          {SOFT_HYPHEN_SPECIMEN}
        </TextItem>
        <TextItem
          label='"auto", lang="de"'
          showText={showText}
          lang="de"
          style={styles.hyphenationRow}
          hyphens="auto"
        >
          {SPECIMEN}
        </TextItem>
        <TextItem
          label='"auto", lang="en": incorrect language'
          showText={showText}
          lang="en"
          style={styles.hyphenationRow}
          hyphens="auto"
        >
          {SPECIMEN}
        </TextItem>
      </Subsection>
      {Platform.OS === 'android' && (
        <Subsection title='"android_hyphenationFrequency" prop'>
          <TextItem
            label='"none"'
            showText={showText}
            android_hyphenationFrequency="none"
            style={styles.hyphenationRow}
          >
            {SPECIMEN}
          </TextItem>
          <TextItem
            label='"normal"'
            showText={showText}
            android_hyphenationFrequency="normal"
            style={styles.hyphenationRow}
          >
            {SPECIMEN}
          </TextItem>
          <TextItem
            label='"full"'
            showText={showText}
            android_hyphenationFrequency="full"
            style={styles.hyphenationRow}
          >
            {SPECIMEN}
          </TextItem>
        </Subsection>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  // Fixed narrow width: at 100% the word wrapped at the preceding space rather
  // than mid-word, so no row showed a real hyphen.
  hyphenationRow: {
    width: 260,
    fontSize: 20,
  },
});

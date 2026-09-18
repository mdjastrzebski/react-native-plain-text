import { StyleSheet } from 'react-native';
import { Section, TextItem } from '../components/Specimen';

// Measured *width*, which is the one thing wrap detection decides. RN
// reports the full constraint width for text that word-wrapped and the
// tight widest-line width for text that didn't, so what to look at is the
// grey box edge, not the glyphs. None of these rows sets a width: the row
// shrink-wraps to whatever the text measured, and "Compare Text" overlays
// RN's own answer in scarlet on top.
//
// Two things to check, in order: PlainText against the scarlet Text overlay on
// one platform, then iOS against Android.
//
// Rows 2 and 3 are the interesting case: hard breaks that all fit, so
// nothing wrapped and the box must stop at the longest line. Every line is
// kept well under ~25 characters so it still fits on a narrow phone. If a
// line soft-wraps the row stops testing what it is here to test. The label
// sits above the row rather than beside it, so it costs these probes no
// width at all.
export function WrapDetectionSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Wrap Detection">
      {/* Control. Nothing to detect: if this one disagrees, the harness is
        wrong, not the wrap logic. */}
      <TextItem label="control" showText={showText} style={styles.wrapProbe}>
        {'One short line   '}
      </TextItem>
      {/* Hard breaks, nothing wraps → hug the longest line. */}
      <TextItem label="hard breaks" showText={showText} style={styles.wrapProbe}>
        {'Short\nthis line is longest   '}
      </TextItem>
      {/* Same with more paragraphs, and with the longest one in the middle:
        the width comes from a max over paragraphs, so order shouldn't
        matter. */}
      <TextItem label="longest in middle" showText={showText} style={styles.wrapProbe}>
        {'A\nBB\nthis line is longest  \nCCC'}
      </TextItem>
      {/* Same paragraphs, longest one last: the width comes from a max over
        paragraphs, so where it sits shouldn't matter. */}
      <TextItem label="longest last" showText={showText} style={styles.wrapProbe}>
        {'A\nBB\nCCC\nthis line is longest  '}
      </TextItem>
      {/* No hard break, too long to fit → full constraint width. */}
      <TextItem label="soft wrap only" showText={showText} style={styles.wrapProbe}>
        {'No breaks here, but this sentence is long enough that it has to ' +
          'wrap onto several lines.'}
      </TextItem>
      {/* Both a hard break and a soft wrap → full constraint width. */}
      <TextItem label="break then wrap" showText={showText} style={styles.wrapProbe}>
        {'Break then wrap:\nthis second line is long enough that it also ' + 'has to wrap.'}
      </TextItem>
    </Section>
  );
}

const styles = StyleSheet.create({
  // Deliberately no width, so it can't take `body`: the row shrink-wraps to the
  // measured intrinsic width, which is the thing this section is checking.
  wrapProbe: {
    fontSize: 18,
  },
});

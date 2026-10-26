import { StyleSheet } from 'react-native';
import { Section, TextItem } from '../components/Specimen';

// Measured *width* is what wrap detection decides: RN reports the full
// constraint width when text wraps, the tight widest-line width when it
// doesn't. Rows set no width of their own, so the grey box edge shows the
// answer directly; "Compare Text" overlays RN's own answer in scarlet.
//
// Rows with hard breaks keep every line under ~25 characters so none
// soft-wraps even on a narrow phone — if one did, the row would stop
// testing what it's here to test.
export function WrapDetectionSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Wrap Detection">
      {/* Control: if this one disagrees, the harness is wrong, not the wrap logic. */}
      <TextItem label="control" showText={showText} style={styles.wrapProbe}>
        {'One short line   '}
      </TextItem>
      {/* Hard breaks, nothing wraps → hug the longest line. */}
      <TextItem label="hard breaks" showText={showText} style={styles.wrapProbe}>
        {'Short\nthis line is longest   '}
      </TextItem>
      {/* Longest line in the middle: width is a max over paragraphs, so
        order shouldn't matter. */}
      <TextItem label="longest in middle" showText={showText} style={styles.wrapProbe}>
        {'A\nBB\nthis line is longest  \nCCC'}
      </TextItem>
      {/* Longest line last: same max-over-paragraphs check, position
        shouldn't matter. */}
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
  // No width set (can't use `body`): the row shrink-wraps to the measured
  // intrinsic width being tested.
  wrapProbe: {
    fontSize: 18,
  },
});

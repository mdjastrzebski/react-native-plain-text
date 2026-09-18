import { StyleSheet } from 'react-native';

// Specimen strings shared by several sections, so a reader scanning down the
// screen is comparing the property and not the sentence. All of them are the
// one familiar pangram at three lengths: SPECIMEN is a fragment for waterfall
// rows that want one line per size, PARAGRAPH wraps to two or three, and
// PARAGRAPH_LONG is the same sentence three times over, which outruns every
// clamp in the screen without introducing a second sentence to read.
export const SPECIMEN = 'Quick brown fox';
export const PARAGRAPH = 'The quick brown fox jumps over the lazy dog.';
export const PARAGRAPH_LONG = `${PARAGRAPH} ${PARAGRAPH} ${PARAGRAPH}`;

// The sections whose specimen is one short line (the face itself, its weight,
// style, color, tracking, decoration and OpenType features) are set a few points
// up from body size. Those rows are looked at rather than read, and at 18pt the
// differences between them were too small to judge. Sections whose specimen has to
// wrap stay at 18: there the point is the paragraph, not the glyph.
export const SHORT_ROW_SIZE = 26;

export const sharedStyles = StyleSheet.create({
  // Every section whose specimen wraps: full width, body size, and no background
  // of its own, because the row's grey is the control. What each of those sections
  // demonstrates (the alignment, the padding, the border geometry, the clamp) is
  // set on top of this at the row, so the column differs only in the one thing it
  // is about.
  //
  // Anything that sets a width obliges every row using it to pass
  // `containerStyle={screenStyles.wideRow}` as well, so the percentage resolves
  // against a definite row width rather than against the overlay's full-width box
  // on one side and a shrink-wrapping row on the other. A section that is not
  // about layout should set no width at all instead. See `a11yRow`.
  body: {
    width: '100%',
    fontSize: 20,
  },
});

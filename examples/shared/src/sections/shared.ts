import { StyleSheet } from 'react-native';

// Same pangram at three lengths, so comparisons differ only in the property
// under test: SPECIMEN (one line), PARAGRAPH (wraps 2-3 lines), and
// PARAGRAPH_LONG (3x, outruns every clamp in the screen).
export const SPECIMEN = 'Quick brown fox';
export const PARAGRAPH = 'The quick brown fox jumps over the lazy dog.';
export const PARAGRAPH_LONG = `${PARAGRAPH} ${PARAGRAPH} ${PARAGRAPH}`;

// Short-line specimens (face, weight, style, color, tracking, etc.) render a
// bit above body size — at 18pt the differences were too small to judge.
// Wrapping specimens stay at 18.
export const SHORT_ROW_SIZE = 26;

export const sharedStyles = StyleSheet.create({
  // Full width + body size, no background of its own (the row's grey is the
  // control), for every section whose specimen wraps. A width:'100%' style
  // like this requires the row to also pass containerStyle={screenStyles.wideRow},
  // so the percentage resolves against a definite row width. See `a11yRow`.
  body: {
    width: '100%',
    fontSize: 20,
  },
});

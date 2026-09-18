import { StyleSheet } from 'react-native';
import { Section, screenStyles, TextItem } from '../components/Specimen';
import { COLOR } from '../theme';
import { PARAGRAPH, PARAGRAPH_LONG, sharedStyles } from './shared';

// Borders are view styles too, and border width joins padding in the
// contentInsets Yoga reserves, so the same two questions apply: is the border
// drawn at all, and is the text inset by it. The last row pairs both so the
// insets have to add up.
//
// One color for the whole section, set once in `bordered`: nothing here is
// testing borderColor (the Colors section does that), so a row that changed
// hue as well as geometry only made the column harder to read down. Each row
// carries widths, a radius or a style and nothing else.
export function BordersSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Borders">
      <TextItem
        label="all 2"
        showText={showText}
        style={[sharedStyles.body, styles.bordered, { borderWidth: 2 }]}
        containerStyle={screenStyles.wideRow}
      >
        {PARAGRAPH}
      </TextItem>
      <TextItem
        label="radius 12"
        showText={showText}
        style={[sharedStyles.body, styles.bordered, { borderWidth: 2, borderRadius: 12 }]}
        containerStyle={screenStyles.wideRow}
      >
        {PARAGRAPH}
      </TextItem>
      {/* Per-side, the accent-bar shape: only the left edge is inset. The color
        comes from `bordered`, so the side widths are the only difference. */}
      <TextItem
        label="left 6"
        showText={showText}
        style={[sharedStyles.body, styles.bordered, { borderLeftWidth: 6 }]}
        containerStyle={screenStyles.wideRow}
      >
        {PARAGRAPH}
      </TextItem>
      <TextItem
        label="dashed"
        showText={showText}
        style={[sharedStyles.body, styles.bordered, { borderWidth: 2, borderStyle: 'dashed' }]}
        containerStyle={screenStyles.wideRow}
      >
        {PARAGRAPH}
      </TextItem>
      <TextItem
        label="all 4 + padding 12"
        showText={showText}
        style={[sharedStyles.body, styles.bordered, { borderWidth: 4, padding: 12 }]}
        containerStyle={screenStyles.wideRow}
      >
        {PARAGRAPH_LONG}
      </TextItem>
    </Section>
  );
}

const styles = StyleSheet.create({
  // Indigo rather than ink for the border sections: at 4pt a near-black stroke
  // outweighed the 18pt type inside it. Set once here so the whole section is drawn
  // in one ink and the rows differ only in the geometry.
  //
  // It is the one accent used at this weight, so it is also the constraint on how
  // bright the blue can go: a 4pt stroke reads roughly twice as loud as the same
  // color set as text.
  bordered: {
    borderColor: COLOR.indigo,
  },
});

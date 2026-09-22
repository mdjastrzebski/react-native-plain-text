import { StyleSheet } from 'react-native';
import { Section, screenStyles, TextItem } from '../components/Specimen';
import { COLOR } from '../theme';
import { PARAGRAPH, PARAGRAPH_LONG, sharedStyles } from './shared';

// Border width joins padding in the contentInsets Yoga reserves, so the last
// row pairs both to check the insets add up.
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
  bordered: {
    borderColor: COLOR.indigo,
  },
});

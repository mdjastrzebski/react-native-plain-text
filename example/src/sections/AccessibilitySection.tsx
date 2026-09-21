import { StyleSheet } from 'react-native';
import { featureCaptureTestID, Section, TextItem } from '../components/Specimen';
import { COLOR } from '../theme';

// Accessibility props pass straight through to the native view and aren't
// visually distinct — verify with VoiceOver/TalkBack or the native tree.
export function AccessibilitySection({ showText }: { showText: boolean }) {
  return (
    <Section title="Accessibility">
      <TextItem
        testID={featureCaptureTestID('accessibility', 'test-id')}
        label="testID"
        showText={showText}
        style={styles.a11yRow}
        accessibilityProps={{ testID: 'plain-text-demo' }}
      >
        &quot;plain-text-demo&quot;, findable in the native tree
      </TextItem>
      <TextItem
        testID={featureCaptureTestID('accessibility', 'label')}
        label="label"
        showText={showText}
        style={styles.a11yRow}
        accessibilityProps={{
          accessibilityLabel: 'A screen reader announces this instead',
        }}
      >
        Overrides the spoken text
      </TextItem>
      <TextItem
        testID={featureCaptureTestID('accessibility', 'role')}
        label="role"
        showText={showText}
        style={styles.a11yRow}
        accessibilityProps={{ accessibilityRole: 'header' }}
      >
        &quot;header&quot;
      </TextItem>
      <TextItem
        testID={featureCaptureTestID('accessibility', 'role-hint')}
        label="role + hint"
        showText={showText}
        style={styles.a11yRow}
        accessibilityProps={{
          accessibilityRole: 'link',
          accessibilityHint: 'Opens the linked page',
        }}
      >
        &quot;link&quot;, hinted
      </TextItem>
      <TextItem
        testID={featureCaptureTestID('accessibility', 'state')}
        label="state"
        showText={showText}
        style={styles.a11yRow}
        accessibilityProps={{ accessibilityState: { disabled: true } }}
      >
        disabled
      </TextItem>
      <TextItem
        testID={featureCaptureTestID('accessibility', 'hidden')}
        label="hidden"
        showText={showText}
        style={styles.a11yRow}
        accessibilityProps={{
          accessibilityElementsHidden: true,
          importantForAccessibility: 'no-hide-descendants',
        }}
      >
        Invisible to screen readers on both platforms
      </TextItem>
    </Section>
  );
}

const styles = StyleSheet.create({
  // No width: these rows demonstrate props with no layout effect, so both
  // boxes should hug their text.
  a11yRow: {
    fontSize: 15,
    color: COLOR.inkSoft,
  },
});

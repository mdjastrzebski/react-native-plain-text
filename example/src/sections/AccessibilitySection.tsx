import { StyleSheet } from 'react-native';
import { Section, TextItem } from '../components/Specimen';
import { COLOR } from '../theme';

// Accessibility props are part of RN's ViewProps, so they pass straight
// through to the native view. They're not visually distinct: turn on
// VoiceOver (iOS) / TalkBack (Android) to hear the label/role/state, or
// inspect the native tree for the testID.
export function AccessibilitySection({ showText }: { showText: boolean }) {
  return (
    <Section title="Accessibility">
      <TextItem
        label="testID"
        showText={showText}
        style={styles.a11yRow}
        accessibilityProps={{ testID: 'plain-text-demo' }}
      >
        &quot;plain-text-demo&quot;, findable in the native tree
      </TextItem>
      <TextItem
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
        label="role"
        showText={showText}
        style={styles.a11yRow}
        accessibilityProps={{ accessibilityRole: 'header' }}
      >
        &quot;header&quot;
      </TextItem>
      <TextItem
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
        label="state"
        showText={showText}
        style={styles.a11yRow}
        accessibilityProps={{ accessibilityState: { disabled: true } }}
      >
        disabled
      </TextItem>
      <TextItem
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
  // Accessibility rows carry no visual difference at all, so they are set below
  // body size: the label above the row is the content here.
  //
  // No width, like `wrapProbe` in WrapDetectionSection: these rows demonstrate
  // props that do not affect layout at all, so both boxes should just hug their
  // text. A `width: '100%'` here resolved against two different containing
  // blocks (the shrink-wrapping row under the PlainText, the full-width overlay
  // box over it) and showed a scarlet box running to the margin over a grey one
  // hugging the glyphs, which is a difference in the harness rather than in
  // anything either component measured.
  a11yRow: {
    fontSize: 15,
    color: COLOR.inkSoft,
  },
});

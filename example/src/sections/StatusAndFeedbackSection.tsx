import { Section, screenStyles, TextItem } from '../components/Specimen';
import { COLOR } from '../theme';

export function StatusAndFeedbackSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Status and Feedback">
      {/* error-inline */}
      <TextItem
        showText={showText}
        style={{ width: '100%', fontSize: 13, color: COLOR.oxblood, lineHeight: 18 }}
        containerStyle={screenStyles.wideRow}
      >
        That email address is already registered.
      </TextItem>
      {/* error-banner */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          fontSize: 15,
          color: COLOR.oxbloodInk,
          backgroundColor: COLOR.oxbloodWash,
          lineHeight: 22,
          padding: 12,
          borderLeftWidth: 4,
          borderLeftColor: COLOR.oxblood,
          borderRadius: 6,
        }}
        containerStyle={screenStyles.wideRow}
      >
        We could not reach the server. Check your connection and try again.
      </TextItem>
      {/* success-toast */}
      <TextItem
        showText={showText}
        style={{
          fontSize: 15,
          fontWeight: '500',
          color: COLOR.paper,
          backgroundColor: COLOR.inkSurface,
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderRadius: 20,
        }}
      >
        Settings saved
      </TextItem>
      {/* empty-state */}
      <TextItem
        showText={showText}
        style={{
          width: '100%',
          fontSize: 16,
          color: COLOR.faint,
          textAlign: 'center',
          lineHeight: 24,
          paddingVertical: 24,
        }}
        containerStyle={screenStyles.wideRow}
      >
        {'Nothing here yet.\nPull down to refresh.'}
      </TextItem>
    </Section>
  );
}

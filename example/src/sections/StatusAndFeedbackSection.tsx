import { Section } from '../components/Specimen';
import { COLOR } from '../theme';
import { UseCaseItemRow, type Combination } from './useCaseShared';

// What the app says when something went wrong, went right, or is empty.
const ITEMS: Combination[] = [
  {
    label: 'error-inline',
    text: 'That email address is already registered.',
    style: { width: '100%', fontSize: 13, color: COLOR.oxblood, lineHeight: 18 },
  },
  {
    label: 'error-banner',
    text: 'We could not reach the server. Check your connection and try again.',
    style: {
      width: '100%',
      fontSize: 15,
      color: COLOR.oxbloodInk,
      backgroundColor: COLOR.oxbloodWash,
      lineHeight: 22,
      padding: 12,
      borderLeftWidth: 4,
      borderLeftColor: COLOR.oxblood,
      borderRadius: 6,
    },
  },
  {
    label: 'success-toast',
    text: 'Settings saved',
    style: {
      fontSize: 15,
      fontWeight: '500',
      color: COLOR.paper,
      backgroundColor: COLOR.inkSurface,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 20,
    },
  },
  {
    label: 'empty-state',
    text: 'Nothing here yet.\nPull down to refresh.',
    style: {
      width: '100%',
      fontSize: 16,
      color: COLOR.faint,
      textAlign: 'center',
      lineHeight: 24,
      paddingVertical: 24,
    },
  },
];

export function StatusAndFeedbackSection({ showText }: { showText: boolean }) {
  return (
    <Section title="Status and Feedback">
      {ITEMS.map((item) => (
        <UseCaseItemRow key={item.label} item={item} showText={showText} />
      ))}
    </Section>
  );
}

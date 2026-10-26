import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PlainText } from 'react-native-plain-text';
import { COLOR } from '../theme';

// Lives above the tab navigator (not in either screen) so the toggle is shared
// state between Features and Examples, rather than resetting per tab.
const CompareTextContext = createContext<
  | {
      showText: boolean;
      toggle: () => void;
      compatOn: boolean;
      toggleCompat: () => void;
    }
  | undefined
>(undefined);

export function CompareTextProvider({ children }: { children: ReactNode }) {
  const [showText, setShowText] = useState(false);
  const [compatOn, setCompatOn] = useState(false);
  const toggle = useCallback(() => setShowText((v) => !v), []);
  const toggleCompat = useCallback(() => setCompatOn((v) => !v), []);
  const value = useMemo(
    () => ({ showText, toggle, compatOn, toggleCompat }),
    [showText, toggle, compatOn, toggleCompat]
  );

  return <CompareTextContext.Provider value={value}>{children}</CompareTextContext.Provider>;
}

// Installs both toggles into the screen's native stack header. Returns
// `showText`; `compatOn` is read separately via useCompatOn.
export function useCompareText(navigation: NativeStackNavigationProp<ParamListBase>) {
  const context = useContext(CompareTextContext);
  if (context == null) {
    throw new Error('useCompareText must be used inside a CompareTextProvider');
  }
  const { showText, toggle, compatOn, toggleCompat } = context;

  useLayoutEffect(() => {
    const button = (
      <Pressable
        onPress={toggle}
        hitSlop={8}
        style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
      >
        <PlainText style={styles.headerButtonLabel}>
          {showText ? 'Hide <Text>' : 'Vs <Text>'}
        </PlainText>
      </Pressable>
    );

    const compatButton = (
      <Pressable
        onPress={toggleCompat}
        hitSlop={8}
        style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
      >
        <PlainText style={styles.headerButtonLabel}>
          {compatOn ? 'Compat: On' : 'Compat: Off'}
        </PlainText>
      </Pressable>
    );

    navigation.setOptions({
      // `headerRight` draws on Android; iOS uses `unstable_headerRightItems` for
      // `hidesSharedBackground` (iOS 26 otherwise puts a glass capsule behind the label).
      headerRight: () => (
        <View style={styles.headerButtonRow}>
          {compatButton}
          {button}
        </View>
      ),
      unstable_headerRightItems: () => [
        { type: 'custom', element: compatButton, hidesSharedBackground: true },
        { type: 'custom', element: button, hidesSharedBackground: true },
      ],
    });
  }, [navigation, showText, toggle, compatOn, toggleCompat]);

  return showText;
}

// Read directly by TextItem via context rather than as a prop, since compatOn
// never varies row to row.
export function useCompatOn(): boolean {
  const context = useContext(CompareTextContext);
  if (context == null) {
    throw new Error('useCompatOn must be used inside a CompareTextProvider');
  }
  return context.compatOn;
}

const styles = StyleSheet.create({
  headerButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  headerButtonPressed: {
    opacity: 0.4,
  },
  headerButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLOR.indigo,
  },
});

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

// "Compare Text" overlays RN's own <Text> in scarlet on top of every specimen. Both
// the Features and the Use Cases screen offer the toggle, and it is one setting:
// turning it on in one tab and switching to the other should not put you in front
// of a screen that has quietly forgotten what you asked for. So the flag lives
// above the tab navigator rather than in either screen.
//
// "Compat" rides alongside it rather than as its own standing toggle, but it
// is always visible: what it does is visible on `PlainText` itself, with or
// without the RN `<Text>` overlay to compare against.
//
// "Exp" is the same shape as "Compat": a standing toggle for
// PlainText.native.tsx's `unstable_experiment`, i.e. whichever measurement
// A/B test PlainTextViewManager.kt's `experiment` prop currently drives (see
// docs/agent/perf-experiments.md). Also always visible, for the same reason.
const CompareTextContext = createContext<
  | {
      showText: boolean;
      toggle: () => void;
      compatOn: boolean;
      toggleCompat: () => void;
      experimentOn: boolean;
      toggleExperiment: () => void;
    }
  | undefined
>(undefined);

export function CompareTextProvider({ children }: { children: ReactNode }) {
  const [showText, setShowText] = useState(false);
  const [compatOn, setCompatOn] = useState(false);
  const [experimentOn, setExperimentOn] = useState(false);
  const toggle = useCallback(() => setShowText((v) => !v), []);
  const toggleCompat = useCallback(() => setCompatOn((v) => !v), []);
  const toggleExperiment = useCallback(() => setExperimentOn((v) => !v), []);
  const value = useMemo(
    () => ({ showText, toggle, compatOn, toggleCompat, experimentOn, toggleExperiment }),
    [showText, toggle, compatOn, toggleCompat, experimentOn, toggleExperiment]
  );

  return <CompareTextContext.Provider value={value}>{children}</CompareTextContext.Provider>;
}

// Installs both toggles into the screen's native stack header and returns
// `showText`, the one value rows still need threaded down to them (see
// useCompatOn for the other).
export function useCompareText(navigation: NativeStackNavigationProp<ParamListBase>) {
  const context = useContext(CompareTextContext);
  if (context == null) {
    throw new Error('useCompareText must be used inside a CompareTextProvider');
  }
  const { showText, toggle, compatOn, toggleCompat, experimentOn, toggleExperiment } = context;

  useLayoutEffect(() => {
    const button = (
      <Pressable
        onPress={toggle}
        hitSlop={8}
        // Dimmed while held, the way TouchableOpacity does it: the label is the
        // whole button, so there is no background to darken instead.
        style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
      >
        {/* Off state says what tapping gets you (a comparison against RN's own
            <Text>); on state says how to get out of it. */}
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

    const experimentButton = (
      <Pressable
        onPress={toggleExperiment}
        hitSlop={8}
        style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
      >
        <PlainText style={styles.headerButtonLabel}>
          {experimentOn ? 'Exp: On' : 'Exp: Off'}
        </PlainText>
      </Pressable>
    );

    navigation.setOptions({
      // `headerRight` is what Android draws. On iOS the same elements go through
      // `unstable_headerRightItems` instead, for `hidesSharedBackground`: from
      // iOS 26 a bar button item sits on the bar's shared glass background, and
      // the rounded, shadowed capsule it puts behind this label belongs to no
      // other surface in the app.
      //
      // Written as three JSX expressions rather than an array rendered as
      // children, so none of the buttons needs a `key`.
      headerRight: () => (
        <View style={styles.headerButtonRow}>
          {experimentButton}
          {compatButton}
          {button}
        </View>
      ),
      unstable_headerRightItems: () => [
        { type: 'custom', element: experimentButton, hidesSharedBackground: true },
        { type: 'custom', element: compatButton, hidesSharedBackground: true },
        { type: 'custom', element: button, hidesSharedBackground: true },
      ],
    });
  }, [navigation, showText, toggle, compatOn, toggleCompat, experimentOn, toggleExperiment]);

  return showText;
}

// Read directly by TextItem rather than threaded down through every row's
// props: compatOn never varies row to row, so passing it as a prop would just
// be the same value copied onto every specimen on the screen.
export function useCompatOn(): boolean {
  const context = useContext(CompareTextContext);
  if (context == null) {
    throw new Error('useCompatOn must be used inside a CompareTextProvider');
  }
  return context.compatOn;
}

// Same shape as useCompatOn, for unstable_experiment.
export function useExperimentOn(): boolean {
  const context = useContext(CompareTextContext);
  if (context == null) {
    throw new Error('useExperimentOn must be used inside a CompareTextProvider');
  }
  return context.experimentOn;
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
  // Indigo keeps it reading as the one tappable thing in the bar; semibold and a
  // few points down from the title is what keeps it subordinate to it, rather
  // than a smaller size alone.
  headerButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLOR.indigo,
  },
});

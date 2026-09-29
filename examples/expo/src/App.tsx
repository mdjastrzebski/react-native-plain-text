import { Children, useCallback } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import {
  useFonts,
  Inter_300Light_Italic,
  Inter_400Regular,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { Ionicons } from '@expo/vector-icons';
import {
  NavigationContainer,
  type NavigationState,
  type ParamListBase,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
  type NativeStackNavigationProp,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {
  COLOR,
  CompareTextProvider,
  ExamplesScreen,
  FeaturesScreen,
  PerformanceScreen,
  SessionStorageProvider,
  useSessionState,
  type FeatureSection,
  type SetHeaderActions,
} from 'example-shared';
import { AnimatingTextSection } from 'example-shared/animating-text';
import { createMMKV } from 'react-native-mmkv';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PlainText } from 'react-native-plain-text';

// Backs useSessionState, so session values survive an app kill.
const storage = createMMKV({ id: 'persisted-state' });

// Built-in sections come from example-shared; this app has Reanimated, so it
// adds the one that needs it.
const EXTRA_FEATURE_SECTIONS: FeatureSection[] = [['Animating Text', AnimatingTextSection]];

const Tab = createBottomTabNavigator();
// Reusing the same Navigator/Screen components across the three mounted stacks
// still gives each its own state.
const Stack = createNativeStackNavigator();

// `headerTitleAlign: 'left'` only works on Android: native-stack's iOS branch
// always centers the title via UIKit, ignoring the option. On iOS the title is
// rendered as the header's left view instead, with the native title emptied so
// UIKit doesn't also draw it centered.
function titleOptions(title: string): NativeStackNavigationOptions {
  if (Platform.OS !== 'ios') {
    // Android's title is drawn natively: only size/weight are supported, not tracking.
    return {
      title,
      headerTitleAlign: 'left',
      headerTitleStyle: { fontSize: 23, fontWeight: '700', color: COLOR.ink },
    };
  }

  return {
    title,
    headerTitle: '',
    // `unstable_headerLeftItems` (not `headerLeft`) for `hidesSharedBackground`: on
    // iOS 26, `headerLeft` sits on the bar's shared glass background and gets a
    // pill, reading as a button. Styled explicitly rather than via the header's
    // title component, which would take the nav bar's tint (blue) here.
    unstable_headerLeftItems: () => [
      {
        type: 'custom',
        element: <PlainText style={styles.headerTitle}>{title}</PlainText>,
        hidesSharedBackground: true,
      },
    ],
  };
}

// The shared screens hand their header controls to this app, which puts them in
// the native stack header.
function useHeaderActions(navigation: NativeStackNavigationProp<ParamListBase>): SetHeaderActions {
  return useCallback(
    (actions) => {
      navigation.setOptions({
        // `headerRight` draws on Android; iOS uses `unstable_headerRightItems` for
        // `hidesSharedBackground` (iOS 26 otherwise puts a glass capsule behind the label).
        headerRight: () => <View style={styles.headerActions}>{Children.toArray(actions)}</View>,
        unstable_headerRightItems: () =>
          actions.map((element) => ({ type: 'custom', element, hidesSharedBackground: true })),
      });
    },
    [navigation]
  );
}

type ScreenProps = NativeStackScreenProps<ParamListBase>;

function FeaturesRoute({ navigation }: ScreenProps) {
  return (
    <FeaturesScreen
      setHeaderActions={useHeaderActions(navigation)}
      extraSections={EXTRA_FEATURE_SECTIONS}
    />
  );
}

function ExamplesRoute({ navigation }: ScreenProps) {
  return <ExamplesScreen setHeaderActions={useHeaderActions(navigation)} />;
}

function PerformanceRoute({ navigation }: ScreenProps) {
  return <PerformanceScreen setHeaderActions={useHeaderActions(navigation)} />;
}

// Tab titles double as the persisted selection's tab route name (see
// `onStateChange` below), so they must stay stable across releases.
const TABS = [
  { title: 'Features', route: 'PlainText', icon: 'text', screen: FeaturesRoute },
  { title: 'Examples', route: 'Examples', icon: 'albums', screen: ExamplesRoute },
  { title: 'Performance', route: 'Benchmarks', icon: 'speedometer', screen: PerformanceRoute },
] as const;

// Built once at module load, not per render: react-navigation diffs `component`
// and `tabBarIcon` by identity, so a fresh closure per render would remount the stack.
const TAB_SCREENS = TABS.map(({ title, route, icon, screen }) => ({
  title,
  stack: function Stacked() {
    return (
      <Stack.Navigator>
        <Stack.Screen name={route} component={screen} options={titleOptions(title)} />
      </Stack.Navigator>
    );
  },
  tabBarIcon: ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={icon} color={color} size={size} />
  ),
}));

export default function App() {
  return (
    <SessionStorageProvider storage={storage}>
      <Root />
    </SessionStorageProvider>
  );
}

// Gated on load: an unregistered fontFamily alias silently falls back to the
// system font, which would make the font rows lie until loading finished.
function Root() {
  const [fontsLoaded] = useFonts({
    Inter_300Light_Italic,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  // Which tab was selected, kept across app kills for the rest of the session.
  const [initialTabName, setSelectedTab] = useSessionState<string | undefined>(
    'selected-tab',
    undefined
  );
  const onStateChange = useCallback(
    (state: NavigationState | undefined) => {
      const selectedTab = state?.routes[state.index]?.name;
      if (selectedTab) {
        setSelectedTab(selectedTab);
      }
    },
    [setSelectedTab]
  );

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      {/* Above the navigator: the Features and Examples screens share one
          "Compare Text" setting, so switching tabs keeps the overlay on. */}
      <CompareTextProvider>
        <NavigationContainer onStateChange={onStateChange}>
          <Tab.Navigator
            initialRouteName={initialTabName}
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: COLOR.indigo,
              tabBarInactiveTintColor: COLOR.faint,
            }}
          >
            {TAB_SCREENS.map(({ title, stack, tabBarIcon }) => (
              <Tab.Screen key={title} name={title} component={stack} options={{ tabBarIcon }} />
            ))}
          </Tab.Navigator>
        </NavigationContainer>
      </CompareTextProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // 23pt: large enough to read as the page name, small enough that all three
  // titles still fit one line beside their header button.
  headerTitle: {
    fontSize: 23,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: COLOR.ink,
  },
});

import { useCallback } from 'react';
import { Platform, StyleSheet } from 'react-native';
import {
  useFonts,
  Inter_300Light_Italic,
  Inter_400Regular,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer, type NavigationState } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PlainText } from 'react-native-plain-text';
import { CompareTextProvider } from './components/CompareText';
import { useSessionState } from './useSessionState';
import { COLOR } from './theme';
import FeaturesScreen from './screens/FeaturesScreen';
import PerformanceScreen from './screens/PerformanceScreen';
import ExamplesScreen from './screens/ExamplesScreen';

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

// Tab titles double as the persisted selection's tab route name (see
// `onStateChange` below), so they must stay stable across releases.
const TABS = [
  { title: 'Features', route: 'PlainText', icon: 'text', screen: FeaturesScreen },
  { title: 'Examples', route: 'Examples', icon: 'albums', screen: ExamplesScreen },
  { title: 'Performance', route: 'Benchmarks', icon: 'speedometer', screen: PerformanceScreen },
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

// Gated on load: an unregistered fontFamily alias silently falls back to the
// system font, which would make the font rows lie until loading finished.
export default function App() {
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
  // 23pt: large enough to read as the page name, small enough that all three
  // titles still fit one line beside their header button.
  headerTitle: {
    fontSize: 23,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: COLOR.ink,
  },
});

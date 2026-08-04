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
import UseCasesScreen from './screens/UseCasesScreen';

const Tab = createBottomTabNavigator();
// One pair of components, used by all three stacks: `Navigator` and `Screen` are
// plain components, and three of them mounted side by side under the tab
// navigator each get their own state.
const Stack = createNativeStackNavigator();

// The screens are specimen pages set flush to the left margin, so the title
// belongs on that margin too.
//
// `headerTitleAlign: 'left'` only reaches the header on Android: native-stack's
// iOS branch always hands the title to UIKit's centered title view, and ignores
// the option. So on iOS the title is rendered as the header's *left* view
// instead, with the native title string emptied so UIKit does not draw it
// centered as well. `headerLeft` is free here because these are single-screen
// stacks with no back button to displace.
function titleOptions(title: string): NativeStackNavigationOptions {
  // Set as display type rather than as a label: bold, tight, in ink. The caps
  // and tracking belong to the furniture inside the page (section rules, row
  // captions); the bar above it names the page, so it takes the register of the
  // cover instead.
  if (Platform.OS !== 'ios') {
    // Android's title is drawn natively, so it takes what the native header
    // supports — size and weight, not tracking.
    return {
      title,
      headerTitleAlign: 'left',
      headerTitleStyle: { fontSize: 23, fontWeight: '700', color: COLOR.ink },
    };
  }

  return {
    title,
    headerTitle: '',
    // Via `unstable_headerLeftItems` rather than `headerLeft`, for
    // `hidesSharedBackground`: from iOS 26 a left view becomes a bar button item
    // sitting on the bar's shared glass background, so a plain `headerLeft`
    // title comes out inside a rounded, shadowed pill and reads as a button.
    //
    // The title is styled explicitly rather than with the header's own title
    // component, which in this slot would take the nav bar's tint — blue 17pt on
    // the leading margin reads as a bar button too.
    unstable_headerLeftItems: () => [
      {
        type: 'custom',
        element: <PlainText style={styles.headerTitle}>{title}</PlainText>,
        hidesSharedBackground: true,
      },
    ],
  };
}

// Every screen is wrapped in a single-screen native stack, which is what gives it
// a real native header: Features and Use Cases install their "compare with Text"
// toggle there, and Performance its props button, and all three then scroll under
// a real navigation bar rather than a JS imitation of one.
//
// Each tab title is also the stack title, and deliberately short. On iOS the title
// is a custom left bar button item, which UIKit lays out before the right one and
// lets take the width it asks for, so a long title compresses the screen's own
// header button to a bare "…": "Performance", not "Performance Benchmarks". The
// library's full name is not in the bar at all — it is set as a wordmark on the
// Features cover, right beside the "Aa", which is a better place for it than a
// 23pt nav title next to a button.
//
// The route name inside each stack never surfaces: single-screen stacks show no
// back button, and the persisted selection reads the *tab* route name — which is
// the title. So it is the titles here that have to stay put across releases, or a
// persisted selection stops resolving; see `onStateChange` in App below.
const TABS = [
  { title: 'Features', route: 'PlainText', icon: 'text', screen: FeaturesScreen },
  { title: 'Use Cases', route: 'UseCases', icon: 'albums', screen: UseCasesScreen },
  { title: 'Performance', route: 'Benchmarks', icon: 'speedometer', screen: PerformanceScreen },
] as const;

// Built once per tab at module load rather than per render of App: `component` and
// `tabBarIcon` are identities react-navigation diffs against, and a fresh closure
// each render would remount the stack and re-set the tab's options.
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

// The keys are the names FeaturesScreen passes as fontFamily, and expo-font
// registers each one as an alias for the face's real PostScript name
// ("Inter_400Regular" ▸ "Inter-Regular"). One family, same names on both
// platforms, which is what makes those rows comparable at all — every other font
// in that section is a platform built-in.
//
// Gated rather than rendered through: an alias that hasn't been registered yet
// resolves to the system font, which is precisely the failure the section exists
// to show, so those rows would lie for as long as the load took.
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
      {/* Above the navigator: the Features and Use Cases screens share one
          "Compare Text" setting, so switching tabs keeps the overlay on. */}
      <CompareTextProvider>
        <NavigationContainer onStateChange={onStateChange}>
          <Tab.Navigator
            initialRouteName={initialTabName}
            screenOptions={{
              headerShown: false,
              // The bar is furniture for the same book as the pages, so it takes
              // the palette instead of the platform default blue: indigo is the
              // page's accent, and the resting state comes from the neutral ramp
              // — faint enough to sit back from the selected tab, dark enough to
              // still read as a label.
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
  // Six points over the 17pt system title, at bold and with the cover glyph's
  // negative tracking pulled back to what a 23pt string can carry: the page's
  // name should be the largest thing in the bar by a clear margin, and at this
  // size each of the three still fits one line beside its header button — which
  // is what keeps the titles short.
  headerTitle: {
    fontSize: 23,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: COLOR.ink,
  },
});

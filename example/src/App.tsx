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
import AndroidTextClippingScreen from './screens/AndroidTextClippingScreen';
import OtherExamplesScreen from './screens/OtherExamplesScreen';

const Tab = createBottomTabNavigator();
// One pair of components, used by all four stacks: `Navigator` and `Screen` are
// plain components, and four of them mounted side by side under the tab
// navigator each get their own state.
const Stack = createNativeStackNavigator();

// The screens are specimen pages set flush to the left margin, so the title
// belongs on that margin too.
//
// `headerTitleAlign: 'left'` only reaches the header on Android: native-stack's
// iOS branch always hands the title to UIKit's centered title view, and ignores
// the option. So on iOS the title is rendered as the header's *left* view
// instead, with the native title string emptied so UIKit does not draw it
// centered as well. Root screens have no back button to displace. Detail screens
// use `detailTitleOptions` below so their native back control remains intact.
function titleOptions(title: string): NativeStackNavigationOptions {
  // Set as display type rather than as a label: bold, tight, in ink. The caps
  // and tracking belong to the furniture inside the page (section rules, row
  // captions); the bar above it names the page, so it takes the register of the
  // cover instead.
  if (Platform.OS !== 'ios') {
    // Android's title is drawn natively, so it takes what the native header
    // supports: size and weight, not tracking.
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
    // component, which in this slot would take the nav bar's tint. Blue 17pt on
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

function detailTitleOptions(title: string): NativeStackNavigationOptions {
  if (Platform.OS !== 'ios') {
    return titleOptions(title);
  }

  return {
    title,
    headerTitleStyle: { fontSize: 18, fontWeight: '600', color: COLOR.ink },
  };
}

// Every screen is wrapped in a single-screen native stack, which is what gives it
// a real native header: Features and Use Cases install their "compare with Text"
// toggle there, Performance installs its props button, and Other Examples pushes
// individual reproductions from its index. All four then scroll under a real
// navigation bar rather than a JS imitation of one.
//
// Each tab title is also its root stack title. On iOS the title is a custom left
// bar button item, which UIKit lays out before the right one and lets take the
// width it asks for. This is why the screen with a header button stays
// "Performance", not "Performance Benchmarks". The library's full name is not in
// the bar at all. It is set as a wordmark on the Features cover, right beside the
// "Aa", which is a better place for it than a 23pt nav title next to a button.
//
// The root route name inside each stack never surfaces, and the persisted
// selection reads the *tab* route name, which is the title. So it is the titles
// here that have to stay put across releases, or a persisted selection stops
// resolving; see `onStateChange` in App below.
const TABS = [
  {
    title: 'Features',
    icon: 'text',
    screens: [{ route: 'PlainText', title: 'Features', component: FeaturesScreen, detail: false }],
  },
  {
    title: 'Use Cases',
    icon: 'albums',
    screens: [{ route: 'UseCases', title: 'Use Cases', component: UseCasesScreen, detail: false }],
  },
  {
    title: 'Other Examples',
    icon: 'list',
    screens: [
      {
        route: 'OtherExamples',
        title: 'Other Examples',
        component: OtherExamplesScreen,
        detail: false,
      },
      {
        route: 'AndroidTextClipping',
        title: 'Android text clipping',
        component: AndroidTextClippingScreen,
        detail: true,
      },
    ],
  },
  {
    title: 'Performance',
    icon: 'speedometer',
    screens: [
      { route: 'Benchmarks', title: 'Performance', component: PerformanceScreen, detail: false },
    ],
  },
] as const;

// Built once per tab at module load rather than per render of App: `component` and
// `tabBarIcon` are identities react-navigation diffs against, and a fresh closure
// each render would remount the stack and re-set the tab's options.
const TAB_SCREENS = TABS.map(({ title, icon, screens }) => ({
  title,
  stack: function Stacked() {
    return (
      <Stack.Navigator>
        {screens.map((screen) => (
          <Stack.Screen
            key={screen.route}
            name={screen.route}
            component={screen.component}
            options={screen.detail ? detailTitleOptions(screen.title) : titleOptions(screen.title)}
          />
        ))}
      </Stack.Navigator>
    );
  },
  tabBarIcon: ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={icon} color={color} size={size} />
  ),
}));

// The keys are the names the example screens pass as fontFamily, and expo-font
// registers each one as an alias for the face's real PostScript name. One alias
// per cut gives both platforms the same names, which is what makes those rows
// comparable at all.
//
// Gated rather than rendered through: an alias that hasn't been registered yet
// resolves to the system font, which is precisely the failure the section exists
// to show, so those rows would lie for as long as the load took.
export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_300Light_Italic,
    Inter_400Regular,
    Inter_600SemiBold,
    'NotoSans-Bold': require('../assets/fonts/NotoSans-Bold.ttf'),
    'NotoSans-BoldItalic': require('../assets/fonts/NotoSans-BoldItalic.ttf'),
    'NotoSans-ExtraBold': require('../assets/fonts/NotoSans-ExtraBold.ttf'),
    'NotoSans-ExtraLight': require('../assets/fonts/NotoSans-ExtraLight.ttf'),
    'NotoSans-ExtraLightItalic': require('../assets/fonts/NotoSans-ExtraLightItalic.ttf'),
    'NotoSans-Light': require('../assets/fonts/NotoSans-Light.ttf'),
    'NotoSans-LightItalic': require('../assets/fonts/NotoSans-LightItalic.ttf'),
    'NotoSans-Medium': require('../assets/fonts/NotoSans-Medium.ttf'),
    'NotoSans-MediumItalic': require('../assets/fonts/NotoSans-MediumItalic.ttf'),
    'NotoSans-Regular': require('../assets/fonts/NotoSans-Regular.ttf'),
    'NotoSans-RegularItalic': require('../assets/fonts/NotoSans-RegularItalic.ttf'),
    'NotoSans-SemiBold': require('../assets/fonts/NotoSans-SemiBold.ttf'),
    'NotoSans-SemiBoldItalic': require('../assets/fonts/NotoSans-SemiBoldItalic.ttf'),
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
              // page's accent, and the resting state comes from the neutral ramp,
              // faint enough to sit back from the selected tab, dark enough to
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
  // size each of the three still fits one line beside its header button, which
  // is what keeps the titles short.
  headerTitle: {
    fontSize: 23,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: COLOR.ink,
  },
});

import {
  Inter_300Light_Italic,
  Inter_400Regular,
  Inter_600SemiBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Platform, ScrollView, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { screenStyles } from './components/Specimen';
import { getVrtScenarios } from './vrt/scenarios';
import { useVrtDeepLink } from './vrt/useVrtDeepLink';
import { vrtStyles } from './vrt/utils';

export default function AppVrt() {
  const [fontsLoaded] = useFonts({
    Inter_300Light_Italic,
    Inter_400Regular,
    Inter_600SemiBold,
  });
  const testID = useVrtDeepLink();

  if (!fontsLoaded || testID === undefined) return null;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={vrtStyles.screen}>
        <VrtScenarios testID={testID} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function VrtScenarios({ testID }: { testID: string | null }) {
  const scenarios = getVrtScenarios(Platform.OS);

  let visibleScenarios =
    testID == null ? scenarios : scenarios.filter((scenario) => scenario.testID === testID);
  if (__DEV__ && testID == null) {
    // only for development purposes; a requested specimen is always honored
    visibleScenarios = scenarios[0] ? [scenarios[0]] : scenarios;
  }

  return (
    <ScrollView
      testID="vrt-screen"
      style={screenStyles.scroll}
      contentContainerStyle={screenStyles.container}
    >
      {visibleScenarios.map(({ testID: scenarioTestID, specimen }) => (
        <View
          key={scenarioTestID}
          testID={scenarioTestID}
          collapsable={false}
          style={vrtStyles.scenario}
        >
          {specimen}
        </View>
      ))}
    </ScrollView>
  );
}

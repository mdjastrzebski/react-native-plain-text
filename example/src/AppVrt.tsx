import {
  Inter_300Light_Italic,
  Inter_400Regular,
  Inter_600SemiBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Platform, ScrollView, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { screenStyles } from './components/Specimen';
import { getVrtExamples } from './vrt/examples';
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
      <SafeAreaView testID="vrt-safe-area" style={vrtStyles.screen}>
        <VrtExamples testID={testID} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function VrtExamples({ testID }: { testID: string | null }) {
  const examples = getVrtExamples(Platform.OS);

  let visibleExamples =
    testID == null ? examples : examples.filter((example) => example.testID === testID);
  if (__DEV__) {
    // only for development purposes
    visibleExamples = examples[0] ? [examples[0]] : examples;
  }

  return (
    <ScrollView
      testID="vrt-screen"
      style={screenStyles.scroll}
      contentContainerStyle={screenStyles.container}
    >
      {visibleExamples.map(({ testID: exampleTestID, specimen }) => (
        <View
          key={exampleTestID}
          testID={exampleTestID}
          collapsable={false}
          style={vrtStyles.example}
        >
          {specimen}
        </View>
      ))}
    </ScrollView>
  );
}

import { useState } from 'react';
import {
  Inter_300Light_Italic,
  Inter_400Regular,
  Inter_600SemiBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Platform, ScrollView, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { screenStyles } from './components/Specimen';
import { AppductVrtTools } from './vrt/appductTools';
import { getVrtExamples } from './vrt/examples';
import { vrtStyles } from './vrt/utils';

export default function AppVrt() {
  const [fontsLoaded] = useFonts({
    Inter_300Light_Italic,
    Inter_400Regular,
    Inter_600SemiBold,
  });
  // Which specimen renders is driven only by the Appduct `show_specimen` tool: no deep
  // link is opened per capture. Start undefined — render nothing until a specimen is
  // chosen — so the (non-virtualized) list never mounts all specimens at once, which
  // spiked memory and stalled long capture runs.
  const [selectedTestID, setSelectedTestID] = useState<string | null | undefined>(undefined);
  const ready = fontsLoaded && (selectedTestID !== undefined || __DEV__);

  return (
    <>
      <AppductVrtTools activeTestID={selectedTestID ?? null} onSelect={setSelectedTestID} />
      {!ready ? null : (
        <SafeAreaProvider>
          <SafeAreaView testID="vrt-safe-area" style={vrtStyles.screen}>
            <VrtExamples testID={selectedTestID ?? null} />
          </SafeAreaView>
        </SafeAreaProvider>
      )}
    </>
  );
}

function VrtExamples({ testID }: { testID: string | null }) {
  const examples = getVrtExamples(Platform.OS);

  let visibleExamples =
    testID == null ? examples : examples.filter((example) => example.testID === testID);
  if (__DEV__ && testID == null) {
    // only for development purposes; a requested specimen is always honored
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

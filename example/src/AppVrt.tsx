import { Children, isValidElement, type ReactNode } from 'react';
import {
  Inter_300Light_Italic,
  Inter_400Regular,
  Inter_600SemiBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Platform, ScrollView, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { screenStyles } from './components/Specimen';
import { groups } from './vrt/groups';
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
        <VrtExamples testID={testID} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function VrtExamples({ testID }: { testID: string | null }) {
  const examples = groups
    .filter(({ platform }) => platform == null || platform === Platform.OS)
    .flatMap(({ children }) => {
      const sectionChildren = isValidElement<{ children?: ReactNode }>(children)
        ? children.props.children
        : children;
      const specimens = Children.toArray(sectionChildren);

      return specimens.map((specimen) => {
        if (
          !isValidElement<{ testID?: string }>(specimen) ||
          typeof specimen.props.testID !== 'string'
        ) {
          throw new Error('Every VRT specimen must have a testID');
        }

        return {
          testID: specimen.props.testID,
          specimen,
        };
      });
    });

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

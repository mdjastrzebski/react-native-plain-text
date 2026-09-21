import { Children, isValidElement, type ReactNode } from "react";
import {
  Inter_300Light_Italic,
  Inter_400Regular,
  Inter_600SemiBold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Platform, ScrollView, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { screenStyles } from "./components/Specimen";
import { groups } from "./vrt/groups";
import { useVrtDeepLink } from "./vrt/useVrtDeepLink";
import { testIDSlug, vrtStyles } from "./vrt/utils";

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
  const occurrences = new Map<string, number>();
  const examples = groups
    .filter(({ platform }) => platform == null || platform === Platform.OS)
    .flatMap(({ children }) => {
      const sectionChildren = isValidElement<{ children?: ReactNode }>(children)
        ? children.props.children
        : children;

      return Children.toArray(sectionChildren).map((specimen, index) => {
        const label =
          isValidElement<{ label?: string }>(specimen) && typeof specimen.props.label === "string"
            ? specimen.props.label
            : `item-${index + 1}`;
        const baseTestID = `vrt-features-${testIDSlug(label)}`;
        const occurrence = (occurrences.get(baseTestID) ?? 0) + 1;
        occurrences.set(baseTestID, occurrence);

        return {
          testID: occurrence === 1 ? baseTestID : `${baseTestID}-${occurrence}`,
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

import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { CompareTextProvider } from './components/CompareText';
import { VrtSpecimenProvider } from './components/Specimen';
import { useExampleFonts } from './fonts';
import { FeaturesSpecimens } from './screens/FeaturesScreen';
import { ExamplesSpecimens } from './screens/ExamplesScreen';

export default function AppVrt({ testID }: { testID: string }) {
  const fontsLoaded = useExampleFonts();

  if (!fontsLoaded) {
    return null;
  }

  const specimens = testID.startsWith('vrt-capture-features-') ? (
    <FeaturesSpecimens showText={false} />
  ) : testID.startsWith('vrt-capture-use-cases-') ? (
    <ExamplesSpecimens showText={false} />
  ) : null;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View testID="vrt-safe-area" collapsable={false} style={styles.container}>
          <CompareTextProvider>
            <VrtSpecimenProvider testID={testID}>{specimens}</VrtSpecimenProvider>
          </CompareTextProvider>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

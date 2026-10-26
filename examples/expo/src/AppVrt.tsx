import { useFonts } from 'expo-font';
import { AppVrt, INTER } from 'react-native-plain-text-example-shared';

export default function ExpoAppVrt() {
  const [fontsLoaded] = useFonts({
    [INTER.lightItalic]: require('../../shared/assets/fonts/Inter_300Light_Italic.ttf'),
    [INTER.regular]: require('../../shared/assets/fonts/Inter_400Regular.ttf'),
    [INTER.semiBold]: require('../../shared/assets/fonts/Inter_600SemiBold.ttf'),
  });

  if (!fontsLoaded) return null;

  return <AppVrt />;
}

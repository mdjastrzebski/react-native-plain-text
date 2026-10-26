import {
  Inter_300Light_Italic,
  Inter_400Regular,
  Inter_600SemiBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { AppVrt, INTER } from 'react-native-plain-text-example-shared';

export default function ExpoAppVrt() {
  const [fontsLoaded] = useFonts({
    [INTER.lightItalic]: Inter_300Light_Italic,
    [INTER.regular]: Inter_400Regular,
    [INTER.semiBold]: Inter_600SemiBold,
  });

  if (!fontsLoaded) return null;

  return <AppVrt />;
}

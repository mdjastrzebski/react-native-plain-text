import {
  Inter_300Light_Italic,
  Inter_400Regular,
  Inter_600SemiBold,
  useFonts,
} from '@expo-google-fonts/inter';

export function useExampleFonts(): boolean {
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

  return fontsLoaded;
}

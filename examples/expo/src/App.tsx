import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { App, INTER, type RenderTabIcon } from 'react-native-plain-text-example-shared';

// Module-level so its identity is stable: the shared App rebuilds the tab
// navigator's icons whenever this changes.
const renderTabIcon: RenderTabIcon = ({ name, color, size }) => (
  <Ionicons name={name} color={color} size={size} />
);

// Gated on load: an unregistered fontFamily silently falls back to the system
// font, which would make the font rows lie until loading finished.
export default function ExpoApp() {
  const [fontsLoaded] = useFonts({
    [INTER.lightItalic]: require('../../shared/assets/fonts/Inter_300Light_Italic.ttf'),
    [INTER.regular]: require('../../shared/assets/fonts/Inter_400Regular.ttf'),
    [INTER.semiBold]: require('../../shared/assets/fonts/Inter_600SemiBold.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return <App renderTabIcon={renderTabIcon} />;
}

import {
  useFonts,
  Inter_300Light_Italic,
  Inter_400Regular,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { Ionicons } from '@expo/vector-icons';
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
    [INTER.lightItalic]: Inter_300Light_Italic,
    [INTER.regular]: Inter_400Regular,
    [INTER.semiBold]: Inter_600SemiBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return <App renderTabIcon={renderTabIcon} />;
}

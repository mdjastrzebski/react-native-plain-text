import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import { App, type RenderTabIcon } from 'react-native-plain-text-example-shared';

// Module-level so its identity is stable: the shared App rebuilds the tab
// navigator's icons whenever this changes.
const renderTabIcon: RenderTabIcon = ({ name, color, size }) => (
  <Ionicons name={name} color={color} size={size} />
);

// No font gating here: the Inter and Open Sans files are linked into the native
// projects (`yarn link-assets`), so every fontFamily resolves on first render.
export default function ReactNativeApp() {
  return <App renderTabIcon={renderTabIcon} />;
}

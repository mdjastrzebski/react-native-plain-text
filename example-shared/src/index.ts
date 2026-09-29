// Everything here depends on React Native, the library,
// react-native-safe-area-context and this package's own dependencies. Sections
// that need more live behind their own entry point (`example-shared/animating-text`),
// so an app that lacks the dependency simply doesn't import it.
export { CompareTextProvider } from './components/CompareText';
export type { SetHeaderActions } from './components/HeaderActions';
export { ExamplesScreen } from './screens/ExamplesScreen';
export { FeaturesScreen, type FeatureSection } from './screens/FeaturesScreen';
export { PerformanceScreen } from './screens/PerformanceScreen';
export { COLOR } from './theme';
export { SessionStorageProvider, useSessionState } from './useSessionState';
export { VrtApp } from './VrtApp';

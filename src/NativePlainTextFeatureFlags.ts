import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  overrideFlag(name: string, value: boolean): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('PlainTextFeatureFlags');

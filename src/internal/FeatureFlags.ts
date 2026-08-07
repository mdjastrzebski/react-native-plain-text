import NativePlainTextFeatureFlags from '../NativePlainTextFeatureFlags';

// Not exported from src/index.tsx — for perf-suite experiments only, until/unless
// some of these are promoted to a public API.
const FLAGS = {
  // Android only: PlainTextViewManager.measureView() reuses one off-screen view
  // per thread when true (the default); false measures with a fresh view every
  // call, for perf comparison. See docs/agent/sync-points.md#the-reused-measuring-view.
  androidSharedMeasuringInstance: true,
} as const;

type FlagName = keyof typeof FLAGS;

export const FeatureFlags = {
  override(name: FlagName, value: boolean): void {
    if (__DEV__ && !(name in FLAGS)) {
      console.warn(`FeatureFlags.override: unknown flag "${name}"`);
    }
    NativePlainTextFeatureFlags.overrideFlag(name, value);
  },
};

#import "RNPlainTextFeatureFlags.h"

#import <RNPlainTextSpec/RNPlainTextSpec.h>

using namespace facebook::react;

// No flag applies on iOS yet — PlainTextShadowNode measures via CoreText
// directly, with no view instance to toggle. Kept in step with the Android
// module (PlainTextFeatureFlagsModule) so the JS call site is symmetric across
// platforms once an iOS flag exists. See docs/agent/sync-points.md.
@interface RNPlainTextFeatureFlags () <NativePlainTextFeatureFlagsSpec>
@end

@implementation RNPlainTextFeatureFlags

RCT_EXPORT_MODULE(PlainTextFeatureFlags)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (void)overrideFlag:(NSString *)name value:(BOOL)value
{
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativePlainTextFeatureFlagsSpecJSI>(params);
}

@end

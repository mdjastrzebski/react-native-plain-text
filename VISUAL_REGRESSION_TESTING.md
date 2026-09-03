# Visual Regression Testing Proposal

## Recommendation

Use:

- **Maestro** for cross-platform E2E navigation and screenshot capture
- **Maestro `assertScreenshot`** initially for visual comparison
- **GitHub Actions** with one pinned simulator or emulator per platform
- **Simulator and emulator as the blocking VRT environment**
- **Optional real-device tests** through BrowserStack App Percy for release candidates or scheduled validation

For this library, I would choose Maestro over Detox or Appium. The app is mostly static specimen screens, so Detox's React Native synchronization provides little extra value while requiring more native test configuration. Maestro works externally against the rendered native UI and supports both platforms with the same YAML flows. It now has native screenshot assertions, cropping, and configurable match thresholds. [Maestro screenshot assertions](https://docs.maestro.dev/reference/commands-available/assertscreenshot) and [screenshot capture](https://docs.maestro.dev/reference/commands-available/takescreenshot) support exactly this workflow.

## Why VRT is particularly valuable here

`PlainText` is a Fabric component backed by `UILabel` and Android `TextView`. Most important behavior therefore happens outside JavaScript:

- intrinsic measurement
- line wrapping and clipping
- baselines
- font selection and fallback
- line height
- letter spacing
- ellipsis placement
- padding and borders
- dynamic font scaling
- variable fonts
- Android font padding

Jest cannot meaningfully verify those things. The project documentation already acknowledges that UIKit and `TextView` behavior is currently verified mainly through the example app and a device, with almost no automated coverage at that layer: [workflow.md](docs/agent/workflow.md#automated-tests).

The example app is already close to a visual test fixture:

- Feature sections exercise individual properties.
- Use Cases combine properties.
- Android clipping has dedicated reproductions.
- Custom fonts are bundled and rendering waits until they are loaded: [App.tsx](example/src/App.tsx).
- The public surface includes exactly the visual properties that benefit from screenshot testing: [README.md](README.md#supported-styles).

The current CI only runs lint, TypeScript, Jest, C++, Android Robolectric, and the package build. It never launches the native example app: [ci.yml](.github/workflows/ci.yml).

## Proposed stack

| Responsibility                  | Recommended tool                                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Native app fixture              | Existing Expo dev-client example                                                                      |
| E2E driver                      | Maestro CLI                                                                                           |
| Initial image comparison        | Maestro `assertScreenshot`                                                                            |
| More configurable local diffing | `reg-cli`, if Maestro thresholds prove insufficient                                                   |
| CI                              | GitHub Actions                                                                                        |
| Android environment             | Pixel 6 AVD, API 35, x86_64, Google APIs                                                              |
| iOS environment                 | iPhone 16 Simulator with an explicitly selected iOS runtime                                           |
| Baseline storage                | Git repository, separate directories per platform and environment                                     |
| Failure artifacts               | GitHub Actions artifact containing actual, expected, diff, and HTML/JUnit report, retained for 4 days |
| Optional hosted upgrade         | Maestro Cloud                                                                                         |
| Optional real-device VRT        | BrowserStack App Percy                                                                                |

`reg-cli` is a sensible fallback because it supports pixel-count and ratio thresholds, anti-alias handling, HTML output, and JUnit reports. [Its current CLI documentation](https://github.com/reg-viz/reg-cli) describes those controls. Install it with Yarn, consistent with this repository.

## Maestro versus WebdriverIO visual service

These tools overlap, but they are not direct equivalents. Maestro is a complete black-box E2E runner with a small visual assertion API. [`@wdio/visual-service`](https://webdriver.io/docs/visual-testing/) is a visual-testing extension for WebdriverIO. Native-app execution through WebdriverIO requires Appium and the corresponding Android or iOS driver.

| Criterion                    | Maestro                                                                                         | WebdriverIO with `@wdio/visual-service`                                                                                             |
| ---------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Primary role                 | Complete mobile E2E runner with built-in screenshot assertions                                  | General WebdriverIO test runner plus a dedicated visual-comparison service                                                          |
| Native React Native support  | Black-box Android and iOS automation through platform accessibility and input APIs              | Native Android and iOS automation through Appium                                                                                    |
| Test language                | Declarative YAML flows, with optional JavaScript expressions                                    | JavaScript or TypeScript test code                                                                                                  |
| Initial setup                | Install one CLI, start a device, install the app, and run a flow                                | Configure WebdriverIO, Appium, platform drivers, capabilities, test framework, and the visual service                               |
| App instrumentation          | None                                                                                            | No visual-service instrumentation, but Appium drivers and sessions must be configured                                               |
| Container or element capture | `cropOn` accepts a Maestro selector and crops to that element's visible bounds                  | `checkElement` and `saveElement` accept a WebdriverIO element                                                                       |
| Crop expansion               | No documented padding option for `cropOn`                                                       | `resizeDimensions` can enlarge the element crop independently on each side                                                          |
| Off-screen native elements   | Must first be brought fully into the viewport                                                   | Must first be brought into the viewport for native apps. Automatic element scrolling is documented only for web and hybrid contexts |
| Image comparison             | One required match percentage through `thresholdPercentage`                                     | Pixelmatch-based comparison with mismatch percentage and direct per-call Pixelmatch settings                                        |
| Anti-alias control           | No dedicated anti-alias option                                                                  | Can ignore or include anti-aliased pixels. Version 10 defaults to ignoring them                                                     |
| Color and alpha control      | No dedicated color or alpha modes                                                               | Can ignore colors or alpha independently and offers strict or relaxed presets                                                       |
| Ignored regions              | No arbitrary ignored-region option documented for `assertScreenshot`                            | Can block rectangular regions and, for native full-screen checks, selected elements                                                 |
| System chrome                | Avoid it by cropping the tested container or configuring the device and app                     | Mobile comparisons can automatically block status bars and toolbars                                                                 |
| Baseline creation            | Create explicitly with `takeScreenshot`. `assertScreenshot` fails when the reference is missing | Can automatically create missing baselines and supports `--update-visual-baseline`                                                  |
| Baseline naming              | Explicit path in each flow                                                                      | Configurable folders and names derived from platform, device, viewport, DPR, and custom metadata                                    |
| Diff artifacts               | Maestro test artifacts and general HTML or JUnit test reports                                   | Separate baseline, actual, and diff directories, optional JSON diff data, and a visual reporter                                     |
| Android physical devices     | Supported locally                                                                               | Supported through Appium locally or through compatible device clouds                                                                |
| iOS physical devices         | Not currently supported by Maestro. iOS execution is simulator-based                            | Supported through Appium and compatible real-device providers                                                                       |
| Waiting and synchronization  | Built-in UI settling, retries, and visibility-based commands                                    | WebdriverIO and Appium wait APIs must be used deliberately                                                                          |
| CI maintenance               | Lower. The main moving parts are the app build, virtual device, and Maestro CLI                 | Higher. WebdriverIO, Appium server, platform driver, visual service, and capabilities must stay compatible                          |
| Best fit                     | Small cross-platform native suites where simple, stable visual assertions are sufficient        | Suites needing detailed diff tuning, masks, rich image metadata, or an existing Appium/WebdriverIO ecosystem                        |

Maestro's container comparison is the direct equivalent of the basic WebdriverIO `checkElement` use case:

```yaml
- assertScreenshot:
    path: baselines/android/font-sizes.png
    cropOn:
      id: vrt-font-sizes
    thresholdPercentage: 99.9
```

The equivalent WebdriverIO call is:

```ts
await expect($('~vrt-font-sizes')).toMatchElementSnapshot('font-sizes', {
  pixelmatch: {
    threshold: 0.05,
    includeAA: true,
  },
});
```

The threshold values in these examples are not equivalent. Maestro's value is the required percentage of matching pixels. Pixelmatch's `threshold` controls how different two pixel colors must be before that pixel is classified as changed. WebdriverIO separately reports the percentage of pixels classified as mismatches.

For `PlainText`, the decision is:

- Start with Maestro when a cropped container, a strict match percentage, and committed baselines provide enough signal. This is the smallest E2E stack and is likely sufficient for fixed, deterministic specimen pages.
- Choose WebdriverIO immediately if the suite must tune anti-alias handling per specimen, expand crop bounds, ignore arbitrary regions, produce detailed visual diff metadata, or run on physical iOS devices.
- Do not add `reg-cli` on top of WebdriverIO visual service. WebdriverIO already provides the richer comparison layer for which `reg-cli` was proposed as a Maestro fallback.

WebdriverIO version 10 uses Pixelmatch and supports `saveElement`, `checkElement`, screen comparisons, and element matchers for native apps. Its [method documentation](https://webdriver.io/docs/visual-testing/methods/), [comparison options](https://webdriver.io/docs/visual-testing/method-options/), and [baseline configuration](https://webdriver.io/docs/visual-testing/service-options/) describe these controls. Maestro provides `cropOn` for both [`takeScreenshot`](https://docs.maestro.dev/reference/commands-available/takescreenshot) and [`assertScreenshot`](https://docs.maestro.dev/reference/commands-available/assertscreenshot). Maestro currently supports Android emulators and physical devices, while its official iOS support is simulator-only, according to its [platform support documentation](https://docs.maestro.dev/getting-started/build-and-install-your-app).

## Combining Maestro with `reg-cli`

Maestro and `reg-cli` combine cleanly. Maestro drives the app, selects a container, and captures a cropped PNG. `reg-cli` then compares that PNG with a baseline, creates the diff and reports, and determines whether CI passes.

```text
Maestro
  drives app -> selects container -> captures cropped PNG
                                      |
                                      v
reg-cli
  baseline PNG -> compares -> creates diff/report -> passes or fails CI
```

This replaces Maestro's `assertScreenshot` with two separate operations:

- Maestro `takeScreenshot` captures the actual image.
- `reg-cli` provides the visual assertion.

### Capability coverage

| Capability                   | Maestro alone           | Maestro with `reg-cli`             | WebdriverIO visual service           |
| ---------------------------- | ----------------------- | ---------------------------------- | ------------------------------------ |
| Container capture            | Yes, with `cropOn`      | Yes                                | Yes, with `checkElement`             |
| Anti-alias handling          | No dedicated option     | Yes, with `--enableAntialias`      | Yes, configurable per check          |
| Per-pixel color sensitivity  | No                      | Yes, with `--matchingThreshold`    | Yes, with direct Pixelmatch settings |
| Allowed changed-pixel ratio  | Match percentage only   | Yes, with `--thresholdRate`        | Yes                                  |
| Absolute changed-pixel limit | No                      | Yes, with `--thresholdPixel`       | Available through comparison results |
| Ignore colors entirely       | No                      | No                                 | Yes                                  |
| Ignore alpha entirely        | No                      | No                                 | Yes                                  |
| Arbitrary ignored regions    | No                      | No, unless images are preprocessed | Yes                                  |
| Diff images                  | Limited built-in output | Yes                                | Yes                                  |
| HTML report                  | General Maestro report  | Dedicated visual report            | Dedicated visual reporter            |
| JUnit result                 | Yes                     | Yes                                | Through the test runner              |
| Setup complexity             | Low                     | Medium                             | Higher                               |

The combination addresses the most important comparison limitations, but it does not reproduce all WebdriverIO functionality.

### Example setup

Install the comparator using Yarn:

```sh
yarn add --dev reg-cli
```

Capture named containers with Maestro:

```yaml
appId: plaintext.example
---
- launchApp:
    clearState: true

- assertVisible:
    id: vrt-ready

- takeScreenshot:
    path: build/vrt/actual/${PLATFORM}/font-sizes
    cropOn:
      id: vrt-font-sizes

- takeScreenshot:
    path: build/vrt/actual/${PLATFORM}/line-height
    cropOn:
      id: vrt-line-height
```

Maestro supports `cropOn` specifically for narrowing a screenshot to an element or container. The output directory can also be controlled using `--test-output-dir`. See [Maestro `takeScreenshot`](https://docs.maestro.dev/reference/commands-available/takescreenshot) and [test output directories](https://docs.maestro.dev/cli/test-output-directory).

After Maestro finishes, compare the directories:

```sh
yarn reg-cli \
  build/vrt/actual/android \
  e2e/visual/baselines/android \
  build/vrt/diff/android \
  --report build/vrt/report-android.html \
  --junit build/vrt/report-android.xml \
  --matchingThreshold 0.02 \
  --thresholdRate 0.0001 \
  --enableAntialias
```

The positional directories are:

```text
reg-cli ACTUAL EXPECTED DIFF
```

`reg-cli` provides these comparison controls:

- `--matchingThreshold` controls how different two pixel colors must be to count as changed.
- `--thresholdRate` sets the maximum proportion of changed pixels.
- `--thresholdPixel` sets the maximum absolute number of changed pixels and takes precedence over `--thresholdRate`.
- `--enableAntialias` recognizes and ignores anti-aliased pixel differences.

It can also produce HTML and JUnit reports. See the [`reg-cli` documentation](https://github.com/reg-viz/reg-cli).

Baseline updates should be explicit:

```sh
yarn reg-cli \
  build/vrt/actual/android \
  e2e/visual/baselines/android \
  build/vrt/diff/android \
  --update
```

Do not use `--update` in normal CI because that would accept regressions automatically.

### Strict typography and tolerant layout suites

Ignoring anti-aliasing is not automatically desirable for a text-rendering library. It can hide a real rasterization change. Keep two baseline groups:

```text
e2e/visual/baselines/android/
  strict/
  layout/
```

Run strict typography specimens without anti-alias tolerance:

```sh
yarn reg-cli \
  build/vrt/actual/android/strict \
  e2e/visual/baselines/android/strict \
  build/vrt/diff/android/strict \
  --matchingThreshold 0 \
  --thresholdPixel 0
```

Run geometry and layout specimens with anti-alias tolerance:

```sh
yarn reg-cli \
  build/vrt/actual/android/layout \
  e2e/visual/baselines/android/layout \
  build/vrt/diff/android/layout \
  --matchingThreshold 0.02 \
  --thresholdRate 0.0001 \
  --enableAntialias
```

These numbers are illustrative. Set them from repeated same-commit runs on freshly created, identically configured devices.

### Remaining WebdriverIO advantages

For this library, the missing modes are not necessarily disadvantages:

- Ignoring colors is undesirable. `PlainText` supports `color`, opacity, decorations, and background styles, so ignoring color could hide actual regressions.
- Ignoring alpha has limited value. Device screenshots normally contain the final composed pixels rather than the component's original alpha channel.
- Ignored regions should rarely be necessary. Dedicated cropped specimen containers should contain no timestamps, status bars, animations, or dynamic content.

If arbitrary masks are genuinely required, an image-preprocessing step could paint fixed rectangles onto both actual and baseline images before running `reg-cli`. At that point, WebdriverIO visual service is likely the cleaner choice.

Use Maestro with `reg-cli` when simple cross-platform E2E plus precise threshold and anti-alias control is sufficient. Use WebdriverIO visual service when ignored regions, per-test comparison modes, crop expansion, or physical iOS execution are firm requirements.

## Optional improvement: replace Maestro with `agent-device`

This is a possible future optimization, not part of the initial recommended stack. The primary implementation should remain:

```text
Maestro -> cropped PNG screenshots -> reg-cli -> diffs and reports
```

If Maestro execution time becomes a measured CI bottleneck, [`agent-device`](https://github.com/callstack/agent-device) can potentially replace Maestro as the E2E driver and screenshot producer while leaving `reg-cli` unchanged:

```text
agent-device -> PNG screenshots -> reg-cli -> diffs and reports
```

The installed `agent-device` 0.20.8 supports Android emulators and physical devices, iOS simulators and physical devices, accessibility selectors, explicit waits, settled interactions, replayable suites, retries, sharding, screenshots, videos, artifacts, and JUnit reports. It can also execute a supported subset of Maestro YAML with `--maestro`, which provides an incremental migration path.

| Capability                    | Maestro                                  | `agent-device`                                                        |
| ----------------------------- | ---------------------------------------- | --------------------------------------------------------------------- |
| Android emulator              | Yes                                      | Yes                                                                   |
| Android physical device       | Yes                                      | Yes                                                                   |
| iOS simulator                 | Yes                                      | Yes                                                                   |
| iOS physical device           | Not officially supported                 | Yes, with a signed XCTest runner                                      |
| React Native support          | Black-box accessibility automation       | Black-box accessibility automation plus React Native helpers          |
| Script format                 | YAML                                     | Native `.ad` scripts or a supported Maestro YAML subset               |
| Automatic settling            | Built in                                 | `--settle` and explicit waits                                         |
| Suite features                | Retries, reports, and cloud sharding     | Retries, fail-fast, local multi-device sharding, artifacts, and JUnit |
| Screenshot capture            | Yes                                      | Yes                                                                   |
| Status-bar normalization      | Usually configured externally            | Built in for iOS simulator screenshots                                |
| Container crop                | `cropOn` selects an element or container | No documented equivalent in the screenshot command                    |
| Anti-alias comparison control | No                                       | No dedicated option. Continue using `reg-cli`                         |
| Dedicated visual HTML report  | No                                       | No. Continue using `reg-cli`                                          |

### Incremental migration

Existing compatible Maestro flows can be evaluated without immediately rewriting them:

```sh
agent-device test ./e2e/maestro \
  --maestro \
  --platform android \
  --fail-fast \
  --artifacts-dir build/agent-device/android \
  --report-junit build/agent-device/android/junit.xml
```

For iOS, pre-warm the XCTest runner before executing the suite:

```sh
agent-device prepare ios-runner --platform ios

agent-device test ./e2e/maestro \
  --maestro \
  --platform ios \
  --fail-fast \
  --artifacts-dir build/agent-device/ios \
  --report-junit build/agent-device/ios/junit.xml
```

Unsupported Maestro syntax fails loudly. Compatibility mode should therefore be validated against every flow before migration. New tests could later move to native `.ad` scripts if the experiment succeeds.

### Main limitation: container cropping

`agent-device screenshot` does not currently document an equivalent to Maestro's `cropOn` or WebdriverIO's `checkElement`. It captures the active application instead of a selected native container.

This matters because the recommended VRT design compares small, tightly cropped specimens. Large full-screen screenshots make small text changes account for a much smaller percentage of the image, weaken ratio-based thresholds, and include more unrelated pixels that can cause noise.

There are three possible workarounds:

1. Render each specimen group as a dedicated full-screen test canvas so the app screenshot is effectively the component screenshot.
2. Capture the full application and crop it in a deterministic preprocessing step before `reg-cli`. This introduces coordinate and density maintenance.
3. Keep Maestro for the visual suite and use `agent-device` only for non-visual E2E tests.

The third option is the default recommendation. Do not replace Maestro in the VRT pipeline until either `agent-device` gains reliable selector-based screenshot cropping or dedicated full-screen fixtures prove simpler and equally sensitive.

### Required benchmark

Before adopting this improvement, run the same representative suite at least ten times with Maestro and `agent-device`. Compare:

- total execution time excluding the native build
- cold and warm iOS execution time
- Android execution time
- intermittent failure count
- screenshot consistency across identical runs
- CI artifact and failure-diagnosis quality

Use `agent-device test --verbose` for per-step timings and `--cost` on individual commands. Pin the exact `agent-device` version in CI. Adopt it only if the measured speed improvement outweighs the missing container crop and the maintenance cost of an additional, pre-1.0 tool.

## Test-fixture design

I would not take screenshots of the current scrolling screens as-is. Scroll offsets and native navigation chrome introduce unnecessary variability.

Add a dedicated, non-production VRT entry to the example app:

1. Render specimens on fixed-size pages.
2. Remove the tab bar, native navigation header, status bar, animations, and persisted state.
3. Give every screenshot container a stable `testID`.
4. Put no more than one coherent group in each viewport.
5. Show a `testID="vrt-ready"` element only after fonts and layout are ready.
6. Capture the container with Maestro's `cropOn`, not the whole device.
7. Use fixed text with no dates, network data, random values, cursor, or timers.

A flow would conceptually look like:

```yaml
appId: plaintext.example
---
- launchApp:
    clearState: true

- assertVisible:
    id: vrt-ready

- assertScreenshot:
    path: baselines/${PLATFORM}/${DEVICE}/font-sizes.png
    cropOn:
      id: vrt-font-sizes
    thresholdPercentage: 99.9
```

The exact threshold must be established empirically. Maestro's default is 95 percent, which is much too forgiving for a text component. A one-pixel baseline movement can affect very few pixels in a large screenshot.

Before choosing the threshold:

1. Run the same binary 20 times on freshly created devices.
2. Measure the largest same-commit difference.
3. Set the allowed difference narrowly above that.
4. Crop screenshots aggressively.
5. Never mask the text itself.

If percentage matching still misses small glyph or baseline regressions, capture with Maestro and compare using `reg-cli` with both a pixel threshold and a changed-pixel ratio.

## Suggested screenshot coverage

Blocking screenshots on both platforms:

- font size
- bundled and system font families
- every weight and italic combination
- line height, including tight line-height clipping
- letter spacing
- multiline wrapping
- every ellipsize mode
- `numberOfLines`
- explicit width and intrinsic width
- baseline alignment
- padding and border interactions
- text alignment
- decorations
- transformations
- emoji and fallback glyphs
- opacity and background
- realistic compound use cases

Additional Android screenshots:

- `includeFontPadding`
- `textAlignVertical`
- clipping reproductions
- variable fonts on API 26+
- vertical alignment aliases

Additional font-scale runs:

- scale `1.0`, blocking
- scale `1.5` or `2.0`, blocking for the dynamic-type subset
- verify `allowFontScaling={false}`
- verify `maxFontSizeMultiplier`

Keep separate baseline trees because cross-platform differences are expected:

```text
e2e/visual/baselines/
  android-api35-pixel6-font1/
  android-api35-pixel6-font15/
  ios26-iphone16-font1/
  ios26-iphone16-font15/
```

System-font screenshots are tied to the OS version. Bundled-font screenshots are more portable, but layout and rasterization can still change between platform releases.

## CI design

Create a reusable `visual.yml` workflow with two independent jobs.

### Android job

- `runs-on: ubuntu-24.04`
- Java 17
- Yarn 4 with `yarn install --immutable`
- build the example's release APK
- launch an AVD using `ReactiveCircus/android-emulator-runner`
- run Maestro
- upload screenshots, diffs, logs, and JUnit/HTML results with a 4-day retention period

Recommended AVD:

```yaml
api-level: 35
target: google_apis
arch: x86_64
profile: pixel_6
emulator-options: >-
  -no-window
  -no-snapshot
  -noaudio
  -no-boot-anim
  -gpu swiftshader
disable-animations: true
```

Android supports explicitly selecting a software GPU and disabling snapshots. These controls are documented by the [Android Emulator command-line reference](https://developer.android.com/studio/run/emulator-commandline) and [graphics acceleration documentation](https://developer.android.com/studio/run/emulator-acceleration).

Avoid `swiftshader_indirect` in a new workflow because current Android documentation marks it deprecated. Use `swiftshader`.

### iOS job

- use an explicit runner such as `macos-26`, never `macos-latest`
- explicitly select Xcode, for example `/Applications/Xcode_26.6.app`
- explicitly create an iPhone 16 simulator with a named iOS runtime
- build the Release simulator `.app`
- install through `simctl`
- run Maestro
- upload artifacts with a 4-day retention period

GitHub's macOS images continue to update even under an explicit OS label, so selecting both Xcode and runtime is important. Current macOS 26 images expose several Xcode and iOS runtime versions, as shown in the [GitHub runner image inventory](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-arm64-Readme.md).

### Triggers

Run VRT:

- as a required step before every release
- manually through `workflow_dispatch` when visual verification is needed during development

Do not run VRT automatically for every pull request or push to `main`. The release workflow should test the exact commit that it will tag and publish. If either platform's VRT job fails, the workflow must stop before creating the tag or publishing the package.

The best release model is:

```text
release starts for a specific commit on main
    ↓
Android and iOS VRT pass for that commit
    ↓
create the tag and publish that exact commit
```

Do not automatically update baselines during a release. Baseline updates should be ordinary reviewed PR changes.

The existing release command invokes `release-it`, whose pre-release validation currently only calls `yarn validate`: [package.json](package.json). Make the release workflow depend on the two VRT jobs before publishing.

## Can the device configuration be locked?

Mostly, but not perfectly.

Lock these parameters:

- device model
- screen resolution and density
- OS/API version
- system image target and architecture
- Xcode version
- iOS runtime
- emulator GPU backend
- portrait orientation
- locale
- timezone
- light appearance
- font scale
- display scale
- animation scales
- accessibility settings
- application state
- bundled font files

For Android, configure after boot:

```sh
adb shell wm size 1080x2400
adb shell wm density 420
adb shell settings put system font_scale 1.0
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0
adb shell cmd uimode night no
```

For iOS:

- use a specifically named simulator device and runtime
- set appearance to light
- fix the content-size category
- override status-bar values if the status bar remains visible
- erase or recreate the simulator before the run
- fix locale and language
- disable animations where possible

For the cleanest results, exclude all system chrome from screenshots.

What GitHub Actions cannot fully lock is the underlying runner image patch and some preinstalled tool revisions. GitHub-hosted jobs also start in a fresh VM, which is useful for isolation, but hosted image contents are maintained over time. [GitHub's runner documentation](https://docs.github.com/en/actions/reference/runners/github-hosted-runners) explains this environment model.

If absolute long-term stability is necessary, use either:

- a self-hosted Mac with frozen Xcode and Android SDK installations, or
- Maestro Cloud with explicit device settings

Maestro Cloud lets you specify Android API, iOS device model, OS, and locale. It also recreates devices between tests. [Maestro Cloud device isolation](https://docs.maestro.dev/maestro-cloud) is attractive if maintaining runners becomes expensive.

## Emulator versus real device

Yes, Android emulator VRT is worthwhile. In fact, I recommend it as the primary blocking environment.

It reliably catches:

- incorrect Yoga/native measurements
- changed wrapping points
- clipping
- ellipsis placement
- baseline movement
- missing fonts
- font-scale bugs
- incorrect padding
- platform-specific prop regressions

It does not perfectly validate:

- physical display characteristics
- OEM font substitutions
- vendor-modified Android behavior
- hardware GPU rendering differences
- performance
- every subpixel antialiasing difference seen on hardware

For this library, geometry and text layout are more important than physical display color, so emulator VRT gives very high value.

Real devices are less suitable for the sole golden-image environment because their state, OS updates, status chrome, provisioning, and availability are harder to control. Use real-device testing as a second layer:

- weekly
- on release candidates
- after React Native, Expo, Xcode, or Android SDK upgrades
- on one stock Android device and one iPhone

If you want managed real-device visual review, BrowserStack App Percy supports native Android and iOS, Maestro integration, device-specific baselines, and real-device execution. [App Percy documentation](https://www.browserstack.com/docs/app-percy) describes those capabilities.

## Tool alternatives

- **Detox:** Good for complex React Native E2E flows and synchronization. It supports device and element screenshots, but you still need a comparison and baseline-management layer. See the [Detox screenshot documentation](https://wix.github.io/Detox/docs/guide/taking-screenshots/). It is more setup than this static fixture needs.
- **Appium:** Broad ecosystem and real-device-cloud compatibility, but verbose and operationally heavier. Use it if Appium is already standard in your organization.
- **Applitools Eyes:** Strong paid review and device-grid experience. Its perceptual matching can reduce false positives, but strict typography regressions need carefully chosen match modes. See [Applitools mobile testing](https://applitools.com/solutions/mobile-testing/).
- **Jest snapshots:** Keep them for JavaScript API structure. They cannot verify native glyphs or measurement.
- **AI visual assertions:** Do not use them as the release gate. Maestro currently labels its AI defect assertion experimental. See the [Maestro AI assertion documentation](https://docs.maestro.dev/api-reference/commands/assertnodefectswithai).

My preferred first implementation is GitHub Actions, Maestro, cropped committed baselines, one virtual device per platform, and optional `reg-cli` only if Maestro's percentage threshold is not precise enough. This gives the repository a small, reviewable stack while testing the native behavior that currently has the largest coverage gap.

# Visual Regression Testing Proposal

## Current implementation

The repository currently uses the smallest useful subset of this proposal.
The root renders `AppVrt` when its deep link contains a `testID` query parameter
and renders the regular app otherwise. agent-device opens one specimen at a
time through the app's URL scheme and captures the full device viewport. `reg-cli`
performs strict image comparison afterward.

The capture runner reads `.agent-device/vrt-captures.txt` and opens every
platform-relevant specimen as
`exp+react-native-plain-text-example://vrt?testID=<testID>`. `AppVrt` filters
the shared Features and Use Cases specimen trees so only that test ID is mounted. The
runner uses `screenshot` to write the fixed-size viewport directly to
`build/vrt/actual/<platform>/<profile>/`. When the corresponding
`baselines/<platform>/<profile>/` directory does not exist, the wrapper moves
the complete PNG set there after agent-device succeeds. Once the baseline
exists, the wrapper stages a portable copy under `build/vrt/baseline-reviewed/`,
then `reg-cli` compares it with the actual images and writes diffs to
`build/vrt/diff/<platform>/<profile>/`.

`baselines/` is a shallow Git submodule backed by
[`react-native-plain-text-artifactory`](https://github.com/troZee/react-native-plain-text-artifactory).
Before a production VRT test, the wrapper initializes it when needed, syncs its
configured URL, and checks out the latest commit from `origin/main`. Reviewed
baselines, candidate baselines, actual captures, diffs, portable reports, and
environment logs are uploaded as temporary CI artifacts outside both
repositories.

Comparison keeps a zero pixel threshold, with `reg-cli`'s antialias detection
enabled. iOS uses a zero matching threshold. Android uses `0.004`, which
ignores a one-step difference in an 8-bit color channel caused by screenshot
quantization. It still detects larger color differences, solid-pixel text
changes, and layout changes.

Setting `VRT_MODE_DEV=1` captures only the predefined
`vrt-capture-features-font-size-48` specimen. Its first run creates a one-image
baseline under the ignored `build/vrt/baseline-dev/` directory, and later runs
compare against it. Dev mode never creates or modifies the production-ready
baseline under `baselines/`.

The development capture is a native `.ad` replay. Its URL and output path are
late-bound through replay variables, while the platform files pin the expected
screenshot density.

Dev mode does not clear app state. Doing so removes the Expo development
client's remembered Metro server, and launching the package without a URL
opens its launcher. The wrapper forwards Metro's default port `8081` on
Android, and agent-device opens the generated `expo-development-client` URL
with the specimen test ID as a query parameter. `VRT_DEV_SERVER_PORT` and
`VRT_DEV_CLIENT_URL` can override those defaults.

The manifest and threshold suites below remain possible extensions rather than
requirements for the current implementation.

Android emulator setup is owned by `emulator.config.json`. CI resolves that
file into inputs for a commit-pinned
[`ReactiveCircus/android-emulator-runner`](https://github.com/ReactiveCircus/android-emulator-runner)
action, which creates a clean Pixel 9 AVD and owns its lifecycle. Repository
scripts derive Android verification and capture values from the same file
instead of duplicating them in shell or CI. The derived logical AVD name is also
the capture and baseline profile, so it remains stable across the host-specific
arm64-v8a and x86_64 images. Print the effective inputs for the current host
with:

```sh
./scripts/resolve-android-vrt-action-config.sh
```

For local iteration, create and start an AVD with those values, then let the
repository normalize and verify it before building and capturing:

```sh
yarn vrt:android
```

CI additionally uploads the action inputs, AVD files, emulator command and
version, SDK packages, system-image metadata, device properties and settings,
display and renderer state, host/KVM details, and system-font hashes. This is
the canonical reproduction record; an Apple Silicon arm64-v8a image can still
render differently from the Linux x86_64 CI image.

The Android job sets `ANDROID_HOME` and `ANDROID_SDK_ROOT` to a clean,
repository-local `.android-sdk`, then installs the checksummed
command-line-tools archive declared in `emulator.config.json`. The workflow
verifies that its `avdmanager` exposes `pixel_9` before invoking the
release-built action. Reusing the runner's SDK can expose an older hardware
profile catalog, while pinning an unreleased action commit can select JavaScript
that has not had its runtime dependencies bundled.

## Recommendation

Use one comparison path for the first implementation:

- agent-device 0.21.0 or newer for cross-platform navigation and full-screen capture
- `reg-cli` for comparison, missing-image detection, PNG diffs, HTML reports, and JUnit output
- GitHub Actions with one pinned simulator or emulator environment per platform
- Committed baselines produced only by the canonical GitHub Actions environments
- Simulator and emulator results as the blocking release signal
- Optional BrowserStack App Percy runs as non-blocking real-device validation

Do not add a second screenshot comparison path in phase one. It would create
different threshold, artifact, and baseline-update behavior. Reconsider it
only if removing `reg-cli` becomes a measured maintenance benefit and the
replacement provides the same missing-image and diagnostic guarantees.

agent-device is preferred over Detox or Appium for the initial fixture because
the screens are static and can be driven through accessibility identifiers.
`reg-cli` supplies the stricter comparison and reporting controls that a
text-rendering library needs.

## Why VRT is valuable here

`PlainText` is a Fabric component backed by `UILabel` and Android `TextView`. Important behavior happens outside JavaScript:

- intrinsic measurement
- line wrapping and clipping
- baselines
- font selection and fallback
- line height and letter spacing
- ellipsis placement
- padding and borders
- dynamic font scaling
- variable fonts
- Android font padding

Jest cannot verify those behaviors. The current automated tests do not launch the native example app, as described in [workflow.md](docs/agent/workflow.md#automated-tests) and [.github/workflows/ci.yml](.github/workflows/ci.yml).

The example app already contains most of the needed specimens and bundled fonts. VRT should expose them through a deterministic test-only entry instead of capturing the current scrolling screens.

## Phase-one stack

| Responsibility    | Choice                                                                       |
| ----------------- | ---------------------------------------------------------------------------- |
| Native fixture    | Existing Expo dev-client example with a test-only VRT route                  |
| E2E driver        | A pinned agent-device CLI version                                            |
| Image comparison  | A pinned `reg-cli` dependency                                                |
| CI                | GitHub Actions                                                               |
| Android           | Pixel 6 AVD, API 35, x86_64, Google APIs                                     |
| iOS               | iPhone 16 Simulator with explicit Xcode and iOS runtime versions             |
| Baselines         | Pinned artifact-repository submodule, separated by environment and suite     |
| Failure artifacts | Actual, expected, diff, JSON, HTML, JUnit, native logs, and fixture metadata |

Pin agent-device to an exact version in the workflow installation step. Pin
third-party GitHub Actions by full commit SHA, matching the existing CI
convention. Keep `reg-cli` in the root Yarn lockfile.

## Fixture contract

### Entry point

Use the example app's Expo development-client URL scheme and a non-production
route with this shape:

```text
exp+react-native-plain-text-example://vrt?testID=<testID>
```

The route bypasses tabs, navigation headers, persisted state, animations, and
the long scrolling specimen pages. It renders one specimen on the same fixed
background and with the same available width as the normal example screen.

agent-device opens the app and captures each specimen by accessibility ID:

```sh
agent-device settings clear-app-state plaintext.example --platform android
agent-device open plaintext.example \
  'exp+react-native-plain-text-example://vrt?testID=vrt-capture-features-font-size-48' \
  --platform android \
  --foreground
agent-device wait 'id="vrt-capture-features-font-size-48-text"' 15000
agent-device screenshot strict/font-size-48.png
agent-device close
```

### Readiness

Each route owns its readiness state. It must:

1. Start in `loading` while bundled fonts load.
2. Render `testID="vrt-error-<specimen-id>"` with a diagnostic message if font loading fails.
3. Wait for the capture container's final layout.
4. Expose `testID="vrt-ready-<specimen-id>"` only after the layout used for capture is stable.

The agent-device runner uses a bounded wait. On timeout its diagnostics identify
the failed selector and current UI state. A global readiness marker is
insufficient because navigation and later layout passes can invalidate it.

### Specimen manifest

Add `e2e/visual/specimens.json` as the source of truth:

```json
[
  {
    "id": "font-sizes",
    "route": "plaintext://vrt/font-sizes",
    "platforms": ["android", "ios"],
    "fontScales": [1, 1.5],
    "suite": "strict",
    "captureTestID": "vrt-capture-font-sizes",
    "readyTestID": "vrt-ready-font-sizes"
  }
]
```

A validation script must fail when:

- a manifest entry has no agent-device capture
- a captured PNG has no manifest entry
- two entries resolve to the same baseline path
- a required platform or font-scale variant is missing
- a baseline exists for a removed entry without an explicit deletion in the same change

Generate flows from the manifest or validate handwritten flows against it. Do not maintain two independent specimen lists.

## Canonical paths

Use one path schema everywhere:

```text
e2e/visual/baselines/<platform>/<environment>/<suite>/<specimen>.png
build/vrt/actual/<platform>/<environment>/<suite>/<specimen>.png
build/vrt/diff/<platform>/<environment>/<suite>/<specimen>.png
```

Initial environment keys:

```text
android/api35-pixel6-x86_64-font1
android/api35-pixel6-x86_64-font1.5
ios/ios26.5-xcode26.6-iphone16-arm64-font1
ios/ios26.5-xcode26.6-iphone16-arm64-font1.5
```

Each baseline environment directory also contains `metadata.json` with the
runner architecture, OS/runtime version, Xcode or Android system-image
revision, device profile, display settings, font scale, agent-device version,
`reg-cli` version, and fixture commit.

## Capture and artifact normalization

agent-device writes each screenshot to the requested repository-relative path.
The current runner waits for the specimen's `-text` test ID, then captures the
full device viewport so every PNG has the same dimensions:

```sh
agent-device screenshot \
  build/vrt/actual/android/example/vrt-capture-font-sizes.png
```

iOS captures pass `--pixel-density 3` to retain the simulator's native pixel
resolution. Android captures use device pixels. Each
deep link mounts its target near the top of the VRT root, so no scrolling or
viewport discovery is required. A missing or unreadable readiness target is
fatal. Fixed viewport dimensions keep native text measurement differences from
changing the dimensions of the captured PNG itself.

## Comparison

Run strict typography and tolerant layout suites separately.

Strict typography:

```sh
yarn reg-cli \
  build/vrt/actual/android/api35-pixel6-x86_64-font1/strict \
  e2e/visual/baselines/android/api35-pixel6-x86_64-font1/strict \
  build/vrt/diff/android/api35-pixel6-x86_64-font1/strict \
  --report build/vrt/report-android-strict.html \
  --json build/vrt/report-android-strict.json \
  --junit build/vrt/report-android-strict.xml \
  --matchingThreshold 0 \
  --thresholdPixel 0 \
  --extendedErrors \
  --diffFormat png
```

Tolerant layout:

```sh
yarn reg-cli \
  build/vrt/actual/android/api35-pixel6-x86_64-font1/layout \
  e2e/visual/baselines/android/api35-pixel6-x86_64-font1/layout \
  build/vrt/diff/android/api35-pixel6-x86_64-font1/layout \
  --report build/vrt/report-android-layout.html \
  --json build/vrt/report-android-layout.json \
  --junit build/vrt/report-android-layout.xml \
  --matchingThreshold 0.02 \
  --thresholdRate 0.0001 \
  --enableAntialias \
  --extendedErrors \
  --diffFormat png
```

`--extendedErrors` is mandatory. Without it, added or deleted images do not fail the command. The numeric thresholds above are placeholders. Calibrate them from repeated same-commit runs on freshly created canonical devices.

A wrapper should translate `reg-cli` JSON into these terminal states:

| State              | Meaning                                                  | Retry                  |
| ------------------ | -------------------------------------------------------- | ---------------------- |
| `PASSED`           | All expected images matched                              | No                     |
| `VISUAL_MISMATCH`  | Image exists but exceeds its threshold                   | No                     |
| `BASELINE_MISSING` | Actual has no committed expected image                   | No                     |
| `CAPTURE_MISSING`  | Manifest entry produced no actual image                  | No                     |
| `INFRA_FAILED`     | Build, boot, install, driver, or artifact service failed | Once on a fresh device |

Only `INFRA_FAILED` is retryable. Every other non-passing state blocks the relevant check.

## Initial screenshot coverage

Start with a small blocking pilot:

- intrinsic width and explicit width
- multiline wrapping
- ellipsis and `numberOfLines`
- line height and tight clipping
- bundled font selection
- baseline alignment
- Android `includeFontPadding`
- one realistic compound use case

Measure duration, false-positive rate, repeated-run stability, artifact size, and baseline churn before expanding. Later coverage should include all supported styles, Android-specific properties, emoji and fallback glyphs, variable fonts, decorations, transformations, and dynamic type.

Run font scale `1.0` for the whole pilot. Run `1.5` for the dynamic-type subset, including `allowFontScaling={false}` and `maxFontSizeMultiplier`.

## Native CI build and installation

Both native example directories are generated and ignored. Every canonical job starts from a clean checkout and must generate them before building.

### Shared setup

1. Check out the requested SHA.
2. Use the repository's composite setup action and `yarn install --immutable` behavior.
3. Install a pinned agent-device version.
4. Validate the specimen manifest.
5. Record tool versions in the artifact metadata.

### Android job

Use `ubuntu-24.04`, Java 17, and the commit-pinned
`ReactiveCircus/android-emulator-runner` action. Keep every third-party workflow
action pinned by full commit SHA. Do not use AVD snapshots while calibrating the
environment; create a clean, wiped AVD for each run.

Generate the project before starting the emulator:

```sh
yarn example expo prebuild --platform android --yarn
```

The installed Expo version recreates the native project by default. Do not pass `--no-clean` in CI.

`emulator.config.json` describes the API 36 Pixel 9 Google Play AVD with the
host-appropriate ABI and pinned emulator build. CI resolves it and passes every
supported setting to the emulator action:

```sh
./scripts/resolve-android-vrt-action-config.sh
```

After boot, configure and verify the locked device state. Then build, install, and launch the embedded-bundle Release app:

```sh
yarn example expo run:android \
  --variant release \
  --no-bundler \
  --device emulator-5554

adb shell pm path plaintext.example
```

The job fails if package verification does not return an installed APK path. Capture `logcat`, emulator details, and screenshots with `if: always()`.

### iOS job

Use an explicit runner such as `macos-26`, an explicit Xcode installation, and an explicitly created iPhone 16 simulator with the baseline runtime.

Generate the native project and install pods through Expo prebuild:

```sh
yarn example expo prebuild --platform ios --yarn
```

Boot the named simulator, then build, install, and launch the Release app without Metro:

```sh
yarn example expo run:ios \
  --configuration Release \
  --no-bundler \
  --device "$VRT_SIMULATOR_UDID"

xcrun simctl get_app_container "$VRT_SIMULATOR_UDID" plaintext.example app
```

The job fails if the app container cannot be resolved. Capture simulator logs, the selected runtime, Xcode version, and screenshots with `if: always()`.

### Locked device state

Both jobs must set and then verify:

- runtime and device model
- screen resolution, density, and orientation
- locale and language
- timezone
- light appearance
- font scale or content-size category
- display scale
- animation scales
- accessibility settings that affect text
- clean application state

Android setup includes:

```sh
adb shell wm size 1080x2400
adb shell wm density 420
adb shell settings put system font_scale 1.0
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0
adb shell cmd uimode night no
```

The setup script must read each effective value back and write it to `metadata.json`. The iOS setup script must do the same for appearance, content-size category, locale, language, orientation, and simulator runtime. Font-scale suites use fresh device state and relaunch the app after changing the setting.

## Baseline lifecycle

### Bootstrap

1. An authorized maintainer dispatches `visual-baseline-candidate.yml` for an exact commit SHA and environment.
2. The workflow builds the app in the canonical environment and captures every manifest entry.
3. It uploads candidate baselines, metadata, and a manifest coverage report. It never writes to the default branch.
4. A maintainer downloads the candidate or a bot opens a baseline PR.
5. The PR requires review from the baseline owners before merge.

### Updating baselines

Baseline changes are ordinary reviewed PR changes in the artifact repository.
Generate them in the canonical workflow, not on a developer workstation. Each
library PR that changes baselines also updates the pinned `baselines/`
submodule commit and cross-links the artifact PR for image review.

For a baseline-changing PR:

1. Dispatch the workflow against the PR's exact head SHA, or trigger it automatically when fixture, font, native, or baseline paths change.
2. Compare the canonical actual images with the baselines proposed in that SHA.
3. Upload the differences between the previous and proposed baselines for human review.
4. Require the manifest coverage check and both platform checks before merge.

Never run `reg-cli --update` in comparison or release jobs. It may be used only inside the isolated candidate-generation workspace:

```sh
yarn reg-cli \
  build/vrt/actual/android/api35-pixel6-x86_64-font1 \
  build/vrt/candidate/android/api35-pixel6-x86_64-font1 \
  build/vrt/candidate-diff/android/api35-pixel6-x86_64-font1 \
  --update \
  --extendedErrors
```

### Rename and deletion

Renaming or removing a specimen requires the capture manifest, runner, and
baseline deletion in linked library and artifact PRs. The library PR must pin
the artifact commit containing that deletion. Manifest validation treats stale
or missing files as errors.

### Environment upgrades

An Xcode, iOS runtime, Android system image, device, font, agent-device, or
comparator upgrade creates a new environment key. Run calibration and review
the complete candidate set before switching CI. Keep the previous baseline
tree until the workflow using it is removed, then delete both in one PR.

## CI triggers and release integration

Create reusable `visual.yml` jobs plus caller workflows.

- Pull requests that change native implementation, example fixtures, fonts, the agent-device runner, the manifest, or baselines run the pilot suite. Baseline-changing PRs run the full affected environment.
- A scheduled full run detects hosted-runner and runtime drift before a release.
- `workflow_dispatch` accepts an exact commit SHA and environment for diagnosis or candidate generation.
- Every release invokes both complete platform jobs before tagging or publishing.

The release workflow calls `visual.yml` with the release commit SHA, waits for both platform outputs, and permits publishing only when both return `PASSED`. Local `yarn release` remains a maintainer operation and must not be used to bypass the required GitHub environment protection.

Use `timeout-minutes`, per-SHA concurrency, cancellation of superseded PR runs, pinned action SHAs, and `permissions: contents: read` for VRT jobs. Retry only `INFRA_FAILED`, once, on a fresh device. Upload compact metadata on success. Upload all diagnostic artifacts on failure with `if: always()`.

Retain release failure artifacts long enough for the project's review SLA. Four days is acceptable only if maintainers commit to investigating within that window.

## Emulator versus real device

Virtual devices are the primary blocking environment because geometry and text layout matter more here than physical display color. They reliably cover measurement, wrapping, clipping, ellipsis, baselines, font loading, dynamic type, and padding.

Real devices add OEM fonts, vendor Android behavior, hardware rendering, and physical display coverage. Run them as a non-blocking second layer on a schedule, for release candidates, and after React Native, Expo, Xcode, or Android SDK upgrades. Document vendor data retention, access control, secrets, expected usage, and cost before enabling BrowserStack or another hosted service.

## Appendix A: Comparator alternatives

### Driver-owned screenshot comparison

A device driver can compare a screenshot directly during capture. That does
not necessarily provide the same per-pixel sensitivity, anti-alias controls,
dedicated visual report, or explicit added and deleted image contract used by
the phase-one workflow.

It is a reasonable simplification only if a measured pilot shows that one percentage threshold catches seeded typography regressions, remains stable across repeated runs, and produces sufficient failure artifacts. If adopted later, replace `reg-cli` rather than maintaining both comparison paths.

### WebdriverIO visual service

WebdriverIO with `@wdio/visual-service` offers element capture, Pixelmatch controls, ignored regions, crop expansion, metadata-rich baselines, and Appium-backed physical iOS support. It also requires WebdriverIO, Appium, platform drivers, capabilities, and their compatibility maintenance.

Choose it instead of agent-device plus `reg-cli` only when ignored regions,
per-test comparison modes, crop expansion, or physical iOS execution are firm
requirements. Do not add `reg-cli` on top of WebdriverIO visual service.

### Detox and Appium

Detox is useful for complex React Native synchronization but still needs a comparison and baseline layer. Appium has broad ecosystem and device-cloud support but is operationally heavier. Neither is the phase-one choice for static specimen pages.

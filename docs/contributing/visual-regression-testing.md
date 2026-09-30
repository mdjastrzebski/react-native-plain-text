# Visual regression testing

The VRT suite renders each specimen from `example/src/vrt/groups.tsx` on its own
screen in a Release build of the example app, screenshots it cropped to the
specimen's bounds, and compares the PNG with a reviewed baseline in
`tests/vrt/<platform>/`.

## Setup

Android needs `ANDROID_HOME` (or `ANDROID_SDK_ROOT`). iOS needs Xcode 26 and the
iOS 26.5 simulator runtime.

## Commands

```sh
yarn vrt android            # full pipeline
yarn vrt ios
yarn vrt <platform> <stage> # setup | build | install | verify | e2e | capture | compare | update
```

Stages run in the order
`setup -> build -> install -> verify -> e2e -> capture -> compare`, and each can
be rerun on its own.

- `setup` creates and boots the pinned Android AVD or iOS simulator. Set
  `ANDROID_HEADLESS=1` to run the emulator without a window, as CI does.
- `build` produces a Release app with `VRT_ENABLED=1` and copies it to
  `node_modules/.cache/vrt/apps/<platform>/`, along with a fingerprint of its
  source inputs. `install` and `capture` refuse a stale app and name the command
  to rerun.
- `verify` fails if the device does not match the pinned profile (runtime,
  device type, density, locale, font scale, appearance, and so on). It writes
  the observed values to `.vrt/environment/<platform>.txt` (see
  [Suites](#suites) for the other suite's paths). `e2e` and `capture`
  run it first.
- `e2e` checks that cold and warm deep links work. It only matters when the
  deep-link path changes. On iOS the cold check calls `simctl openurl` itself,
  since agent-device gives it only 15 s, and a failed attempt leaves a
  screenshot, the openurl output, and SpringBoard's log in
  `.vrt/agent-device/ios/cold-<n>/`.
- `compare` only reads existing captures, so it is cheap to rerun.

## Local loop

Capture a subset and compare just those images:

```sh
yarn vrt ios capture --filter font-size   # comma-separated substrings, or --limit <n>
yarn vrt ios compare partial
```

A filtered capture is marked partial. `compare` without `partial` still demands
every scenario, and `update` refuses a partial capture.

To open one specimen by hand, deep link to its test ID:

```sh
xcrun simctl openurl "$(cat .vrt/devices/ios-udid)" \
  'exp+react-native-plain-text-example://vrt?testID=vrt-features-font-size-48'

adb -s "$(cat .vrt/devices/android-serial)" shell am start -W \
  -a android.intent.action.VIEW -p plaintext.example \
  -d 'exp+react-native-plain-text-example://vrt?testID=vrt-features-font-size-48'
```

## Scenarios

Every specimen in `groups.tsx` is a scenario, named after its `vrt-…` test ID.
Its image file drops the `vrt-` prefix: `vrt-features-font-size-48` is captured
as `features-font-size-48.png`.
Adding a specimen means it gets captured and needs a baseline. There is no skip
list: to leave a specimen out, remove it from `groups.tsx` (and its baseline
PNG), or give its group a `platform` to render it on one platform only.
`yarn test` checks that IDs are well formed and unique.

### What belongs in the suite

Every scenario is a baseline to review and update whenever rendering changes, so
each one has to protect something no other scenario does. Prefer stable
scenarios that rarely need a new baseline:

- **Feature rows** that vary one prop, or a combination of two where they
  interact.
- **Representative examples** of typical UI text (headings, body copy, labels,
  badges) that stay stable over time.

Three kinds of specimen from the example app are left out on purpose:

- **Props with no visual effect.** Accessibility props (`accessibilityLabel`,
  `accessibilityRole`, and so on) and animated text (Animated and Reanimated
  driving `text`) don't change what a still screenshot shows. Test them with
  VoiceOver or TalkBack, the native view tree, or unit tests instead.
- **Redundant variations.** When a prop goes through one native code path, one
  or two values cover it. For example, VRT doesn't render text in every palette
  color: color is passed straight through, so one row catches a regression and
  the extra rows only add images to update. Add another value only when it
  takes a different code path, or when the platform treats it differently.
- **Random combinations.** The example app's Random Combinations rows stack
  three to five arbitrary props. A change to any one of those props changes the
  image, so these rows would need new baselines far more often than the feature
  rows that already cover each prop, without catching anything those rows miss.

## Suites

A suite is a set of scenarios captured under its own device settings, with its
own captures, reports, and baselines. A group in `groups.tsx` joins one with
`suite`, and everything else is in `default`:

| Suite        | Scenarios                                                 | Text size                                             | Baselines                          |
| ------------ | --------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------- |
| `default`    | every group without a `suite`                             | Android `font_scale` 1, iOS content size `large` (1x) | `tests/vrt/<platform>/`            |
| `font-scale` | the font-scaling group (`allowFontScaling`, the 1.2x cap) | Android 1.3, iOS `extra-extra-extra-large` (1.353x)   | `tests/vrt/<platform>-font-scale/` |

At 1x, `allowFontScaling` and `maxFontSizeMultiplier` change nothing, which is
why those specimens run in their own suite.

`capture`, `compare`, and `update` (and the full pipeline) run every suite in
turn. Each capture first switches the device to its suite's text size with
`scripts/apply-vrt-text-size.sh`, restarting the app when the size changes, since
a running app keeps the text size it started with. `compare` reports every suite
even when an earlier one fails. A `--filter` capture skips the suites it selects
nothing in, and `compare partial` only compares suites with a partial capture.

To run one suite, set `VRT_SUITE`:

```sh
VRT_SUITE=font-scale yarn vrt android capture
VRT_SUITE=font-scale yarn vrt android compare
```

`setup`, `verify`, and `e2e` use the default suite's text size unless
`VRT_SUITE` says otherwise. A capture leaves the device at its suite's size, so
`verify` and `e2e` switch it back first, the same way a capture does.

## What compare enforces

- **Exact image set.** Actual and baseline directories must hold exactly one
  PNG per scenario. Missing or extra images fail before any pixel comparison.
- **Same environment.** The current `environment.txt` must match the one stored
  with the baselines. Android ignores CPU architecture, so x86_64 CI and arm64
  Macs share baselines. iOS ignores the exact Xcode version but not the
  simulator runtime.
- **Pixels.** `reg-cli` allows zero changed pixels. Android uses a matching
  threshold of `0.02` to absorb emulator rasterization noise, iOS uses `0`.
  Defaults live in `scripts/vrt-config.sh`.

The report (actual, expected, and diff images, plus HTML and JSON) is written to
`.vrt/report/<platform>/`. CI uploads it even when the comparison fails.

## Updating baselines

Baselines are the committed PNGs in `tests/vrt/android/` and `tests/vrt/ios/`,
one per scenario, plus the `environment.txt` they were captured in. `compare`
never writes them. After reviewing a complete capture:

```sh
yarn vrt ios update
git add tests/vrt/ios
```

`update` replaces the whole platform directory, so check `git status` shows
only the images you expect. Commit them in the same pull request as the change
that caused them, where the image diff gets reviewed alongside the code.

## CI

`.github/workflows/vrt.yml` runs nightly and on manual dispatch, on a
Pixel 9 API 36 emulator and an iPhone 16 Pro iOS 26.5 simulator. Each job runs
both suites on the same device. Built apps are cached by their source
fingerprint.

To run it by hand, use Actions → Visual Regression Tests → Run workflow, or:

```sh
gh workflow run vrt.yml --ref <branch> -f platform=ios
```

`platform` is `all` (the default), `android`, or `ios`.

### Bumping the Android system image

The Android emulator build is pinned by URL, but the system image is not:
`sdkmanager`, and `android-emulator-runner` which calls it in CI, only installs
the newest revision on the channel. The pin in `scripts/vrt-config.sh`
(`ANDROID_SYSTEM_IMAGE_REVISION`) is therefore a check, not an install
instruction. The day Google publishes a new revision, every fresh install gets
it, `verify` fails with `android_system_image_revision` mismatched, and the
nightly Android job stays red until someone bumps the pin.

The x86_64 image (CI) and the arm64-v8a image (Apple silicon) are separate
packages. They usually move together, but check both in
`https://dl.google.com/android/repository/sys-img/google_apis/sys-img2-3.xml`
before bumping.

To bump:

1. Set `ANDROID_SYSTEM_IMAGE_REVISION` in `scripts/vrt-config.sh` to the new
   revision.
2. Change the `rN` in the Android job's `VRT_TOOLCHAIN` in
   `.github/workflows/vrt.yml` to match, so no build cached against the old
   image is restored.
3. Re-baseline both Android suites. The revision is recorded in each
   `environment.txt`, so `compare` rejects the old baselines even when no pixel
   moved. Either run locally:

   ```sh
   yarn vrt android all
   yarn vrt android update
   ```

   `all` ends with a compare that fails on the environment. That is expected;
   the captures are in place for `update`. Or dispatch the workflow on the
   branch (`-f platform=android`). Its compare fails the same way, but the
   uploaded `vrt-android-*` artifact holds `actual/` and `environment/` for
   both suites. Every uploaded path is under `.vrt/`, so the zip is rooted there
   and has no `.vrt/` prefix. Unzip it into `.vrt/`, not the repo root, and run
   `yarn vrt android update`:

   ```sh
   unzip vrt-android-1.zip -d .vrt
   yarn vrt android update
   ```

4. Review the image diff in `tests/vrt/android/` and
   `tests/vrt/android-font-scale/`. Beyond `environment.txt`, any changed image
   is a rendering change in the new image and needs the same scrutiny as one
   caused by code.

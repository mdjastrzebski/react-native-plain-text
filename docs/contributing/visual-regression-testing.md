# Visual regression testing

The VRT suite renders each specimen from `example/src/vrt/groups.tsx` on its own
screen in a Release build of the example app, screenshots it cropped to the
specimen's bounds, and compares the PNG with a reviewed baseline.

## Setup

Baselines live in the `baselines` submodule, which is empty after a plain clone.
No VRT stage fetches it for you:

```sh
git submodule update --init baselines
```

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
  the observed values to `.vrt/environment/<platform>.txt`. `e2e` and `capture`
  run it first.
- `e2e` checks that cold and warm deep links work. It only matters when the
  deep-link path changes.
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
Adding a specimen means it gets captured and needs a baseline. To leave one out,
list it in `SKIPPED_SCENARIOS` in `scripts/vrt-scenarios/scenarios.ts`.
`yarn test` checks that IDs are well formed and unique, and that every skipped
entry still names a rendered specimen.

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

`compare` never writes baselines. After reviewing a complete capture:

```sh
yarn vrt ios update
git -C baselines add --all && git -C baselines commit -m 'Update iOS baselines'
# push and merge in the baselines repository, then:
git add baselines
```

The submodule is pinned. CI never uses `--remote` and no script moves the
pointer, so a commit always compares against the same images. A baseline change
is a pointer bump in this repo, and the image diff is reviewed in the
[baselines repository](https://github.com/troZee/react-native-plain-text-artifactory).

Older baselines may still use the `vrt-capture-<name>.png` naming. Compare
accepts it, and the next `update` rewrites them under the current names.

## CI

`.github/workflows/visual-test.yml` runs nightly and on manual dispatch, on a
Pixel 9 API 36 emulator and an iPhone 16 Pro iOS 26.5 simulator. Built apps are
cached by their source fingerprint.

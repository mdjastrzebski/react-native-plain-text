# Visual regression testing

The visual regression suite renders each entry in `.agent-device/vrt-captures.txt` by itself, captures the specimen bounds, and compares the resulting PNG with a reviewed baseline from the pinned `baselines` submodule.

## Commands

Run the full platform workflow with:

```sh
yarn vrt android
yarn vrt ios
```

The workflow is split into independently runnable stages:

```text
setup -> build -> install -> e2e -> capture -> compare
```

`compare` does not start a device or capture new images. It compares the existing `build/vrt/actual/<platform>/` directory, so it is cheap to rerun while investigating a failure:

```sh
yarn vrt ios compare
```

## Baselines

Reviewed images live in the `baselines` submodule: [react-native-plain-text-artifactory](https://github.com/troZee/react-native-plain-text-artifactory) checked out at the commit this repository pins. `baselines/android/` and `baselines/ios/` hold one PNG per capture id, and each directory also contains `environment.txt`, which records the rendering environment that produced those images.

The submodule is empty after a plain `git clone`, and no VRT stage fetches it for you:

```sh
git submodule update --init baselines
```

### Pinning

This repository records exactly one commit of the baselines repository, and that commit is the only baseline source. CI checks it out with `git submodule update --init baselines` and never with `--remote`, so the same application commit always compares against the same images. A run cannot pass one day and fail the next because the baselines repository happened to move.

Comparison scripts only read the checked out tree. Neither `compare` nor `update` runs `git submodule update`, `git checkout`, or any other command that changes Git state, so a result always describes the pinned commit rather than whatever was current when the script started.

### Updating

A missing or incomplete baseline is an error. Normal comparison never creates or changes baselines. After reviewing a complete capture, replace one platform's baseline explicitly:

```sh
yarn vrt ios update
```

Review every changed PNG and `environment.txt` before committing them. The update command requires a complete actual capture set and verified environment metadata. It refuses to turn a partial capture into a baseline.

`update` rewrites the checked out `baselines/<platform>/` directory and stops there. Review, commit, and merge those images in the baselines repository, then record the resulting commit here:

```sh
git -C baselines add --all && git -C baselines commit -m 'Reviewed iOS baselines'
# push and merge the baselines pull request, then:
git add baselines
```

The pointer bump is the reviewable baseline change in the library pull request. The image diff itself is reviewed in the baselines repository pull request, and the two should cross-reference each other.

## Capture-set validation

Before image comparison, the runner derives the exact platform-specific file list from `.agent-device/vrt-captures.txt`. Actual and baseline directories must both contain exactly that set. Missing, unexpected, malformed, and duplicate entries fail before pixel comparison.

This distinguishes an incomplete capture from a rendering change and ensures that adding or removing a manifest entry cannot silently pass.

## Environment matching

`yarn vrt <platform> verify` writes the current rendering inputs to `build/vrt/environment/<platform>.txt`. Baseline updates store a copy beside the reviewed images. Comparison requires their enforced rendering inputs to match.

This prevents comparisons across different simulator runtimes, device types, densities, font scales, locales, or other verified rendering inputs. Android's CPU architecture, architecture-specific system-image path, and adb serial are recorded but excluded from the equality check. CI renders the same AVD on x86_64 while Apple Silicon development hosts use arm64, so the two environments deliberately share a baseline. Android's matching threshold handles the small rasterization difference. When any enforced input differs, use the environment that produced the reviewed baseline or intentionally review and update the whole platform baseline. Every mismatch is reported in one run, and the environment file records the observed values even when they do not match.

## Pixel comparison and reports

`reg-cli` performs the image comparison, with `--enableAntialias` on so antialiased edges do not count as changes and `--extendedErrors` on so every differing image is named. Android uses a matching threshold of `0.02` to absorb very small emulator rasterization differences. iOS uses `0`. Both platforms use a changed-pixel allowance of `0`, so any pixel beyond the matching threshold fails the suite. The defaults live in `scripts/vrt-config.sh` and can be overridden for investigation without changing the reviewed policy.

Comparison writes a self-contained report under `build/vrt/report/<platform>/`. It includes actual, expected, and diff images, the HTML report, the JSON result, capture-set diagnostics, and both environment files. CI uploads the captures, the report, the environment files, the device metadata, and the device logs even when comparison fails. The built app under `build/vrt/apps/` is cached, not uploaded.

## Build fingerprint

`scripts/vrt-app-state.sh fingerprint <platform>` hashes the tracked sources whose bytes reach the compiled app, per platform: the library's `src`, `cpp`, and platform tree, plus the example's bundle entry, its configs, sources, and assets. Generated trees (`example/android`, `example/ios`, `Podfile.lock`) are derived from those and are not hashed, so the value moves only when something a person changed moves it.

The same value is written beside each built app and checked before install, e2e, and capture; comparison reads only the already-captured images, so it does not recheck the app. CI uses the value as the cache key for that app. Cache hit and staleness check are therefore the same function: a cached app can never restore for one commit and be called stale by the next.

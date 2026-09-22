# Visual regression testing

The visual regression suite renders each entry in
`.agent-device/vrt-captures.txt` by itself, captures the specimen bounds, and
compares the resulting PNG with a reviewed baseline committed in this
repository.

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

`compare` does not start a device or capture new images. It compares the
existing `build/vrt/actual/<platform>/` directory, so it is cheap to rerun while
investigating a failure:

```sh
yarn vrt ios compare
```

## Baselines

Reviewed images live in `baselines/android/` and `baselines/ios/`. Each
directory also contains `environment.txt`, which records the rendering
environment that produced those images.

A missing or incomplete baseline is an error. Normal comparison never creates
or changes baselines. After reviewing a complete capture, replace one
platform's baseline explicitly:

```sh
yarn vrt ios update
```

Review every changed PNG and `environment.txt` before committing them. The
update command requires a complete actual capture set and verified environment
metadata. It refuses to turn a partial capture into a baseline.

Baselines currently live in this repository. Keeping the comparison command
independent of their storage location leaves open a later move to external
artifact storage.

## Capture-set validation

Before image comparison, the runner derives the exact platform-specific file
list from `.agent-device/vrt-captures.txt`. Actual and baseline directories must
both contain exactly that set. Missing, unexpected, malformed, and duplicate
entries fail before pixel comparison.

This distinguishes an incomplete capture from a rendering change and ensures
that adding or removing a manifest entry cannot silently pass.

## Environment matching

`yarn vrt <platform> verify` writes the current rendering inputs to
`build/vrt/environment/<platform>.txt`. Baseline updates store a copy beside
the reviewed images. Comparison requires their enforced rendering inputs to
match.

This prevents comparisons across different simulator runtimes, device types,
densities, font scales, locales, or other verified rendering inputs. Android's
CPU architecture and architecture-specific system-image path are recorded but
excluded from the equality check. CI renders the same AVD on x86_64 while Apple
Silicon development hosts use arm64, so the two environments deliberately
share a baseline. Android's matching threshold handles the small rasterization
difference. When any enforced input differs, use the environment that produced
the reviewed baseline or intentionally review and update the whole platform
baseline.

## Pixel comparison and reports

`reg-cli` performs the image comparison. Android uses a matching threshold of
`0.02` to absorb very small emulator rasterization differences. iOS uses `0`.
Both platforms use a changed-pixel allowance of `0`, so any pixel beyond the
matching threshold fails the suite. The defaults live in `scripts/vrt-config.sh`
and can be overridden for investigation without changing the reviewed policy.

Comparison writes a self-contained report under
`build/vrt/report/<platform>/`. It includes actual, expected, and diff images,
the HTML report, the JSON result, capture-set diagnostics, and both environment
files. CI uploads the whole `build/vrt` directory even when comparison fails.

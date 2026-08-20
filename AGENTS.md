# AGENTS.md

A React Native library exposing `PlainText`: a lightweight static-text component
backed directly by the platform's native text widget (`UILabel` on iOS,
`TextView` on Android) instead of RN's own `<Text>`. It is a **Fabric (New
Architecture) native component**.

**Use Yarn v4 workspaces, never `npm`.** The library is the repo root, and
`example/` is an Expo dev-client app for running and testing changes.

## Commands

Run from the repo root:

|                                             |                                                        |
| ------------------------------------------- | ------------------------------------------------------ |
| `yarn validate`                             | All checks: lint, format, typecheck, test, build       |
| `yarn typecheck`                            | TypeScript                                             |
| `yarn lint`                                 | ESLint (`--fix` to autofix)                            |
| `yarn format`                               | oxfmt on JS/TS, md, json and yml                       |
| `yarn test`                                 | Jest (`yarn test path -t "name"` for one case)         |
| `yarn test:cpp`                             | C++ unit tests in `tests/cpp/`, no framework           |
| `yarn test:android`                         | Kotlin unit tests in `android/src/test/` (Robolectric) |
| `yarn example ios` / `yarn example android` | Build & run the example app                            |
| `yarn example start`                        | Metro only (no native rebuild)                         |
| `yarn prepare`                              | Build the shippable library into `lib/`                |

**After every change run `yarn validate`.** It leaves out `yarn test:android`, which needs
a JDK and the Android SDK, so run that one yourself after touching `android/src/main/`. CI
runs both.

**Do not build the native binaries yourself** (`yarn example ios|android`) unless
explicitly asked to.

## Prose style

No mid-sentence em dashes, no semicolons joining clauses, avoid AI-writing
tells.

## Investigating RN's own implementation

Check RN's Fabric code, not legacy (non-Fabric): legacy is deprecated and
being removed, and can silently differ.

## Documentation

Agent docs live in `docs/agent/`. Put new ones there and link them here. The
human-facing docs are `README.md` and `CONTRIBUTING.md`, under `docs/` once that
exists.

| Read when                                                                     |                                                                                                                                        |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Adding or changing any prop                                                   | [architecture.md](docs/agent/architecture.md): the four-layer prop flow, naming, prop conventions, example app, RN sources             |
| Needing an Android API level or the iOS deployment target                     | [architecture.md](docs/agent/architecture.md#platform-versions): min/compile SDK, and where RN's own values live                       |
| Adding any prop, for what it is allowed to cost                               | [performance.md](docs/agent/performance.md#prop-cost-policy): unused is a check, and every prop that is set carries a cost rating      |
| **Before** adding a size-affecting prop                                       | [sync-points.md](docs/agent/sync-points.md): the files that must change together and that nothing verifies                             |
| Implementing a feature                                                        | [workflow.md](docs/agent/workflow.md): parity policy, order of work, build policy                                                      |
| Looking for what to work on next                                              | [todo.md](docs/agent/todo.md): known behavior/API gaps against RN `<Text>`, already investigated                                       |
| Touching measurement, shadow nodes, JNI or CMake                              | [intrinsic-sizing.md](docs/agent/intrinsic-sizing.md): how self-sizing works on each platform                                          |
| A native change "does nothing", or builds misbehave                           | [native-gotchas.md](docs/agent/native-gotchas.md)                                                                                      |
| Quoting or producing a performance number                                     | [measuring.md](docs/agent/measuring.md): metrics and procedure                                                                         |
| Optimizing anything                                                           | [performance.md](docs/agent/performance.md): what's been done, what was rejected and why, and what's still open                        |
| Asked for an A/B perf test on the same release build                          | [perf-experiments.md](docs/agent/perf-experiments.md): the `experiment` prop: how to wire, drive from the perf suite, and conclude one |
| Comparing `PlainText` to RN's `<Text>`, or explaining why this library exists | [rn-text-history.md](docs/agent/rn-text-history.md): how RN core measures text, and why it never used `UILabel`                        |
| Asked about `adjustsFontSizeToFit` / `minimumFontScale`                       | [adjusts-font-size-to-fit.md](docs/agent/adjusts-font-size-to-fit.md): why it needs the final frame, and the two shapes it could take  |

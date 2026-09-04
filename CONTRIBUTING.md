# Contributing

Contributions are welcome. Before contributing, please read the [code of conduct](./CODE_OF_CONDUCT.md).

This guide, and the deep-dives it links to in [`docs/contributing/`](./docs/contributing/),
are written for humans and coding agents alike. There is no separate agent track.
`AGENTS.md` is a short pointer back here.

## Project layout

`react-native-plain-text` exposes `PlainText`, a single-style text component
backed directly by the platform's native text widget (`UILabel` on iOS,
`TextView` on Android) instead of RN's own `<Text>`. It is a Fabric (New
Architecture) native component.

This is a Yarn workspaces monorepo: the library lives in the root directory, and
`example/` is an Expo dev-client app used to run and test changes. Use the Node.js
version in [`.nvmrc`](./.nvmrc), and use Yarn v4, not `npm`.

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

## Development workflow

Install dependencies with `yarn`.

The example app uses the local copy of the library. Changes to the library's
JavaScript are picked up on reload, native changes need a rebuild.

```sh
yarn example start      # Metro only
yarn example ios        # build & run on iOS
yarn example android    # build & run on Android
```

The library is iOS/Android only. `PlainText` renders a Fabric native
component with no web fallback, so there is no `yarn example web`.

To edit native code in an IDE, open `example/ios/PlainTextExample.xcworkspace`
in Xcode (sources under `Pods > Development Pods > react-native-plain-text`) or
`example/android` in Android Studio (sources under `react-native-plain-text`).

Agents: do not build the native binaries yourself unless explicitly asked to.
They are slow, and the person you are working with is usually running the app
already.

## Checks

Run `yarn validate` before sending a pull request. It runs lint, format check,
typecheck, the JS and C++ unit tests, and builds the library:

```sh
yarn validate
```

Individual steps: `yarn lint` (`--fix` to autofix), `yarn format`, `yarn typecheck`,
`yarn test`, `yarn test:cpp`.

`yarn test:android` runs the Kotlin tests and needs a JDK and the Android SDK, so
it is not part of `yarn validate`. Run it yourself after changing
`android/src/main/`. CI runs both.

Add tests for your change where possible.

## Adding a prop

**An unused prop costs only a prop check.** A prop left at its default must not
allocate, resolve a font, build a string, force a second layout pass, or reach a
platform setter that does any of those. A comparison and an early return is the
whole budget. This keeps the component cheap for the common case, where a node
sets a handful of the props on offer. A new prop that can't hold to this is the
exception and needs an argument.

A prop that _is_ set gets a light/medium/heavy cost rating, recorded in
`src/PlainTextViewNativeComponent.ts`. Full policy, tiers, and where the rule is
tested: [performance.md](docs/contributing/performance.md#prop-cost-policy).

## Manual sync points

Some things in this codebase must be edited together, and **nothing verifies
them**: no type error, no failing test, and usually nothing wrong on first
render. The common case is a size-affecting prop, whose value has to be
applied identically in the mounted view, in each platform's separate measure
pass, and in the C++ measurement-cache key.

This duplication is deliberate. Deriving every path from one source would mean a
single cross-platform text engine and no caching. Instead each platform uses its
native widget to measure, and the caches key on an explicit input list, both for
performance. The cost is that the prop-to-attribute mapping lives in several
places at once.

Every such place carries a `// SYNC:` comment (`grep -rn "SYNC:" src cpp ios
android`). Before adding or changing a size-affecting prop, read
[sync-points.md](docs/contributing/sync-points.md) for the full list of sites
and what breaks if you miss one.

## Architecture and internals

The deep-dives live in [`docs/contributing/`](./docs/contributing/). They are kept
out of the published docs site. Add new ones there and link them from the table
below.

| Read when                                                                     |                                                                                                                                               |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Adding or changing any prop                                                   | [architecture.md](docs/contributing/architecture.md): the four-layer prop flow, naming, prop conventions, example app, RN sources             |
| Needing an Android API level or the iOS deployment target                     | [architecture.md](docs/contributing/architecture.md#platform-versions): min/compile SDK, and where RN's own values live                       |
| Adding any prop, for what it is allowed to cost                               | [performance.md](docs/contributing/performance.md#prop-cost-policy): unused is a check, and every prop that is set carries a cost rating      |
| **Before** adding a size-affecting prop                                       | [sync-points.md](docs/contributing/sync-points.md): the files that must change together and that nothing verifies                             |
| Implementing a feature                                                        | [workflow.md](docs/contributing/workflow.md): parity policy, order of work, build policy                                                      |
| Looking for what to work on next                                              | [todo.md](docs/contributing/todo.md): known behavior/API gaps against RN `<Text>`, already investigated                                       |
| Touching measurement, shadow nodes, JNI or CMake                              | [intrinsic-sizing.md](docs/contributing/intrinsic-sizing.md): how self-sizing works on each platform                                          |
| A native change "does nothing", or builds misbehave                           | [native-gotchas.md](docs/contributing/native-gotchas.md)                                                                                      |
| Quoting or producing a performance number                                     | [measuring.md](docs/contributing/measuring.md): metrics and procedure                                                                         |
| Optimizing anything                                                           | [performance.md](docs/contributing/performance.md): what's been done, what was rejected and why, and what's still open                        |
| Touching a font/measurement cache, or comparing caching to RN's               | [caching.md](docs/contributing/caching.md): what the library caches, what RN's `<Text>` caches, and why the two designs differ                |
| Asked for an A/B perf test on the same release build                          | [perf-experiments.md](docs/contributing/perf-experiments.md): the `experiment` prop: how to wire, drive from the perf suite, and conclude one |
| Comparing `PlainText` to RN's `<Text>`, or explaining why this library exists | [rn-text-history.md](docs/contributing/rn-text-history.md): how RN core measures text, and why it never used `UILabel`                        |
| Asked about `adjustsFontSizeToFit` / `minimumFontScale`                       | [adjusts-font-size-to-fit.md](docs/contributing/adjusts-font-size-to-fit.md): why it needs the final frame, and the two shapes it could take  |
| Looking for prior art on what RN `<Text>` bugs/requests people care about     | [rn-text-issues.md](docs/contributing/rn-text-issues.md): ranked survey of RN `<Text>` issues/PRs by reactions, with nested-text ones flagged  |

### Investigating RN's own implementation

Check RN's Fabric code, not legacy (non-Fabric): legacy is deprecated and being
removed, and can silently differ. The full RN source tree is a shallow submodule
at `references/react-native` (see
[architecture.md](docs/contributing/architecture.md#react-native-sources)).

## Prose style

For docs and comments: no mid-sentence em dashes, no semicolons joining clauses,
avoid AI-writing tells.

## Sending a pull request

- Keep pull requests small and focused on one change.
- Make sure `yarn validate` passes.
- Follow the pull request template.
- For changes to the API or implementation, open an issue to discuss first.

## Documentation site

The published documentation site is an RSPress project rooted at `docs/`
(`react-native-plain-text-docs` workspace). Page content is the Markdown directly
under `docs/` (`docs/index.md` and `docs/guide/`). `docs/contributing/` is
excluded from it. Run it with `yarn docs dev` / `yarn docs build`. The `Docs`
workflow deploys `main` to GitHub Pages at
`https://mdjastrzebski.github.io/react-native-plain-text/`.

## Publishing

Maintainers publish with [release-it](https://github.com/release-it/release-it):

```sh
yarn release
```

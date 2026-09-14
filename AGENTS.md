# AGENTS.md

A React Native library exposing `PlainText`: a lightweight static-text component
backed directly by the platform's native text widget (`UILabel` on iOS,
`TextView` on Android) instead of RN's own `<Text>`. It is a **Fabric (New
Architecture) native component**.

## Where the docs are

Contributor documentation is written for humans and agents alike. There is no
separate agent track.

1. **[CONTRIBUTING.md](CONTRIBUTING.md)** — start here. Commands, the dev
   workflow, checks, prose style, how to investigate RN's own code, and an index
   ("Read when …") into the deep-dives.
2. **[docs/contributing/](docs/contributing/)** — the deep-dives themselves:
   architecture, performance, sync points, intrinsic sizing, native gotchas, and
   more. Kept out of the published docs site.

`README.md` is for people using the library, not changing it.

## Always

- **Yarn v4 workspaces, never `npm`.** The library is the repo root, `example/`
  is an Expo dev-client app for running and testing changes.
- **Run `yarn validate` after every change.** It skips `yarn test:android`
  (needs a JDK and the Android SDK), so run that yourself after touching
  `android/src/main/`. CI runs both.
- **Do not build the native binaries yourself** (`yarn example ios|android`)
  unless explicitly asked to.

## React Native Testing Library in this project

This project uses `@testing-library/react-native`. Its APIs and testing
conventions can differ from your training data. Before writing or changing RNTL
tests, read the relevant guide in
`node_modules/@testing-library/react-native/docs/`, starting with
`node_modules/@testing-library/react-native/docs/guides/llm-guidelines.md`.
Prefer those package docs over stale assumptions, and follow deprecation
notices.

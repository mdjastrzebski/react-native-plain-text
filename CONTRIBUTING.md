# Contributing

Contributions are always welcome, no matter how large or small!

We want this community to be friendly and respectful to each other. Please follow it in all your interactions with the project. Before contributing, please read the [code of conduct](./CODE_OF_CONDUCT.md).

## Development workflow

This project is a monorepo managed using [Yarn workspaces](https://yarnpkg.com/features/workspaces). It contains the following packages:

- The library package in the root directory.
- An example app in the `example/` directory.

To get started with the project, make sure you have the correct version of [Node.js](https://nodejs.org/) installed. See the [`.nvmrc`](./.nvmrc) file for the version used in this project.

Run `yarn` in the root directory to install the required dependencies for each package:

```sh
yarn
```

> Since the project relies on Yarn workspaces, you cannot use [`npm`](https://github.com/npm/cli) for development without manually migrating.

The [example app](/example/) demonstrates usage of the library. You need to run it to test any changes you make.

It is configured to use the local version of the library, so any changes you make to the library's source code will be reflected in the example app. Changes to the library's JavaScript code will be reflected in the example app without a rebuild, but native code changes will require a rebuild of the example app.

If you want to use Android Studio or Xcode to edit the native code, you can open the `example/android` or `example/ios` directories respectively in those editors. To edit the Objective-C or Swift files, open `example/ios/PlainText.xcworkspace` in Xcode and find the source files at `Pods > Development Pods > react-native-plain-text`.

To edit the Java or Kotlin files, open `example/android` in Android studio and find the source files at `react-native-plain-text` under `Android`.

You can use various commands from the root directory to work with the project.

To start the packager:

```sh
yarn example start
```

To run the example app on Android:

```sh
yarn example android
```

To run the example app on iOS:

```sh
yarn example ios
```

To run the complete visual regression workflow, including device setup, the
Release build, and agent-device captures:

```sh
git submodule update --init --depth 1 baselines
yarn vrt android
yarn vrt ios
```

Equivalent shortcuts are available:

```sh
yarn vrt:android
yarn vrt:ios
```

Run one stage independently when debugging or retrying a failure:

```sh
yarn vrt android setup
yarn vrt android run
yarn vrt android test
```

The shortcuts also forward the stage:

```sh
yarn vrt:android setup
yarn vrt:android run
yarn vrt:android test

yarn vrt:ios setup
yarn vrt:ios run
yarn vrt:ios test
```

The capture stage requires `agent-device` 0.21.0 or newer. The app root renders
`AppVrt` when the incoming deep link contains a `testID` query parameter and
renders the regular app otherwise. For each manifest entry, agent-device opens
`exp+react-native-plain-text-example://vrt?testID=<testID>` and uses
`screenshot --crop-on` to write the one rendered specimen into
`build/vrt/actual/<platform>/<profile>/`. This avoids tab navigation and
scrolling through the specimen book. On the first successful `test` run for a
profile, it moves those PNGs to
`baselines/<platform>/<profile>/` for review and commit in the
[`react-native-plain-text-artifactory`](https://github.com/troZee/react-native-plain-text-artifactory)
repository. The `baselines/` directory is a shallow submodule pinned to the
exact reviewed artifact commit. Later runs use
`reg-cli` to compare actual images with that baseline and write comparison
images to `build/vrt/diff/`. A visual difference makes the command fail. All
generated VRT files remain ignored under `build/`. When comparison images
exist, the wrapper also writes the built-in `reg-cli` HTML and JSON reports to
`build/vrt/report/<platform>/<profile>.{html,json}` and prints the command that
opens the HTML file. The report provides diff, side-by-side, slider, blend, and
toggle views of the baseline and actual images.

Use development mode to capture and compare only
`vrt-capture-features-font-size-48` against its canonical baseline:

```sh
VRT_MODE_DEV=1 yarn vrt:android test
VRT_MODE_DEV=1 yarn vrt:ios test
```

Development mode expects the Expo development server on port `8081`. On
Android, the wrapper forwards that port to the host and agent-device opens the
Expo development-client URL directly. This avoids the development-client
launcher screen that a plain app launch would show. Override
`VRT_DEV_SERVER_PORT` and `VRT_DEV_CLIENT_URL` together when Metro uses a
different port or scheme. The development capture runs as a native `.ad`
replay from `.agent-device/vrt-dev-<platform>.ad`.

Start Metro before using development mode:

```sh
yarn example start
```

The first development-mode run creates a one-image baseline in the ignored
`build/vrt/baseline-dev/` directory. Later development runs compare against
that image. Development mode never creates or updates the production-ready
baseline under `baselines/`.

To update production baselines, create and check out a branch inside the
`baselines/` submodule, commit the reviewed images there, and push that branch
to the artifact repository. Then stage the updated submodule pointer in this
repository. Cross-link the artifact and library pull requests so the image
changes and the code change can be reviewed together. Actual captures, diffs,
reports, and logs remain ignored under `build/` and belong in temporary CI
artifacts rather than either Git repository.

To confirm that the app is running with the new architecture, you can check the Metro logs for a message like this:

```sh
Running "PlainTextExample" with {"fabric":true,"initialProps":{"concurrentRoot":true},"rootTag":1}
```

Note the `"fabric":true` and `"concurrentRoot":true` properties.

To run the example app on Web:

```sh
yarn example web
```

Make sure your code passes TypeScript:

```sh
yarn typecheck
```

To check for linting errors, run the following:

```sh
yarn lint
```

To fix formatting errors, run the following:

```sh
yarn format
```

Remember to add tests for your change if possible. Run the unit tests by:

```sh
yarn test
```

### Publishing to npm

We use [release-it](https://github.com/release-it/release-it) to make it easier to publish new versions. It handles common tasks like bumping version based on semver, creating tags and releases etc.

To publish new versions, run the following:

```sh
yarn release
```

### Scripts

The `package.json` file contains various scripts for common tasks:

- `yarn`: setup project by installing dependencies.
- `yarn typecheck`: type-check files with TypeScript.
  - `yarn lint`: lint files with [ESLint](https://eslint.org/).
  - `yarn format`: format files with [oxfmt](https://oxc.rs/docs/guide/usage/formatter).
    - `yarn test`: run unit tests with [Jest](https://jestjs.io/).
    - `yarn test:android`: run the Kotlin unit tests with [Robolectric](https://robolectric.org/) (needs a JDK and the Android SDK).
  - `yarn example start`: start the Metro server for the example app.
- `yarn example android`: run the example app on Android.
- `yarn example ios`: run the example app on iOS.
  - `yarn example web`: run the example app on Web.
- `yarn example build:web`: build the example app for Web.

### Sending a pull request

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://app.egghead.io/playlists/how-to-contribute-to-an-open-source-project-on-github).

When you're sending a pull request:

- Prefer small pull requests focused on one change.
- Verify that linters and tests are passing.
- Review the documentation to make sure it looks good.
- Follow the pull request template when opening a pull request.
- For pull requests that change the API or implementation, discuss with maintainers first by opening an issue.

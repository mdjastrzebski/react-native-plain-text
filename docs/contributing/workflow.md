# Feature workflow

## What "implement a feature" means here

Unless told otherwise, a request for a new feature (e.g. a new prop) implies all
three of:

- **API parity with RN `<Text>`**: match the shape and semantics of the
  equivalent prop or behavior rather than inventing a new API.
- **Both platforms**: iOS and Android, not one "for now".
- **Example coverage**: a dedicated section on the Features screen
  (`example/src/screens/FeaturesScreen.tsx`), so it's visible and testable.
- **A cost rating**: free when the prop is unused, and rated light/medium/heavy
  when it is set ([performance.md](performance.md#prop-cost-policy)). Medium and
  heavy get a `Cost:` note beside the prop in the codegen spec.

### When RN itself has the platform gap

Parity means matching RN, not matching RN's own asymmetry. A prop that exists on
one platform in RN core and not the other is a gap in RN rather than a platform
difference to preserve, so default to closing it, provided that can be done
without the cost that presumably stopped RN.

`textAlignVertical` is the first case, Android-only in RN core with no `ios/`
implementation in Fabric at all. Closing it on iOS cost nothing because a
`UILabel` subclass was already overriding
`-textRectForBounds:limitedToNumberOfLines:` for another reason
(`ios/RNPlainText.mm`). Look for that kind of free ride before anything heavier.

Say so where the prop is declared and applied, so the next reader knows the
divergence is deliberate.

**Check for JS-level aliases first.** RN's `Text.js` maps `verticalAlign` onto
`textAlignVertical` in JS (`verticalAlignToTextAlignVerticalMap`), so despite
the CSS name it was never a second gap.
`PlainText.tsx`'s `resolveTextAlignVertical` mirrors that alias, and
closing `textAlignVertical` on iOS closed `verticalAlign` with it.

### When RN itself is wrong

Same reasoning when RN's own behavior is a known bug, not a platform gap:
match CSS/web, not RN's bug. `textTransform: 'capitalize'` on iOS is this case
(react/react-native#34117) — see `ios/PlainTextTextTransform.h`.

## Order of work

1. **Add usage/test cases to the Features screen first.**
2. **Implement iOS, then Android**, across the four-layer prop flow
   ([architecture.md](architecture.md)).
3. **Run the checks**: `yarn validate`.

Read [sync-points.md](sync-points.md) before starting. A size-affecting prop
touches five more files than the four-layer flow suggests, and none of them fail
loudly when missed.

## Automated tests

There are almost none. `yarn test` runs Jest over `src/`, where the only case is
`it.todo`, and the Features screen plus a device is how nearly everything is
verified. That is a deliberate consequence of where the logic lives: almost all
of it is `UILabel`/`TextView` behavior, which no unit test reaches.

The exception is the pure C++ helpers extracted out of the `.mm` files, which
have a test target.

### `yarn test:cpp`

`scripts/test-cpp.sh` runs one suite per extracted helper, each a table of
inputs against expected results:

| Suite             | Unit under test                              | Source                                                               |
| ----------------- | -------------------------------------------- | -------------------------------------------------------------------- |
| `font-variations` | `parseFontVariations`                        | `ios/PlainTextFontVariations.cpp` (+ `ios/PlainTextStringUtils.cpp`) |
| `font-cache-key`  | `faceCacheKey` / `fontCacheKey`              | `ios/PlainTextFontCacheKey.cpp`                                      |
| `font-sizing`     | `scaledFontSize` / `clampFontSizeMultiplier` | `ios/PlainTextFontSizing.cpp`                                        |

That kind of table caught a real bug that review did not: the variations parser
rejected the trailing comma Android accepts, so the same prop value varied on
one platform and not the other.

- **No framework and no include paths.** `scripts/test-cpp.sh` is a `c++`
  invocation per suite, naming the test file and the sources under test. Add a
  suite with one more `run_suite` line. It runs in the `test` CI job, which is
  `ubuntu-latest` with no pod install and no NDK.
- **Extra arguments reach the compiler**, so `yarn test:cpp -g -O0` or
  `yarn test:cpp -fsanitize=address,undefined` work for a one-off run.
- **Failures print the case name, the input, and both sides.** Nonzero exit on
  the first failing case, which is all `validate` needs.
- **Tests live in `tests/cpp/`, never in `ios/` or `cpp/`.** The podspec globs
  the cpp sources under both of those, and the Android `CMakeLists.txt` globs
  the ones under `cpp/`, so a test file there would compile into the shipped pod
  and into the Android build.

What makes this cheap is that each unit under test includes nothing but the
standard library. Keeping it that way is the price of admission: pure logic
extracted into its own dependency-free file gets a test, logic left inline in a
`.mm` next to `UIFont` does not. These helpers sit in `ios/` rather than `cpp/`
because Android has no use for them: it parses `fontVariationSettings` with
`FontVariationAxis.fromFontVariationSettings` and does its own font-size math in
Kotlin, so there is nothing cross-platform to share.

For hand-written parsing that is _not_ extracted, review is still the only line
of defense.

## Native builds

**Do not build the native binaries yourself** (`yarn example ios` /
`yarn example android`) unless explicitly asked to. They are slow, and the user
is usually running the app already.

When you are asked to, note that native changes need a full rebuild: Metro
reload and Fast Refresh only pick up JS, and that clean builds have
project-specific pitfalls. See [native-gotchas.md](native-gotchas.md).

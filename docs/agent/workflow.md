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

"API parity with RN `<Text>`" means matching RN, not necessarily matching RN's
own asymmetry. When a prop or behavior exists on one platform in RN core and not
the other, that is a gap in RN rather than a platform difference to preserve.
Default to closing it on the platform RN lacks, provided it can be done without
the cost that presumably kept RN from doing it.

The first case is `textAlignVertical`, which is Android-only in RN core with no
`ios/` implementation anywhere in Fabric's text-attributes code. Its iOS
implementation in `ios/RNPlainText.mm` shows the shape this usually takes: a
`UILabel` subclass already overriding
`-textRectForBounds:limitedToNumberOfLines:` for one reason can absorb a second
one for free. Reach for anything heavier only after that kind of option is out.

This is a deliberate divergence from "match RN's shape", so say so where the
prop is declared and where it's applied. The reader needs to know the prop is
intentionally ahead of RN, not that RN was checked and found wanting.

**Check for JS-level aliases before declaring the gap closed.** RN's own
`Text.js` maps the CSS-standard `verticalAlign` style onto `textAlignVertical`
purely in JS (`verticalAlignToTextAlignVerticalMap`, applied before anything
reaches native) — so despite its cross-platform-sounding name, `verticalAlign`
was exactly as Android-only as `textAlignVertical`, for the same underlying
reason, and was never a second gap. `PlainText.native.tsx`'s
`resolveTextAlignVertical` mirrors that same shim, so closing
`textAlignVertical` on iOS closed `verticalAlign` too, for free, with no native
change of its own. The lesson generalizes: before scoping a second
implementation for what looks like a related prop, check whether it's actually
JS sugar over the one you already fixed.

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

The exception is string parsing, and it does have a test target.

### `yarn test:cpp`

A table of inputs against expected results for
`parsePlainTextFontVariations`, in `tests/cpp/PlainTextFontVariations.test.cpp`.
That kind of table would have caught a real bug that review did not: the parser
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

What makes this cheap is that the unit under test includes nothing but the
standard library. Keeping it that way is the price of admission: pure logic
extracted into its own dependency-free file gets a test, logic left inline in a
`.mm` next to `UIFont` does not. `parsePlainTextFontVariations` sits in `ios/`
rather than `cpp/` for the separate reason that Android parses the same prop
with `FontVariationAxis.fromFontVariationSettings` and has no use for it.

For hand-written parsing that is _not_ extracted, review is still the only line
of defense.

## Native builds

**Do not build the native binaries yourself** (`yarn example ios` /
`yarn example android`) unless explicitly asked to. They are slow, and the user
is usually running the app already.

When you are asked to, note that native changes need a full rebuild: Metro
reload and Fast Refresh only pick up JS, and that clean builds have
project-specific pitfalls. See [native-gotchas.md](native-gotchas.md).

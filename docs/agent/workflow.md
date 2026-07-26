# Feature workflow

## What "implement a feature" means here

Unless told otherwise, a request for a new feature (e.g. a new prop) implies all
three of:

- **API parity with RN `<Text>`** — match the shape and semantics of the
  equivalent prop or behavior rather than inventing a new API.
- **Both platforms** — iOS and Android, not one "for now".
- **Example coverage** — a dedicated section on the Features screen
  (`example/src/screens/FeaturesScreen.tsx`), so it's visible and testable.

## Order of work

1. **Add usage/test cases to the Features screen first.**
2. **Implement iOS, then Android**, across the four-layer prop flow
   ([architecture.md](architecture.md)).
3. **Run the checks** — `yarn typecheck`, `yarn lint`, `yarn test`.

Read [sync-points.md](sync-points.md) before starting. A size-affecting prop
touches five more files than the four-layer flow suggests, and none of them fail
loudly when missed.

## Native builds

**Do not build the native binaries yourself** (`yarn example ios` /
`yarn example android`) unless explicitly asked to. They are slow, and the user
is usually running the app already.

When you are asked to, note that native changes need a full rebuild — Metro
reload and Fast Refresh only pick up JS — and that clean builds have
project-specific pitfalls. See [native-gotchas.md](native-gotchas.md).

# Todo

Known gaps against RN `<Text>` that are understood but not implemented. Each
entry says what RN does, where its code is, and what implementing it would
touch, so picking one up doesn't mean rediscovering the investigation.

Performance work has its own backlog in
[performance.md](performance.md#open-opportunities). This file is for behavior
and API.

## `includeFontPadding`

**Missing entirely.** RN `<Text>` exposes it (`ReactTextViewManager.kt:377`,
`ViewProps.INCLUDE_FONT_PADDING`, default `true`) and threads it through
measurement as well as rendering: `TextLayoutManager.kt:812` reads it out of the
paragraph attributes and `:677` feeds `.setIncludePad(...)` into the
`StaticLayout` builder.

We have no such prop. `PlainTextView` inherits `TextView`'s default of `true`,
which matches RN's default, so the rendered result is correct out of the box:
there is just no way to turn it off. Turning it off is the standard fix for
"the text sits too low inside its box", which is what someone hits right after
setting `padding` and finding the optical spacing wrong.

Android-only, and `UILabel` has no equivalent. Unlike `textAlignVertical` (see
[workflow.md](workflow.md#when-rn-itself-has-the-platform-gap)), there is no
cheap way to synthesize this from an existing drawing hook, so it stays a real
gap.

It is size-affecting, so it needs the full treatment in
[sync-points.md](sync-points.md): the `measure()` fallback has to match the
default in the generated `Props.h`, and the off-screen view has to set it on
every call, not only when the key is present.

## `overflow: hidden` doesn't clip to the padding box

RN clips the canvas before drawing (`ReactTextView.java:211`):

```java
if (mOverflow != Overflow.VISIBLE) {
  BackgroundStyleApplicator.clipToPaddingBox(this, canvas);
}
super.onDraw(canvas);
```

`PreparedLayoutTextView.kt:102` does the same. We never clip.

This became visible with border support: with a `borderRadius`, text long enough
to reach the corners draws over the rounded edge and outside the border box.

Two pieces of work, neither large:

- **The prop doesn't arrive.** `overflow` fails the `startsWith("border")` gate
  in `PlainTextViewManagerDelegate` and falls through to `super.setProperty`,
  where nothing handles it: `BaseViewManager` has no overflow setter, only
  `ReactViewManager` does. It needs its own case alongside the border props, for
  the same reason they are there.
- **An `onDraw` override** in `PlainTextView`, gated the way RN gates it.

Bounded impact: the default is `visible`, so only the `borderRadius` +
overflowing-text combination is affected today.

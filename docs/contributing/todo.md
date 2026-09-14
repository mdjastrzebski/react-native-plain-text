# Todo

Known gaps against RN `<Text>` that are understood but not implemented. Each
entry says what RN does, where its code is, and what implementing it would
touch, so picking one up doesn't mean rediscovering the investigation.

Performance work has its own backlog in
[performance.md](performance.md#open-opportunities). This file is for behavior
and API.

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

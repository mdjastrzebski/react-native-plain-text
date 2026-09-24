# Introduction

Plain Text is a faster, lighter alternative to React Native's built-in `<Text>` component
that focuses on single-style text. This covers most real-world text: headers, labels, body copy.

It renders straight to the platform's native text
views: `UILabel` on iOS, `TextView` on Android, instead of using React Native's
text layout pipeline.

The tradeoff: one style, no nested `<Text>`.

See the list of [supported props and styles](./props-and-styles) and
[recipes](./recipes) for common patterns like animating text.

## Should you use it?

For most apps, React Native's `<Text>` is a reasonable choice. Two reasons to pick
`<PlainText>` instead:

1. Performance: on screens that mount a lot of single-style labels at once, like
   feeds and long lists, it renders faster and uses less memory. See [benchmarks](./performance).
2. Features and bug fixes missing from RN `<Text>`:
   [`verticalAlign` / `textAlignVertical` on iOS and `fontVariationSettings`](./props-and-styles#improvements-over-rn-text),
   and [animated text](./recipes#animating-text).

You can mix it with `<Text>` in the same screen and only use it where it earns
its place. The [`Text` component](./text-component) is an easy adoption path: a
drop-in replacement for RN `<Text>` that picks `PlainText` for you where it can.
Using `PlainText` directly gives you the best performance.

## License

MIT

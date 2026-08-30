# Introduction

Plain Text is a faster, lighter alternative to React Native's built-in `<Text>` component
that focuses on single-style text. This covers most real-world text: headers, labels, body copy.

It renders straight to the platform's native text
views: `UILabel` on iOS, `TextView` on Android, instead of using React Native's
text layout pipeline.

The tradeoff: one style, no nested `<Text>`.

See the list of [supported props and styles](./props-and-styles).

## Should you use it?

For most apps, React Native's `<Text>` is a reasonable choice. Two reasons to pick
`<PlainText>` instead:

1. Performance: on screens that mount a lot of single-style labels at once, like
   feeds and long lists, it renders faster and uses less memory. See [benchmarks](./performance).
2. Features and bug fixes missing from RN `<Text>`: such as `fontVariationSettings` and
   `verticalAlign` / `textAlignVertical` on iOS. See
   [Improvements over RN Text](./props-and-styles#improvements-over-rn-text).

You can mix it with `<Text>` in the same screen and only use it where it earns
its place. A [unified `Text` component](./installation#unified-text-component) uses
conditional rendering to pick between the two for you.

## License

MIT

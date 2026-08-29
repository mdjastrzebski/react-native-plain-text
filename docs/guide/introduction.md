# Introduction

A faster, lower-memory alternative to React Native's `<Text>` for simple,
single-style text. `PlainText` renders straight to the platform's native text
widget (`UILabel` on iOS, `TextView` on Android) instead of going through RN's
text layout pipeline.

The tradeoff: one string, one style. No nested `<Text>`, no mixed styles. That
still covers most real-world text: body copy, labels, list and feed content.

Beta: the API is stable enough to use, and feedback drives what gets built next.

## Should you use it?

RN's `<Text>` is the right choice for most apps. Reach for `PlainText` when you
want to squeeze the most out of text-heavy screens like long lists and feeds,
where a lot of labels mount at once.

It is not all-or-nothing. Everything `PlainText` supports is API-compatible with
RN `<Text>`, so the two mix freely in one screen. Use `PlainText` for the flat,
single-style labels and plain `<Text>` wherever you need something it doesn't
do, like mixed styles, nested text, press handling or selection.

## Contributing

- [Measuring performance](https://github.com/mdjastrzebski/react-native-plain-text/blob/main/docs/agent/measuring.md) ·
  [Performance notes](https://github.com/mdjastrzebski/react-native-plain-text/blob/main/docs/agent/performance.md)
- [Development workflow](https://github.com/mdjastrzebski/react-native-plain-text/blob/main/CONTRIBUTING.md#development-workflow)
- [Sending a pull request](https://github.com/mdjastrzebski/react-native-plain-text/blob/main/CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](https://github.com/mdjastrzebski/react-native-plain-text/blob/main/CODE_OF_CONDUCT.md)

## License

MIT

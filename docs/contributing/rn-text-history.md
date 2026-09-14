# How RN's own `<Text>` measures text

Why RN core never used `UILabel`/`TextView` measurement, and what actually
changed between the old and new architecture. Read this before claiming that
`PlainText` reverts a core-team decision, or that Fabric introduced custom text
measurement: both are wrong.

Verified against RN git history and the `react-native@0.83.10` sources vendored
in `example/node_modules`.

## The claim that keeps coming up, and why it's false

> Old arch used `UILabel`. The new arch replaced it with custom measurement.

Neither half holds. **RN's `<Text>` has never been backed by `UILabel`.** The
first open-source commit of the Text library
([`99f7a0ab9`](https://github.com/facebook/react-native/commit/99f7a0ab9),
Feb 2015) already shipped:

- `RCTShadowText.m`: measured by building an `NSMutableAttributedString` and
  calling `boundingRectWithSize:options:NSStringDrawingUsesLineFragmentOrigin`
- `RCTText.m`: a plain `UIView` subclass owning its own `NSLayoutManager`,
  drawing in `drawRect:`

In 0.83, `grep -rl UILabel` over the RN checkout returns no hits in
`Libraries/Text/Text` or in the Fabric text component views. The surviving
`UILabel` uses are dev tooling (RedBox, `RCTPerfMonitor`, `RCTFPSGraph`) and the
unimplemented-component placeholder.

Android is the mirror image. `ReactTextView` _does_ extend `AppCompatTextView`,
but measurement has always bypassed `TextView.onMeasure` in favour of
hand-constructed `BoringLayout`/`StaticLayout`
(`ReactAndroid/src/main/java/com/facebook/react/views/text/TextLayoutManager.kt`,
`createLayout`).

## What the new architecture actually changed

Obj-C/Java measurement code moved **behind a C++ facade**. The text engine
underneath did not change.

|                                                                          |                                                                                                                                                            |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`05890a594`](https://github.com/facebook/react-native/commit/05890a594) | "Fabric/Text: textlayoutmanager", Valentin Shergin, 2018-05-08 (D7751852). Creates `ReactCommon/fabric/textlayoutmanager`. **This is the starting point.** |
| [`f3893aab3`](https://github.com/facebook/react-native/commit/f3893aab3) | "Fabric/Text: Connecting the dots", registers the component, 2018-05-09                                                                                    |
| [`ee535fafe`](https://github.com/facebook/react-native/commit/ee535fafe) | Makes `textlayoutmanager` compile on Android, 2018-07-02                                                                                                   |
| [`5c0da011c`](https://github.com/facebook/react-native/commit/5c0da011c) | "Add support to measure shadow nodes in the FabricUIManager", David Vacca, 2018-09-18, the Android backend, C++ → JNI → Java                               |

The intent is stated in the first commit message verbatim:

> TextLayoutManager measures and renders text using iOS specific APIs (CoreText
> & TextKit). By design, only this module should contain platform-specific text
> functionality.

And the iOS backend added in that commit (`RCTTextLayoutManager.mm`) uses the
_same_ stack as the old architecture: `NSTextStorage` + `NSLayoutManager` +
`NSTextContainer`, size read from `usedRectForTextContainer:`. Same technique,
new boundary.

The C++ header still describes itself as a _"Cross platform facade"_, exposing
`measure(AttributedStringBox, ParagraphAttributes, TextLayoutContext,
LayoutConstraints)` plus an opaque `getNativeTextLayoutManager()` that the view
layer reuses for rendering
(`ReactCommon/react/renderer/textlayoutmanager/platform/ios/.../TextLayoutManager.h`).

## Why it had to be C++ rather than a platform widget

Same constraint that forces our own `ShadowNode`. See
[intrinsic-sizing.md](intrinsic-sizing.md). The shadow tree lives in C++ and
lays out with Yoga on the shadow thread, so `ParagraphShadowNode` registers a
Yoga custom measure function. Measurement must be callable synchronously, off
the main thread, during commit. That rules out `[label sizeThatFits:]` and
`TextView.measure()` regardless of anything else.

Decoupling measurement from the view is also what made the later optimizations
possible:

- **`TextMeasureCache`**: memoizes on attributed string + attributes +
  constraints ([enlarged](https://github.com/facebook/react-native/commit/8f6aee0df)
  2021, [shipped everywhere](https://github.com/facebook/react-native/commit/9578c2cad) 2022)
- [`d41e95fb1`](https://github.com/facebook/react-native/commit/d41e95fb1):
  "Cache NSTextStorage", Samuel Susla, 2023
- **`enablePreparedTextLayout`**: _"Enables caching text layout artifacts for
  later reuse"_ (`ReactCommon/react/featureflags/ReactNativeFeatureFlags.h`), so
  the `Layout`/`NSTextStorage` built during measure is handed to render instead
  of rebuilt. See `ParagraphShadowNode.cpp` (`enablePreparedTextLayout` call
  sites), `TextLayoutManagerExtended.h` (a C++ concept gating whether a platform
  implements `prepareLayout`/`measurePreparedLayout`), and `JPreparedLayout.h`
  on Android.

## What this means for `PlainText`

`PlainText` is not taking a path core rejected. It is taking a path core
**cannot** take. `<Text>` has to support nested fragments with per-fragment
attributes, per-fragment touch targets, `onTextLayout`, and font scaling, all of
which need layout introspection that `UILabel` does not expose. Hence TextKit
from day one.

`PlainText` is static, non-nested, and exposes no layout introspection, so the
trade goes the other way: let the platform widget own layout and drawing, and
measure with the cheapest primitive that agrees with it
(`-[NSString boundingRectWithSize:]` on iOS, see
[intrinsic-sizing.md](intrinsic-sizing.md)).

State it that way in `README.md` and in perf discussions. "Core chose the slow
path" is both wrong and easy to disprove.

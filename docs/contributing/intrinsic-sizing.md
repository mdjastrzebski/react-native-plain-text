# Intrinsic sizing

How `PlainText` measures itself from its own text, so callers never need an
explicit `width`/`height`.

In Fabric, layout runs in C++ on the shadow thread: a mounted view can never
push its size back into Yoga. Measurement therefore lives on a **custom
`ShadowNode` + `ComponentDescriptor`**, not on the view. Codegen only emits
non-measuring `ConcreteViewShadowNode`/`ConcreteComponentDescriptor` aliases, so
we hand-write our own and override the registration.

The invariants that keep this correct when adding props are in
[sync-points.md](sync-points.md). The performance rationale is in
[performance.md](performance.md). This file is the mechanism.

## iOS

Three pieces in `ios/`:

- **`PlainTextShadowNode.h/.mm`**: subclasses `ConcreteViewShadowNode`, reusing
  the generated `RNPlainTextComponentName` but named differently to avoid
  clashing with the generated `RNPlainTextShadowNode` alias. Sets
  `LeafYogaNode + MeasurableYogaNode` in `BaseTraits()` (`MeasurableYogaNode` is
  what makes Yoga call the measure fn) and overrides `measureContent`, which
  reads `getConcreteProps()`, measures with
  `-[NSString boundingRectWithSize:...]` (the same CoreText engine as the
  `UILabel`, thread-safe off-main) and returns the size `clamp`ed to the
  `LayoutConstraints`.
- **`PlainTextComponentDescriptor.h`**: `ConcreteComponentDescriptor<PlainTextShadowNode>`.
  Because the shadow node reuses `RNPlainTextComponentName`, its handle and name
  match the generated descriptor, so registering it overrides the default.
- **`RNPlainText.mm`**: `+componentDescriptorProvider` returns
  `concreteComponentDescriptorProvider<PlainTextComponentDescriptor>()` instead
  of the generated one, and no longer imports the generated
  `ComponentDescriptors.h`.

Gotcha: `measureContent` accesses `LayoutConstraints` members, so the `.mm` must
`#include <react/renderer/core/LayoutConstraints.h>`, since the generated shadow-node
headers only forward-declare it.

## Android

Android has no thread-safe pure-C++ text measurement, so measurement hops back
over JNI into a Kotlin `ViewManager.measure()` that sizes an off-screen
`TextView`: the `AndroidSwitch`/`AndroidProgressBar` pattern. This is the
project's only C++/CMake/JNI, under `android/src/main/jni/`:

- **`.../PlainTextShadowNode.{h,cpp}`**: same shape as iOS (reused component
  name, `LeafYogaNode + MeasurableYogaNode`), with `measureContent` delegating to
  a `PlainTextMeasurementsManager`.
- **`.../PlainTextMeasurementsManager.{h,cpp}`**: calls `FabricUIManager.measure(...)`
  over JNI, serializing the size-affecting props from `getConcreteProps()` into a
  `ReadableNativeMap` passed as the `props` arg. (`AndroidSwitch` passes `null`
  there because its size is prop-independent. Ours isn't.) The `FabricUIManager`
  `global_ref` and the `"RNPlainText"` component-name `jstring` are resolved once
  rather than per call, unlike RN's own managers. Needs
  `<react/jni/ReadableNativeMap.h>` + `<folly/dynamic.h>`. The size math uses
  `yogaMeassureToSize` from `<react/renderer/core/conversions.h>`.
- **`.../ComponentDescriptors.h`**: an override of the generated header _of the
  same include path_, defining a measuring `RNPlainTextComponentDescriptor` whose
  `adopt()` wires the manager onto the shadow node.
- **`PlainTextViewManager.kt`**: overrides `measure(...)`: reads the serialized
  props, sizes a reused off-screen `PlainTextView`, returns
  `YogaMeasureOutput.make(...)`.

### Wiring

- **Registration is by include-shadowing, driven from `react-native.config.js`.**
  Autolinking generates
  `providerRegistry->add(concreteComponentDescriptorProvider<RNPlainTextComponentDescriptor>())`
  plus an `#include` of `react/renderer/components/RNPlainTextSpec/ComponentDescriptors.h`.
  The root `react-native.config.js` sets the Android `cmakeListsPath` to
  `src/main/jni/CMakeLists.txt`, replacing the generated one. That CMakeLists
  compiles the generated codegen sources **plus** our custom sources into the
  `react_codegen_RNPlainTextSpec` target, and lists our jni dir on the include
  path **before** the generated dir, so the include resolves to our measuring
  override. No app-side C++ or `OnLoad` edits needed.
- **Units:** the `width`/`height` passed to `ViewManager.measure` are already in
  **pixels** (`FabricUIManager.getYogaSize()` runs `dpToPx()` on the point-based
  C++ constraints), so build the `MeasureSpec` from them directly. Do **not**
  `PixelUtil.toPixelFromDIP` again, and convert the result **back** to DIP with
  `toDIPFromPixel` for `YogaMeasureOutput`. Double-scaling the input width was
  what cropped width-constrained wrapping text to too few lines.

## Measurement invalidation (both platforms)

Both shadow nodes override `shouldNewRevisionDirtyMeasurement`. The base
`YogaLayoutableShadowNode` implementation returns `true` unconditionally, which
is expensive: when an ancestor re-renders, Fabric clones _every_ child of the
changed parent purely to re-own its Yoga node
(`YogaLayoutableShadowNode::adoptYogaChild`, a Yoga node can have one owner), so
with the default every `PlainText` on screen re-measures on any ancestor state
change.

RN's `ParagraphShadowNode` overrides it to `fragment.props != nullptr`, skipping
those re-own clones. Ours goes further and compares the props measurement
actually reads, so a revision changing only e.g. `color` keeps its cached size.

Both the decision (`shouldRevisionDirtyMeasurement`) and the comparison it rests
on (`measurementInputsEqual`) live in **`cpp/PlainTextMeasurementHelpers.{h,cpp}`**,
the only C++ shared by both platforms. The rest of the shadow node stays
duplicated: the two
`measureContent`s share nothing but their prop reads, since one is CoreText and
the other a JNI hop.

It reaches both builds through the podspec's `cpp/**/*.{h,cpp}` glob and through
`shared_SRCS` + `SHARED_CPP_DIR` in `android/src/main/jni/CMakeLists.txt`. `cpp`
is already in `package.json`'s `files`.

### Where the comparison has to happen

**`shouldRevisionDirtyMeasurement` is called from each shadow node's clone
constructor, not from the `shouldNewRevisionDirtyMeasurement` override.** The
override only returns the `bool` the constructor cached. This looks
roundabout and is not: the override _cannot_ do the comparison itself.

`YogaLayoutableShadowNode::completeClone` discards its own `sourceShadowNode`
parameter and calls the override with `*this`:

```cpp
void YogaLayoutableShadowNode::completeClone(
    const ShadowNode& /*sourceShadowNode*/, const ShadowNodeFragment& fragment) {
  if (getTraits().check(...MeasurableYogaNode) &&
      (fragment.children || shouldNewRevisionDirtyMeasurement(*this, fragment)))
    yogaNode_.setDirty(true);
}
```

`ConcreteComponentDescriptor::cloneShadowNode` runs the clone constructor first
and `completeClone` after, and the base `ShadowNode` clone constructor has by
then already installed `fragment.props` as `props_`. So inside the override,
`sourceShadowNode.getProps()` and `getConcreteProps()` are the _same object_:
comparing them is comparing the new props against themselves. It is always
equal, the node is never dirtied, and every size-affecting prop change keeps
its stale frame. This shipped once, see the note in
[performance.md](performance.md).

The clone constructor is the last point where the two revisions are still
distinguishable, so the verdict is computed there. Declaring it also excludes
the inherited constructor of the same signature, which is why
`using ConcreteViewShadowNode::ConcreteViewShadowNode;` can stay for the create
path. This is also why RN's `ParagraphShadowNode` ignores `sourceShadowNode`
entirely. It is useless in that position.

Yoga _style_ props are deliberately excluded from the comparison:
`updateYogaProps` dirties the node on style changes independently.

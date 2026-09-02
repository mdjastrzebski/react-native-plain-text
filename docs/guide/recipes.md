# Recipes

## Animating text

`PlainText` can be driven per frame from an `Animated.Value` or a Reanimated
shared value with **no React re-render** — as long as the text goes through
`text`, not `children`. `createAnimatedComponent` (both RN core's and
Reanimated's) writes per-frame updates straight onto the native view by prop
name; it never re-runs `PlainText`'s render, so the `children` → `text`
remapping never fires and animating `children` is silently dropped.

### Reanimated

`useAnimatedProps` computes `text` in a worklet, so it can produce any string,
not just a number:

```tsx
import Animated, { useAnimatedProps, useSharedValue } from 'react-native-reanimated';
import { PlainText } from 'react-native-plain-text';

const AnimatedPlainText = Animated.createAnimatedComponent(PlainText);

function Percent() {
  const progress = useSharedValue(0); // animate this 0 → 100
  const animatedProps = useAnimatedProps(() => ({
    text: `${Math.round(progress.value)}%`,
  }));

  return <AnimatedPlainText text="0%" animatedProps={animatedProps} />;
}
```

The worklet runs on the UI thread and reconciles against the current shared
value, so the label always lands on the latest frame.

### RN core Animated

When the output is a number, color, or unit string, bind an interpolation
directly:

```tsx
const AnimatedPlainText = Animated.createAnimatedComponent(PlainText);

<AnimatedPlainText
  text={progress.interpolate({ inputRange: [0, 1], outputRange: ['0', '100'] })}
/>;
```

`Animated.Value.interpolate()` only produces strings with a numeric component
(`'0'`, `'100'`, `'4deg'`), never arbitrary text. For that, update the ref from
a listener, coalescing to one write per frame:

```tsx
const ref = useRef<ComponentRef<typeof AnimatedPlainText>>(null);

useEffect(() => {
  let frame: number | null = null;
  let pending = '';
  const flush = () => {
    frame = null;
    ref.current?.setNativeProps({ text: pending });
  };
  const id = progress.addListener(({ value }) => {
    pending = format(value); // any string
    if (frame == null) frame = requestAnimationFrame(flush);
  });
  return () => {
    progress.removeListener(id);
    if (frame != null) cancelAnimationFrame(frame);
  };
}, [progress]);
```

The `requestAnimationFrame` step matters on the New Architecture: the listener
fires several times per frame, and a burst of `setNativeProps` calls can commit
to the shadow tree out of order, stranding the label on a stale value once the
animation stops. One write per frame — always the freshest value — avoids it.
Reanimated's `useAnimatedProps` handles this for you.

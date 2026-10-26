import { useRef, useState, type ComponentRef } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { COLOR } from '../theme';

const THUMB_SIZE = 28;
const TRACK_HEIGHT = 4;

// A minimal 0-100 drag control, built on PanResponder (no extra dependency)
// rather than a slider package. Uses `gestureState.moveX` (absolute screen
// coordinate) against the track's measured page position rather than
// `nativeEvent.locationX`: on Fabric, `locationX` during a PanResponder
// `move` is unreliable (only accurate on the initial touch), which reads as
// a jumpy/unstable thumb.
export function TextScrubber({
  onChange,
  onDragStateChange,
}: {
  onChange: (value: number) => void;
  // The parent `ScrollView` still tries to claim a mostly-horizontal drag on
  // iOS (its pan gesture recognizer runs natively, alongside JS responder
  // negotiation, not gated by it), which reads as the page subtly scrolling
  // while scrubbing. Locking `scrollEnabled` for the drag's duration is more
  // reliable than trying to out-negotiate it from here.
  onDragStateChange?: (dragging: boolean) => void;
}) {
  const trackRef = useRef<ComponentRef<typeof View>>(null);
  const trackPageX = useRef(0);
  const trackWidth = useRef(0);
  const [thumbX, setThumbX] = useState(0);

  const updateFromPageX = (pageX: number) => {
    const width = trackWidth.current;
    if (width <= 0) return;
    const clamped = Math.max(0, Math.min(width, pageX - trackPageX.current));
    setThumbX(clamped);
    onChange(Math.round((clamped / width) * 100));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event, gestureState) => {
        onDragStateChange?.(true);
        updateFromPageX(gestureState.moveX || event.nativeEvent.pageX);
      },
      onPanResponderMove: (_event, gestureState) => updateFromPageX(gestureState.moveX),
      onPanResponderRelease: () => onDragStateChange?.(false),
      onPanResponderTerminate: () => onDragStateChange?.(false),
    })
  ).current;

  const onLayout = (_event: LayoutChangeEvent) => {
    // `LayoutChangeEvent` only carries position relative to the parent, not
    // the page — `measure` is what gives an absolute (pageX, pageY, width).
    trackRef.current?.measure((_x, _y, width, _height, pageX) => {
      trackWidth.current = width;
      trackPageX.current = pageX;
    });
  };

  return (
    <View style={styles.container}>
      <View ref={trackRef} style={styles.track} onLayout={onLayout} {...panResponder.panHandlers}>
        <View style={styles.trackFill} />
        <View style={[styles.thumb, { left: thumbX - THUMB_SIZE / 2 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Insets the whole track from the screen edges, so the thumb — which
  // straddles the track's own start/end (`left: thumbX - THUMB_SIZE / 2`) —
  // never renders half off-screen at either extreme.
  container: {
    paddingHorizontal: THUMB_SIZE / 2,
  },
  track: {
    height: THUMB_SIZE,
    justifyContent: 'center',
  },
  trackFill: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: COLOR.line,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: COLOR.indigo,
  },
});

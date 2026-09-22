import { useEffect, useRef, type ComponentRef } from 'react';
import { Animated as RNAnimated, StyleSheet, Text, View } from 'react-native';
import ReanimatedAnimated, { useAnimatedProps, useSharedValue } from 'react-native-reanimated';
import { PlainText } from 'react-native-plain-text';
import { Section } from '../components/Specimen';
import { TextScrubber } from '../components/TextScrubber';
import { COLOR } from '../theme';

// `text`, not `children`: createAnimatedComponent writes updates onto the host
// ref by prop name, bypassing PlainText's children -> text remap.
const RNAnimatedPlainText = RNAnimated.createAnimatedComponent(PlainText);
const ReanimatedPlainText = ReanimatedAnimated.createAnimatedComponent(PlainText);

// `'worklet'` lets the same function run on both the RN Animated and
// Reanimated sides.
const REVEAL_PHRASE = 'The quick brown fox jumps over the lazy dog.';

function revealPhrase(value: number): string {
  'worklet';
  const clamped = value < 0 ? 0 : value > 100 ? 100 : value;
  const count = Math.round((clamped / 100) * REVEAL_PHRASE.length);
  return REVEAL_PHRASE.slice(0, count);
}

const ANIMATING_TEXT_FOOTER =
  'PlainText wrapped in createAnimatedComponent from Animated RN API and RN Reanimated package.';

export function AnimatingTextSection({
  onDragStateChange,
}: {
  // Parent ScrollView locks scrollEnabled for the drag's duration.
  onDragStateChange: (dragging: boolean) => void;
}) {
  // `.interpolate()` can't produce an arbitrary string, so the RN Animated side
  // bridges to `text` via a listener + `setNativeProps`. The listener can fire
  // several times per frame and Fabric commits can land out of order, so
  // coalesce to one write per frame.
  const rnValue = useRef(new RNAnimated.Value(0)).current;
  const rnAnimatedRef = useRef<ComponentRef<typeof RNAnimatedPlainText>>(null);

  useEffect(() => {
    let frame: number | null = null;
    let pending = '';
    const flush = () => {
      frame = null;
      rnAnimatedRef.current?.setNativeProps({ text: pending });
    };
    const id = rnValue.addListener(({ value }) => {
      pending = revealPhrase(value);
      if (frame == null) frame = requestAnimationFrame(flush);
    });
    return () => {
      rnValue.removeListener(id);
      if (frame != null) cancelAnimationFrame(frame);
    };
  }, [rnValue]);

  const reanimatedValue = useSharedValue(0);
  const reanimatedProps = useAnimatedProps(() => ({
    text: revealPhrase(reanimatedValue.value),
  }));
  const onScrub = (value: number) => {
    rnValue.setValue(value);
    reanimatedValue.value = value;
  };

  // Neither animated side re-renders this section while scrubbing; the
  // counter below stays at 1 to prove it.
  const renderCount = useRef(0);
  renderCount.current += 1;

  return (
    <Section title="Animating text" footer={ANIMATING_TEXT_FOOTER} spacedRows>
      <View style={styles.animatingRow}>
        <Text style={styles.animatingLabel}>ANIMATED (RN CORE)</Text>
        <RNAnimatedPlainText ref={rnAnimatedRef} style={styles.animatingText} text="" />
      </View>
      <View style={styles.animatingRow}>
        <Text style={styles.animatingLabel}>REANIMATED</Text>
        <ReanimatedPlainText style={styles.animatingText} text="" animatedProps={reanimatedProps} />
      </View>
      <Text style={styles.renderCountLabel}>RENDER COUNT: {renderCount.current}</Text>
      <TextScrubber onChange={onScrub} onDragStateChange={onDragStateChange} />
    </Section>
  );
}

const styles = StyleSheet.create({
  animatingRow: {
    alignItems: 'flex-start',
    gap: 4,
  },
  animatingLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.7,
    color: COLOR.faint,
  },
  animatingText: {
    fontSize: 18,
    color: COLOR.ink,
    backgroundColor: COLOR.wash,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  renderCountLabel: {
    alignSelf: 'center',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.7,
    color: COLOR.faint,
  },
});

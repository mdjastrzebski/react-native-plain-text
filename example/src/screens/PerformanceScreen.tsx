import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
// unstable_NativeText is RN's bare RCTText host component (no <Text> JS wrapper).
import { unstable_NativeText as NativeText } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMemoryFootprint } from 'react-native-memory-footprint';
import { PlainText } from 'react-native-plain-text';
// The library's bare codegen host component — the analogue of the
// NativeText-vs-Text pair, which prices the JS wrapper. Imported by path
// because it is deliberately not public API.
import NativePlainText from '../../../src/PlainTextViewNativeComponent';

const COUNT = 1000;

const FONT_SIZES = [
  { label: 'Large', value: 56 },
  { label: 'Regular', value: 20 },
  { label: 'Small', value: 14 },
] as const;

// Native allocations (CoreText layout, CALayer backing stores, JS heap growth)
// are deferred past the React commit, so sampling immediately undercounts. This
// also bounds how long the Event Timing entry has to arrive, since the readouts
// are published on this timer — see the effects below.
//
// One value for both platforms, deliberately generous. Neither platform's
// settle curve has been sampled, and undercounting memory fails *silently* —
// a short window yields a plausible-looking smaller number, not a visible gap.
// Too long only costs waiting.
const SETTLE_MS = 3000;

type Kind = 'plain' | 'nativePlain' | 'text' | 'nativeText';

// How far an Event Timing entry may sit from the press timestamp and still
// count as this run's: the native event is stamped before the JS handler runs,
// so the entry always starts a little earlier.
const EVENT_MATCH_SLACK_MS = 1_000;

const COMMIT_START_MARK = 'plaintext-bench:press';
const COMMIT_MEASURE = 'plaintext-bench:commit';

// Distinct names from the mount benchmark above so the two runs stay separable
// in React Native DevTools' Performance panel.
const UPDATE_START_MARK = 'plaintext-bench:update-press';
const UPDATE_MEASURE = 'plaintext-bench:update-commit';

type Timing = {
  commitMs: number;
  interactionMs: number | null;
};

type Stats = Timing & {
  memBefore: number;
  memAfter: number;
  totalBytes: number;
  perViewBytes: number;
};

// Measured with RN's own Web Performance APIs, stable since 0.83, rather than
// hand-rolled timing — see docs/agent/measuring.md.
//
// `interaction` is the headline: for an event whose handler causes rendering
// updates, EventPerformanceLogger holds the entry until the shadow tree mounts
// and reports `duration = mountTime - eventStartTime`. Press to mounted,
// measured by the core — RN's analogue of INP.
//
// Typed locally: tsconfig has no DOM lib and RN's strict TS API doesn't declare
// these globals, though the runtime installs them.
type EventTimingEntry = {
  name: string;
  startTime: number;
  duration: number;
};

type PerformanceObserverLike = {
  observe(options: {
    type: string;
    buffered?: boolean;
    durationThreshold?: number;
  }): void;
  disconnect(): void;
};

type PerformanceObserverCtor = new (
  callback: (list: { getEntries(): EventTimingEntry[] }) => void
) => PerformanceObserverLike;

const PerformanceObserverGlobal = (
  globalThis as unknown as {
    PerformanceObserver?: PerformanceObserverCtor;
  }
).PerformanceObserver;

export default function PerformanceScreen() {
  const insets = useSafeAreaInsets();
  const [plainCount, setPlainCount] = useState(0);
  const [nativePlainCount, setNativePlainCount] = useState(0);
  const [textCount, setTextCount] = useState(0);
  const [nativeTextCount, setNativeTextCount] = useState(0);
  const [plainStats, setPlainStats] = useState<Stats | null>(null);
  const [nativePlainStats, setNativePlainStats] = useState<Stats | null>(null);
  const [textStats, setTextStats] = useState<Stats | null>(null);
  const [nativeTextStats, setNativeTextStats] = useState<Stats | null>(null);
  const [fontSize, setFontSize] = useState<number>(56);
  // Bumped by the Re-render button. Rendered into its label on purpose — see
  // the comment there.
  const [rerenders, setRerenders] = useState(0);
  const [updateTiming, setUpdateTiming] = useState<{
    label: string;
    timing: Timing;
  } | null>(null);

  // In-flight measurement. Only one runs at a time, so a single ref is enough.
  const pending = useRef<{
    kind: Kind;
    memBefore: number;
    startTime: number;
  } | null>(null);

  // Same, for the update runs (font size, forced re-render). Separate from
  // `pending` because the two measure different things: mounting N new views
  // vs. updating the ones already on screen. No memory sampling here — nothing
  // is allocated, only how long an update to mounted text takes. Carries the
  // label rather than just a flag, so the readout can say which run it was.
  const updatePending = useRef<string | null>(null);

  // Event Timing arrives after mount, later than the effect that clears
  // `pending`, so the press timestamp it matches against has to outlive it.
  const interactionMs = useRef<number | null>(null);
  const runStartTime = useRef<number | null>(null);

  useEffect(() => {
    if (PerformanceObserverGlobal == null) return;

    const observer = new PerformanceObserverGlobal((list) => {
      const start = runStartTime.current;
      if (start == null) return;

      for (const entry of list.getEntries()) {
        if (Math.abs(entry.startTime - start) > EVENT_MATCH_SLACK_MS) continue;
        // A press emits several entries (touchstart, touchend, click…); only
        // the one whose handler triggered the render waits for mount, so it is
        // by far the longest.
        interactionMs.current = Math.max(
          interactionMs.current ?? 0,
          entry.duration
        );
      }
    });

    // 0 overrides the spec's default, which drops short events.
    observer.observe({ type: 'event', durationThreshold: 0 });
    return () => observer.disconnect();
  }, []);

  const startMeasure = useCallback((kind: Kind) => {
    // Memory is sampled before the render that mounts the views. The commit
    // start is a User Timing mark rather than a bare timestamp so the span also
    // shows up in React Native DevTools' Performance panel.
    const memBefore = getMemoryFootprint();
    performance.mark(COMMIT_START_MARK);
    const startTime = performance.now();
    pending.current = { kind, memBefore, startTime };

    interactionMs.current = null;
    runStartTime.current = startTime;

    if (kind === 'plain') {
      setPlainCount(COUNT);
    } else if (kind === 'nativePlain') {
      setNativePlainCount(COUNT);
    } else if (kind === 'text') {
      setTextCount(COUNT);
    } else {
      setNativeTextCount(COUNT);
    }
  }, []);

  // Arms an update measurement. The caller must then trigger a state change
  // that actually commits, otherwise the armed run leaks into the next press.
  const startUpdateMeasure = useCallback((label: string) => {
    performance.mark(UPDATE_START_MARK);
    updatePending.current = label;

    interactionMs.current = null;
    runStartTime.current = performance.now();
  }, []);

  const changeFontSize = useCallback(
    (value: number) => {
      // Re-pressing the selected size renders nothing, so there would be no
      // commit to measure — and the armed run would leak into the next press.
      if (value === fontSize) return;
      startUpdateMeasure('font size');
      setFontSize(value);
    },
    [fontSize, startUpdateMeasure]
  );

  // The control for the font-size run: re-render the screen *without* touching
  // any prop the mounted text receives. This is what isolates
  // `shouldNewRevisionDirtyMeasurement`'s `fragment.props == nullptr` early
  // return — the ancestor-re-render path, where Fabric clones every child of a
  // changed parent purely to re-own its Yoga node
  // (`YogaLayoutableShadowNode::adoptYogaChild`) and nothing should re-measure.
  //
  // The counter has to be *rendered* somewhere for this to test anything: a
  // state change that produces an identical tree makes React bail out, Fabric
  // commits no clones, and the run measures nothing at all rather than
  // measuring a cheap re-own. Showing it in the label changes one sibling
  // inside the same content container, which forces that container to be
  // cloned with a new children list — and that is what re-owns all ~1000
  // mounted items.
  const forceRerender = useCallback(() => {
    startUpdateMeasure('re-render');
    setRerenders((n) => n + 1);
  }, [startUpdateMeasure]);

  // Runs after React has committed the new views; memory is sampled SETTLE_MS
  // later, once native allocations have caught up.
  useEffect(() => {
    const m = pending.current;
    if (!m) return;
    pending.current = null;

    // The JS thread only — React render, Fabric commit, Yoga layout. Mounting
    // happens on the UI thread after this fires, so `interaction - commit` is
    // roughly what mounting cost.
    const commitMs = performance.measure(
      COMMIT_MEASURE,
      COMMIT_START_MARK
    ).duration;

    const timer = setTimeout(() => {
      const memAfter = getMemoryFootprint();
      const totalBytes = memAfter - m.memBefore;
      const stats: Stats = {
        memBefore: m.memBefore,
        memAfter,
        totalBytes,
        perViewBytes: totalBytes / COUNT,
        commitMs,
        interactionMs: interactionMs.current,
      };
      if (m.kind === 'plain') {
        setPlainStats(stats);
      } else if (m.kind === 'nativePlain') {
        setNativePlainStats(stats);
      } else if (m.kind === 'text') {
        setTextStats(stats);
      } else {
        setNativeTextStats(stats);
      }
    }, SETTLE_MS);

    return () => clearTimeout(timer);
  }, [plainCount, nativePlainCount, textCount, nativeTextCount]);

  // The update counterpart. Commit is readable right away, but Event Timing
  // only delivers the entry once the update has mounted, so the result is read
  // on the same SETTLE_MS timer — generous here, since it is tuned for native
  // allocations settling, but a shorter deadline risks reading before a slow
  // re-render has mounted and reporting no interaction at all.
  useEffect(() => {
    const label = updatePending.current;
    if (label == null) return;
    updatePending.current = null;

    const commitMs = performance.measure(
      UPDATE_MEASURE,
      UPDATE_START_MARK
    ).duration;

    const timer = setTimeout(() => {
      setUpdateTiming({
        label,
        timing: { commitMs, interactionMs: interactionMs.current },
      });
    }, SETTLE_MS);

    return () => clearTimeout(timer);
  }, [fontSize, rerenders]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 40, paddingBottom: 40 },
      ]}
    >
      <View style={styles.selector}>
        {FONT_SIZES.map(({ label, value }) => {
          const selected = value === fontSize;
          return (
            <Pressable
              key={value}
              onPress={() => changeFontSize(value)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <Text
                style={[
                  styles.optionLabel,
                  selected && styles.optionLabelSelected,
                ]}
              >
                {`${label} (${value})`}
              </Text>
            </Pressable>
          );
        })}

        {/*
          `rerenders` is in the label deliberately: it is what makes this press
          commit anything at all. See `forceRerender`.
        */}
        <Pressable onPress={forceRerender} style={styles.option}>
          <Text style={styles.optionLabel}>{`Re-render (${rerenders})`}</Text>
        </Pressable>
      </View>

      {/*
        Update cost for text already on screen, as opposed to the mount cost the
        buttons below report. The pair is the point:

        - `font size` changes a size-affecting prop on every mounted item, so
          all of them must re-measure. It reads near zero when measurement
          invalidation is broken — and the labels keep their old size.
        - `re-render` changes nothing those items receive, so none of them
          should re-measure. It reads close to the `font size` number when the
          invalidation is too eager.
      */}
      {updateTiming != null && (
        <Text style={styles.stats}>
          {`${updateTiming.label}: ${formatTiming(updateTiming.timing)}`}
        </Text>
      )}

      <Button
        title={`Add ${COUNT} PlainText`}
        onPress={() => startMeasure('plain')}
      />
      <StatsRow label="PlainText" stats={plainStats} />

      <Button
        title={`Add ${COUNT} NativePlainText`}
        onPress={() => startMeasure('nativePlain')}
      />
      <StatsRow label="NativePlainText" stats={nativePlainStats} />

      <Button
        title={`Add ${COUNT} Text`}
        onPress={() => startMeasure('text')}
      />
      <StatsRow label="Text" stats={textStats} />

      <Button
        title={`Add ${COUNT} NativeText`}
        onPress={() => startMeasure('nativeText')}
      />
      <StatsRow label="NativeText" stats={nativeTextStats} />

      {Array.from({ length: plainCount }, (_, n) => (
        <PlainText key={n} style={[styles.listItem, { fontSize }]}>
          {`List Item ${n + 1}`}
        </PlainText>
      ))}

      {/*
        Same rendered result as the PlainText block above, but with props already
        in native shape — no StyleSheet.flatten, no rest destructure, and only
        the props actually set. The delta is the JS wrapper's cost.
      */}
      {Array.from({ length: nativePlainCount }, (_, n) => (
        <NativePlainText
          key={n}
          text={`List Item ${n + 1}`}
          fontSize={fontSize}
          style={styles.listItem}
        />
      ))}

      {Array.from({ length: textCount }, (_, n) => (
        <Text key={n} style={[styles.listItem, { fontSize }]}>
          {`List Item ${n + 1}`}
        </Text>
      ))}

      {Array.from({ length: nativeTextCount }, (_, n) => (
        // Bare RCTText host component, bypassing the <Text> JS wrapper.
        <NativeText key={n} style={[styles.listItem, { fontSize }]}>
          {`List Item ${n + 1}`}
        </NativeText>
      ))}
    </ScrollView>
  );
}

function StatsRow({ label, stats }: { label: string; stats: Stats | null }) {
  if (!stats) return null;
  return (
    <Text style={styles.stats}>
      {`${label}: ${formatBytes(stats.perViewBytes)}/view · ` +
        `${formatBytes(stats.totalBytes)} total\n` +
        `initial ${formatBytes(stats.memBefore)} → final ${formatBytes(
          stats.memAfter
        )}\n` +
        `${formatTiming(stats)}`}
    </Text>
  );
}

// Shared by both readouts so the mount and font-size numbers stay comparable.
function formatTiming({ interactionMs, commitMs }: Timing) {
  const interaction =
    interactionMs == null ? '—' : `${interactionMs.toFixed(0)} ms`;
  return `${interaction} interaction · ${commitMs.toFixed(0)} ms commit`;
}

function formatBytes(bytes: number) {
  if (Math.abs(bytes) >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    gap: 10,
  },
  stats: {
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
  },
  listItem: {
    backgroundColor: '#f0f0f0',
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'center',
    // One line on a normal phone; wraps rather than overflowing on narrow ones.
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007aff',
  },
  optionSelected: {
    backgroundColor: '#007aff',
  },
  optionLabel: {
    fontSize: 13,
    color: '#007aff',
  },
  optionLabelSelected: {
    color: '#fff',
  },
});

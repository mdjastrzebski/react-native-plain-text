import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Platform,
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
// are deferred past the React commit, so sampling immediately undercounts.
// Android defers more (GC timing, TextView layout) than iOS.
const SETTLE_MS = Platform.select({ android: 2000, default: 500 });

type Kind = 'plain' | 'nativePlain' | 'text' | 'nativeText';

// How far an Event Timing entry may sit from the press timestamp and still
// count as this run's: the native event is stamped before the JS handler runs,
// so the entry always starts a little earlier.
const EVENT_MATCH_SLACK_MS = 1_000;

const COMMIT_START_MARK = 'plaintext-bench:press';
const COMMIT_MEASURE = 'plaintext-bench:commit';

type Stats = {
  memBefore: number;
  memAfter: number;
  totalBytes: number;
  perViewBytes: number;
  commitMs: number;
  interactionMs: number | null;
};

// Measured with RN's own Web Performance APIs, stable since 0.83, rather than
// hand-rolled timing — see docs/agent/MEASURING.md.
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

  // In-flight measurement. Only one runs at a time, so a single ref is enough.
  const pending = useRef<{
    kind: Kind;
    memBefore: number;
    startTime: number;
  } | null>(null);

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
              onPress={() => setFontSize(value)}
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
      </View>

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
        `${
          stats.interactionMs == null
            ? '—'
            : `${stats.interactionMs.toFixed(0)} ms`
        } interaction · ` +
        `${stats.commitMs.toFixed(0)} ms commit\n` +
        `initial ${formatBytes(stats.memBefore)} → final ${formatBytes(
          stats.memAfter
        )}`}
    </Text>
  );
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

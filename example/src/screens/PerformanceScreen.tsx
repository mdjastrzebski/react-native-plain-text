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
// The library's bare codegen host component, bypassing the PlainText JS
// wrapper — the analogue of the NativeText-vs-Text pair below, used to price
// what the wrapper's StyleSheet.flatten + rest destructure + 18-prop element
// costs per view. Imported by path because it is deliberately not public API.
import NativePlainText from '../../../src/PlainTextViewNativeComponent';

const COUNT = 1000;

const FONT_SIZES = [
  { label: 'Large', value: 56 },
  { label: 'Regular', value: 20 },
  { label: 'Small', value: 14 },
] as const;

// How long to wait after commit before sampling memory. Native allocations
// (CoreText layout, CALayer backing stores, JS heap growth) are deferred past
// the React commit, so sampling immediately undercounts. Android defers more
// (GC timing, TextView layout) so it needs a longer settle window than iOS.
const SETTLE_MS = Platform.select({ android: 2000, default: 500 });

type Kind = 'plain' | 'nativePlain' | 'text' | 'nativeText';

// A frame slower than this counts as the UI thread still doing bulk work. Two
// frames at 60Hz, four at 120Hz — deliberately generous, so the same constant
// works on every device: what is being detected is a multi-hundred-millisecond
// mount stall, not a marginally dropped frame.
const LONG_FRAME_MS = 32;
// Consecutive on-budget frames that mean the UI has settled.
const QUIET_FRAMES = 3;
// Give up if frames never settle (an animation elsewhere, or the app going to
// the background, which stops frame callbacks entirely).
const TTFF_TIMEOUT_MS = 10_000;

type Stats = {
  memBefore: number;
  memAfter: number;
  totalBytes: number;
  perViewBytes: number;
  timeMs: number;
  ttffMs: number | null;
};

// Time from `startTime` until the UI stops doing bulk work — the end of the
// last frame that overran its budget.
//
// The render+commit number the effect captures covers only the JS thread: React
// renders and commits, Yoga lays out, the effect fires, and *then* the mount
// transaction is handed to the UI thread, which creates and draws the views
// long after. Frame callbacks cannot run while that is happening, so the mount
// storm appears as a gap in the frame stream and needs no native hook to see.
// requestAnimationFrame is display-driven on both platforms (Choreographer on
// Android, CADisplayLink on iOS) and nothing here touches the components under
// test, so all four variants are measured by identical machinery.
//
// Being on the JS thread, the loop cannot attribute a long frame to JS work vs
// UI work — that split comes from comparing this against the effect's number.
function measureTimeToFirstFrame(
  startTime: number,
  isStale: () => boolean,
  onSettled: (ttffMs: number) => void
) {
  let lastFrameTime = startTime;
  let lastLongFrameEnd = startTime;
  let quietFrames = 0;

  const tick = () => {
    if (isStale()) return;

    const now = performance.now();
    const delta = now - lastFrameTime;
    lastFrameTime = now;

    if (delta > LONG_FRAME_MS) {
      lastLongFrameEnd = now;
      quietFrames = 0;
    } else if (++quietFrames >= QUIET_FRAMES) {
      onSettled(lastLongFrameEnd - startTime);
      return;
    }

    if (now - startTime > TTFF_TIMEOUT_MS) {
      onSettled(lastLongFrameEnd - startTime);
      return;
    }
    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

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

  // Holds an in-flight measurement between the button press (state update)
  // and the moment the new views have been laid out on screen. Only one
  // measurement runs at a time, so a single ref is enough.
  const pending = useRef<{
    kind: Kind;
    memBefore: number;
    startTime: number;
  } | null>(null);

  // Time-to-first-frame lands asynchronously, once frames settle (~0.5s here),
  // which is well inside the SETTLE_MS wait before stats are built — so the
  // stats row can just read whatever the loop has stored by then.
  const ttff = useRef<number | null>(null);
  // Bumped per run so a still-running frame loop from an earlier press stops
  // instead of overwriting the current run's result.
  const runId = useRef(0);

  const startMeasure = useCallback((kind: Kind) => {
    // Sample memory *before* the render that mounts the views, and mark the
    // start of the render+commit window right as we trigger the state update.
    const memBefore = getMemoryFootprint();
    const startTime = performance.now();
    pending.current = { kind, memBefore, startTime };

    // Started before the state update so the first sampled frame brackets the
    // render itself, making the result a true press-to-painted number.
    ttff.current = null;
    runId.current += 1;
    const thisRun = runId.current;
    measureTimeToFirstFrame(
      startTime,
      () => runId.current !== thisRun,
      (ttffMs) => {
        ttff.current = ttffMs;
      }
    );

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

  // Runs after React has committed the new views. That commit is our
  // render+commit endpoint (captured immediately), but native memory keeps
  // growing past it, so we wait SETTLE_MS before sampling the "after" memory.
  useEffect(() => {
    const m = pending.current;
    if (!m) return;
    pending.current = null;

    // Covers the JS thread only — React render, Fabric commit, Yoga layout.
    // Mounting and painting happen on the UI thread after this fires; that half
    // is what the frame loop measures.
    const timeMs = performance.now() - m.startTime;

    const timer = setTimeout(() => {
      const memAfter = getMemoryFootprint();
      const totalBytes = memAfter - m.memBefore;
      const stats: Stats = {
        memBefore: m.memBefore,
        memAfter,
        totalBytes,
        perViewBytes: totalBytes / COUNT,
        timeMs,
        ttffMs: ttff.current,
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
        Same rendered result as the PlainText block above (same text, fontSize
        and backgroundColor), but with the props already in native shape: no
        StyleSheet.flatten, no rest destructure, and only the props actually set
        instead of 18 mostly-undefined ones. The delta against PlainText is the
        JS wrapper's cost.
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
        // commit = JS thread (render + layout); frame = press to painted, so
        // frame - commit is what the UI thread spent mounting and drawing.
        `${stats.timeMs.toFixed(0)} ms commit · ` +
        `${stats.ttffMs == null ? '—' : `${stats.ttffMs.toFixed(0)} ms`} frame\n` +
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

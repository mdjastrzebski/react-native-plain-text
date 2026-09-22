import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
// unstable_NativeText is RN's bare RCTText host component (no <Text> JS wrapper).
import { unstable_NativeText as NativeText } from 'react-native';
import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getMemoryFootprint } from 'react-native-memory-footprint';
import {
  PlainText,
  unstable_NativePlainText as NativePlainText,
  type PlainTextStyle,
} from 'react-native-plain-text';
import { Section, screenStyles } from '../components/Specimen';
import { useSessionState } from '../useSessionState';
import { COLOR, MONO, SERIF, VARIABLE } from '../theme';

// Matches the Text Count row's default option below, see COUNT_ATTR.
const DEFAULT_COUNT = 5000;

// Per-mount offset for item indices, so a cached attributed string can't make a
// later mount look cheaper. Fixed above COUNT_ATTR's largest option; bump if that
// option grows past 10000.
const MOUNT_TEXT_STRIDE = 10_000;

// Native/JS allocations land after the commit, so sampling must wait (mount and
// unmount both — releasing is lazier than allocating).
// Window must be long enough for transients to settle (<1s on Android reads ~35%
// high) yet short enough to avoid a GC trim mid-window (>~15s); 5s tuned per-device,
// adjustable via the Props sheet's 'settleMs'.
const DEFAULT_SETTLE_MS = 5_000;

type Kind = 'plain' | 'nativePlain' | 'text' | 'nativeText';

const VARIANTS: { kind: Kind; label: string }[] = [
  { kind: 'plain', label: 'PlainText' },
  { kind: 'nativePlain', label: 'NativePlainText' },
  { kind: 'text', label: 'Text' },
  { kind: 'nativeText', label: 'NativeText' },
];

function labelFor(kind: Kind) {
  return VARIANTS.find((v) => v.kind === kind)?.label ?? kind;
}

// Native event is stamped before the JS handler runs, so allow slack when
// matching an Event Timing entry to the press timestamp.
const EVENT_MATCH_SLACK_MS = 1_000;

const START_MARK = 'plaintext-bench:press';

// mount/unmount change what's on screen; the rest update what's already there.
type Scenario = 'mount' | 'unmount' | 'parent' | 'color' | 'layout';

// Toggle rather than an absolute value, so every press commits a change with no
// value picker needed. Moss (not indigo) so the toggle still changes color even
// when the config's own `color` row is set to indigo.
const COLORS = [COLOR.ink, COLOR.moss];

// Half-point bump forces re-measure while the drawn area only changes ~2%,
// isolating measurement invalidation from redraw/composite cost.
const SIZE_BUMP = 0.5;

type RunStats = {
  commitMs: number;
  interactionMs: number | null;
  // memBefore/memAfter plus two post-mount re-render samples; the last two are
  // null until their settle window closes, so the headline total only appears
  // once all three deltas have landed.
  memBefore: number;
  memAfter: number;
  memFirstTouch: number | null;
  memFinal: number | null;
  // Sampled once before the mount; every `retained` figure subtracts against
  // this same baseline (equal to memBefore on the mount run itself).
  mountBaseline: number;
  // Captured, not read live: after unmount the Text Count row is editable
  // again, but perView must divide by the count this run actually used.
  count: number;
};

// The two re-render windows land in the headline because any screen re-rendering
// above its text pays them — dominant cost for RN <Text> on Android (Paragraph
// clone rebuilds its content cache), near-zero for PlainText. Capped at three:
// RN <Text> converges by then (~23KB/view, then ~9, then ~0), and a fourth window
// risks a GC trim landing inside it.

const SCENARIO_TERMS: Record<Scenario, string> = {
  mount: 'mount',
  unmount: 'unmount',
  parent: 'update',
  color: 'update',
  layout: 'update',
};

// RN's Web Performance API (stable since 0.83). `duration` = mountTime -
// eventStartTime, RN's analogue of INP. See docs/contributing/measuring.md.
// Typed locally: tsconfig has no DOM lib, though the runtime installs these globals.
type EventTimingEntry = {
  startTime: number;
  duration: number;
};

type PerformanceObserverLike = {
  observe(options: { type: string; durationThreshold: number }): void;
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

// Hermes-only, when built with GC exposed to JS. Called before sampling on
// mount/unmount only; on other scenarios a forced GC would land inside the
// commit/interaction measurement instead of after it.
const forceGC = (globalThis as unknown as { gc?: () => void }).gc;

type Props = NativeStackScreenProps<ParamListBase>;

export default function PerformanceScreen({ navigation }: Props) {
  // Persisted: runs are compared across app kills, so config can't reset on launch.
  const [config, setConfig] = useSessionState<AttrConfig>('perf-attrs', DEFAULT_CONFIG);
  const [sheetVisible, setSheetVisible] = useState(false);

  // Persisted for the same reason as config: avoids re-picking the most-used
  // control after every app kill.
  const [variant, setVariant] = useSessionState<Kind>('perf-variant', 'plain');

  // Only one variant mounted at a time — mixing two isn't a meaningful scenario.
  const [mounted, setMounted] = useState<Kind | null>(null);

  // Mounts this session, incl. current; shifts label indices by
  // MOUNT_TEXT_STRIDE so no mount reuses another's exact text.
  const [mountCount, setMountCount] = useState(0);

  // One entry per scenario; cleared on next mount, otherwise only a re-run of
  // the same scenario overwrites its own entry.
  const [stats, setStats] = useState<Partial<Record<Scenario, RunStats>>>({});

  // Component/config frozen at mount time, so switching variants after unmount
  // doesn't relabel results measured against the previous one.
  const [captured, setCaptured] = useState<string | null>(null);

  // Non-null while a settle window is open; all actions are disabled meanwhile
  // so a second commit can't land mid-sample.
  const [running, setRunning] = useState<Scenario | null>(null);
  const settling = running != null;

  // `rerenders` feeds the No-op Update button's testID on purpose. See runParentRerender.
  const [rerenders, setRerenders] = useState(0);
  const [colorIndex, setColorIndex] = useState(0);
  const [sizeBump, setSizeBump] = useState(0);

  // In-flight measurement. Only one runs at a time, so a single ref is enough.
  const pending = useRef<{ scenario: Scenario; memBefore: number } | null>(null);

  // Baseline before mount, so unmount can report what didn't come back, not
  // just what was freed.
  const mountBaseline = useRef<number | null>(null);

  // Captured like mountBaseline: a live read at stats-build time could see a
  // value this run didn't use. See RunStats.count.
  const mountedCount = useRef<number>(DEFAULT_COUNT);

  // Event Timing arrives after mount, later than the effect clearing `pending`,
  // so read it when the settle timer fires rather than immediately.
  const interactionMs = useRef<number | null>(null);
  const runStartTime = useRef<number | null>(null);

  // Not memoized: every render already rebuilds all count elements, so
  // memoizing here would save nothing.
  const applied = buildApplied(config, colorIndex, sizeBump);
  // 0, MOUNT_TEXT_STRIDE, 2×... per mount; only read once something's mounted.
  const textOffset = (mountCount - 1) * MOUNT_TEXT_STRIDE;
  const settleDelayMs = settleMsFor(config);
  const count = countFor(config);
  const fingerprint = formatFingerprint(config);
  const live = `${labelFor(variant)} · ${fingerprint}`;

  // Edited via the native header, not JS, so the panel is never part of the
  // measured tree.
  useLayoutEffect(() => {
    const button = (
      <Pressable
        onPress={() => setSheetVisible(true)}
        disabled={mounted != null}
        hitSlop={8}
        // Dimmed while held, the way TouchableOpacity does it. Only when it can
        // actually be pressed: the locked state already reads as unavailable
        // through its color, and dimming it further would suggest it responded.
        style={({ pressed }) => [
          styles.headerButton,
          pressed && mounted == null && styles.headerButtonPressed,
        ]}
      >
        {/*
          Short, and `numberOfLines` set: on iOS the page title is a custom left
          bar button item, which UIKit lays out before the right one and lets take
          the width it asks for. "Unmount to edit" beside a 23pt title left this
          item so little room that it came back as a bare "…". So the locked state
          says the same thing in two words, and neither label is allowed to wrap.
        */}
        <PlainText
          numberOfLines={1}
          style={[styles.headerButtonLabel, mounted != null && styles.headerButtonDisabled]}
        >
          {mounted != null ? 'Props locked' : `Props (${countChangedProps(config)})`}
        </PlainText>
      </Pressable>
    );

    navigation.setOptions({
      // Android draws headerRight; iOS uses the item form so the glass capsule
      // can be turned off (same split as CompareText).
      // Returns a stable element built above, not a component; CompareText's
      // equivalent lives in a hook, so only this one needs the exemption.
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () => button,
      unstable_headerRightItems: () => [
        { type: 'custom', element: button, hidesSharedBackground: true },
      ],
    });
  }, [navigation, config, mounted]);

  useEffect(() => {
    if (PerformanceObserverGlobal == null) return;

    const observer = new PerformanceObserverGlobal((list) => {
      const start = runStartTime.current;
      if (start == null) return;

      for (const entry of list.getEntries()) {
        if (Math.abs(entry.startTime - start) > EVENT_MATCH_SLACK_MS) continue;
        // A press emits several entries; only the one whose handler triggers
        // the render waits for mount, so it's by far the longest.
        if (entry.duration <= (interactionMs.current ?? -1)) continue;
        interactionMs.current = entry.duration;
      }
    });

    // 0 overrides the spec's default, which drops short events.
    observer.observe({ type: 'event', durationThreshold: 0 });
    return () => observer.disconnect();
  }, []);

  // Arms a run; the caller must trigger a state change that actually commits,
  // or the armed run leaks into the next press. Memory is sampled before the
  // render; commit start uses a User Timing mark so it shows up in RN DevTools.
  const beginRun = useCallback((scenario: Scenario) => {
    const memBefore = getMemoryFootprint();
    performance.mark(START_MARK);
    pending.current = { scenario, memBefore };

    interactionMs.current = null;
    runStartTime.current = performance.now();
    setRunning(scenario);
    return memBefore;
  }, []);

  const runMount = useCallback(
    (kind: Kind) => {
      mountBaseline.current = beginRun('mount');
      mountedCount.current = count;
      // Clears prior numbers, which may belong to a different variant/config.
      setStats({});
      setCaptured(`${labelFor(kind)} · ${fingerprint}`);
      setMountCount((n) => n + 1);
      setMounted(kind);
    },
    [beginRun, count, fingerprint]
  );

  const runUnmount = useCallback(() => {
    // memBefore here is the peak: sampled at press time, before anything is freed.
    beginRun('unmount');
    setMounted(null);
  }, [beginRun]);

  // Isolates Fabric's ancestor-re-render clone path (`fragment.props == nullptr`,
  // re-owns Yoga nodes, no re-measure) from a true no-op, which React would skip
  // entirely. The counter must reach a real prop inside the same content
  // container as the items — here, the No-op Update button's testID — to force
  // that clone; moving it to the header or outside the ScrollView silently turns
  // this run into a no-op.
  const runParentRerender = useCallback(() => {
    beginRun('parent');
    setRerenders((n) => n + 1);
  }, [beginRun]);

  const runColorChange = useCallback(() => {
    beginRun('color');
    setColorIndex((n) => (n + 1) % COLORS.length);
  }, [beginRun]);

  const runLayoutChange = useCallback(() => {
    beginRun('layout');
    setSizeBump((n) => (n === 0 ? SIZE_BUMP : 0));
  }, [beginRun]);

  // Runs after commit. Memory is sampled settleDelayMs later, once native
  // alloc/release has caught up; interaction is read at the same time since
  // Event Timing entries land well before then.
  // Deps are every piece of state a scenario touches, plus settleDelayMs, so
  // exactly one changing is what triggers this.
  useEffect(() => {
    const run = pending.current;
    if (!run) return;
    pending.current = null;

    // JS thread only (render, commit, layout); mounting happens on the UI thread
    // after this fires, so `interaction - commit` roughly gives mounting cost.
    const commitMs = performance.measure(`${START_MARK}:${run.scenario}`, START_MARK).duration;

    // Mount/unmount only: their memory number should reflect count views' worth
    // of allocation, not this run's own garbage. Timings are already latched,
    // so a GC pause here can't skew them.
    const sample = () => {
      if (run.scenario === 'mount' || run.scenario === 'unmount') forceGC?.();
      return getMemoryFootprint();
    };

    const timers: ReturnType<typeof setTimeout>[] = [];

    // No-op once the board is cleared, so a late-closing window can't resurrect an entry.
    const patch = (fields: Partial<RunStats>) =>
      setStats((prev) => {
        const entry = prev[run.scenario];
        if (entry == null) return prev;
        return { ...prev, [run.scenario]: { ...entry, ...fields } };
      });

    timers.push(
      setTimeout(() => {
        const memAfter = sample();
        setRunning(null);
        setStats((prev) => ({
          ...prev,
          [run.scenario]: {
            commitMs,
            interactionMs: interactionMs.current,
            memBefore: run.memBefore,
            memAfter,
            memFirstTouch: null,
            memFinal: null,
            mountBaseline: mountBaseline.current ?? run.memBefore,
            count: mountedCount.current,
          },
        }));

        // This setStats is itself the second window's event (readout shares the
        // mounted items' content container); `patch` below is the third — how
        // three windows come from two writes.
        // Buttons re-enable above, not after these windows; a press cancels the
        // effect and the headline total just never fills in.
        timers.push(
          setTimeout(() => {
            patch({ memFirstTouch: sample() });
            timers.push(setTimeout(() => patch({ memFinal: sample() }), settleDelayMs));
          }, settleDelayMs)
        );
      }, settleDelayMs)
    );

    return () => timers.forEach((t) => clearTimeout(t));
  }, [mounted, rerenders, colorIndex, sizeBump, settleDelayMs]);

  return (
    <>
      {/* Not a sticky header: a sticky child adds native handling of its own inside
          the tree every run commits into, and runParentRerender depends on this
          block staying a plain child of the same content container as the items. */}
      <ScrollView style={screenStyles.scroll} contentContainerStyle={styles.container}>
        <View style={styles.controls}>
          {/* No cover: the build-status banner is this page's first line.
              Two PlainTexts, not one string with a bold span: PlainText is one
              style per node by design. Set to wrap so the note drops below the
              tag on a narrow phone instead of clipping. */}
          <View style={[styles.build, __DEV__ ? styles.buildDebug : styles.buildRelease]}>
            <PlainText
              style={[styles.buildTag, __DEV__ ? styles.buildDebugInk : styles.buildReleaseInk]}
            >
              {__DEV__ ? '⚠️ DEBUG BUILD' : '✅ RELEASE BUILD'}
            </PlainText>
            {__DEV__ ? (
              <PlainText
                style={[styles.buildNote, __DEV__ ? styles.buildDebugInk : styles.buildReleaseInk]}
              >
                Results are not reliable!
              </PlainText>
            ) : null}
          </View>

          <Section title="Component" spacedRows>
            {/* Frozen at mount time so it never relabels results against a later
                selection; shows the next mount's config until then. Mono face:
                a record to be read character by character, not prose. */}
            <PlainText style={styles.fingerprint}>{captured ?? live}</PlainText>

            {/* Selecting a variant is only meaningful for the next mount, so the
                chips lock as soon as one is on screen. */}
            <View style={styles.row}>
              {VARIANTS.map(({ kind, label }) => (
                <Chip
                  key={kind}
                  label={label}
                  selected={kind === variant}
                  disabled={settling || mounted != null}
                  onPress={() => setVariant(kind)}
                />
              ))}
            </View>
          </Section>

          {/*
            All five actions stay on screen in a fixed order, each with its own
            result pinned underneath it, so a press never moves the numbers that
            are already there. Which ones are enabled is the whole state
            machine: mount when nothing is up, the other four when something is.

            `rerenders` is in the No-op Update button's `testID` deliberately:
            it is what makes that press commit anything at all. See
            runParentRerender.
          */}
          <Section title="Scenarios" spacedRows>
            <Action
              title={`Mount ${count} Instances`}
              scenario="mount"
              stats={stats}
              running={running}
              disabled={settling || mounted != null}
              onPress={() => runMount(variant)}
            />
            <Action
              title="No-op Update"
              testID={`no-op-update-${rerenders}`}
              scenario="parent"
              stats={stats}
              running={running}
              disabled={settling || mounted == null}
              onPress={runParentRerender}
            />
            <Action
              title="Color Update"
              scenario="color"
              stats={stats}
              running={running}
              disabled={settling || mounted == null}
              onPress={runColorChange}
            />
            <Action
              title="Layout Update"
              scenario="layout"
              stats={stats}
              running={running}
              disabled={settling || mounted == null}
              onPress={runLayoutChange}
            />
            <Action
              title="Unmount All Instances"
              scenario="unmount"
              stats={stats}
              running={running}
              disabled={settling || mounted == null}
              onPress={runUnmount}
            />
          </Section>
        </View>

        {/* The items are physically mounted, last, inside the same content
            container as the controls above. */}
        {mounted != null && renderItems(mounted, applied, textOffset, mountedCount.current)}
      </ScrollView>

      <PropsSheet
        visible={sheetVisible}
        config={config}
        onChange={setConfig}
        onClose={() => setSheetVisible(false)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

function renderItems(kind: Kind, applied: Applied, offset: number, count: number) {
  const { textStyle, viewStyle, props, text } = applied;
  const extra = props as object;
  // Per-mount index shift, see MOUNT_TEXT_STRIDE.
  const label = (n: number) => text(n + offset);

  if (kind === 'nativePlain') {
    // Props already in native shape (no StyleSheet.flatten/rest destructure) to
    // isolate the JS wrapper's own cost — why this doesn't share a helper with
    // the PlainText branch below.
    // textShadowOffset needs manual translation to textShadowOffsetWidth/Height;
    // every other textStyle key is already a native prop name and spreads through.
    const { textShadowOffset, ...nativeTextStyle } = textStyle as PlainTextStyle;
    if (textShadowOffset != null) {
      (nativeTextStyle as Record<string, unknown>).textShadowOffsetWidth = textShadowOffset.width;
      (nativeTextStyle as Record<string, unknown>).textShadowOffsetHeight = textShadowOffset.height;
    }
    return Array.from({ length: count }, (_, n) => (
      <NativePlainText
        key={n}
        text={label(n)}
        style={[styles.listItem, viewStyle]}
        {...(nativeTextStyle as object)}
        {...extra}
      />
    ));
  }

  const style = [styles.listItem, textStyle, viewStyle];
  // Same array minus the one key RN's own components lack an entry for — dropped,
  // not translated.
  const rnStyle = style as StyleProp<TextStyle>;

  if (kind === 'plain') {
    return Array.from({ length: count }, (_, n) => (
      <PlainText key={n} style={style} {...extra}>
        {label(n)}
      </PlainText>
    ));
  }

  if (kind === 'text') {
    return Array.from({ length: count }, (_, n) => (
      <Text key={n} style={rnStyle} {...extra}>
        {label(n)}
      </Text>
    ));
  }

  return Array.from({ length: count }, (_, n) => (
    // Bare RCTText host component, bypassing the <Text> JS wrapper.
    <NativeText key={n} style={rnStyle} {...extra}>
      {label(n)}
    </NativeText>
  ));
}

// Zero-padded to 5 digits so label width stays uniform (unpadded, the box width
// jumps at 1000/10000, muddying the area comparison). Must also clear
// MOUNT_TEXT_STRIDE's per-mount shift.
const SHORT_TEXT = (n: number) => `Text Item ${pad(n)}`;
const WRAPPING_TEXT = (n: number) =>
  `Text Item ${pad(n)}: a longer string that has to wrap onto more than one line on a phone.`;
// No index: every row is identical, pricing static content rather than
// per-row computation.
const STATIC_TEXT = () => 'ListItem Static';
// A BMP symbol most fonts lack (forces fallback) but resolves to a vector glyph,
// not color bitmap data — isolates fallback-resolution cost from the emoji
// row's color-glyph cost.
const SYMBOL_TEXT = (n: number) => `${SHORT_TEXT(n)} ★`;
// Cycled (not random) per row for reproducibility, across many distinct emoji
// rather than one repeated: if glyph data were shared/deduped, cost per view
// should match a single repeated emoji; if higher, it isn't shared.
const EMOJIS = ['🎉', '🦊', '🐇', '🐶', '🚀', '🌈', '🍕', '⚽️', '🎈', '🐝'];
const EMOJI_TEXT = (n: number) => `${SHORT_TEXT(n)} ${EMOJIS[n % EMOJIS.length]}`;

const pad = (n: number) => String(n).padStart(5, '0');

// ---------------------------------------------------------------------------
// Tunable props
//
// Named Attr* rather than Prop* so nothing here reads as the screen's own
// React props (see `type Props` above).
// ---------------------------------------------------------------------------

// Where a chosen value goes: `text` = text-style props/style entries, `view` =
// Yoga-laid-out view styles, `prop` = component props, `content` = the string.
// `settle`/`count` aren't rendered — read via settleMsFor/countFor below.
type Target = 'text' | 'view' | 'prop' | 'content' | 'settle' | 'count';

type AttrOption = {
  label: string;
  // undefined means "not set": the attribute is left off entirely.
  value?: unknown;
};

type AttrDef = {
  // Doubles as the style entry/prop name the value is written to (every row
  // but `content`).
  key: string;
  // Only where the row isn't named after a real prop; otherwise the key is the label.
  label?: string;
  section: string;
  // Fingerprint prefix, e.g. 'fs' + '20'.
  fp: string;
  target: Target;
  options: AttrOption[];
  // Omitted = first option (used by every row with an 'off' state); set
  // explicitly when the natural order differs (fontSize: largest first).
  defaultIndex?: number;
  // Always names the row in the fingerprint, even at default: for a row with no
  // unset state, "absent" and "default" would otherwise look identical.
  alwaysInFingerprint?: boolean;
};

// Only props that plausibly cost something (an extra native attribute, or a
// forced re-measure). No sliders/free text: discrete values keep runs
// comparable, quotable, and the persisted shape trivial.
//
// Every row starts with `(none)` (unset) then explicit values, including ones
// equal to the platform default. Unset means the prop never reaches the native
// view; an explicit default-valued prop still costs a diff/bridge entry/span —
// that gap is what this prices.
const ATTRIBUTES: AttrDef[] = [
  {
    key: 'fontSize',
    section: 'Text',
    fp: 'fs',
    target: 'text',
    // No `(none)`: there is always a font size, and 20 is the baseline every
    // recorded number is taken at.
    options: [
      { label: '56', value: 56 },
      { label: '20', value: 20 },
      { label: '14', value: 14 },
    ],
    defaultIndex: 1,
    alwaysInFingerprint: true,
  },
  {
    key: 'fontWeight',
    section: 'Text',
    fp: 'fw',
    target: 'text',
    options: [
      { label: '(none)' },
      { label: 'normal', value: 'normal' },
      { label: '100', value: '100' },
      { label: '300', value: '300' },
      { label: '500', value: '500' },
      { label: 'bold', value: 'bold' },
      { label: '900', value: '900' },
    ],
  },
  {
    key: 'fontFamily',
    section: 'Text',
    fp: 'ff',
    target: 'text',
    options: [
      { label: '(none)' },
      { label: 'serif', value: SERIF },
      { label: 'mono', value: MONO },
      // Bundled variable face; the only family fontVariationSettings can move,
      // so the two are meant to be set together (an axis on a system font
      // costs the same work but shows nothing).
      { label: 'OpenSans', value: VARIABLE },
    ],
  },
  {
    key: 'color',
    label: 'text color',
    section: 'Text',
    fp: 'c',
    target: 'text',
    // Mirrors backgroundColor's grey/indigo and alphas, so the two rows can be
    // paired to price translucent-over-translucent compositing.
    options: [
      { label: '(none)' },
      { label: '50% grey', value: `${COLOR.faint}80` },
      { label: '100% grey', value: COLOR.faint },
      { label: '50% indigo', value: `${COLOR.indigo}80` },
      { label: '100% indigo', value: COLOR.indigo },
    ],
  },
  {
    key: 'backgroundColor',
    label: 'background',
    section: 'Text',
    fp: 'bg',
    target: 'view',
    // Grey = page's neutral, indigo = the sheet's accent. Alpha as an 8-digit
    // hex suffix (not rgba()) so every value is one flat-color prop.
    options: [
      { label: '(none)' },
      { label: '50% grey', value: `${COLOR.faint}80` },
      { label: '100% grey', value: COLOR.faint },
      { label: '50% indigo', value: `${COLOR.indigo}80` },
      { label: '100% indigo', value: COLOR.indigo },
    ],
  },
  {
    key: 'fontStyle',
    section: 'Text',
    fp: 'fst',
    target: 'text',
    options: [
      { label: '(none)' },
      { label: 'normal', value: 'normal' },
      { label: 'italic', value: 'italic' },
    ],
  },
  {
    key: 'letterSpacing',
    section: 'Text',
    fp: 'ls',
    target: 'text',
    options: [
      { label: '(none)' },
      { label: '0', value: 0 },
      { label: '-1', value: -1 },
      { label: '0.5', value: 0.5 },
      { label: '3', value: 3 },
    ],
  },
  {
    key: 'lineHeight',
    section: 'Text',
    fp: 'lh',
    target: 'text',
    options: [
      { label: '(none)' },
      { label: '16', value: 16 },
      { label: '24', value: 24 },
      { label: '40', value: 40 },
    ],
  },
  {
    key: 'fontVariant',
    section: 'Text',
    fp: 'fv',
    target: 'text',
    options: [
      { label: '(none)' },
      { label: 'tabular', value: ['tabular-nums'] },
      { label: 'proportional', value: ['proportional-nums'] },
      { label: 'small-caps', value: ['small-caps'] },
      { label: 'oldstyle', value: ['oldstyle-nums'] },
      { label: 'two', value: ['small-caps', 'oldstyle-nums'] },
    ],
  },
  {
    // Only moves glyphs on OpenSans, but costs its parse work on any family
    // (both platforms derive a font before fvar applies). (none)→one axis prices
    // the prop; pairing with OpenSans makes the re-measure real too.
    key: 'fontVariationSettings',
    section: 'Text',
    fp: 'fvs',
    target: 'text',
    options: [
      { label: '(none)' },
      // Same axis at both range ends: same parse/derivation, but the heavier
      // instance measures wider, so a re-measuring run shows it in layout too.
      { label: 'wght 300', value: '"wght" 300' },
      { label: 'wght 800', value: '"wght" 800' },
      { label: 'wdth 75', value: '"wdth" 75' },
      // Two axes in one string: one more entry to parse, still one derivation.
      { label: 'two', value: '"wght" 800, "wdth" 75' },
    ],
  },
  {
    key: 'textDecorationLine',
    section: 'Text',
    fp: 'td',
    target: 'text',
    options: [
      { label: '(none)' },
      { label: 'none', value: 'none' },
      { label: 'underline', value: 'underline' },
      { label: 'line-through', value: 'line-through' },
      { label: 'both', value: 'underline line-through' },
    ],
  },
  {
    // Only draws once textShadowOffset (or Android's textShadowRadius) is also
    // set, like the border rows need borderWidth. Kept separate so the color
    // write and the attributed-string-path cost can each be priced alone.
    key: 'textShadowColor',
    section: 'Text',
    fp: 'tsc',
    target: 'text',
    options: [
      { label: '(none)' },
      // The same indigo the border rows below default to.
      { label: 'indigo', value: COLOR.indigo },
    ],
  },
  {
    key: 'textShadowOffset',
    section: 'Text',
    fp: 'tso',
    target: 'text',
    options: [
      { label: '(none)' },
      { label: '1,1', value: { width: 1, height: 1 } },
      { label: '2,2', value: { width: 2, height: 2 } },
    ],
  },
  {
    key: 'textShadowRadius',
    section: 'Text',
    fp: 'tsr',
    target: 'text',
    options: [
      { label: '(none)' },
      { label: '0', value: 0 },
      { label: '2', value: 2 },
      { label: '6', value: 6 },
    ],
  },
  {
    key: 'textTransform',
    section: 'Text',
    fp: 'tt',
    target: 'text',
    options: [
      { label: '(none)' },
      { label: 'none', value: 'none' },
      { label: 'uppercase', value: 'uppercase' },
      { label: 'lowercase', value: 'lowercase' },
      { label: 'capitalize', value: 'capitalize' },
    ],
  },
  {
    key: 'textAlign',
    section: 'Text',
    fp: 'ta',
    target: 'text',
    options: [
      { label: '(none)' },
      { label: 'auto', value: 'auto' },
      { label: 'left', value: 'left' },
      { label: 'center', value: 'center' },
      { label: 'right', value: 'right' },
      { label: 'justify', value: 'justify' },
    ],
  },
  {
    // Keyed on the native prop name (not the `verticalAlign` alias) so
    // nativePlain can spread it straight through. Only moves glyphs when the
    // box is taller than the text — pair with Layout `height` to see it, not
    // just price it.
    key: 'textAlignVertical',
    section: 'Text',
    fp: 'tav',
    target: 'text',
    options: [
      { label: '(none)' },
      { label: 'auto', value: 'auto' },
      { label: 'top', value: 'top' },
      { label: 'center', value: 'center' },
      { label: 'bottom', value: 'bottom' },
    ],
  },
  {
    key: 'numberOfLines',
    section: 'Layout',
    fp: 'nol',
    target: 'prop',
    options: [
      { label: '(none)' },
      { label: '0', value: 0 },
      { label: '1', value: 1 },
      { label: '2', value: 2 },
      { label: '3', value: 3 },
    ],
  },
  {
    key: 'ellipsizeMode',
    section: 'Layout',
    fp: 'em',
    target: 'prop',
    options: [
      { label: '(none)' },
      { label: 'head', value: 'head' },
      { label: 'middle', value: 'middle' },
      { label: 'tail', value: 'tail' },
      { label: 'clip', value: 'clip' },
    ],
  },
  {
    key: 'padding',
    section: 'Layout',
    fp: 'p',
    target: 'view',
    options: [
      { label: '(none)' },
      { label: '0', value: 0 },
      { label: '8', value: 8 },
      { label: '20', value: 20 },
    ],
  },
  {
    key: 'borderWidth',
    section: 'Layout',
    fp: 'bw',
    target: 'view',
    options: [
      { label: '(none)' },
      { label: '0', value: 0 },
      { label: '1', value: 1 },
      { label: '4', value: 4 },
    ],
  },
  {
    key: 'borderRadius',
    section: 'Layout',
    fp: 'br',
    target: 'view',
    options: [
      { label: '(none)' },
      { label: '0', value: 0 },
      { label: '8', value: 8 },
      { label: '999', value: 999 },
    ],
  },
  {
    key: 'height',
    section: 'Layout',
    fp: 'h',
    target: 'view',
    options: [
      { label: '(none)' },
      { label: '100', value: 100 },
      { label: '200', value: 200 },
      { label: '300', value: 300 },
    ],
  },
  {
    key: 'width',
    section: 'Layout',
    fp: 'w',
    target: 'view',
    options: [
      { label: '(none)' },
      { label: '50%', value: '50%' },
      { label: '100%', value: '100%' },
    ],
  },
  {
    key: 'allowFontScaling',
    section: 'Layout',
    fp: 'afs',
    target: 'prop',
    options: [
      { label: '(none)' },
      { label: 'true', value: true },
      { label: 'false', value: false },
    ],
  },
  {
    key: 'maxFontSizeMultiplier',
    section: 'Layout',
    fp: 'mfm',
    target: 'prop',
    options: [
      { label: '(none)' },
      { label: '1', value: 1 },
      { label: '1.5', value: 1.5 },
      { label: '4', value: 4 },
    ],
  },
  {
    key: 'content',
    label: 'text length',
    section: 'Content',
    fp: 'text',
    target: 'content',
    // The builder itself rather than a name for it, so nothing downstream has to
    // map one to the other.
    options: [
      { label: 'short', value: SHORT_TEXT },
      { label: 'wrapping', value: WRAPPING_TEXT },
      { label: 'static', value: STATIC_TEXT },
      { label: 'symbol', value: SYMBOL_TEXT },
      { label: 'emoji', value: EMOJI_TEXT },
    ],
  },
  {
    // Library's internal `experiment` prop (PlainTextViewNativeComponent.ts): a
    // generic on/off switch for whatever the perf suite is A/B testing;
    // currently unread on both platforms. See docs/contributing/perf-experiments.md.
    key: 'experiment',
    section: 'Params',
    fp: 'exp',
    target: 'prop',
    options: [
      { label: '(none)' },
      { label: 'baseline', value: false },
      { label: 'experiment', value: true },
    ],
  },
  {
    // See DEFAULT_SETTLE_MS. Always in the fingerprint since it affects whether
    // a recorded memory number is trustworthy.
    key: 'settleMs',
    label: 'Settle Time',
    section: 'Params',
    fp: 'settle',
    target: 'settle',
    // 5s, matching DEFAULT_SETTLE_MS.
    defaultIndex: 1,
    options: [
      { label: '1s', value: 1_000 },
      { label: '5s', value: 5_000 },
      { label: '15s', value: 15_000 },
      { label: '30s', value: 30_000 },
      { label: '45s', value: 45_000 },
      { label: '60s', value: 60_000 },
    ],
    alwaysInFingerprint: true,
  },
  {
    // Always in the fingerprint: other figures (bytes/view, commit time) scale
    // by it, so differently-scaled runs would otherwise look comparable. See
    // countFor and RunStats.count.
    key: 'count',
    label: 'Text Count',
    section: 'Params',
    fp: 'n',
    target: 'count',
    defaultIndex: 0,
    options: [
      { label: '5000', value: 5000 },
      { label: '1000', value: 1000 },
      { label: '2000', value: 2000 },
      { label: '10000', value: 10_000 },
    ],
    alwaysInFingerprint: true,
  },
];

// Derived from ATTRIBUTES so adding a row is the only edit needed; a hardcoded
// list risks a new row rendering nowhere. Insertion-ordered to match ATTRIBUTES.
const SECTIONS = [...new Set(ATTRIBUTES.map((attr) => attr.section))];

// Value is the option index; a missing key falls back to the attribute's
// default, so a config persisted before an attribute existed still loads.
type AttrConfig = Record<string, number>;

const DEFAULT_CONFIG: AttrConfig = {};

function defaultIndex(attr: AttrDef) {
  return attr.defaultIndex ?? 0;
}

function selectedIndex(config: AttrConfig, attr: AttrDef) {
  const index = config[attr.key] ?? defaultIndex(attr);
  return attr.options[index] == null ? defaultIndex(attr) : index;
}

// selectedIndex only ever returns an index that exists, so the fallback is
// unreachable. It is here because noUncheckedIndexedAccess cannot see that.
function selectedOption(config: AttrConfig, attr: AttrDef): AttrOption {
  return attr.options[selectedIndex(config, attr)] ?? { label: '(none)' };
}

// Named starting points so a run can be quoted as "header at 1000 nodes" rather
// than a fingerprint to decode. Matched by option value, not label, so a
// relabelled chip can't repoint a preset.
type Preset = {
  name: string;
  values: Record<string, unknown>;
};

const PRESETS: Preset[] = [
  {
    name: 'Label',
    values: { fontSize: 20, fontFamily: VARIABLE, color: COLOR.faint },
  },
  {
    name: 'Header',
    values: {
      fontSize: 56,
      fontWeight: 'bold',
      fontFamily: VARIABLE,
      color: COLOR.indigo,
      letterSpacing: -1,
    },
  },
  {
    name: 'Body',
    values: {
      fontSize: 20,
      fontFamily: VARIABLE,
      color: COLOR.faint,
      lineHeight: 24,
      // Only preset that also sets content: a body is where wrapping (the
      // measure pass) is the whole cost.
      content: WRAPPING_TEXT,
    },
  },
];

// A preset is a whole look, not a patch: unnamed rows reset to default so
// pressing one twice from different states converges. Params rows (settle
// time, experiment) are left alone — they affect measurement, not appearance.
function presetConfig(config: AttrConfig, preset: Preset): AttrConfig {
  const next: AttrConfig = {};
  for (const attr of ATTRIBUTES) {
    if (attr.section === 'Params') {
      const current = config[attr.key];
      if (current != null) next[attr.key] = current;
      continue;
    }
    const value = preset.values[attr.key];
    if (value === undefined) continue;
    const index = attr.options.findIndex((option) => option.value === value);
    if (index !== -1) next[attr.key] = index;
  }
  return next;
}

// Compared through selectedIndex, so an omitted row and a row explicitly set to
// its default count as the same state.
function matchesPreset(config: AttrConfig, preset: Preset) {
  const next = presetConfig(config, preset);
  return ATTRIBUTES.every((attr) => selectedIndex(config, attr) === selectedIndex(next, attr));
}

const SETTLE_ATTR = ATTRIBUTES.find((attr) => attr.key === 'settleMs');

function settleMsFor(config: AttrConfig): number {
  if (SETTLE_ATTR == null) return DEFAULT_SETTLE_MS;
  return selectedOption(config, SETTLE_ATTR).value as number;
}

const COUNT_ATTR = ATTRIBUTES.find((attr) => attr.key === 'count');

function countFor(config: AttrConfig): number {
  if (COUNT_ATTR == null) return DEFAULT_COUNT;
  return selectedOption(config, COUNT_ATTR).value as number;
}

// Excludes always-fingerprinted rows: they're visible on the line regardless,
// so counting them too would double-report.
function countChangedProps(config: AttrConfig) {
  return ATTRIBUTES.filter(
    (attr) => !attr.alwaysInFingerprint && selectedIndex(config, attr) !== defaultIndex(attr)
  ).length;
}

// Unset-default rows contribute nothing, so the line records only what this
// run changed, plus the always-fingerprinted rows.
function formatFingerprint(config: AttrConfig) {
  return ATTRIBUTES.filter(
    (attr) => attr.alwaysInFingerprint || selectedIndex(config, attr) !== defaultIndex(attr)
  )
    .map((attr) => `${attr.fp}:${selectedOption(config, attr).label}`)
    .join(' · ');
}

type TextBuilder = (n: number) => string;

type Applied = {
  // PlainTextStyle, not TextStyle: fontVariationSettings writes a key RN's
  // TextStyle lacks. The <Text> branches cast it away — exactly the gap being priced.
  textStyle: PlainTextStyle;
  viewStyle: ViewStyle;
  // Bag, not named fields, so adding an ATTRIBUTES row is the only edit needed,
  // and an unset `(none)` prop stays genuinely absent rather than `undefined`.
  props: Record<string, unknown>;
  text: TextBuilder;
};

function buildApplied(config: AttrConfig, colorIndex: number, sizeBump: number): Applied {
  const textStyle: Record<string, unknown> = {};
  const viewStyle: Record<string, unknown> = {};
  const props: Record<string, unknown> = {};
  let text: TextBuilder = SHORT_TEXT;

  for (const attr of ATTRIBUTES) {
    const option = selectedOption(config, attr);
    if (option.value === undefined) continue;
    if (attr.target === 'text') textStyle[attr.key] = option.value;
    else if (attr.target === 'view') viewStyle[attr.key] = option.value;
    else if (attr.target === 'prop') props[attr.key] = option.value;
    else if (attr.target === 'settle' || attr.target === 'count')
      continue; // read separately, see settleMsFor / countFor
    else text = option.value as TextBuilder;
  }

  // No color = no visible border on either platform. Indigo matches Features' border rows.
  if (viewStyle.borderWidth != null) viewStyle.borderColor = COLOR.indigo;

  // Applied last so update scenarios win over config. Color only overrides once
  // toggled from index 0, so at rest the config's own color (or native default)
  // reaches the text unstomped.
  if (colorIndex !== 0) textStyle.color = COLORS[colorIndex];
  textStyle.fontSize = (textStyle.fontSize as number) + sizeBump;

  return {
    textStyle: textStyle as PlainTextStyle,
    viewStyle: viewStyle as ViewStyle,
    props,
    text,
  };
}

function PropsSheet({
  visible,
  config,
  onChange,
  onClose,
}: {
  visible: boolean;
  config: AttrConfig;
  onChange: (config: AttrConfig) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.sheetBar}>
          <Pressable onPress={() => onChange(DEFAULT_CONFIG)} hitSlop={8}>
            <PlainText style={styles.sheetAction}>Reset all</PlainText>
          </Pressable>
          <PlainText style={styles.sheetTitle}>Props</PlainText>
          <Pressable onPress={onClose} hitSlop={8}>
            <PlainText style={styles.sheetAction}>Done</PlainText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.sheetBody}>
          <Section title="Presets" spacedRows>
            <View style={styles.attrRow}>
              <PlainText style={styles.attrLabel}>Preset</PlainText>
              <View style={styles.attrOptions}>
                {PRESETS.map((preset) => (
                  <Chip
                    key={preset.name}
                    label={preset.name}
                    selected={matchesPreset(config, preset)}
                    onPress={() => onChange(presetConfig(config, preset))}
                  />
                ))}
              </View>
            </View>
          </Section>

          {/* Reuses the screens' own section furniture so the sheet reads as
              part of the same book, not a bolted-on settings dialog. */}
          {SECTIONS.map((section) => (
            <Section key={section} title={section} spacedRows>
              {ATTRIBUTES.filter((attr) => attr.section === section).map((attr) => {
                const index = selectedIndex(config, attr);
                return (
                  <View key={attr.key} style={styles.attrRow}>
                    <PlainText style={styles.attrLabel}>{attr.label ?? attr.key}</PlainText>
                    <View style={styles.attrOptions}>
                      {attr.options.map((option, i) => (
                        <Chip
                          key={option.label}
                          label={option.label}
                          selected={i === index}
                          onPress={() => onChange({ ...config, [attr.key]: i })}
                        />
                      ))}
                    </View>
                  </View>
                );
              })}
            </Section>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

function Chip({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.chip, selected && styles.chipSelected, disabled && styles.chipDisabled]}
    >
      <PlainText style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
        {label}
      </PlainText>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Actions and readouts
// ---------------------------------------------------------------------------

// Groups a button with its result so the result can't drift when a sibling's height changes.
function Action({
  title,
  testID,
  scenario,
  stats,
  running,
  disabled,
  onPress,
}: {
  title: string;
  // Not user-visible, just a real prop for a real diff. See runParentRerender.
  testID?: string;
  scenario: Scenario;
  stats: Partial<Record<Scenario, RunStats>>;
  running: Scenario | null;
  disabled?: boolean;
  onPress: () => void;
}) {
  const result = stats[scenario];
  const isSettling = running === scenario;
  return (
    <View style={styles.action}>
      {/* Not RN's <Button>: it renders differently per platform and its label
          padding isn't adjustable. Pressable is the same box everywhere. */}
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={[styles.button, disabled && styles.buttonDisabled]}
      >
        <PlainText
          testID={testID}
          style={[styles.buttonLabel, disabled && styles.buttonLabelDisabled]}
        >
          {title}
        </PlainText>
      </Pressable>
      {/* Mounted for the life of the screen (placeholder/profiling/numbers are
          the same node, different string): adding or removing a node here would
          be tree churn charged to the run being measured. */}
      <PlainText
        style={[styles.readout, result != null && !isSettling ? styles.stats : styles.settling]}
      >
        {isSettling
          ? formatProfiling(1)
          : result != null
            ? formatStats(result, scenario)
            : 'No results yet'}
      </PlainText>
    </View>
  );
}

// Same lines/order/units for every scenario, so numbers can be compared
// without re-learning the format.
function formatStats(stats: RunStats, scenario: Scenario) {
  // Withheld until the last window closes — a partial figure would read like a finished one.
  const memFinal = stats.memFinal;
  const memory =
    memFinal == null
      ? formatProfiling(stats.memFirstTouch == null ? 2 : 3)
      : [formatHeadline(stats, memFinal, scenario), formatChain(stats, memFinal)].join('\n');
  return [formatTiming(stats), memory].join('\n');
}

// One dot per window closed, so the line says which of the three is open.
function formatProfiling(phase: number) {
  return `Profiling memory${'.'.repeat(phase)}`;
}

// Per-view figure across all three windows, since that's what someone scales
// by their own node count. `incl.` breaks out this run's own commit from the
// two re-renders.
function formatHeadline(stats: RunStats, memFinal: number, scenario: Scenario) {
  const own = perView(stats.memAfter - stats.memBefore, stats.count);
  const total = perView(memFinal - stats.memBefore, stats.count);
  return `${total} KB/view headline (${own} KB/view ${SCENARIO_TERMS[scenario]})`;
}

// Absolute, not relative: an impossible-looking delta usually means the
// footprint was already off before the run began.
function formatChain(stats: RunStats, memFinal: number) {
  const retained = formatSignedMB(memFinal - stats.mountBaseline);
  return `${formatMB(stats.memBefore)} MB → ${formatMB(memFinal)} MB (retained ${retained})`;
}

// Unitless; headline carries the unit. `count` is this run's own, not the
// live Text Count selection — see RunStats.count.
function perView(bytes: number, count: number) {
  return `${bytes >= 0 ? '+' : '−'}${Math.abs(bytes / count / 1024).toFixed(1)}`;
}

function formatMB(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(1);
}

function formatSignedMB(bytes: number) {
  return `${bytes >= 0 ? '+' : '−'}${formatMB(Math.abs(bytes))} MB`;
}

// Shared by every readout so the numbers stay comparable across scenarios.
function formatTiming({
  interactionMs,
  commitMs,
}: {
  interactionMs: number | null;
  commitMs: number;
}) {
  const interaction = interactionMs == null ? '—' : `${interactionMs.toFixed(0)} ms`;
  // Nested, not side by side: commit is the JS-thread slice of interaction, so
  // the gap is UI-thread mount cost.
  return `${interaction} interaction (incl. ${commitMs.toFixed(0)} ms commit)`;
}

const styles = StyleSheet.create({
  // screenStyles.container with `gap` dropped (this container also holds 1000
  // items, which would each eat that 40pt gap) and alignItems added; margins
  // and padding otherwise match the other screens.
  container: {
    flexGrow: 1,
    // Shrink-wraps items to their own width on the left margin, not stretched.
    alignItems: 'flex-start',
    paddingTop: 28,
    paddingHorizontal: 18,
    paddingBottom: 48,
  },
  // Carries the 40pt section gap so items below can space themselves freely.
  // Closed with the section hairline: below it the page becomes specimens, not prose.
  controls: {
    alignSelf: 'stretch',
    backgroundColor: COLOR.paper,
    gap: 40,
    paddingBottom: 28,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLOR.line,
  },
  // No card: the action's 6pt gap (same ratio the specimen rows use for
  // caption-to-specimen) binds result to button; the readout's own wash carries the pairing.
  action: {
    alignSelf: 'stretch',
    gap: 6,
  },
  // Tinted, not filled: five stacked in solid indigo drowned out the numbers.
  button: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: COLOR.indigoWash,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  buttonDisabled: {
    backgroundColor: COLOR.wash,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLOR.indigo,
  },
  buttonLabelDisabled: {
    color: COLOR.disabled,
  },
  // Examples' error-banner shape (wash, pigment left rule, text in pigment).
  // Box only — the tag/note children carry their own size, weight, and color.
  build: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 7,
    overflow: 'hidden',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderLeftWidth: 4,
    borderRadius: 6,
    // A note on the page, not a section: skips the top margin/40pt section gap,
    // using its own padding as spacing instead.
    marginTop: -8,
    marginBottom: -16,
  },
  // Caps, tracked, bold: the register the page gives every other label.
  buildTag: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  buildNote: {
    fontSize: 13,
    lineHeight: 19,
  },
  buildDebug: {
    backgroundColor: COLOR.ochreWash,
    borderLeftColor: COLOR.ochre,
  },
  buildDebugInk: {
    color: COLOR.ochre,
  },
  buildRelease: {
    backgroundColor: COLOR.mossWash,
    borderLeftColor: COLOR.moss,
  },
  buildReleaseInk: {
    color: COLOR.mossInk,
  },
  fingerprint: {
    width: '100%',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: MONO,
    color: COLOR.muted,
  },
  // Same wash the specimen rows use behind their type.
  readout: {
    fontSize: 12,
    lineHeight: 18,
    color: COLOR.inkSoft,
    // Centered under the button's own centered label, so the pair reads as one
    // block (page is otherwise left-aligned).
    textAlign: 'center',
    backgroundColor: COLOR.wash,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    overflow: 'hidden',
  },
  // Tabular, not mono: this is short sentences of units and arrows, not a code
  // listing, but digits still need to line up run to run.
  stats: {
    fontVariant: ['tabular-nums'],
  },
  // Reads as a quiet, italic caption rather than a value.
  settling: {
    color: COLOR.muted,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  // marginTop, not marginBottom, keeps the first item clear of the control
  // block too. Margin is a view style: Yoga lays it out around the
  // self-measured text without touching the measurement itself.
  listItem: {
    marginTop: 10,
    // Dark enough to read in the 10pt gaps against white, unlike the specimen
    // wash which only needs to hold an edge.
    backgroundColor: COLOR.line,
  },
  headerButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  headerButtonPressed: {
    opacity: 0.4,
  },
  // Matches the toggle the other two screens put in the same slot.
  headerButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLOR.indigo,
  },
  headerButtonDisabled: {
    color: COLOR.disabled,
  },
  // Neutral ramp, not outlined indigo: up to seven chips in a row would
  // otherwise read as seven things asking to be pressed. Only the selected one takes the accent.
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLOR.line,
  },
  chipSelected: {
    backgroundColor: COLOR.indigo,
    borderColor: COLOR.indigo,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipLabel: {
    fontSize: 12,
    color: COLOR.inkSoft,
  },
  chipLabelSelected: {
    color: COLOR.paper,
  },
  sheet: {
    flex: 1,
    backgroundColor: COLOR.paper,
  },
  sheetBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLOR.line,
  },
  // Register of nav bar titles, a size down — this bar has two actions beside it.
  sheetTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLOR.ink,
  },
  // Same indigo as the header buttons on every screen.
  sheetAction: {
    fontSize: 16,
    color: COLOR.indigo,
  },
  // Page margins and section gap from the specimen pages; extra bottom padding
  // clears Android's gesture bar.
  sheetBody: {
    paddingTop: 24,
    paddingBottom: 72,
    paddingHorizontal: 18,
    gap: 40,
  },
  attrRow: {
    gap: 6,
  },
  attrLabel: {
    fontSize: 14,
    color: COLOR.ink,
  },
  attrOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});

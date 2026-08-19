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
import { PlainText, type PlainTextStyle } from 'react-native-plain-text';
import { Section, screenStyles } from '../components/Specimen';
import { useSessionState } from '../useSessionState';
import { COLOR, MONO, SERIF, VARIABLE } from '../theme';
// The library's bare codegen host component, the analogue of the
// NativeText-vs-Text pair, which prices the JS wrapper. Imported by path
// because it is deliberately not public API.
import NativePlainText from '../../../src/PlainTextViewNativeComponent';

const COUNT = 1000;

// Native allocations (CoreText layout, CALayer backing stores, JS heap growth)
// are deferred past the React commit, so sampling immediately undercounts. Every
// run waits this out before sampling, because memory has no completion signal to
// observe the way the timings do. An unmount needs it at least as much as a
// mount: releasing is lazier than allocating.
//
// Default for both platforms, adjustable per run from the Props sheet (the
// 'settleMs' row below) up to 15s, for whenever a platform's settle curve
// turns out to need longer than this. Undercounting memory fails *silently*
// (a short window yields a plausible-looking smaller number, not a visible
// gap), so lengthening it is the safer direction to reach for when in doubt.
const DEFAULT_SETTLE_MS = 3_000;

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

// How far an Event Timing entry may sit from the press timestamp and still
// count as this run's: the native event is stamped before the JS handler runs,
// so the entry always starts a little earlier.
const EVENT_MATCH_SLACK_MS = 1_000;

const START_MARK = 'plaintext-bench:press';

// Every scenario. `mount` and `unmount` change what is on screen, the other
// three update what is already there.
type Scenario = 'mount' | 'unmount' | 'parent' | 'color' | 'layout';

// The two colors the "Color" scenario alternates between. A toggle rather than
// an absolute value so every press commits something, and so the run never
// needs a value picker. Both from the palette: the page's ink, and the indigo
// accent the rest of the app already uses for its own interactive elements.
const COLORS = [COLOR.ink, COLOR.indigo];

// The "Layout" scenario alternates fontSize by half a point: every item has to
// re-measure, while the drawn area changes by ~2%. That isolates measurement
// invalidation from re-draw and re-composite cost, which a full font-size step
// mixes together.
const SIZE_BUMP = 0.5;

// One shape for every scenario, so the readouts stay directly comparable and a
// new scenario needs no new plumbing.
type RunStats = {
  commitMs: number;
  interactionMs: number | null;
  memBefore: number;
  memAfter: number;
  // Signed: positive for a mount, negative for an unmount that actually
  // released, near zero for an update that allocated nothing. The readout also
  // shows this over COUNT, only meaningful where the run created or destroyed
  // the views, and ~0 per view for the update runs.
  deltaBytes: number;
  // Unmount only: how far the settled footprint sits above the pre-mount
  // baseline. A large value is the leak signal.
  retainedBytes: number | null;
};

// Measured with RN's own Web Performance APIs, stable since 0.83, rather than
// hand-rolled timing. See docs/agent/measuring.md.
//
// `interaction` is the headline: for an event whose handler causes rendering
// updates, EventPerformanceLogger holds the entry until the shadow tree mounts
// and reports `duration = mountTime - eventStartTime`. Press to mounted,
// measured by the core, RN's analogue of INP.
//
// Typed locally: tsconfig has no DOM lib and RN's strict TS API doesn't declare
// these globals, though the runtime installs them.
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

// Hermes only, and only when it's built with GC exposed to JS. Called before
// sampling memory on mount and unmount, so a run's own garbage doesn't count
// toward its delta/retained numbers, never on the other scenarios, where a
// GC pause would otherwise land inside the commit/interaction measurement
// instead of after it.
const forceGC = (globalThis as unknown as { gc?: () => void }).gc;

type Props = NativeStackScreenProps<ParamListBase>;

export default function PerformanceScreen({ navigation }: Props) {
  // Persisted for the session: the run procedure says kill the app between
  // runs, so a config that reset on launch could never be held constant across
  // the runs being compared.
  const [config, setConfig] = useSessionState<AttrConfig>('perf-attrs', DEFAULT_CONFIG);
  const [sheetVisible, setSheetVisible] = useState(false);

  // Which component the next mount will use. Persisted for the same reason the
  // config is: the run procedure kills the app between runs, and re-picking the
  // variant every launch is friction on the one control pressed most.
  const [variant, setVariant] = useSessionState<Kind>('perf-variant', 'plain');

  // Which variant is currently on screen, if any. One at a time: mounting a
  // second variant into a tree that already holds 1000 of another is not a
  // scenario worth a number.
  const [mounted, setMounted] = useState<Kind | null>(null);

  // One entry per scenario, each rendered under the button that produced it and
  // kept there until the next mount clears the board. Only a re-run of the same
  // scenario overwrites its own entry, so the five numbers of one session stay
  // on screen together.
  const [stats, setStats] = useState<Partial<Record<Scenario, RunStats>>>({});

  // The component and config the numbers on screen were taken against, frozen
  // at mount time. Without this the header tracked the live selection, so
  // picking a different component after an unmount relabelled results that had
  // been measured against the previous one.
  const [captured, setCaptured] = useState<string | null>(null);

  // The scenario whose settle window is still open, if any. Every action is
  // disabled meanwhile: a second commit inside the window would land in the
  // middle of the memory sample it is about to invalidate.
  const [running, setRunning] = useState<Scenario | null>(null);
  const settling = running != null;

  // The three update scenarios. `rerenders` is fed into the No-op Update
  // button's `testID` on purpose. See runParentRerender.
  const [rerenders, setRerenders] = useState(0);
  const [colorIndex, setColorIndex] = useState(0);
  const [sizeBump, setSizeBump] = useState(0);

  // In-flight measurement. Only one runs at a time, so a single ref is enough.
  const pending = useRef<{ scenario: Scenario; memBefore: number } | null>(null);

  // The footprint sampled before the mount, kept so the unmount run can say how
  // much never came back rather than only how much was freed.
  const mountBaseline = useRef<number | null>(null);

  // Event Timing arrives after mount, later than the effect that clears
  // `pending`, so the press timestamp it matches against has to outlive it. Read
  // when the settle timer fires, by which point every entry for that press has
  // long since landed.
  const interactionMs = useRef<number | null>(null);
  const runStartTime = useRef<number | null>(null);

  // Not memoized: every render rebuilds all COUNT elements anyway, so a stable
  // object here would save nothing.
  const applied = buildApplied(config, colorIndex, sizeBump);
  const settleDelayMs = settleMsFor(config);
  const fingerprint = formatFingerprint(config);
  // What the next mount would run.
  const live = `${labelFor(variant)} · ${fingerprint}`;

  // Props are edited from the native header, which keeps the panel out of the
  // measured tree entirely: the tree the benchmark commits into is the same
  // whether one prop is set or ten.
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
      // Same split as the Compare Text toggle: Android draws `headerRight`, iOS
      // takes the item form so the bar's iOS 26 glass capsule can be turned off.
      //
      // The rule cannot tell a header-slot render callback from a component. The
      // element it returns is built once above, outside the callback. The same
      // pattern in CompareText sits in a hook rather than a component, which is
      // why only this one needs the exemption.
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
        // A press emits several entries (touchstart, touchend, click…); only
        // the one whose handler triggered the render waits for mount, so it is
        // by far the longest.
        if (entry.duration <= (interactionMs.current ?? -1)) continue;
        interactionMs.current = entry.duration;
      }
    });

    // 0 overrides the spec's default, which drops short events.
    observer.observe({ type: 'event', durationThreshold: 0 });
    return () => observer.disconnect();
  }, []);

  // Arms a run. The caller must then trigger a state change that actually
  // commits, otherwise the armed run leaks into the next press.
  //
  // Memory is sampled here, before the render. The commit start is a User Timing
  // mark rather than a bare timestamp so the span also shows up in React Native
  // DevTools' Performance panel.
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
      // Every number on screen belongs to the previous mount, which may have
      // used a different variant or config.
      setStats({});
      setCaptured(`${labelFor(kind)} · ${fingerprint}`);
      setMounted(kind);
    },
    [beginRun, fingerprint]
  );

  const runUnmount = useCallback(() => {
    // memBefore is sampled at press time, so for this run it is the peak:
    // everything the mount allocated is still live.
    beginRun('unmount');
    setMounted(null);
  }, [beginRun]);

  // The control for the other two update runs: re-render the screen *without*
  // touching any prop the mounted text receives. This is what isolates
  // `shouldNewRevisionDirtyMeasurement`'s `fragment.props == nullptr` early
  // return, the ancestor-re-render path, where Fabric clones every child of a
  // changed parent purely to re-own its Yoga node
  // (`YogaLayoutableShadowNode::adoptYogaChild`) and nothing should re-measure.
  //
  // The counter has to be *rendered* somewhere for this to test anything: a
  // state change that produces an identical tree makes React bail out, Fabric
  // commits no clones, and the run measures nothing at all rather than
  // measuring a cheap re-own. Feeding it into the No-op Update button's
  // `testID` changes a real prop inside the same content container as the
  // items, which forces that container to be cloned with a new children list,
  // and that is what re-owns all ~1000 mounted items. Keep the counter
  // reaching some real prop under that container. How deeply nested, or
  // whether it's user-visible, does not matter. Moving it into the header or
  // into a view outside the ScrollView, or dropping it, silently turns this
  // run into a no-op.
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

  // One pipeline for all five scenarios. Runs after React has committed.
  // Memory is sampled settleDelayMs later, once native allocation (or release) has
  // caught up, and the interaction number is read at the same moment because
  // every Event Timing entry for that press has landed well before then.
  //
  // The dependency list is every piece of state a scenario touches, plus
  // settleDelayMs itself, so exactly one of them changing is what runs this.
  useEffect(() => {
    const run = pending.current;
    if (!run) return;
    pending.current = null;

    // The JS thread only: React render, Fabric commit, Yoga layout. Mounting
    // happens on the UI thread after this fires, so `interaction - commit` is
    // roughly what mounting cost. Named per scenario so the runs stay separable
    // in React Native DevTools' Performance panel.
    const commitMs = performance.measure(`${START_MARK}:${run.scenario}`, START_MARK).duration;

    const timer = setTimeout(() => {
      // commitMs is already fixed above and interactionMs already latched by
      // the observer effect, so a GC pause here only delays this callback.
      // It can't skew either timing number. Mount and unmount only: those are
      // the two scenarios whose memory number is supposed to reflect COUNT
      // views' worth of allocation, so a run's own garbage shouldn't count
      // toward it either way.
      if (run.scenario === 'mount' || run.scenario === 'unmount') forceGC?.();

      const memAfter = getMemoryFootprint();
      const deltaBytes = memAfter - run.memBefore;
      const result: RunStats = {
        commitMs,
        interactionMs: interactionMs.current,
        memBefore: run.memBefore,
        memAfter,
        deltaBytes,
        retainedBytes:
          run.scenario === 'unmount' ? memAfter - (mountBaseline.current ?? run.memBefore) : null,
      };
      setRunning(null);
      setStats((prev) => ({ ...prev, [run.scenario]: result }));
    }, settleDelayMs);

    return () => clearTimeout(timer);
  }, [mounted, rerenders, colorIndex, sizeBump, settleDelayMs]);

  return (
    <>
      {/*
        The control block scrolls with the content. It stays a child of the same
        content container as the items, which is what runParentRerender depends
        on, but it is deliberately not a sticky header: a sticky child gets extra
        native handling of its own, and that is chrome inside the tree every run
        commits into. Cost: reaching the actions after a mount means scrolling
        back to the top.
      */}
      <ScrollView style={screenStyles.scroll} contentContainerStyle={styles.container}>
        <View style={styles.controls}>
          {/* No cover: the other two pages open with a blurb about what they
              hold, and this one's first line is the build warning, which no
              amount of prose above it should push down the page.

              Debug numbers are not comparable to anything, so say so before the
              first press rather than in a doc nobody reads mid-run. Set as the
              banner shape the Use Cases page uses for the same job (a tinted
              wash with the pigment as a left rule) rather than as a pill,
              because this is a note about the whole page.

              Two PlainTexts in a row rather than one string with a bold span in
              it: PlainText is one style per node by design, which is the point of
              the library. They are set to wrap, so on a narrow phone the note
              drops below the tag instead of being clipped. */}
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
            {/*
              The full component name, never the chips' abbreviation, and no
              instance count, which is fixed and already named on the mount
              button. Frozen at mount time rather than following the live
              selection, so it never relabels results measured against something
              else. Until the first mount it shows what the next one will run.

              Set in the mono face the page uses for every recorded value: it is
              a record to be read character by character and quoted, not prose.
            */}
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
              title={`Mount ${COUNT} Instances`}
              scenario="mount"
              stats={stats}
              running={running}
              settleMs={settleDelayMs}
              disabled={settling || mounted != null}
              onPress={() => runMount(variant)}
            />
            <Action
              title="No-op Update"
              testID={`no-op-update-${rerenders}`}
              scenario="parent"
              stats={stats}
              running={running}
              settleMs={settleDelayMs}
              disabled={settling || mounted == null}
              onPress={runParentRerender}
            />
            <Action
              title="Color Update"
              scenario="color"
              stats={stats}
              running={running}
              settleMs={settleDelayMs}
              disabled={settling || mounted == null}
              onPress={runColorChange}
            />
            <Action
              title="Layout Update"
              scenario="layout"
              stats={stats}
              running={running}
              settleMs={settleDelayMs}
              disabled={settling || mounted == null}
              onPress={runLayoutChange}
            />
            <Action
              title="Unmount All Instances"
              scenario="unmount"
              stats={stats}
              running={running}
              settleMs={settleDelayMs}
              disabled={settling || mounted == null}
              onPress={runUnmount}
            />
          </Section>
        </View>

        {/* The items are physically mounted, last, inside the same content
            container as the controls above. */}
        {mounted != null && renderItems(mounted, applied)}
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

function renderItems(kind: Kind, applied: Applied) {
  const { textStyle, viewStyle, props, text } = applied;
  const extra = props as object;

  if (kind === 'nativePlain') {
    // Same rendered result as the PlainText branch, but with props already in
    // native shape: no StyleSheet.flatten, no rest destructure, and only the
    // props actually set. The delta is the JS wrapper's cost. Every key in
    // textStyle is also a native prop name, so it spreads straight through.
    return Array.from({ length: COUNT }, (_, n) => (
      <NativePlainText
        key={n}
        text={text(n)}
        style={[styles.listItem, viewStyle]}
        {...(textStyle as object)}
        {...extra}
      />
    ));
  }

  const style = [styles.listItem, textStyle, viewStyle];
  // What RN's own components accept, which is the same array minus the one key
  // they have no entry for. Dropped rather than translated: there is nothing to
  // translate it to.
  const rnStyle = style as StyleProp<TextStyle>;

  if (kind === 'plain') {
    return Array.from({ length: COUNT }, (_, n) => (
      <PlainText key={n} style={style} {...extra}>
        {text(n)}
      </PlainText>
    ));
  }

  if (kind === 'text') {
    return Array.from({ length: COUNT }, (_, n) => (
      <Text key={n} style={rnStyle} {...extra}>
        {text(n)}
      </Text>
    ));
  }

  return Array.from({ length: COUNT }, (_, n) => (
    // Bare RCTText host component, bypassing the <Text> JS wrapper.
    <NativeText key={n} style={rnStyle} {...extra}>
      {text(n)}
    </NativeText>
  ));
}

// Zero-based and padded to three digits, so every label is the same character
// count (000 through 999) and the grey boxes are uniform in size. An unpadded
// counter makes the box width jump at 10, 100 and 1000, which reads as a layout
// bug and makes the measured-area comparison harder than it needs to be.
const SHORT_TEXT = (n: number) => `Text Item ${pad(n)}`;
const WRAPPING_TEXT = (n: number) =>
  `Text Item ${pad(n)}: a longer string that has to wrap onto more than one line on a phone.`;
// No index: every row renders the identical string, so this prices content
// that never changes across the list rather than a per-row computed one.
const STATIC_TEXT = () => 'ListItem Static';
// A BMP symbol most text fonts don't cover, so it still forces fallback, but
// (unlike an emoji) resolves to a scalar/vector glyph rather than color
// bitmap data. Separates "fallback font resolution" from "color glyph data"
// as the cause of any memory delta the emoji row shows.
const SYMBOL_TEXT = (n: number) => `${SHORT_TEXT(n)} ★`;
// A different emoji per row (cycled, not random, so runs are reproducible), to
// price color glyph data across many distinct glyphs rather than one repeated
// one. If that data is a shared, deduplicated cache keyed on the glyph, this
// should cost about the same per view as a single repeated emoji; if it
// costs more, that data isn't being shared across views.
const EMOJIS = ['🎉', '🦊', '🐇', '🐶', '🚀', '🌈', '🍕', '⚽️', '🎈', '🐝'];
const EMOJI_TEXT = (n: number) => `${SHORT_TEXT(n)} ${EMOJIS[n % EMOJIS.length]}`;

const pad = (n: number) => String(n).padStart(3, '0');

// ---------------------------------------------------------------------------
// Tunable props
//
// Named Attr* throughout rather than Prop*, so nothing in here reads as the
// screen's own React props (see `type Props` above).
// ---------------------------------------------------------------------------

// Where a chosen value goes. `text` values are text-style props (native props
// on NativePlainText, style entries everywhere else), `view` values are view
// styles Yoga lays out around the self-measured text, `prop` values are
// component props, `content` picks the string.
// 'settle' isn't rendered onto anything. It's read separately, see
// settleMsFor below.
type Target = 'text' | 'view' | 'prop' | 'content' | 'settle';

type AttrOption = {
  label: string;
  // undefined means "not set": the attribute is left off entirely.
  value?: unknown;
};

type AttrDef = {
  // Doubles as the style entry / prop name the chosen value is written to, so
  // every row but `content` needs nothing else to be applied.
  key: string;
  // Only where the row is not named after a real prop. Otherwise the key is the
  // label.
  label?: string;
  section: string;
  // Fingerprint prefix, e.g. 'fs' + '20'.
  fp: string;
  target: Target;
  options: AttrOption[];
  // Which option counts as the default. Omitted means the first one, which is
  // what every row with an 'off' state uses. Rows whose options read naturally
  // in another order (fontSize, largest first) set it explicitly.
  defaultIndex?: number;
  // Always name this row in the fingerprint, even at its default value. For a
  // row with no unset state, "absent from the line" and "left at the default"
  // look identical, and the value is too load-bearing to leave implied.
  alwaysInFingerprint?: boolean;
};

// Deliberately not every prop the library supports: these are the ones that
// plausibly cost something (an extra native attribute to set, or a re-measure
// to force). No sliders and no free text, because a discrete value is what makes
// two runs comparable and quotable, and it keeps the persisted shape trivial.
//
// Every row starts with `(none)`, which leaves the attribute unset, and then
// lists the real values explicitly, including the ones that equal the platform
// default (`fontStyle normal`, `textDecorationLine none`, `allowFontScaling
// true`). That distinction is the point: unset means the prop never reaches the
// native view, while an explicit default-valued prop still costs a diff, a
// bridge entry and, on Android, sometimes a span. Pricing that gap is a thing
// the harness should be able to do.
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
      // The bundled variable face. Also the only family the fontVariationSettings
      // row below can move, so the two are meant to be set together: an axis on a
      // system font costs the same work and shows nothing.
      { label: 'OpenSans', value: VARIABLE },
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
    // Only moves glyphs when fontFamily is OpenSans, but it costs its work on any
    // family: both platforms derive a font from the string before the fvar table
    // gets a say. So (none) -> one axis is the price of the prop, and pairing it
    // with OpenSans is what makes the re-measure real as well as priced.
    key: 'fontVariationSettings',
    section: 'Text',
    fp: 'fvs',
    target: 'text',
    options: [
      { label: '(none)' },
      // One axis at both ends of its range: same parse and same derivation either
      // way, but the heavier instance measures wider, so a run that re-measures
      // shows it in the layout and not only in the timings.
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
    // Keyed on the native prop name rather than the `verticalAlign` alias, so
    // the nativePlain variant can still spread it straight through. Costs its
    // work on any row, but only moves glyphs where the box is taller than the
    // text, so pair it with the Layout `height` row to see it as well as price
    // it.
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
    key: 'color',
    label: 'text color',
    section: 'Layout',
    fp: 'c',
    target: 'text',
    // Same grey/color, same two alphas as backgroundColor below, so the two
    // rows can be paired to price compositing a translucent text color over a
    // translucent background rather than just a flat one.
    options: [
      { label: '(none)' },
      { label: '50% grey', value: `${COLOR.faint}80` },
      { label: '100% grey', value: COLOR.faint },
      { label: '50% color', value: `${COLOR.indigo}80` },
      { label: '100% color', value: COLOR.indigo },
    ],
  },
  {
    key: 'backgroundColor',
    label: 'background',
    section: 'Layout',
    fp: 'bg',
    target: 'view',
    // Grey is the page's own neutral (COLOR.faint); color is the indigo accent
    // the rest of the sheet already uses. Alpha as an 8-digit hex suffix (80 =
    // 50%) rather than an rgba() string, so the value is one flat color prop
    // either way, not a format switch between options.
    options: [
      { label: '(none)' },
      { label: '50% grey', value: `${COLOR.faint}80` },
      { label: '100% grey', value: COLOR.faint },
      { label: '50% color', value: `${COLOR.indigo}80` },
      { label: '100% color', value: COLOR.indigo },
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
    // The library's internal `experiment` prop (src/PlainTextViewNativeComponent.ts):
    // one generic on/off switch for whatever the perf suite is currently A/B
    // testing. `(none)`/`false` is baseline, and `true` is the experiment.
    // Meaning is platform- and experiment-specific, and currently unread on
    // both: the shared-vs-fresh measuring view it once gated is settled
    // (shared won) and no longer conditional. See docs/agent/sync-points.md.
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
    // How long a run waits before sampling memory. See DEFAULT_SETTLE_MS.
    // Always in the fingerprint, since it changes whether a recorded memory
    // number is trustworthy.
    key: 'settleMs',
    label: 'Settle Time',
    section: 'Params',
    fp: 'settle',
    target: 'settle',
    options: [
      { label: '3s', value: 3_000 },
      { label: '5s', value: 5_000 },
      { label: '8s', value: 8_000 },
      { label: '10s', value: 10_000 },
      { label: '15s', value: 15_000 },
    ],
    alwaysInFingerprint: true,
  },
];

// Derived, so adding an attribute above is the only edit: a hardcoded list is one
// more place to forget, and forgetting means the new row renders nowhere.
// Insertion-ordered, so the sheet's section order is ATTRIBUTES' own order.
const SECTIONS = [...new Set(ATTRIBUTES.map((attr) => attr.section))];

// Option index per attribute key. Anything missing falls back to the
// attribute's default, so a config persisted before an attribute existed still
// loads.
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

const SETTLE_ATTR = ATTRIBUTES.find((attr) => attr.key === 'settleMs');

function settleMsFor(config: AttrConfig): number {
  if (SETTLE_ATTR == null) return DEFAULT_SETTLE_MS;
  return selectedOption(config, SETTLE_ATTR).value as number;
}

// What the header badge counts. Rows that always name themselves in the
// fingerprint are excluded: they are visible on the line whatever their value,
// so counting them too would double-report them.
function countChangedProps(config: AttrConfig) {
  return ATTRIBUTES.filter(
    (attr) => !attr.alwaysInFingerprint && selectedIndex(config, attr) !== defaultIndex(attr)
  ).length;
}

// What deviates from the default, plus the rows that always name themselves. A
// row left at an unset default contributes nothing, so the line stays a record
// of what this run changed rather than a dump of every row.
function formatFingerprint(config: AttrConfig) {
  return ATTRIBUTES.filter(
    (attr) => attr.alwaysInFingerprint || selectedIndex(config, attr) !== defaultIndex(attr)
  )
    .map((attr) => `${attr.fp}:${selectedOption(config, attr).label}`)
    .join(' · ');
}

type TextBuilder = (n: number) => string;

type Applied = {
  // PlainTextStyle, not TextStyle: the fontVariationSettings row writes a key RN
  // has no style entry for. The two <Text> branches below cast it away again,
  // which is exactly the gap the row is there to price.
  textStyle: PlainTextStyle;
  viewStyle: ViewStyle;
  // numberOfLines, ellipsizeMode, allowFontScaling, maxFontSizeMultiplier:
  // whichever of them are set. Kept as a bag rather than named fields so adding
  // a row to ATTRIBUTES is the only edit needed, and so a prop that is `(none)`
  // is genuinely absent from the element rather than passed as undefined.
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
    else if (attr.target === 'settle')
      continue; // read separately, see settleMsFor
    else text = option.value as TextBuilder;
  }

  // A border with no color draws nothing on either platform. Indigo, the same
  // accent the Features page draws its border rows in.
  if (viewStyle.borderWidth != null) viewStyle.borderColor = COLOR.indigo;

  // The two update scenarios, applied last so they win over the config. Color
  // only overrides once the scenario has actually toggled it away from index
  // 0: at rest, the config's own `color` row (or the native default) should
  // reach the text unstomped.
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
          {/* The screens' own section furniture (tracked caps and a rule out to
              the margin) so the sheet reads as a page of the same book rather
              than as a settings dialog bolted to it. */}
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

// One action and the result it produced, as a unit. Grouping them means the
// result cannot drift away from its own button when a sibling's result appears
// or changes height.
function Action({
  title,
  testID,
  scenario,
  stats,
  running,
  settleMs,
  disabled,
  onPress,
}: {
  title: string;
  // Not user-visible, just a real prop for a real diff. See runParentRerender.
  testID?: string;
  scenario: Scenario;
  stats: Partial<Record<Scenario, RunStats>>;
  running: Scenario | null;
  settleMs: number;
  disabled?: boolean;
  onPress: () => void;
}) {
  const result = stats[scenario];
  return (
    <View style={styles.action}>
      {/*
        Not RN's <Button>: it renders differently per platform (a bare text link
        on iOS, a filled surface with its own grey disabled state and elevation
        on Android), and its internal label padding is not adjustable, which the
        card layout has to reason about. A Pressable is the same box everywhere.
      */}
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
      {running === scenario ? (
        <PlainText style={[styles.readout, styles.settling]}>
          {`Settling ${settleMs / 1000}s…`}
        </PlainText>
      ) : result != null ? (
        <StatsBlock stats={result} />
      ) : null}
    </View>
  );
}

// One readout for every scenario: same lines, same order, same units, so a
// mount number and a re-render number can be read against each other without
// re-learning the format.
function StatsBlock({ stats }: { stats: RunStats }) {
  const { deltaBytes, retainedBytes, memBefore, memAfter } = stats;
  // No scenario label: the block sits under the button that produced it.
  const lines = [
    formatTiming(stats),
    `${formatSignedBytes(deltaBytes)} · ${formatSignedBytes(deltaBytes / COUNT)}/view`,
    `${formatBytes(memBefore)} → ${formatBytes(memAfter)}` +
      (retainedBytes == null ? '' : ` · ${formatSignedBytes(retainedBytes)} retained`),
  ];
  return <PlainText style={[styles.readout, styles.stats]}>{lines.join('\n')}</PlainText>;
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
  return `${interaction} interaction · ${commitMs.toFixed(0)} ms commit`;
}

// Signed, because half these numbers are supposed to be negative (an unmount
// that released) or zero (an update that allocated nothing), and an unsigned
// delta hides both.
function formatSignedBytes(bytes: number) {
  return `${bytes >= 0 ? '+' : '−'}${formatBytes(Math.abs(bytes))}`;
}

function formatBytes(bytes: number) {
  if (Math.abs(bytes) >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

const styles = StyleSheet.create({
  // `screenStyles.container` with its `gap` dropped and `alignItems` set: the
  // gap between sections is 40pt there, and this content container also holds
  // the 1000 items, which would each take that gap in place of their own
  // margin. Everything else (the margins, the top and bottom padding) is the
  // same page as the other two screens, so the control block above the items
  // sits on the same measure as a specimen row.
  container: {
    flexGrow: 1,
    // Keeps the items shrink-wrapped to their own measured width, on the left
    // margin with the rest of the page, rather than stretched to the container.
    alignItems: 'flex-start',
    paddingTop: 28,
    paddingHorizontal: 18,
    paddingBottom: 48,
  },
  // Carries the 40pt section gap the page style would have given it, so the
  // items below are free to space themselves. Opaque, and closed with the same
  // hairline the section rules use: below it the page stops being prose and
  // becomes 1000 specimens.
  controls: {
    alignSelf: 'stretch',
    backgroundColor: COLOR.paper,
    gap: 40,
    paddingBottom: 28,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLOR.line,
  },
  // No card. The action's own 6pt against the section's row gap is what binds a
  // result to the button that produced it (the same ratio the specimen rows
  // use to bind a caption to its specimen), and the readout carries a wash of
  // its own, so the pairing survives without a box drawn around it.
  action: {
    alignSelf: 'stretch',
    gap: 6,
  },
  // Tinted rather than filled: five of these stacked in solid indigo drowned out
  // the numbers, which are the thing being read.
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
  // The error-banner shape from the Use Cases page: wash, the pigment as a left
  // rule, and text in the same pigment rather than in ink.
  // Now the box only, with the type in the two children: the tag and the note are
  // separate nodes, so size, weight and colour move down to them.
  build: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    // What the two spaces between the tag and the note used to be.
    columnGap: 7,
    overflow: 'hidden',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderLeftWidth: 4,
    borderRadius: 6,
    // The banner is a note on the page rather than a section of it, so it does
    // not take the page's top margin or a full 40pt section gap below it. The box
    // carries its own padding, which reads as space of its own on both sides.
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
  // The box under a button, whatever it currently holds: the same wash the
  // specimen rows put behind their type.
  readout: {
    fontSize: 12,
    lineHeight: 18,
    color: COLOR.inkSoft,
    // Centered under the button's own centered label, so the pair reads as one
    // block. The page is left-aligned everywhere else, but these lines are a
    // caption on the control above them rather than another row of prose.
    textAlign: 'center',
    backgroundColor: COLOR.wash,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    overflow: 'hidden',
  },
  // Tabular figures rather than a mono face: the readout is three short
  // sentences of units and arrows, not a code listing, and mono made a block of
  // it. Tabular is what the column of five actually needs: the digits still
  // line up run to run, in the page's own face.
  stats: {
    fontVariant: ['tabular-nums'],
  },
  // The waiting line is a sentence rather than a value, so it reads quiet and
  // italic like a caption instead.
  settling: {
    color: COLOR.muted,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  // marginTop rather than marginBottom, so the first item is also clear of the
  // control block above it. Margin is a view style: Yoga lays it out around the
  // self-measured text and it never reaches the text measurement itself.
  listItem: {
    marginTop: 10,
    // The ramp's rule grey: dark enough to read against the white page in the
    // 10pt gaps, where the wash the specimen rows use only has to hold an edge
    // rather than separate 1000 stacked items.
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
  // Unselected chips sit on the neutral ramp rather than in outlined indigo:
  // there are up to seven in a row, and seven blue outlines read as seven things
  // asking to be pressed. Only the chosen one takes the accent, filled, which is
  // also the one piece of state the row carries.
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
  // The sheet is its own screen, so its title takes the register the nav bar
  // titles take, a size down: this bar has two actions beside it.
  sheetTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLOR.ink,
  },
  // Same indigo as the header buttons on every screen, which is what these are.
  sheetAction: {
    fontSize: 16,
    color: COLOR.indigo,
  },
  // The page's margins, and the section gap the specimen pages use.
  sheetBody: {
    paddingVertical: 24,
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

import { createContext, useContext, useEffect, useRef, useState } from 'react';

import styles from './PerfBarChart.module.css';

type Platform = 'ios' | 'android';
type Series = 'baseline' | 'native' | 'plain';

type Metric = {
  label: string;
  unit: string;
  /** RN `<Text>`. */
  baseline: number;
  /** RN's private `NativeText` Fabric component. */
  native: number;
  /** `<PlainText>`. */
  plain: number;
};

const DATA: Record<Platform, { mount: Metric; memory: Metric }> = {
  ios: {
    mount: {
      label: 'Mount interaction time',
      unit: 'ms',
      baseline: 833,
      native: 803,
      plain: 519,
    },
    memory: { label: 'Memory per view', unit: 'KB', baseline: 74.5, native: 72.8, plain: 51.4 },
  },
  android: {
    mount: {
      label: 'Mount interaction time',
      unit: 'ms',
      baseline: 2737,
      native: 2539,
      plain: 1959,
    },
    memory: { label: 'Memory per view', unit: 'KB', baseline: 57.3, native: 52.9, plain: 34.2 },
  },
};

const SERIES: { key: Series; name: string; barClass: string; withPill: boolean }[] = [
  { key: 'baseline', name: 'RN Text', barClass: styles.barBaseline, withPill: false },
  { key: 'native', name: 'RN NativeText', barClass: styles.barNative, withPill: true },
  { key: 'plain', name: 'PlainText', barClass: styles.barPlain, withPill: true },
];

const PLATFORM_LABEL: Record<Platform, string> = {
  ios: 'iOS',
  android: 'Android',
};

const CAPTION: Record<Platform, string> = {
  ios: 'iPhone 16, release build, 5000 unique views, "Label" preset (% is vs RN Text)',
  android: 'Pixel 6, release build, 5000 unique views, "Label" preset (% is vs RN Text)',
};

/** Small headroom past the longest bar so its in-bar value label isn't flush with the edge. */
const SCALE_HEADROOM = 1.08;

/** Shared platform selection so the mount-time and memory charts stay in sync. */
const PlatformContext = createContext<{
  platform: Platform;
  setPlatform: (platform: Platform) => void;
} | null>(null);

export function PerfChartsProvider({ children }: { children: React.ReactNode }) {
  const [platform, setPlatform] = useState<Platform>('ios');
  return (
    <PlatformContext.Provider value={{ platform, setPlatform }}>
      {children}
    </PlatformContext.Provider>
  );
}

function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('Chart components must be rendered inside <PerfChartsProvider>.');
  return ctx;
}

/** Ease a number toward `target` with a short cubic tween; snaps if reduced motion. */
function useTweenedNumber(target: number, duration = 500): number {
  const [value, setValue] = useState(target);
  const displayRef = useRef(target);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      displayRef.current = target;
      setValue(target);
      return;
    }

    const from = displayRef.current;
    let raf = 0;
    let start = 0;

    const step = (now: number) => {
      if (!start) start = now;
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = from + (target - from) * eased;
      displayRef.current = next;
      setValue(next);
      if (p < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

function Lane({
  name,
  value,
  baseline,
  scaleMax,
  unit,
  barClass,
  withPill,
}: {
  name: string;
  value: number;
  baseline: number;
  scaleMax: number;
  unit: string;
  barClass: string;
  withPill: boolean;
}) {
  const tweenedValue = useTweenedNumber(value);
  const fasterPct = ((baseline - value) / baseline) * 100;
  const tweenedFaster = useTweenedNumber(Math.max(0, fasterPct));

  const pct = (value / scaleMax) * 100;
  const comparative = unit === 'ms' ? 'faster' : 'smaller';
  const pill = fasterPct < 0.5 ? '≈ RN Text' : `${Math.round(tweenedFaster)}% ${comparative}`;
  const displayValue = Number.isInteger(value) ? Math.round(tweenedValue) : tweenedValue.toFixed(1);

  return (
    <div className={styles.lane}>
      <span className={styles.laneName}>{name}</span>
      <div className={styles.barTrack}>
        <div className={`${styles.bar} ${barClass}`} style={{ width: `${pct}%` }}>
          <span className={styles.barValue}>
            {displayValue} {unit}
          </span>
        </div>
      </div>
      <span className={styles.pill}>{withPill ? pill : ''}</span>
    </div>
  );
}

function MetricRow({ metric }: { metric: Metric }) {
  const scaleMax = Math.max(metric.baseline, metric.native, metric.plain) * SCALE_HEADROOM;

  return (
    <div className={styles.row}>
      <div className={styles.plot}>
        {SERIES.map((s) => (
          <Lane
            key={s.key}
            name={s.name}
            value={metric[s.key]}
            baseline={metric.baseline}
            scaleMax={scaleMax}
            unit={metric.unit}
            barClass={s.barClass}
            withPill={s.withPill}
          />
        ))}
      </div>
    </div>
  );
}

function PlatformToggle() {
  const { platform, setPlatform } = usePlatform();
  return (
    <div className={styles.toggle} role="group" aria-label="Platform">
      {(['ios', 'android'] as Platform[]).map((p) => (
        <button
          key={p}
          type="button"
          className={`${styles.toggleButton} ${platform === p ? styles.toggleButtonActive : ''}`}
          aria-pressed={platform === p}
          onClick={() => setPlatform(p)}
        >
          {PLATFORM_LABEL[p]}
        </button>
      ))}
    </div>
  );
}

function Chart({ metric }: { metric: Metric }) {
  const { platform } = usePlatform();

  return (
    <div className={styles.chart}>
      <PlatformToggle />
      <MetricRow metric={metric} />
      <p className={styles.caption}>{CAPTION[platform]}</p>
    </div>
  );
}

export function MountTimeChart() {
  const { platform } = usePlatform();
  return <Chart metric={DATA[platform].mount} />;
}

export function MemoryUsageChart() {
  const { platform } = usePlatform();
  return <Chart metric={DATA[platform].memory} />;
}

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { PlainText, type PlainTextProps } from 'react-native-plain-text';
// TEMPORARY: Nitro Views port of PlainText (nitro/), see nitro/README.md.
import { NitroPlainText, type NitroPlainTextProps } from 'react-native-plain-text-nitro';
import { useSessionState } from '../useSessionState';

// Which native implementation the Features and Examples specimens render with.
// App-wide (above the tab navigator) and session-persisted, like the screens'
// other header toggles, so it survives switching tabs and app kills.
//
// Only specimens read this (TextItem, and the sections rendering PlainText
// directly); screen chrome stays on Fabric PlainText. The Performance screen
// ignores it on purpose: each of its variant chips names its implementation
// explicitly, so a run's label always matches what was mounted.
export type TextImplementation = 'fabric' | 'nitro';

const TextImplementationContext = createContext<
  { implementation: TextImplementation; toggle: () => void } | undefined
>(undefined);

export function TextImplementationProvider({ children }: { children: ReactNode }) {
  const [implementation, setImplementation] = useSessionState<TextImplementation>(
    'text-implementation',
    'fabric'
  );
  const toggle = useCallback(
    () => setImplementation(implementation === 'fabric' ? 'nitro' : 'fabric'),
    [implementation, setImplementation]
  );
  const value = useMemo(() => ({ implementation, toggle }), [implementation, toggle]);

  return (
    <TextImplementationContext.Provider value={value}>
      {children}
    </TextImplementationContext.Provider>
  );
}

export function useTextImplementation() {
  const context = useContext(TextImplementationContext);
  if (context == null) {
    throw new Error('useTextImplementation must be used inside a TextImplementationProvider');
  }
  return context;
}

/**
 * A specimen: PlainText's props, rendered by whichever implementation is
 * selected. Props the Nitro port doesn't support (see nitro/README.md) are
 * silently ignored on the Nitro side, which is part of what the toggle shows.
 */
export function SpecimenText(props: PlainTextProps) {
  const { implementation } = useTextImplementation();
  if (implementation === 'nitro') {
    // Type-only cast: PlainTextProps is a superset (PlainTextStyle's
    // fontVariationSettings, lineBreakStrategyIOS, ...); the extras reach the
    // Nitro host component and are dropped there.
    return <NitroPlainText {...(props as NitroPlainTextProps)} />;
  }
  return <PlainText {...props} />;
}

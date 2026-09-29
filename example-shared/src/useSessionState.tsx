import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

// Like useState, but the value survives an app kill for the rest of the session.
// The value can be anything JSON-serializable.
//
// The Performance screen is why this exists: its run procedure says to kill the
// app between runs, so a config that reset on launch could never be held constant
// across the runs being compared.

// Where values are kept. Each app brings its own through SessionStorageProvider
// (the Expo app uses MMKV, whose instances fit this shape as they are). Without
// one, values live in memory: they survive a remount but not an app kill.
export type SessionStorage = {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
};

const memoryStorage: SessionStorage = (() => {
  const values = new Map<string, string>();
  return {
    getString: (key) => values.get(key),
    set: (key, value) => {
      values.set(key, value);
    },
  };
})();

const SessionStorageContext = createContext<SessionStorage>(memoryStorage);

export function SessionStorageProvider({
  storage,
  children,
}: {
  storage: SessionStorage;
  children: ReactNode;
}) {
  return (
    <SessionStorageContext.Provider value={storage}>{children}</SessionStorageContext.Provider>
  );
}

// A session ends after this much time without a save. Restoring what the user was
// doing helps right after an app kill, but a value from an old session is noise,
// so it is dropped and the caller's default wins instead. Which is what the
// timestamp is for: the storage itself has no expiry.
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

type Envelope<T> = { value: T; savedAt: number };

function load<T>(storage: SessionStorage, key: string): T | undefined {
  const stored = storage.getString(key);
  if (stored === undefined) {
    return undefined;
  }

  try {
    const envelope = JSON.parse(stored) as Envelope<T>;
    return Date.now() - envelope.savedAt > SESSION_TIMEOUT_MS ? undefined : envelope.value;
  } catch {
    return undefined;
  }
}

export function useSessionState<T>(key: string, defaultValue: T) {
  const storage = useContext(SessionStorageContext);
  const [state, setState] = useState<T>(() => load<T>(storage, key) ?? defaultValue);

  const setSessionState = useCallback(
    (value: T) => {
      setState(value);
      const envelope: Envelope<T> = { value, savedAt: Date.now() };
      storage.set(key, JSON.stringify(envelope));
    },
    [storage, key]
  );

  return [state, setSessionState] as const;
}

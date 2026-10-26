import { useCallback, useState } from 'react';
import { createMMKV } from 'react-native-mmkv';

// Like useState, but the value survives an app kill for the rest of the session.
// The value can be anything JSON-serializable.
//
// The Performance screen is why this exists: its run procedure says to kill the
// app between runs, so a config that reset on launch could never be held constant
// across the runs being compared.

const storage = createMMKV({ id: 'persisted-state' });

// A session ends after this much time without a save. Restoring what the user was
// doing helps right after an app kill, but a value from an old session is noise,
// so it is dropped and the caller's default wins instead. Which is what the
// timestamp is for: MMKV itself has no expiry.
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

type Envelope<T> = { value: T; savedAt: number };

function load<T>(key: string): T | undefined {
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
  const [state, setState] = useState<T>(() => load<T>(key) ?? defaultValue);

  const setSessionState = useCallback(
    (value: T) => {
      setState(value);
      const envelope: Envelope<T> = { value, savedAt: Date.now() };
      storage.set(key, JSON.stringify(envelope));
    },
    [key]
  );

  return [state, setSessionState] as const;
}

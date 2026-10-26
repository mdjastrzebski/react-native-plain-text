import { useEffect, useState } from 'react';
import { Linking } from 'react-native';

function testIDFromURL(url: string | null | undefined): string | null {
  const encodedTestID = url?.match(/[?&]testID=([^&#]+)/)?.[1];
  if (encodedTestID == null) return null;

  try {
    return decodeURIComponent(encodedTestID.replace(/\+/g, ' '));
  } catch {
    return null;
  }
}

export function useVrtDeepLink(): string | null | undefined {
  const [testID, setTestID] = useState<string | null>();

  useEffect(() => {
    let active = true;
    let receivedURL = false;

    const applyURL = (url: string | null | undefined) => {
      setTestID(testIDFromURL(url));
    };
    const subscription = Linking.addEventListener('url', ({ url }) => {
      receivedURL = true;
      applyURL(url);
    });

    Linking.getInitialURL().then(
      (url) => {
        if (active && !receivedURL) applyURL(url);
      },
      () => {
        if (active && !receivedURL) applyURL(null);
      }
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return testID;
}

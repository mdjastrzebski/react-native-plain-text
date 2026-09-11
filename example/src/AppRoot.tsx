import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import App from './App';
import AppVrt from './AppVrt';

function testIDFromURL(url: string | null | undefined): string | null {
  const encodedTestID = url?.match(/[?&]testID=([^&#]+)/)?.[1];
  if (encodedTestID == null) {
    return null;
  }

  try {
    return decodeURIComponent(encodedTestID.replace(/\+/g, ' '));
  } catch {
    return null;
  }
}

export default function AppRoot() {
  const [initialURLResolved, setInitialURLResolved] = useState(false);
  const [testID, setTestID] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let receivedURL = false;

    const applyURL = (url: string | null | undefined) => {
      setTestID(testIDFromURL(url));
      setInitialURLResolved(true);
    };
    const subscription = Linking.addEventListener('url', ({ url }) => {
      receivedURL = true;
      applyURL(url);
    });

    Linking.getInitialURL().then(
      (url) => {
        if (active && !receivedURL) {
          applyURL(url);
        }
      },
      () => {
        if (active && !receivedURL) {
          applyURL(null);
        }
      }
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  if (!initialURLResolved) {
    return null;
  }

  return testID == null ? <App /> : <AppVrt testID={testID} />;
}

'use client';

import { Wifi, WifiOff, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type ConnectionState = 'offline' | 'online' | null;
type ConnectionStatusPlacement = 'desktop' | 'mobile';

const RECONNECTED_MESSAGE_DURATION_MS = 4_000;
const OFFLINE_MESSAGE_DISMISSED_KEY =
  'open-personal-tracking.offline-message-dismissed';

/** Announces browser connectivity without changing local archive behavior. */
export const ConnectionStatus = ({
  placement,
}: {
  placement: ConnectionStatusPlacement;
}) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(null);
  const [isOfflineMessageDismissed, setIsOfflineMessageDismissed] =
    useState(false);

  useEffect(() => {
    let clearReconnectedMessage: number | undefined;

    const showOffline = () => {
      if (clearReconnectedMessage) {
        window.clearTimeout(clearReconnectedMessage);
      }
      setIsOfflineMessageDismissed(
        window.sessionStorage.getItem(OFFLINE_MESSAGE_DISMISSED_KEY) === 'true',
      );
      setConnectionState('offline');
    };
    const showOnline = () => {
      window.sessionStorage.removeItem(OFFLINE_MESSAGE_DISMISSED_KEY);
      setIsOfflineMessageDismissed(false);
      setConnectionState('online');
      clearReconnectedMessage = window.setTimeout(
        () => setConnectionState(null),
        RECONNECTED_MESSAGE_DURATION_MS,
      );
    };

    if (!navigator.onLine) showOffline();
    window.addEventListener('offline', showOffline);
    window.addEventListener('online', showOnline);

    return () => {
      if (clearReconnectedMessage) {
        window.clearTimeout(clearReconnectedMessage);
      }
      window.removeEventListener('offline', showOffline);
      window.removeEventListener('online', showOnline);
    };
  }, []);

  const dismissOfflineMessage = () => {
    window.sessionStorage.setItem(OFFLINE_MESSAGE_DISMISSED_KEY, 'true');
    setIsOfflineMessageDismissed(true);
  };

  const showOfflineMessage = () => {
    window.sessionStorage.removeItem(OFFLINE_MESSAGE_DISMISSED_KEY);
    setIsOfflineMessageDismissed(false);
  };

  if (!connectionState) return null;

  const isOffline = connectionState === 'offline';

  if (isOffline && isOfflineMessageDismissed) {
    return (
      <div
        className={`connection-status connection-status--${placement} connection-status--compact`}
      >
        <button
          type="button"
          onClick={showOfflineMessage}
          aria-label="Show offline details"
        >
          <WifiOff aria-hidden="true" />
          <span>Offline · working locally</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`connection-status connection-status--${placement} connection-status--expanded ${isOffline ? 'is-offline' : 'is-online'}`}
      role="status"
      aria-live="polite"
    >
      {isOffline ? <WifiOff aria-hidden="true" /> : <Wifi aria-hidden="true" />}
      <div>
        <strong>{isOffline ? "You're offline" : "You're back online"}</strong>
        <span>
          {isOffline
            ? 'Your library, changes, backups, and restores stay available on this device.'
            : 'Your local library was not changed.'}
        </span>
      </div>
      {isOffline && (
        <button
          className="connection-status-dismiss"
          type="button"
          onClick={dismissOfflineMessage}
          aria-label="Dismiss offline message"
        >
          <X aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

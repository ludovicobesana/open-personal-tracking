'use client';

import { Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

type ConnectionState = 'offline' | 'online' | null;

const RECONNECTED_MESSAGE_DURATION_MS = 4_000;

/** Announces browser connectivity without changing local archive behavior. */
export const ConnectionStatus = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(null);

  useEffect(() => {
    let clearReconnectedMessage: number | undefined;

    const showOffline = () => {
      if (clearReconnectedMessage) {
        window.clearTimeout(clearReconnectedMessage);
      }
      setConnectionState('offline');
    };
    const showOnline = () => {
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

  if (!connectionState) return null;

  const isOffline = connectionState === 'offline';

  return (
    <div
      className={`connection-status ${isOffline ? 'is-offline' : 'is-online'}`}
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
    </div>
  );
};

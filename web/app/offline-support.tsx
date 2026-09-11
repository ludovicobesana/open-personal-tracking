'use client';

import { useEffect } from 'react';

const SERVICE_WORKER_URL = '/service-worker.js';

const getRequiredAssetUrls = (): string[] => {
  const urls = new Set([window.location.href, '/app-shell']);
  const assets = document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>(
    'script[src], link[rel="stylesheet"][href]',
  );

  for (const asset of Array.from(assets)) {
    const assetUrl =
      asset instanceof HTMLScriptElement ? asset.src : asset.href;
    const url = new URL(assetUrl, window.location.href);
    if (url.origin === window.location.origin) {
      urls.add(url.href);
    }
  }

  for (const resource of performance.getEntriesByType('resource')) {
    const url = new URL(resource.name, window.location.href);
    if (url.origin === window.location.origin) {
      urls.add(url.href);
    }
  }

  return Array.from(urls);
};

const cacheAppShellAssets = (
  worker: ServiceWorker,
  urls: string[],
): Promise<void> =>
  new Promise((resolve) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(resolve, 5_000);
    channel.port1.onmessage = () => {
      window.clearTimeout(timeout);
      resolve();
    };
    worker.postMessage({ type: 'CACHE_APP_SHELL_ASSETS', urls }, [
      channel.port2,
    ]);
  });

/** Registers offline delivery only for production builds of the web app. */
export const OfflineSupport = () => {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' ||
      !('serviceWorker' in navigator)
    ) {
      return;
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register(SERVICE_WORKER_URL);
        const registration = await navigator.serviceWorker.ready;
        if (registration.active) {
          await cacheAppShellAssets(
            registration.active,
            getRequiredAssetUrls(),
          );
        }
      } catch {
        // Offline delivery is progressive enhancement; normal online use stays available.
      }
    };

    void register();
  }, []);

  return null;
};

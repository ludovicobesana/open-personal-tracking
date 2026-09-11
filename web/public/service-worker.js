const CACHE_PREFIX = 'open-personal-tracking-shell-';
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const APP_SHELL_URLS = ['/', '/app-shell'];

const isCacheableResponse = (response) =>
  response.ok && response.type === 'basic';

const cacheResponse = async (request, response) => {
  if (!isCacheableResponse(response)) return response;

  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  return response;
};

const fetchAndCache = async (request) =>
  cacheResponse(request, await fetch(request));

const cacheUrls = async (urls) => {
  await Promise.all(
    urls.map(async (url) => {
      try {
        await fetchAndCache(new Request(url, { credentials: 'same-origin' }));
      } catch {
        // A missing optional asset must not prevent offline support installation.
      }
    }),
  );
};

const handleNavigation = async (request) => {
  try {
    return await fetchAndCache(request);
  } catch {
    return (
      (await caches.match(request)) ??
      (await caches.match('/app-shell')) ??
      new Response('The app is not available offline yet.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    );
  }
};

const handleStaticAsset = async (request) => {
  const cached = await caches.match(request);
  return cached ?? fetchAndCache(request);
};

self.addEventListener('install', (event) => {
  event.waitUntil(cacheUrls(APP_SHELL_URLS));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_APP_SHELL_ASSETS') return;

  const urls = Array.isArray(event.data.urls) ? event.data.urls : [];
  const sameOriginUrls = urls.filter((url) => {
    try {
      return new URL(url, self.location.origin).origin === self.location.origin;
    } catch {
      return false;
    }
  });
  event.waitUntil(
    cacheUrls(sameOriginUrls).then(() => {
      event.ports[0]?.postMessage({ type: 'APP_SHELL_ASSETS_CACHED' });
    }),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || request.cache === 'no-store') return;

  const url = new URL(request.url);
  if (
    url.origin !== self.location.origin ||
    url.pathname === '/service-worker.js'
  ) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (['script', 'style', 'font', 'image'].includes(request.destination)) {
    event.respondWith(handleStaticAsset(request));
  }
});

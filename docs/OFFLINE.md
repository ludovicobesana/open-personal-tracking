# Offline web delivery

## Scope

The production web app registers a service worker after the first successful
visit. It caches the app shell and same-origin scripts, styles, fonts, and
images required by the current page. Once cached, `/app-shell` can open without
a network connection.

The service worker is intentionally not enabled during local development. Run
a production build to verify offline behavior.

## Local data

The service worker never caches IndexedDB records, backup files, form input, or
any other user-owned archive data. The existing browser archive store remains
the only persistence implementation for items, history, preferences, and
collections.

After the app shell is available offline, local create, edit, search, export,
and restore operations continue to use that browser-local archive. They do not
need an account, a provider, telemetry, cloud sync, or a network request.

When the browser is offline, the app displays a dismissible status message. If
the message is dismissed, a compact reminder remains above the Local sync card
on desktop and can be opened again; it is cleared when connectivity returns.

## Limitations

- Offline delivery starts only after a successful online visit and service
  worker registration.
- New deployments are fetched on the next online navigation; offline users see
  their last cached app shell until they reconnect.
- Remote catalog, provider, and optional network functionality is not cached or
  made available offline.

## Verification

`npm run test:e2e` uses a production build and verifies that the app opens,
creates an item, searches, exports, clears local state, and restores a backup
while the browser context is offline.

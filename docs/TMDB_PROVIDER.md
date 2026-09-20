# TMDB provider adapter

`TmdbProvider` is an optional implementation of the provider contract from
[RFC 0004](rfcs/0004-provider-abstraction.md). It supports TMDB movie and TV
search, details, and remote image references. It has no React dependency and
is not registered or initialized by application startup.

## Configuration

The adapter receives a `TmdbProviderOptions` object from the infrastructure
composition point. Its required `accessToken` is the TMDB API Read Access Token
sent as a Bearer authorization header. `language` and a positive
`timeoutMilliseconds` are optional. Tests inject `fetch`; production code uses
the platform `fetch` implementation.

No credential is read from the domain model, archive, backup, or exported data.
The project currently has no application-wide provider configuration mechanism,
so the adapter deliberately does not add one. A future web composition must
make an explicit product and deployment decision about where the optional TMDB
credential is configured before it wires this adapter into a UI.

TMDB documents application-level authentication and its API Read Access Token
in its [authentication documentation](https://developer.themoviedb.org/docs/authentication-application).
TMDB's current terms distinguish non-commercial use from use requiring a
separate commercial agreement. Maintainers must confirm the intended deployment
is licensed before enabling the adapter for end users.

## Mapping and integrity

- The provider id is `tmdb`.
- Movie references are `movie:<TMDB numeric id>`; TV references are
  `tv:<TMDB numeric id>`. This retains the media kind because TMDB numeric IDs
  alone do not express which detail endpoint must be used.
- `/search/multi` results are filtered to movies and TV series. They normalize
  to `Film`/`film` and `Series`/`series` respectively.
- Detail responses are schema-validated and accepted only when their numeric
  id matches the requested reference and their endpoint-implied media kind
  matches it.
- Unknown TMDB response fields are ignored. Raw payloads and TMDB transport
  types do not enter the application or domain layers.

TMDB results carry an attribution record. The consuming UI in Issue #78 must
present the required TMDB logo and notice in an appropriate About or Credits
surface before any TMDB-backed flow ships. TMDB currently requires the notice:
`This product uses TMDB and the TMDB APIs but is not endorsed, certified, or
otherwise approved by TMDB.` See TMDB's [FAQ](https://developer.themoviedb.org/docs/faq)
and [API Terms of Use](https://www.themoviedb.org/api-terms-of-use).

## Images

The adapter turns a valid TMDB poster or backdrop path into a remote HTTPS
reference using TMDB's documented `w500` image URL form. It neither downloads
nor caches the image. The reference has TMDB attribution and is not assigned to
an archive item's `imageUrl` by the generic mapping. A future UI must request
an explicit user choice before it loads a remote image.

TMDB documents its image URL components and configuration endpoint in its
[image basics](https://developer.themoviedb.org/docs/image-basics).

## Failure and timeout behavior

The adapter validates all consumed response fields with Zod. Malformed JSON,
missing required values, wrong types, and mismatched detail ids map to the
shared `malformed_response` failure. It maps HTTP 401/403 to `unauthorized`,
404 to `not_found`, 429 to `rate_limited` with a parsed `Retry-After` duration
when available, other 4xx responses to `invalid_request`, and transport or 5xx
failures to `unavailable`.

Every request receives a timeout controller and honours the caller's
`AbortSignal`. RFC 0004 does not define a separate cancellation outcome, so a
timeout or caller cancellation is represented by the existing retryable
`timeout` provider failure. No raw HTTP, JSON, or transport details cross the
adapter boundary.

## Cache policy

No TMDB metadata cache is implemented. The adapter reads and maps a response
only for the current optional request. This avoids introducing retention,
invalidation, schema-drift, and purge behavior into the adapter PR.

Any future cache must be local, disposable, separate from `ArchiveSnapshot`,
excluded from backup and restore, and purged when TMDB access ends. TMDB's API
Terms currently prohibit caching information for longer than six months and
require purging TMDB content after license termination. That work is tracked
separately from this adapter.

## Testing

`tests/tmdb-provider.test.ts` injects deterministic `fetch` responses. It
covers movie and TV search and details, attribution, images, missing images,
schema failures, mismatched identities and media kinds, unauthorized,
not-found, rate-limit, malformed JSON, unavailable transport, timeout,
cancellation, and local archive independence. It never calls TMDB or requires
a credential.

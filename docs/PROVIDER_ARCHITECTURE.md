# Provider architecture

## Purpose

Providers are optional sources of catalog metadata and discovery. They can help
someone find a title or prefill a local item, but they do not own the person's
tracking data. The archive remains usable when a provider is unavailable or
the device is offline.

## Boundary

```text
provider adapter → provider contract → application use case → local archive
```

- `src/providers/metadata-provider.ts` defines provider-neutral types and
  narrow capabilities.
- `src/application/provider-catalog.ts` looks up providers, returns normalized
  outcomes, and maps reviewed details into `CreateItemInput`.
- Future adapter code belongs behind the provider contract.
- React components call application use cases, never provider SDKs directly.
- `src/domain` and `ArchiveSnapshot` must not import provider SDK or response
  types.

## Adding a provider

1. Confirm the provider's current terms, attribution, licensing, rate-limit,
   authentication, and image rules.
2. Implement the supported capabilities behind `MetadataProvider`.
3. Normalize every external failure to `ProviderError`; do not expose SDK,
   transport, or HTTP details to application code.
4. Validate raw responses in the adapter, honour cancellation, and return
   details only for the requested provider reference.
5. Add minimized deterministic fixtures and contract tests. Do not require a
   real API key or network connection in ordinary tests.
6. Map provider data to `ProviderItemDetails`; retain only portable local item
   fields after the user creates or updates an item.
7. Add provider-specific documentation and UI only in the adapter's follow-up
   issue.

## Local data, metadata, and cache

```text
Archive = user-owned durable data
Provider cache = disposable external metadata cache
```

No cache is implemented by the provider abstraction. If a cache is introduced,
its eviction must not delete or corrupt local items. Raw provider responses are
not archive data and do not become a backup compatibility promise.

## Attribution and images

Adapters return attribution records with their results. The draft mapping keeps
them in provider-scoped local attributes, and a consuming UI must show the
attribution required by the provider's current terms. Image URLs remain remote
references only: the generic mapping does not put one in `imageUrl`, so a UI
must obtain an explicit user choice before loading it. Local image storage
needs a separate design.

## Failure behavior

Provider outcomes distinguish unavailable, timeout, unauthorized, rate-limited,
not-found, malformed-response, unsupported-operation, and invalid-request
cases. Rate-limited outcomes may include a retry-after duration. Search input
is bounded, supports an opaque cursor, and can be cancelled. Failure of an
optional provider must leave manual item creation, existing local data, export,
restore, and all offline workflows available.

See [RFC 0004](rfcs/0004-provider-abstraction.md) for the architecture decision
and [Issue #7](https://github.com/ludovicobesana/open-personal-tracking/issues/7)
for its implementation scope.

The concrete [TMDB provider adapter](TMDB_PROVIDER.md) documents its optional
transport configuration, attribution, image, timeout, and no-cache policy.

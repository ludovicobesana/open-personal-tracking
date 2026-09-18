# RFC: Provider abstraction for optional metadata enrichment

## Status

Draft

## Summary

Define a provider-neutral boundary for optional catalog metadata and discovery.
The boundary lets adapters for providers such as TMDB, Open Library, and
AniList supply normalized search and detail results without making an external
service part of the domain model, archive format, or normal local workflow.

## Context

People can enrich local items with titles, descriptions, release information,
creators, and image references from external catalogs. Those services have
different capabilities, licensing requirements, availability, credentials,
rate limits, and response formats. The Core product cannot depend on any one
of them continuing to exist.

## Goals

- Define a stable application and infrastructure boundary for metadata
  providers.
- Represent search, details, images, external identifiers, attribution, and
  unsupported operations without provider SDK types.
- Normalize provider failures before application code or UI receives them.
- Validate provider requests and responses at the application boundary before
  they can affect local item creation.
- Convert reviewed provider details into ordinary local item-creation input.
- Keep provider cache data disposable and separate from the archive.
- Make new adapters testable without live network access.

## Non-goals

- Implement a TMDB, Open Library, AniList, or other real adapter.
- Add provider calls to React components.
- Add an account, sync service, remote image store, or mandatory cache.
- Change `ArchiveSnapshot` or make raw provider responses part of a backup.
- Define provider-specific UI, recommendation, or discovery policy.

## Provider boundary

The intended dependency direction is:

```text
External provider
    ↓
provider adapter
    ↓
provider abstraction
    ↓
application service/use case
    ↓
local domain/archive
```

The following direction is prohibited:

```text
React UI
    ↓
TMDB/Open Library SDK
    ↓
ArchiveSnapshot
```

The provider contract lives in `src/providers/metadata-provider.ts`.
`src/application/provider-catalog.ts` coordinates optional providers and maps
their normalized results into local item input. Future adapters belong behind
this boundary and must not import their API response types into `src/domain` or
React components.

## Capabilities

A base provider declares a stable identity and explicit capabilities. Search,
details, and image support are separate capabilities because a provider may
offer one without another. Application code checks a capability before calling
the corresponding narrow interface, so an unsupported operation is a normal,
displayable outcome rather than a missing method or provider-specific error.

## Provider result model

The shared model has small common concepts:

- provider item reference and external identifiers
- title, category, optional type and description
- optional release date and creators
- remote image references
- attribution records
- primitive adapter attributes when a provider has additional useful metadata

The model does not claim that every provider supports every field. Adapters use
empty collections or omit optional values rather than inventing a universal
provider-specific media object.

Search input is bounded and can carry an opaque cursor and `AbortSignal`.
Responses have a bounded result set and an optional opaque next cursor. An
adapter must treat cursors as provider-owned values, validate its raw response
before returning it, and return details only for the exact requested provider
reference. The catalog repeats validation and rejects malformed or mismatched
data before it reaches a caller.

## Attribution and licensing

Provider results carry attribution records, including an optional notice, URL,
and license URL. The application returns these records with a draft and writes
a readable provider-scoped attribution value into the local item's existing
primitive attributes. This preserves provenance after import while a future UI
can present the attribution required by a provider's current terms. Each real
adapter must verify its provider's current attribution and licensing
requirements before release.

## Image handling

Provider image values are remote references. The generic mapping deliberately
does not assign them to an item's `imageUrl`: a UI must let the person make an
explicit choice before the browser loads a third-party image. That choice does
not copy, cache, transfer ownership, or guarantee availability. Any future
local image cache or copied asset requires a separate design that covers
storage, licensing, eviction, and attribution.

## Error model

Adapters convert known failures into `ProviderError` values with an operation,
kind, retryability, and optional retry-after duration. The common kinds are
unavailable, timeout, unauthorized, rate limited, not found, malformed
response, unsupported operation, and invalid request. Unknown adapter or
transport errors are normalized to a generic retryable availability failure;
raw SDK errors and HTTP details do not cross the boundary. Adapters must honour
the supplied cancellation signal and map their own timeout behavior into this
model.

## Caching boundary

```text
Archive
= user-owned durable data

Provider cache
= disposable external metadata cache
```

No provider cache is implemented by this RFC. If one is added, cache eviction
must never delete, alter, or make inaccessible a locally created item. A cache
is not exported as the authoritative archive and is never required for local
tracking, backup, or restore.

## Local-first behavior

The Core app remains useful when a provider is offline, unavailable, missing
credentials, rate limited, changed, or gone. Manual creation and all archive
operations remain available. Provider failures are outcomes of optional use
cases, not errors in local persistence or archive validation.

## Mapping external data into local items

`createItemDraftFromProviderDetails` produces ordinary `CreateItemInput` plus
the source reference, attribution records, and an optional image reference.
The local item receives a title, category, optional description,
provider-scoped external identifiers, provenance, and primitive provider
metadata. Collisions created by normalizing provider attribute names or
external identifiers are rejected rather than silently overwriting data. The
caller decides whether to create or update an item through the existing archive
application boundary and whether an image reference may be used.

After creation, the local item is valid and useful without provider access. No
raw response is persisted, and no adapter type becomes part of the archive
schema.

## Extensibility for future categories and providers

New adapters define their provider identity, capability set, mapping, failure
translation, attribution, and deterministic fixtures. They may use additional
primitive attributes where the local item model supports them. Complex
category-specific structures require a separate domain and migration decision,
not an extension of this generic provider contract.

## Data model impact

None. `ArchiveSnapshot` and its schema version remain unchanged. Provider
results are transient application data until a person explicitly creates or
updates a local item through existing archive operations.

## Privacy impact

The abstraction makes no network request on its own and introduces no
telemetry. A real adapter must document the data it sends to its provider. Core
tracking, backups, and restores do not require provider access.

## Offline impact

Provider discovery is unavailable offline, but local archive workflows are not
blocked. Application code receives a normalized optional-provider failure and
can retain or offer manual creation.

## Portability impact

Locally saved provider-derived fields use existing portable item fields,
external IDs, and primitive attributes. Provider cache entries and raw response
payloads are not a portability contract.

## Compatibility and migration impact

This RFC adds source and application types only. It does not alter exported
archives, require a migration, or invalidate existing items. A later archive
schema change requires its own RFC and migration plan.

## Testing strategy

Unit tests use fake providers with different capability sets. They cover
successful search, unsupported operations, invalid requests, malformed or
mismatched responses, normalized adapter failure, attribution propagation,
mapping to local item input, normalized-key collisions, and creating a local
item after a provider failure. Tests use no live APIs, credentials, SDKs, or
network access. Each real adapter will add minimized response fixtures and
contract tests at the adapter boundary.

## Alternatives considered

### Provider SDK calls in React

This exposes UI code to provider failures, credentials, API formats, and
attribution rules. It also makes replacement and deterministic testing harder.

### One large universal provider interface

This forces providers to pretend to support unrelated operations and encourages
optional provider-specific fields to leak through the application.

### Persist raw provider responses in the archive

This would make backups opaque, expose volatile external formats, complicate
migrations, and blur the distinction between user-owned data and cache data.

## Risks

The provider-neutral types can become too broad if future adapters add arbitrary
fields instead of proposing explicit category/domain work. Reviewers should
keep the contract small, require attribution and error handling for every real
adapter, and reject changes that make Core workflows depend on network access.

## Open questions

- Which adapter-specific response fixtures may be committed under documented
  provider terms?
- Does a future image cache need a separate user-facing retention policy?
- Which provider attribution surfaces are required for each future adapter?

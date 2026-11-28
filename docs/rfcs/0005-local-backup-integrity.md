# RFC 0005: Browser-local backup integrity verification

## Status

Draft. This RFC proposes a contract for #84; it does not change the backup
format or authorize implementation until reviewed.

## Summary

Verify the completeness and consistency of portable archive backups locally,
before offering a download and before enabling destructive restore. Separate
schema validity, referential integrity and accidental corruption detection.
Preserve compatibility with existing RFC 0002 JSON backups.

## User problem

A file can be syntactically valid JSON yet omit archive sections or contain
broken references. Users need actionable feedback without revealing titles,
notes, history or other personal data.

## Goals

- Validate all required sections of the current archive schema before applying
  defaults or migrations that could conceal missing data.
- Detect duplicate entity IDs, invalid relationships and incomplete snapshots.
- Verify newly generated backup bytes before download.
- Retain existing export and restore compatibility.
- Report integrity errors locally without exposing personal contents.

## Non-goals

Authentication, digital signatures, encryption, cloud storage, telemetry,
provider enrichment, or repairing corrupted data automatically.

## Proposed design

Use a two-stage verification service shared by export and restore:

1. Inspect JSON and the declared schema version before migration. Enforce the
   required fields for that version; reject unsupported future versions.
2. Migrate with existing code, validate the resulting snapshot, and verify
   unique item, collection, history and tracking-unit identifiers. Validate
   references according to existing domain semantics, including intentional
   historical references to deleted items and tracking-unit parent rules.
   Do not reject valid legacy history merely because the item was deleted.

Return a structured report containing schema version, counts, verification
status, issue codes and structural field paths. Do not include item titles,
note text, raw IDs or input values in user-facing errors. Use separate status
labels for valid legacy backups and digest-verified backups.

For a new backup, retain the plain JSON ArchiveSnapshot file as the portable
default and propose an optional detached integrity manifest, containing
`manifestVersion: 1`, algorithm `SHA-256`, UTF-8 byte length and lowercase
hex digest of the exact backup bytes. Compute via Web Crypto locally. A
manifest is not a signature and does not authenticate an author.

Export serializes a validated snapshot once, verifies those exact bytes
through the same restore preparation path, then generates the optional digest
and offers the file. Restore accepts existing JSON alone, or JSON plus its
manifest; if a manifest is provided and malformed or mismatched, block restore.
Do not silently discard the supplied manifest or treat an unverified backup as
digest-verified. Any later envelope format would require a separate RFC.

Review the report before explicit replacement confirmation. Keep the current
archive untouched if verification, migration or persistence fails. The
verification service performs no persistence and does not log private data.

## Data model impact

No change to ArchiveSnapshot schema version 2 is proposed. An optional
versioned detached manifest is a separate file, not user-owned archive
content. Its exact version, byte encoding, supported algorithm and validation
rules form a small documented portability contract.

## Privacy impact

No network request, account or telemetry. The digest is metadata and may
correlate identical backups, so it stays local and is shared only at the
user's choice. Do not log it or backup file names.

## Offline impact

All validation and hashing operate in-browser. Web Crypto requires a secure
context; report unsupported digest verification rather than claiming success
or blocking valid legacy JSON-only recovery.

## Portability impact

The primary file remains readable by existing implementations and generic JSON
tools. The optional manifest uses a standard digest over exact bytes, so
independent tools can verify it without the application.

## Migration strategy

Continue reading supported legacy archive versions through existing migrations.
Define version-specific completeness requirements using synthetic fixtures.
Legacy JSON without a manifest remains restorable, with a clear indication
that no independent digest was available. No historical archive rewrite or
bulk re-export is required.

## Alternatives considered

- Checksum-only: cannot identify structural or referential errors.
- Schema-only: cannot independently detect accidental changes that still
  produce valid JSON.
- Required envelope or embedded digest: changes the established portable
  file contract and complicates backward compatibility.
- Cloud verification: conflicts with local-first requirements.

## Risks

- Overly strict reference validation could reject legitimate deleted-item
  history. Define and test domain exceptions before release.
- Large backups can consume memory; bound input processing after measuring
  representative archives and provide an actionable error rather than silently
  truncating.
- Detached files can be separated or edited together. Make verification status
  explicit and avoid claims of authenticity or tamper resistance.

## Open questions

- Is a detached manifest worth the extra file, or should the first release
  ship structural verification only?
- Which legacy sections were optional in each version, and which historical
  references are intentionally allowed?
- What measured file-size threshold and progress feedback are appropriate?

## Acceptance and implementation checklist

- Add version-specific complete and incomplete fixtures, malformed JSON,
  unsupported versions, duplicate IDs and domain reference edge cases.
- Verify digest determinism and mismatched/unsupported manifests, including
  changed whitespace and non-ASCII text.
- Test that unsuccessful verification and persistence leave the original
  archive untouched.
- Test export and restore feedback with keyboard and browser coverage.
- Document exact format and compatibility in the data-format documentation
  after acceptance, then update the changelog.

This design keeps personal data exportable as ordinary JSON and does not
require an account or network service.

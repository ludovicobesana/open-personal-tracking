# RFC 0002: Local backup export and restore

## Summary

The application exports the complete `ArchiveSnapshot` as a user-downloaded JSON file and restores it from a user-selected local JSON file. No account, network request, or provider is involved.

## Decision

The backup format is the portable `ArchiveSnapshot`, not the IndexedDB record. Export validates the current snapshot before serialization. Restore parses the file, rejects a future `schemaVersion`, runs supported migrations, validates the resulting snapshot, and only then writes it through the archive persistence boundary.

## Safety rules

- A malformed, invalid, or unsupported backup must not replace the current archive.
- Restore requires explicit user confirmation because it replaces the current local archive.
- The restored snapshot contains items, progress, ratings, notes, tags, collections, history, and preferences together.
- Backup files stay local to the user unless the user chooses to move them.

## Compatibility

`schemaVersion` identifies the archive format. The application migrates supported older snapshots and rejects newer snapshots rather than coercing or discarding them. Breaking format changes require an additional migration, automated coverage, and a changelog entry.

## Alternatives considered

- Treat IndexedDB as the backup: it is browser-specific and does not give users a portable recovery file.
- Offer an export preview or disabled import control: these do not provide recovery after local data is removed.

# Data Format

## Purpose

The open-personal-tracking data format is a public contract for representing user-owned tracking data.

It should be possible to read exported data without running the official application.

## Naming

`open-personal-tracking` is a working project name.

The data format identifier should remain stable once publicly released, even if the final product name changes.

Before format version 1 is declared stable, the project should decide whether the identifier should remain:

```text
open-personal-tracking
```

or use another permanent neutral identifier.

## Envelope

Initial conceptual structure:

```json
{
	"format": "open-personal-tracking",
	"formatVersion": 1,
	"exportedAt": "2026-08-27T00:00:00Z",
	"data": {
		"items": [],
		"trackingEntries": [],
		"collections": [],
		"tags": [],
		"history": []
	}
}
```

## Requirements

The format must be:

- versioned
- documented
- human-readable
- deterministic where practical
- validated
- migratable
- sufficiently complete to restore user-owned state

## User-owned data

The format should include all meaningful local data such as:

- items
- tracking state
- progress
- personal ratings
- notes
- tags
- collections
- history
- custom metadata
- custom item types

## External metadata

Provider metadata may be included where useful, but provider availability must not determine whether the user's tracked item remains understandable.

## Unknown fields

Importers should preserve unknown fields where technically reasonable.

Unknown data must never be silently discarded during migrations.

## Versioning

Breaking format changes require:

- documented migration
- automated migration tests
- changelog entry
- compatibility statement
- RFC approval once the format is stable

## Interoperability goal

Third-party software should eventually be able to:

- parse exports
- create compatible exports
- inspect user history
- build migration tools
- build alternative clients

without reverse engineering the official application.

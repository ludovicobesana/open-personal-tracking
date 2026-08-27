# Data Ownership and Portability

## Principle

open-personal-tracking does not own the user's personal history.

The application is a tool used to create, inspect, and modify that history.

## Local source of truth

Personal tracking data should be stored locally by default.

Core functionality must not depend on a remote account.

## Data categories

### User-owned canonical data

Examples:

- Tracking state
- Progress
- Personal ratings
- Private notes
- Collections
- Tags
- History
- Custom items
- Custom metadata explicitly created by the user

This data must be exportable.

### Reconstructable external data

Examples:

- Provider descriptions
- Posters
- Cast
- External popularity values
- Cached remote metadata

This may be cached locally but should not be treated as irreplaceable user history.

## Backup format

Primary backup format: JSON.

Required envelope:

```json
{
	"format": "open-personal-tracking",
	"formatVersion": 1,
	"exportedAt": "2026-08-27T00:00:00Z",
	"data": {}
}
```

## Backup requirements

The format must be:

- versioned
- documented
- human-readable
- validated on import
- migratable
- testable
- sufficiently complete to recover user state

## Import flow

```text
Select
|
Parse
|
Validate
|
Migrate
|
Preview
|
Transactional import
```

A failed import must not damage the current database.

## Export policy

Export must never be a paid-only feature.

Users should be able to export their complete history without contacting maintainers.

## Cloud backup

Cloud is optional.

Potential targets:

- Google Drive
- iCloud Drive
- Dropbox
- OneDrive
- WebDAV
- NAS
- Filesystem

Whenever possible, backups should live in storage controlled by the user.

## Portability principle

open-personal-tracking should optimize for the possibility that another application may need to read open-personal-tracking data in the future.

The data format is therefore part of the public product contract.

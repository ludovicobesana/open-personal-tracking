# Compatibility Policy

## Goal

Users may keep data for many years.

Compatibility therefore matters more than short-term implementation convenience.

## Platforms

The project intends to support:

- modern web browsers
- Android
- iOS

Exact minimum supported versions should be documented once the application reaches public testing.

## Data compatibility

Backward compatibility for user-owned data receives higher priority than API compatibility for internal implementation details.

## Backup compatibility

New releases should continue importing supported older backup versions through explicit migrations.

## Deprecation

Before removing support for:

- a platform
- a provider
- a backup version
- an importer
- a public API

document:

- reason
- migration path
- replacement
- earliest removal release

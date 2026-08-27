# Release Process

## Goals

Releases must be predictable, reversible where possible, and safe for long-lived local data.

## Versioning

Use semantic versioning once the project reaches a stable public contract.

Before 1.0, breaking changes are still expected to be documented.

## Release requirements

Before a release:

- CI passes
- migration tests pass
- backup restore tests pass
- critical E2E tests pass
- release notes are drafted
- known data-safety issues are reviewed
- format compatibility is documented
- platform-specific regressions are checked

## Release notes

Release notes should clearly identify:

- new features
- bug fixes
- migration changes
- backup format changes
- provider changes
- removed or deprecated functionality
- known issues

## Data migrations

A release containing a destructive or irreversible migration requires explicit maintainer review.

## Rollback

Document whether downgrading is supported.

Never imply that downgrade is safe if a newer migration makes it unsafe.

## Pre-releases

Use pre-release channels for risky changes involving:

- persistence
- sync
- backup
- import
- native storage

# Deprecation Policy

## Principle

Removing a feature must not unexpectedly strand user data.

## Deprecation process

For user-visible or public contracts:

1. Announce deprecation.
2. Explain why.
3. Provide a migration or alternative where possible.
4. Document the affected data.
5. Keep support for a reasonable transition period.
6. Remove only after the transition is understood.

## High-impact deprecations

Require an RFC when removing or breaking:

- backup formats
- storage mechanisms
- public provider APIs
- importer APIs
- synchronization formats
- supported data categories with persisted user data

## Provider shutdowns

If an external provider is removed or becomes unavailable, existing locally stored items must remain readable.

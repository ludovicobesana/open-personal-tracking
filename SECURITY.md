# Security Policy

## Reporting vulnerabilities

Do not publish exploitable security vulnerabilities as normal public issues.

The repository should configure GitHub Private Vulnerability Reporting before its first public release.

Until a formal security contact is established, maintainers should document a private reporting channel here.

## High-risk areas

Security review should pay particular attention to:

- backup parsing
- imported files
- database migrations
- HTML or rich-text rendering
- external metadata
- network authentication
- public comments
- file-system access
- OAuth integrations
- URL handling

## Data integrity

For open-personal-tracking, data integrity is part of security.

A bug that corrupts or irreversibly deletes user history should be treated with severity similar to a major security regression.

## Dependency policy

Avoid unnecessary dependencies.

Automated dependency updates are useful, but updates affecting storage, cryptography, authentication, or native bridges should receive manual review.

## Network

open-personal-tracking Core should expose as little network attack surface as practical.

Network-facing services must be treated as separate trust boundaries.

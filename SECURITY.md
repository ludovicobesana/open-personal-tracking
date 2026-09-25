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

## Accidental repository data exposure

Potentially personal data committed to the repository is a security and privacy
incident, even when the data is used as a test fixture. Do not paste its
contents into issues, pull requests, logs, or replacement fixtures.

When it is discovered, maintainers must:

1. Remove the data from shipped assets and the current repository tree.
2. Replace any test dependency with a minimal, documented synthetic fixture.
3. Audit all tracked fixtures for provenance, minimization, and authorization.
4. Assess the Git history, forks, releases, caches, and mirrors through a
   private security process before deciding on history rewriting.
5. Document the decision and follow-up without republishing the exposed data.

The unverified IMDb CSV addressed by [#114](https://github.com/ludovicobesana/open-personal-tracking/issues/114)
is removed from the current tree by its remediation change. Its earlier commit
remains reachable through Git history, so historical cleanup is required and
must be coordinated separately. This repository change deliberately does not
rewrite shared history.

## Dependency policy

Avoid unnecessary dependencies.

Automated dependency updates are useful, but updates affecting storage, cryptography, authentication, or native bridges should receive manual review.

## Network

open-personal-tracking Core should expose as little network attack surface as practical.

Network-facing services must be treated as separate trust boundaries.

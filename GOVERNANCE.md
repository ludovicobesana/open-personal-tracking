# Governance

## Goal

open-personal-tracking governance exists to protect the long-term health of the project and the interests of its users.

No individual maintainer should become a single point of failure for project continuity.

## Governance principles

- Public decisions
- Multiple maintainers
- Documented release access
- Reproducible builds where practical
- Transparent roadmap
- Transparent moderation
- No private ownership of essential community infrastructure where avoidable

## Maintainers

Maintainers are responsible for:

- merging pull requests
- releases
- security coordination
- repository administration
- issue triage
- enforcing project standards
- mentoring reviewers
- documenting significant decisions

## Becoming a maintainer

Maintainer status should be based on sustained contribution and trust.

A candidate should demonstrate:

- technical judgment
- respectful review behavior
- familiarity with project principles
- reliability
- willingness to document decisions
- concern for compatibility and user data

Existing maintainers should publicly nominate and approve new maintainers.

## Decision process

### Routine decisions

Handled through normal issue and pull request review.

### Significant decisions

Require an RFC.

Examples:

- changing storage architecture
- changing backup format
- introducing mandatory infrastructure
- changing license
- introducing accounts
- changing governance
- breaking plugin/provider APIs
- collecting new categories of user data

## Voting

Consensus is preferred.

If consensus cannot be reached, active maintainers may vote.

Unless otherwise documented:

- simple majority for ordinary governance decisions
- two-thirds majority for license or governance changes

Dissenting technical arguments should be preserved in the RFC record.

## Project continuity

The project should progressively reduce dependency on individual people.

Critical credentials, domains, package publishing, release signing, and organizational access should eventually support multiple authorized maintainers.

## Fork friendliness

Forking is a legitimate part of open source.

Governance should not intentionally make forks unable to interpret user data or maintain application functionality.

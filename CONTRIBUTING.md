# Contributing to open-personal-tracking

Thank you for helping build open-personal-tracking.

open-personal-tracking is a community-built project. Contribution does not mean only writing code. A contributor is anyone who improves the project, its data, its documentation, its design, its accessibility, its integrations, or the quality of the community around it.

You can contribute by:

- fixing bugs
- implementing features
- reviewing pull requests
- improving documentation
- reporting reproducible problems
- testing releases
- contributing or correcting catalog metadata
- creating importers
- creating catalog providers
- improving accessibility
- proposing UX and visual design
- translating the application
- writing tests
- helping triage issues
- answering contributor questions
- participating in RFC discussions
- moderating community spaces

First contribution or hundredth contribution, both matter.

---

# Contributor Charter

open-personal-tracking depends on contributors to remain useful, accurate, maintainable, and independent.

The project and its contributors should have clear expectations of each other.

## What contributors can expect from open-personal-tracking

Maintainers should:

- welcome new contributors
- treat contributors with courtesy and respect
- keep contribution rules public
- explain why contributions are rejected or require changes
- review contributions within a reasonable time when maintainer capacity allows
- communicate when review queues are delayed
- listen to contributor feedback
- allow project policies to evolve
- document significant decisions
- provide clear issue labels and acceptance criteria where possible
- maintain approachable `good first issue` tasks
- avoid moving important decisions into private conversations
- recognize non-code contributions
- protect the long-term portability of user data

The project should continuously improve its contribution guides when recurring ambiguity appears.

## What open-personal-tracking expects from contributors

Contributors should:

- treat other contributors respectfully
- submit information they reasonably believe to be correct
- provide evidence when a contribution depends on externally verifiable facts
- describe assumptions when evidence is incomplete
- follow documented contribution policies
- keep changes focused
- accept review as part of collaboration
- disclose uncertainty rather than guessing
- avoid knowingly introducing incompatible or lossy data changes
- raise disagreements constructively
- use RFCs for changes affecting long-term project contracts

Disagreement with an existing policy is welcome.

Ignoring an existing policy silently is not.

When a policy appears wrong, propose changing the policy.

---

# Two kinds of contribution

open-personal-tracking has two major contribution surfaces.

## Product contributions

These change open-personal-tracking itself.

Examples:

- application code
- architecture
- UI
- tests
- documentation
- providers
- importers
- backup tooling
- network services
- build infrastructure

These normally happen through GitHub Issues, RFCs, and Pull Requests.

## Catalog and metadata contributions

open-personal-tracking may also allow contributors to improve shared metadata used by the community.

Examples may eventually include:

- missing titles
- incorrect release information
- duplicate entities
- edition information
- relationships between works
- episode or chapter metadata
- external identifiers
- translations
- corrections to community-maintained records

This contribution system must remain separate from private user tracking data.

A contributor must never be able to edit another user's:

- tracking status
- progress
- personal rating
- private notes
- private collections
- private tags
- local history

Community-editable metadata and user-owned data are different trust domains.

---

# Contributing data

open-personal-tracking should prefer authoritative external catalog providers when good open or licensed data already exists.

Community editing should be used where it adds value rather than recreating entire external databases unnecessarily.

## Accuracy first

Do not submit a metadata correction because it "looks right".

Prefer information that can be independently verified.

Good submissions should answer:

1. What is changing?
2. Why is the current value incorrect or incomplete?
3. What supports the proposed value?
4. Does the change apply globally or only to a particular edition, release, language, region, or provider?

## Sources

When a contribution depends on an external fact, include the best available source.

Prefer primary evidence when practical.

Examples:

- publisher information
- official production information
- creator or studio sources
- ISBN registries
- official release documentation
- platform or distributor metadata
- recognized catalog identifiers

Community discussion may help discover an issue but should not automatically become authoritative evidence.

## Correcting existing data

Corrections are as valuable as additions.

When correcting existing metadata:

- identify the exact field
- preserve valid existing information
- explain the reason
- provide evidence when appropriate
- distinguish correction from preference

Do not overwrite a valid title, date, edition, translation, or identifier merely because another representation is preferred.

## Conflicting information

Real-world catalogs contain ambiguity.

Do not force certainty where none exists.

When sources disagree:

- document the conflict
- preserve provenance if the data model supports it
- prefer precise qualifiers
- escalate schema ambiguity through an issue or RFC

Examples include:

- regional release dates
- alternate titles
- book editions
- manga serialization vs collected volumes
- remake relationships
- disputed publication dates

## Provenance

Long term, shared metadata should be able to answer:

> Where did this value come from?

Where technically reasonable, community-maintained fields should retain provenance or contribution history.

---

# Contribution quality

Not every contribution needs the same level of evidence.

A typo correction is different from changing an item's identity or merging two records.

Higher-impact contributions may require stronger verification.

Examples:

### Low-risk

- typo
- broken documentation link
- missing translation
- UI spacing bug

### Medium-risk

- metadata correction
- external identifier change
- provider normalization behavior
- importer mapping

### High-risk

- merging or splitting catalog entities
- backup schema changes
- destructive migrations
- synchronization logic
- account or identity changes
- privacy-sensitive data collection

Maintainers may request additional evidence or review for higher-risk changes.

Repeated low-quality or deliberately inaccurate contributions may require additional review before acceptance.

The purpose is data quality, not contributor ranking.

---

# Contribution history

Where practical, open-personal-tracking should preserve a public history of accepted shared-data contributions.

This improves:

- accountability
- debugging
- provenance
- reversibility
- contributor recognition

Private user data must never appear in this history.

---

# Before starting product work

For small fixes:

1. Search existing issues and pull requests.
2. Confirm the problem is not already being addressed.
3. Comment on the issue if you intend to work on it.
4. Implement the smallest complete fix.
5. Add or update tests when behavior changes.
6. Open a focused pull request.

You do not need permission to fix an obvious, well-scoped issue.

For substantial changes:

1. Describe the user problem first.
2. Search existing RFCs and Discussions.
3. Open a proposal.
4. Explain alternatives and tradeoffs.
5. Discuss architecture publicly.
6. Write an RFC when the change affects a long-term contract.
7. Implement after sufficient agreement exists.

---

# When an RFC is required

Use an RFC for changes involving:

- backup formats
- persistence architecture
- synchronization
- authentication
- open-personal-tracking Network protocols
- public plugin APIs
- provider APIs
- data collection
- privacy behavior
- breaking migrations
- governance
- licensing

Routine bug fixes do not need RFCs.

See `docs/RFC_PROCESS.md`.

---

# Issues

Use issues for bounded, actionable work.

A good issue should include:

- the user problem
- current behavior
- expected behavior
- reproduction steps when relevant
- affected platform
- data-safety impact
- screenshots or recordings when useful

Avoid combining unrelated problems in one issue.

## Data-loss issues

If an issue may involve:

- data corruption
- failed restore
- migration failure
- irreversible deletion
- lost tracking history

make this explicit.

These issues receive the highest project priority.

---

# Pull requests

Prefer pull requests that are:

- focused
- reviewable
- tested
- documented
- reversible where practical

A pull request should explain:

## What

What changed?

## Why

What problem does it solve?

## How

What implementation approach was chosen?

## Verification

How was it tested?

## Data impact

Does it alter:

- persistence
- migrations
- backup
- import
- export
- deletion
- synchronization

If yes, explain the failure behavior.

---

# Pull request principles

Prefer:

- focused changes
- tests for behavior changes
- migration tests for persistence changes
- screenshots for visible UI changes
- accessibility verification for interaction changes
- documentation updates when public behavior changes
- explicit error handling

Avoid:

- unrelated refactors inside feature PRs
- dependencies without justification
- breaking backup compatibility without migration
- direct database access from UI code
- mandatory network dependencies in core workflows
- silent data transformations
- destructive migrations without recovery strategy

---

# Review criteria

Reviewers should evaluate:

- correctness
- data safety
- accessibility
- maintainability
- portability
- offline behavior
- migration impact
- test coverage
- dependency cost
- user lock-in risk
- privacy impact

For shared metadata changes, reviewers should additionally evaluate:

- factual support
- source quality
- scope
- ambiguity
- provenance
- duplicate risk

---

# Evidence over authority

A contributor's reputation does not make a contribution correct.

A new contributor with strong evidence should be treated the same as an established contributor proposing the same change.

Review the contribution, not the status of the person submitting it.

Contributor history may inform how much verification is useful, but it must not replace evaluation of the evidence.

---

# Data-sensitive changes

Changes involving persistence, backup, import, migrations, deletion, or synchronization require extra review.

At least one reviewer should explicitly verify:

- success path
- failure path
- rollback behavior
- compatibility with existing data
- backup implications

If a change can destroy user history, convenience is never an acceptable reason to skip validation.

---

# Provider contributions

Provider integrations should remain isolated from the open-personal-tracking domain.

A provider contribution should document:

- provider name
- supported entity types
- authentication requirements
- rate limits
- relevant terms or attribution
- identifiers used
- normalization rules
- failure behavior
- caching behavior
- test strategy

Provider-specific terminology must not leak unnecessarily into core domain models.

---

# Importer contributions

Importers are strategically important because they help users escape platform lock-in.

An importer contribution should document:

- source platform
- supported export format and version
- supported fields
- unsupported fields
- mapping rules
- duplicate handling
- unknown values
- validation behavior
- test fixtures

Importers must never silently discard meaningful user history.

When a field cannot be represented, surface that limitation.

---

# Design contributions

Design contributions are welcome.

Include:

- problem being solved
- affected workflow
- mobile behavior
- desktop behavior
- accessibility considerations
- empty state
- loading state
- error state
- offline state
- destructive-action behavior

open-personal-tracking should remain:

- personal
- calm
- durable
- content-forward
- information-rich without becoming cluttered

Do not assume that engagement maximization is a product goal.

---

# Documentation contributions

Documentation is a first-class contribution.

Useful documentation includes:

- user guides
- architecture explanations
- provider guides
- importer documentation
- troubleshooting
- migration notes
- contribution guides
- translations
- accessibility notes

If the same contributor question appears repeatedly, improve the documentation instead of repeatedly answering it privately.

---

# Testing contributions

Testing is especially valuable for a long-lived local-first application.

Useful contributions include:

- regression tests
- migration tests
- importer fixtures
- backup compatibility tests
- platform-specific reproductions
- accessibility testing
- offline tests
- destructive-flow tests

A high-quality bug reproduction can be as valuable as a code fix.

---

# Good first issues

The project should maintain a curated set of genuinely approachable issues.

A `good first issue` should:

- have clear acceptance criteria
- identify the relevant subsystem
- avoid unresolved architecture
- be reasonably small
- contain enough context to start
- have a reviewer available when possible

Do not label complex abandoned work as `good first issue` merely to attract contributors.

---

# Getting help

If you are unsure how to contribute:

1. Search existing documentation.
2. Search Issues and Discussions.
3. Ask publicly in the relevant Discussion.
4. Bring the question to the weekly community call if synchronous discussion would help.

Questions are useful signals.

If something is difficult for contributors to understand, the project probably needs better documentation.

---

# Weekly community call

open-personal-tracking holds a public contributor and issue-triage call every week.

Typical agenda:

1. New contributors
2. Critical regressions and data-safety issues
3. Issue triage
4. Pull requests needing review
5. RFC discussion
6. Product and UX questions
7. Catalog/data quality questions
8. Good first issues
9. Documentation gaps
10. Next priorities
11. Open floor

Attendance is optional.

open-personal-tracking is async-first.

No contributor should need to attend a meeting to have their argument considered.

Any material decision made during a call must be written down in:

- an issue
- a Discussion
- an RFC
- project documentation

Written records are canonical.

See `docs/WEEKLY_CALL.md`.

---

# Contributor recognition

open-personal-tracking should recognize meaningful contributions beyond commits.

Examples:

- data corrections
- issue triage
- testing
- documentation
- accessibility
- translations
- design
- moderation
- community support
- review
- provider maintenance

Long term, the project may maintain public contributor acknowledgements or contribution statistics.

These should celebrate participation rather than create incentives for low-quality volume.

Quality matters more than submission count.

---

# A final rule

Before contributing a change, ask:

> Does this make open-personal-tracking more trustworthy for someone who may keep twenty years of personal history in it?

If yes, it probably belongs here.

If it makes that history harder to understand, export, verify, migrate, or keep, reconsider the approach.

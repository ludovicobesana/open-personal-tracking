---
name: 'Review Current Changes'
description: 'Review current repository changes for high-confidence bugs and regressions.'
agent: 'Repository Reviewer'
argument-hint: 'Optional scope such as current diff, files, or PR URL'
---

Review this scope:

**Scope:** ${input:scope:Current working tree, selected files, or pull request URL}

Prioritize exploitable bugs, data loss, broken offline behavior, accessibility regressions, migration risks, and missing tests. Return findings ordered by severity and confidence, or explicitly state that no actionable findings were found.

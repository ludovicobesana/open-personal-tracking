# AI-assisted development workflow

This repository supports Copilot in VS Code, Codex, and Claude Code. The tools
share the same engineering contract; only the entry points differ.

## Sources of truth

- [`AGENTS.md`](../AGENTS.md): repository-wide rules for Codex and compatible agents.
- [`CLAUDE.md`](../CLAUDE.md): Claude Code entry point; shared rules remain in
  `AGENTS.md`.
- [`copilot-instructions.md`](../.github/copilot-instructions.md): always-on
  Copilot guidance.
- [`.github/instructions/`](../.github/instructions/): file-specific guidance
  for domain/test and web changes.
- [`.github/agents/`](../.github/agents/): focused implementation and review
  personas.
- [`.github/prompts/`](../.github/prompts/): reusable issue implementation and
  review workflows.

When guidance overlaps, preserve the stricter product rule: local-first,
offline-capable, user-owned data with explicit validation and tests.

## Recommended workflow

1. Start from the issue or acceptance criteria and inspect the worktree.
2. Read the applicable instructions before editing.
3. Search for existing helpers, types, tests, and documentation.
4. Make the smallest complete change; keep business logic pure where possible.
5. Add focused tests for normal, invalid, empty, and issue-specific edge cases.
6. Run targeted checks, then the relevant build and lint commands.
7. Review the final diff for unrelated changes, data-format impact, and
   accessibility.
8. Report exact commands and results. Never claim a check that was not run.

## AI safety boundaries

Agents must not commit secrets, add telemetry, require an account or server for
core flows, silently discard imported data, or use destructive Git commands.
External provider data is optional cached enrichment, never the source of truth
for user history.

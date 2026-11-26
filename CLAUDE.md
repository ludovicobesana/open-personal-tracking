@AGENTS.md

## Claude Code

- Keep this file small. Put instructions shared with other coding agents in `AGENTS.md`.
- Before concluding a code task, report the verification command actually run and any meaningful limitation.
- Do not use `--dangerously-skip-permissions`.

- Follow the protected seed rule in `AGENTS.md`: never silently delete, truncate,
  reorder destructively, or replace records in `data/catalog/**`. Intentional
  replacements require explicit approval, a migration or deprecation note, and
  updated tests. Never mutate user-owned archive data because a seed changes.

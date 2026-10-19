---
name: 'Implement Issue Safely'
description: 'Implement a GitHub issue with local-first design, focused tests, and explicit verification.'
agent: 'Local-First Implementer'
argument-hint: 'Issue URL, number, or description'
---

Implement this issue in the current repository:

**Request:** ${input:issue:Provide the issue URL, number, or full description}

Use the repository instructions and the issue acceptance criteria as the source of truth. Before editing, identify affected files and existing patterns. Keep the change surgical, add focused tests, and report exact verification commands.

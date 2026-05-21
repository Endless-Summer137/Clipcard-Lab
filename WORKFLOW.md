# Repository Workflow

This file stores durable collaboration rules for this repository.

## Source of Truth

GitHub repository history is the long-term record across Codex conversations.

`PROGRESS.md` is the handoff log for current state, design decisions, validation, and next steps.

`README.md` is the public-facing project overview and setup guide.

`WORKFLOW.md` is the durable place for collaboration rules and repository update policy.

## Default Rule

After each completed, verified small task:

- Update the project files locally.
- Update `PROGRESS.md` if current state, design decisions, validation, or next steps changed.
- Update `README.md` only if setup, usage, or public project description changed.
- Update `WORKFLOW.md` whenever a durable collaboration rule changes.
- Commit coherent finished changes.
- Push them to GitHub.

## Do Not Push

- Half-finished exploratory edits unless explicitly requested.
- Unverified changes that are still in active investigation.

## Code Comments

Comments should explain intent or design constraints, not restate obvious code mechanics.

Prefer a few helpful comments near important logic over dense line-by-line annotation.

## Branch and PR Habit

Small, self-contained fixes may be committed and pushed directly when that matches the current working style.

When branch-based review is useful, create a task branch, push it, and open a PR so `gh pr status` remains meaningful.

## Rule for Future Sessions

When a new durable working agreement is made in conversation, write it into this repository and push it, instead of leaving it only in chat context.

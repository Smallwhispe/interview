# Diff Scope Rules

These rules apply to every reviewer. They define what is in scope versus pre-existing context.

## Excluded Directories

The following directory patterns are **always excluded** from code review scope. These are tooling, configuration, or generated directories that are not business logic:

| Pattern | Reason |
|---------|--------|
| `.ttadk/` | TTADK plugin/config installation directory |
| `.claude/` | Claude Code project configuration |
| `.codex/` | Codex CLI configuration |
| `node_modules/` | NPM package dependencies |
| `vendor/` | Vendored dependencies |
| `.venv/`, `venv/` | Python virtual environments |
| `__pycache__/` | Python bytecode cache |
| `dist/`, `build/` | Build output directories |
| `.git/` | Git internal directory |
| `*.lock`, `*-lock.json`, `*-lock.yaml`, `*.sum` | Lock files (package-lock.json, go.sum, yarn.lock, etc.) |

When computing diff scope, filter out files matching these patterns **before** passing the file list to reviewers.

If the only changes in a diff are within excluded directories, the review should report a clean scope with a note that all changes were in excluded directories.

## Scope Discovery

Determine the diff to review using this priority order:

1. User-specified scope (`BASE:`, `FILES:`, `DIFF:`)
2. Working copy changes
3. Unpushed commits vs resolved base branch

The scope step in `review.md` handles discovery and passes the resolved diff. Reviewers do not need to discover it themselves.

## Finding Classification Tiers

### Primary (directly changed code)

Lines added or modified in the diff. Main focus.

### Secondary (immediately surrounding code)

Unchanged code within the same function, method, or block as a changed line. Report it when the change makes the issue newly relevant.

### Pre-existing (unrelated to this diff)

Issues in unchanged code that the diff did not touch and does not interact with. Mark these as `pre_existing: true`.

### Submodule-internal (code inside changed submodules)

Lines changed inside a submodule whose pointer was modified in the parent diff. Treated as Primary scope because the parent commit intentionally updates the submodule reference. Includes both committed changes (visible via the submodule's own `git diff <sub_base>`) and uncommitted dirty-state changes (visible via `git diff` / `git diff --cached` inside the submodule).

### Submodule-pre-existing (unchanged submodule code)

Issues in a submodule whose pointer was NOT changed in this diff. Mark these as `pre_existing: true`.

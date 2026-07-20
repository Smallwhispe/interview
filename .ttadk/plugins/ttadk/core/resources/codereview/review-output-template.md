# Code Review Output Template

Use this exact format when presenting synthesized review findings. Findings are grouped by severity, not by reviewer.

## Required structure

```markdown
## Code Review Results

**Scope:** ...
**Excluded Paths:** (list any excluded directories that had changes, or "none")
**Intent:** ...
**Mode:** ...

**Reviewers:** correctness, testing, maintainability, ...

### P0 -- Critical

| # | File | Issue | Reviewer | Confidence | Route |
|---|------|-------|----------|------------|-------|

### P1 -- High

| # | File | Issue | Reviewer | Confidence | Route |
|---|------|-------|----------|------------|-------|

### P2 -- Moderate

| # | File | Issue | Reviewer | Confidence | Route |
|---|------|-------|----------|------------|-------|

### P3 -- Low

| # | File | Issue | Reviewer | Confidence | Route |
|---|------|-------|----------|------------|-------|

### Applied Fixes

### Residual Actionable Work

### Pre-existing Issues

### Learnings & Past Solutions

### Agent-Native Gaps

### Schema Drift Check

### Deployment Notes

### Coverage

---

> **Verdict:** ...
>
> **Reasoning:** ...
>
> **Fix order:** ...
```

## Rules

- Use pipe-delimited markdown tables for findings.
- Group findings by severity.
- Include file:line location.
- Include `Route` as `<autofix_class> -> <owner>`.
- In headless mode, use the structured text envelope defined in `review.md` instead of tables.

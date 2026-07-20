# [PROJECT_NAME] Quality

## Core Standards

### I. Quality Gates

All changes should satisfy build, review, and validation gates before merge.

### II. Testing Strategy

Tests should cover the intended behavior of the change and protect critical workflows from regression.

## Fixed Rules

- **CI Required**: All services must pass CI before merge.
- **Code Review Required**: Every change requires review before it is merged.
- **Coverage Guardrail**: Test coverage must not decrease on a pull request without explicit justification.

## Governance

- Quality standards apply to code, documentation, and generated project assets.
- When a quality gate fails, fix the underlying issue rather than bypassing the check.
- Teams should periodically review quality targets to keep them aligned with repository needs.

**Version**: 1.0.0 | **Ratified**: [DATE] | **Last Amended**: [DATE]

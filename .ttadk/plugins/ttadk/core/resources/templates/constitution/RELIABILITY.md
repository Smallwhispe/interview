# [PROJECT_NAME] Reliability

## Core Practices

### I. Fault Tolerance

Design changes so failures are isolated and recovery paths remain clear.

### II. Degradation Strategy

Prefer graceful degradation and rollback-friendly changes over all-or-nothing behavior.

### III. Monitoring Patterns

Critical workflows should expose signals that help detect failures and confirm healthy operation.

### IV. Graceful Startup and Shutdown

Initialization and shutdown paths should avoid leaving systems in partial or inconsistent states.

## Fixed Rules

- **Availability Target**: Reliability decisions should support a 99.9% service availability target.
- **Rollback Readiness**: Deployments should keep a practical rollback path.
- **Incident Response**: Reliability incidents must be detected, triaged, mitigated, and reviewed.

## Governance

- Reliability guidance should be considered during design, implementation, deployment, and incident follow-up.
- Changes that reduce observability or rollback confidence require explicit review.
- Post-incident learnings should be folded back into tooling, automation, or documentation.

**Version**: 1.0.0 | **Ratified**: [DATE] | **Last Amended**: [DATE]

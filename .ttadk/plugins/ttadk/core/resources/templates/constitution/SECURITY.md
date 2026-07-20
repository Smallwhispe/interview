# [PROJECT_NAME] Security

## Core Practices

### I. Authentication Mechanisms

Authentication flows should be explicit, controlled, and appropriate for the systems they protect.

### II. Authorization Patterns

Access should follow least-privilege principles and be limited to the minimum required scope.

### III. Encryption Practices

Sensitive data should be protected in transit and at rest using approved mechanisms.

## Fixed Rules

- **Least Privilege**: Access control must follow the principle of least privilege.
- **Secrets Protection**: Secrets must never be committed to source control.
- **Dependency Audits**: Dependencies should be scanned regularly for known vulnerabilities.

## Governance

- Security requirements apply to source code, generated assets, dependencies, and operational workflows.
- Suspected security incidents should be reported, tracked, and resolved with urgency.
- Exceptions to security controls require explicit review and documented rationale.

**Version**: 1.0.0 | **Ratified**: [DATE] | **Last Amended**: [DATE]

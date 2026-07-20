# Persona Catalog

19 reviewer personas organized into always-on, cross-cutting conditional, and stack-specific conditional layers, plus TTADK-specific agents. The orchestrator uses this catalog to select which reviewers to spawn for each review.

## Availability Note

These reviewer names are aligned to currently available Codex skill names in the active environment.

- **Verified available in current environment:** `correctness-reviewer`, `testing-reviewer`, `maintainability-reviewer`, `project-standards-reviewer`, `code-compliance-reviewer`, `security-reviewer`, `performance-reviewer`, `api-contract-reviewer`, `data-migrations-reviewer`, `reliability-reviewer`, `adversarial-reviewer`, `cli-readiness-reviewer`, `previous-comments-reviewer`, `agent-native-reviewer`, `learnings-researcher`, `schema-drift-detector`, `deployment-verification-agent`, `dhh-rails-reviewer`, `kieran-rails-reviewer`, `kieran-python-reviewer`, `kieran-typescript-reviewer`, `julik-frontend-races-reviewer`, `bits-code-guard-reviewer`
- **TTADK internal reviewer resources now exist:** reviewer prompts are bundled inside `core/resources/codereview/reviewers/` so `/adk-sdd-codereview` can reference stable local names consistently
- These local resources act as internal reviewer contracts, not user-facing plugin skill registrations
- If a target environment does not provide a richer reviewer implementation, the local resource remains the fallback reviewer contract

## Always-on (6 personas + 2 TTADK agents)

Spawned on every review regardless of diff content.

**Persona agents (structured JSON output):**

| Persona | Agent | Focus |
|---------|-------|-------|
| `correctness` | `correctness-reviewer` | Logic errors, edge cases, state bugs, error propagation, intent compliance |
| `testing` | `testing-reviewer` | Coverage gaps, weak assertions, brittle tests, missing edge case tests |
| `maintainability` | `maintainability-reviewer` | Coupling, complexity, naming, dead code, premature abstraction |
| `project-standards` | `project-standards-reviewer` | AGENTS.md / CLAUDE.md compliance, references, naming, cross-platform portability, tool selection |
| `code-compliance` | `code-compliance-reviewer` | ByteDance compliance dimensions (Domain, License, KeyWord, Credential, Binary, Chinese); also emits the platform telemetry callback |
| `bits-code-guard` | `bits-code-guard-reviewer` | ByteDance devinfra 7-dimension defect detection: logic, business semantics, security, concurrency, robustness, performance, quality (requires `ttadk/bits_code_guard` plugin) |

**TTADK agents (unstructured output, synthesized separately):**

| Agent | Focus |
|-------|-------|
| `agent-native-reviewer` | Verify new features are agent-accessible |
| `learnings-researcher` | Search `docs/solutions/` and local learnings for past issues related to this change |

## Conditional (8 personas)

| Persona | Agent | Select when diff touches... |
|---------|-------|---------------------------|
| `security` | `security-reviewer` | Auth middleware, public endpoints, user input handling, permission checks, secrets management |
| `performance` | `performance-reviewer` | Database queries, loop-heavy data transforms, caching layers, async/concurrent code |
| `api-contract` | `api-contract-reviewer` | Route definitions, serializer/interface changes, event schemas, exported type signatures, API versioning |
| `data-migrations` | `data-migrations-reviewer` | Migration files, schema changes, backfill scripts, data transformations |
| `reliability` | `reliability-reviewer` | Error handling, retry logic, timeouts, background jobs, async handlers, health checks |
| `adversarial` | `adversarial-reviewer` | Large or high-risk diff, or auth/payments/data-mutation/external-API changes |
| `cli-readiness` | `cli-readiness-reviewer` | CLI command definitions, argument parsing, CLI framework usage, command handler implementations |
| `previous-comments` | `previous-comments-reviewer` | Bits-Code MR-only. Reviewing a Bits-Code MR that already has review comments or review threads |

## Stack-Specific Conditional (5 personas)

| Persona | Agent | Select when diff touches... |
|---------|-------|---------------------------|
| `dhh-rails` | `dhh-rails-reviewer` | Rails architecture, service objects, authentication/session choices, Hotwire-vs-SPA boundaries |
| `kieran-rails` | `kieran-rails-reviewer` | Rails controllers, models, views, jobs, components, routes, or other application-layer Ruby code |
| `kieran-python` | `kieran-python-reviewer` | Python modules, endpoints, services, scripts, or typed domain code |
| `kieran-typescript` | `kieran-typescript-reviewer` | TypeScript components, services, hooks, utilities, or shared types |
| `julik-frontend-races` | `julik-frontend-races-reviewer` | Stimulus/Turbo controllers, DOM event wiring, timers, async UI flows, animations, or frontend race risks |

## TTADK Conditional Agents (migration-specific)

| Agent | Focus |
|-------|-------|
| `schema-drift-detector` | Cross-references schema changes against included migrations to catch unrelated drift |
| `deployment-verification-agent` | Produces Go/No-Go deployment checklist with verification queries and rollback procedures |

## Selection rules

1. Always spawn all 6 always-on personas plus the 2 TTADK always-on agents. Skip `bits-code-guard-reviewer` only when the `ttadk/bits_code_guard` plugin is not installed.
2. For each cross-cutting conditional persona, read the diff and decide whether the domain is relevant.
3. For stack-specific personas, use file types and changed patterns as a starting point, not a mechanical extension match.
4. For TTADK conditional agents, spawn when the diff includes migration files or data backfills.
5. Announce the team before spawning with a one-line justification per conditional reviewer selected.

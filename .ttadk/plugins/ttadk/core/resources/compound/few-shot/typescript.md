# TypeScript Project few-shot Examples

> Default few-shot examples for TypeScript/Node.js projects.
> Used by compound on first run when no human-edited docs/ content exists.

## Entry Style Example

### Factory Pattern

LoaderFactory coordinates creation of 6 loader types (`BashLoader`, `FileLoader`, `GlobLoader`, `TaskLoader`, `TextLoader`, `AgentLoader`) via a registry lookup. Each loader self-registers via `LoaderType.register()` at module load time — callers pass a `LoaderConfig` object with `type` discriminant, factory dispatches without knowing concrete types.

Deviation: `AgentLoader` skips the registry and is instantiated directly in `AgentExecutor` — this was intentional to avoid circular deps but means it cannot be swapped via config.

**Source**: `src/loader/loader-factory.ts` [Code Direct]

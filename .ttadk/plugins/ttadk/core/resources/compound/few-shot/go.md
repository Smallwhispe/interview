# Go Project few-shot Examples

> Default few-shot examples for Go projects.
> Used by compound on first run when no human-edited docs/ content exists.

## Entry Style Example

### Retry Mechanism

All outbound RPC calls use `retry.Do(ctx, 3, 200ms, exponential)` from `pkg/retry`. The 3-attempt / 200ms-base policy is declared in `config/defaults.go:45`; individual callers override only when SLO evidence justifies it (search `retry.WithMax` for overrides — currently 2 services use 5 attempts for payment-critical paths).

**Source**: `pkg/retry/retry.go` [Code Direct]

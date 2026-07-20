# Python Project few-shot Examples

> Default few-shot examples for Python projects.
> Used by compound on first run when no human-edited docs/ content exists.

## Entry Style Example

### Test Fixture Strategy

Integration tests use a shared `TestClient` fixture (defined in `tests/conftest.py:23`) that spins up a real FastAPI app with a test database. Unit tests mock at the service layer using `unittest.mock.patch`. Fixture scope: `TestClient` is session-scoped; individual test DB transactions are function-scoped and roll back on teardown.

**Source**: `tests/conftest.py` [Code Direct]

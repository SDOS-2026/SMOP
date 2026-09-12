# Production Operations

This runbook describes the operational contract of the SMOP API and the reasoning behind its reliability controls.

## Reliability model

SMOP is a stateless HTTP service backed by PostgreSQL. Any API replica can serve a request; correctness that spans requests belongs in PostgreSQL, not process memory.

The most important business invariant is that an order cannot be committed unless all linked state changes commit together. Order creation therefore uses a serializable transaction for the feasibility read, FIFO inventory deductions, inventory ledger writes, and linked quotation update. PostgreSQL can abort a serializable transaction when concurrent work invalidates its reads; SMOP retries the entire unit of work up to three times. A non-retryable error is returned without committing partial state.

Human-readable document numbers use an atomic row per prefix and year in `sequence_counters`. The migration bootstraps each counter from existing production records before new application instances start. Rolled-back or failed non-transactional creates may leave gaps; uniqueness and concurrency safety are prioritized over gap-free numbering.

## Deployment order

1. Back up the database and verify that the latest restore test succeeded.
2. Run `npm ci` in `backend/`.
3. Apply migrations with `npm run prisma:migrate:prod`. The sequence migration is additive and bootstraps from existing rows.
4. Deploy the new application version with `RELEASE_VERSION` set to the immutable image tag or commit SHA.
5. Configure the orchestrator to use `/api/health/live` for liveness and `/api/health/ready` for readiness.
6. Wait for all new replicas to become ready, then inspect error rate, readiness failures, and latency before completing the rollout.

Do not start application replicas against the new code before the migration completes: atomic number generation depends on the `sequence_counters` table.

## Health contract

| Endpoint | Dependency check | Meaning | Failure action |
| --- | --- | --- | --- |
| `/api/health/live` | None | The Node.js event loop can answer HTTP | Restart the process after repeated failures |
| `/api/health/ready` | PostgreSQL query, 2 s deadline | The replica can serve database-backed traffic | Remove the replica from service; do not restart solely for a database outage |
| `/api/health` | None | Backwards-compatible liveness alias | Migrate callers to the explicit endpoints |

Health payloads expose the release version but not environment configuration or secrets.

## Logs and correlation

Logs are newline-delimited JSON on stdout/stderr. Ingest them through the runtime rather than writing local log files. Useful fields include `event`, `requestId`, `method`, `path`, `statusCode`, `durationMs`, and `version`. An incoming `x-request-id` is retained only if it contains 1–128 safe characters; otherwise the API creates a UUID. Return the ID in incident reports to connect a client failure to server events.

Suggested initial alerts (tune after collecting a representative baseline):

- readiness failure for 2 minutes;
- 5xx responses above 2% for 5 minutes;
- p95 request latency above 1 second for 10 minutes;
- serializable conflict retries exhausted;
- unexpected process exits or forced shutdowns;
- database connection saturation above 80%.

## Shutdown and rollback

On SIGTERM or SIGINT, the API stops accepting new connections, closes idle connections, waits for in-flight requests, then disconnects Prisma. `SHUTDOWN_TIMEOUT_MS` bounds this process and defaults to 10 seconds; the platform termination grace period should be several seconds longer.

The sequence migration is backward-compatible with the previous application version, so application rollback does not require a database rollback. Leave the counter table in place. If a deployment fails readiness, stop the rollout and restore the previous immutable application artifact.

## Required production configuration

Start from `backend/.env.example`. Production validation rejects a missing `DATABASE_URL`, a JWT secret shorter than 32 characters, or bcrypt cost below 10. Set `CORS_ORIGIN` to a comma-separated allowlist; never use a wildcard with credentialed cookies. Keep secrets in the platform secret manager, not in `.env` files or CI variables printed to logs.

## Hardening roadmap

The next highest-value systems work is deliberately documented rather than implied to be complete:

1. Add idempotency keys to externally retried create/confirm endpoints.
2. Export RED metrics and traces via OpenTelemetry; create dashboards before choosing final SLO thresholds.
3. Put distributed rate limiting at the API gateway or a shared Redis-backed limiter, especially for login and AI endpoints.
4. Add PostgreSQL integration tests in CI using an ephemeral service container, including concurrent order-confirmation tests.
5. Define and exercise backup retention, point-in-time recovery, and quarterly restore drills.
6. Replace floating-point quantities and currency with database decimals plus explicit rounding rules.

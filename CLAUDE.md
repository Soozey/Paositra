# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Non-invention rule

The DAO (Dossier d'Appel d'Offres) PDF is the sole functional and contractual reference. **No feature, role, permission, status, workflow, data, or rule absent from the DAO may be invented.** This applies to code, migrations, screens, exports, tests, and documentation. The active compliance matrix is [`docs/conformite-dao.md`](docs/conformite-dao.md). Items requiring clarification from PAOMA are tracked in [`docs/a-clarifier.md`](docs/a-clarifier.md). Technical decisions are logged in [`docs/decisions-techniques.md`](docs/decisions-techniques.md).

## Common commands

```powershell
# Install
npm install

# Development (each in a separate terminal)
npm run dev:api          # NestJS API — watch mode tsc
npm run dev:treasury     # Treasury frontend — Vite on port 5173
npm run dev:operations   # Operations frontend — Vite on port 5174

# Build all workspaces
npm run build

# Type-check all workspaces
npm run typecheck

# Run all tests (unit only)
npm run test

# Integration tests (requires a live PostgreSQL)
npm run test:integration

# Database migrations (requires DATABASE_URL or MIGRATION_DATABASE_URL)
npm run db:migrate

# OpenAPI artifact
npm run openapi:generate   # builds API first, then exports openapi.json
npm run openapi:check      # validates the generated artifact

# Start PostgreSQL only
docker compose up -d postgres

# Isolated demo stack (Jalon 1)
$env:POSTGRES_ADMIN_PASSWORD="..."
$env:PAOSITRA_OWNER_PASSWORD="..."
$env:PAOSITRA_APP_PASSWORD="..."
$env:JWT_SECRET="..."
$env:VITE_DEMO_MODE="true"
docker compose -p paositra-jalon1 up --build -d
```

### Run a single API test file

```powershell
cd apps/api
npx vitest run test/rbac.spec.ts
```

Frontend tests use jsdom; run them the same way from `apps/treasury-web` or `apps/operations-web`.

## Architecture

### Monorepo layout

```
apps/
  api/               NestJS API (TypeScript, TypeORM, PostgreSQL)
  treasury-web/      React/Vite frontend — Lot 1 Trésorerie (port 5173)
  operations-web/    React/Vite frontend — Lot 2 Opérations (port 5174/8081)
packages/
  web-core/          Shared: auth context, apiRequest(), AppShell, LoginPage, Message
database/
  migrations/        Numbered SQL files: 0001_…sql → 0013_…sql
  docker-init/       Docker PostgreSQL init scripts
docs/                Compliance matrix, technical decisions, clarifications
scripts/             migrate.mjs, seed-demo.mjs, run-postgres-integration.mjs
```

### NestJS API (`apps/api/src`)

The root `AppModule` registers two global guards (`AuthGuard`, `PermissionGuard`) applied to every route, plus four domain modules:

| Module | Scope |
|--------|-------|
| `PlatformModule` | Users, RBAC, roles, audit, idempotency |
| `AuthModule` | Login, sessions, password policy |
| `TreasuryModule` | Lot 1 — placements, institutions, billing, receivables, current accounts, budget, dashboard |
| `OperationsModule` | Lot 2 — agencies |

### PostgreSQL schemas

- `platform` — users, sessions, login_attempts, audit_events, idempotency_keys, permissions, user_permissions, rbac_role_templates
- `treasury` — institutions, placements, placement_history (+ billing, receivables, current-accounts, budget from later migrations)
- `operations` — agencies

`synchronize: false` is enforced. All schema changes go through numbered SQL migrations.

### Key cross-cutting patterns

**RBAC** — Use the `@RequirePermission('code')` decorator on controller methods. The global `PermissionGuard` checks user permissions loaded at login. Scoped permissions (organ, direction, agency, counter) are compared against route params. All current RBAC roles and permissions are marked `proposition_a_valider`; no contractual matrix has been validated.

**Audit** — Every write must call `AuditService.record()` inside the same transaction, capturing `actorUserId`, `sessionId`, `action`, `objectType`, `objectId`, `beforeState`, `afterState`. The `audit_events` table is append-only.

**Idempotency** — `IdempotencyInterceptor` (in `PlatformModule`) deduplicates mutating requests using an `Idempotency-Key` header (UUID). The frontend sends it automatically via `apiRequest(..., { idempotent: true })`.

**No physical deletion** — Sensitive records (placements, institutions, agencies) use status transitions and `archivedAt`/`closedAt` timestamps instead of DELETE.

**Error format** — All API errors follow Problem Details (RFC 7807) via `ProblemDetailsFilter`. Avoid leaking internal details in error messages.

**Optimistic locking** — Entities use TypeORM `@VersionColumn()`. Pass `version` in action DTOs and handle `ConflictException` (HTTP 409) on the frontend.

### Frontend pattern (`packages/web-core`)

- `useAuth()` hook provides `token`, `user`, `hasPermission()`, `clearSession()`.
- `apiRequest<T>(path, { token, method, body, idempotent })` wraps `fetch` and throws `ApiError` on non-2xx.
- Each frontend checks `auth.hasPermission('domain:resource:action')` before rendering write forms or calling mutating routes.
- `VITE_DEMO_MODE=true` activates presentation mode with a visible banner; no business data is created or seeded.

### Migration rules

- Never modify an applied migration (checksums are verified by `scripts/migrate.mjs`; a mismatch throws).
- Name new migrations sequentially: `0014_short_description.sql`.
- The runner uses `pg_advisory_lock(26005)` to prevent concurrent runs.
- Always back up before running on a database that contains data.

### Environment

Copy `.env.example` to `.env` and fill in all values. The API requires `DATABASE_URL`; migrations use `MIGRATION_DATABASE_URL` (falls back to `DATABASE_URL`). Two database roles are expected: `paositra_owner` (migrations) and `paositra_app` (runtime). The bootstrap script requires `CONTROLLED_BOOTSTRAP_ENABLED=true` and explicit identity/permission lists; it creates nothing automatically.

### Local URLs (demo stack)

| Service | URL |
|---------|-----|
| API | `http://127.0.0.1:3000` |
| Lot 1 Trésorerie | `http://127.0.0.1:8080` |
| Lot 2 Opérations | `http://127.0.0.1:8081` |

The generated OpenAPI artifact is `docs/openapi/openapi.json`. Swagger UI is not exposed in the Docker production image.

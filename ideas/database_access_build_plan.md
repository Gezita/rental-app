# Database Access Build Plan

## Context

The application is a TypeScript monolith that already runs locally with Docker Compose and a PostgreSQL database.

The goal is to keep local developer testing simple with Docker Compose, while also supporting a hosted Neon PostgreSQL database for staging and live environments.

The intended model is:

```text
Local development  -> Docker Compose Postgres
Staging / Live     -> Neon Postgres
Same app code      -> Different DATABASE_URL values per environment
```

---

## Phase 1 — Standardize Environment Configuration

### Goal

Make the application database-agnostic so it connects to whichever database is provided through environment variables.

### Actions

- Ensure the application reads its database connection from `DATABASE_URL`.
- Avoid hardcoded database hostnames, usernames, passwords, or ports in the TypeScript code.
- Keep `.env` files out of source control.
- Commit only safe example files.

### Recommended files

```text
.env.example
.env.local.example
.env.staging.example
.env.production.example
```

### Local example

```env
NODE_ENV=development
DATABASE_URL=postgresql://local_user:local_password@postgres:5432/rental_app
DIRECT_DATABASE_URL=postgresql://local_user:local_password@postgres:5432/rental_app
```

### Neon staging/live example

```env
NODE_ENV=staging
DATABASE_URL=postgresql://app_user:password@pooled-neon-host/rental_app?sslmode=require
DIRECT_DATABASE_URL=postgresql://migration_user:password@direct-neon-host/rental_app?sslmode=require
```

### Acceptance criteria

- The app runs locally using the Docker Compose database.
- The same app code can connect to Neon by changing only environment variables.
- No real credentials are committed to the repository.

---

## Phase 2 — Separate Runtime and Migration Connections

### Goal

Prepare the app for safer database access by separating normal application traffic from schema changes.

### Why this matters

The running app should not need the same level of database permission as the migration process.

A good split is:

```text
DATABASE_URL          -> used by the running application
DIRECT_DATABASE_URL   -> used by migrations, schema changes, and administrative DB tasks
```

### Actions

- Update the app to use `DATABASE_URL` for normal runtime queries.
- Update the migration tool to use `DIRECT_DATABASE_URL`.
- Use the same local database for both values during development if needed.
- Use different Neon users for staging/live.

### Recommended role model

```text
app_user
  - Used by the application
  - Can read and write application data
  - Should not manage schema

migration_user
  - Used by migration scripts or deployment process
  - Can create, alter, and drop database objects
  - Should not be used by the running app
```

### Acceptance criteria

- Runtime database access and migration database access are configured separately.
- The application does not require schema-owner credentials to run.
- Migrations can still be executed locally and against Neon.

---

## Phase 3 — Add Neon Staging

### Goal

Introduce Neon in a safe non-production environment before using it for live data.

### Actions

- Create a Neon project or branch for staging.
- Create a staging database.
- Create a staging `app_user`.
- Create a staging `migration_user`.
- Store the Neon pooled connection string as `DATABASE_URL` in the staging hosting environment.
- Store the Neon direct connection string as `DIRECT_DATABASE_URL` in the staging hosting environment.
- Run migrations against Neon staging.
- Deploy the app to staging and verify connectivity.

### Recommended Neon connection usage

```text
Pooled Neon URL   -> application runtime
Direct Neon URL   -> migrations, pg_dump, pg_restore, admin tasks
```

### Testing checklist

- App can connect to Neon staging.
- SSL is enabled with `sslmode=require`.
- Migrations run successfully.
- The app does not expose database errors or credentials in responses.
- The app does not log the full connection string.

### Acceptance criteria

- Staging uses Neon successfully.
- Local development still uses Docker Compose PostgreSQL.
- The same codebase works in both environments.

---

## Phase 4 — Secure Credential Handling

### Goal

Reduce the chance of leaking Neon credentials and limit damage if a credential is exposed.

### Actions

- Add the following to `.gitignore`:

```gitignore
.env
.env.local
.env.staging
.env.production
.env.*.local
```

- Store real Neon credentials only in:
  - local developer `.env` files
  - hosting provider secret/environment variable storage
  - GitHub Actions secrets, if CI/CD needs Neon access
- Never place Neon URLs in:
  - source code
  - frontend code
  - Dockerfile
  - committed Docker Compose files
  - README screenshots
  - logs
  - GitHub issues
  - Slack or chat messages

### Logging guidance

Do not log this:

```ts
console.log(process.env.DATABASE_URL);
```

If database config must be logged, redact secrets:

```ts
console.log({
  databaseConfigured: Boolean(process.env.DATABASE_URL),
});
```

### Acceptance criteria

- Secrets are not committed.
- Secrets are not logged.
- Production/staging secrets are managed through the deployment platform or secret manager.
- Developers understand that Neon URLs are sensitive credentials.

---

## Phase 5 — Add CI Testing

### Goal

Make pull requests safer by running automated tests against a clean database.

### Recommended first approach

Use a temporary PostgreSQL service inside GitHub Actions instead of Neon.

This keeps CI isolated, fast, and inexpensive.

```text
Pull request
  -> Start temporary Postgres service
  -> Run migrations
  -> Run tests
  -> Destroy temporary database automatically
```

### Actions

- Add a GitHub Actions workflow for tests.
- Start a temporary Postgres service in the workflow.
- Set `DATABASE_URL` to the temporary test database.
- Run migrations.
- Run tests.

### Optional future approach

Later, add Neon branch-based testing:

```text
Pull request
  -> Create Neon branch
  -> Run migrations
  -> Run tests
  -> Delete Neon branch
```

This is useful when you want test infrastructure closer to staging/production.

### Acceptance criteria

- Pull requests run automated tests.
- Tests do not depend on developer machines.
- Tests do not use production or staging data.

---

## Phase 6 — Prepare Neon Production

### Goal

Create a clean production database setup that is separate from local and staging.

### Actions

- Create a dedicated Neon production environment.
- Do not reuse staging credentials.
- Create production `app_user`.
- Create production `migration_user`.
- Store production `DATABASE_URL` securely in the hosting platform.
- Store production `DIRECT_DATABASE_URL` securely in the deployment or migration environment.
- Run production migrations through a controlled deployment process.

### Production separation

Use separate values for:

```text
local DATABASE_URL
staging DATABASE_URL
production DATABASE_URL
```

And separate users for:

```text
staging app_user
staging migration_user
production app_user
production migration_user
```

### Acceptance criteria

- Production has its own database and credentials.
- Production credentials are not available in local `.env` files unless explicitly required by a trusted operator.
- The app can be deployed without exposing database credentials.

---

## Phase 7 — Database Permissions Hardening

### Goal

Apply least privilege to database users.

### Recommended permission model

#### `app_user`

Should usually have:

```text
CONNECT
USAGE on required schemas
SELECT
INSERT
UPDATE
DELETE
USAGE / SELECT on required sequences
```

Should not have:

```text
SUPERUSER
CREATEDB
CREATEROLE
Schema ownership
Unnecessary DROP / ALTER permissions
```

#### `migration_user`

Can have permissions required to:

```text
CREATE TABLE
ALTER TABLE
DROP TABLE
CREATE INDEX
ALTER INDEX
Manage schema changes
```

### Actions

- Review actual permissions granted to Neon users.
- Remove unnecessary admin privileges from the runtime app user.
- Use the migration user only in migration jobs or controlled deployment steps.

### Acceptance criteria

- The live app does not connect using an owner/admin role.
- Schema-changing credentials are not used by the running application.
- A leaked runtime credential has limited blast radius.

---

## Phase 8 — Backups, Rotation, and Recovery

### Goal

Prepare for real operational issues before the app has important live data.

### Actions

Document the process for:

- rotating Neon credentials
- restoring from backup
- responding to leaked credentials
- validating migrations before production
- controlling who has access to the Neon dashboard
- removing access when a developer leaves

### Credential leak playbook

If a Neon connection string is leaked:

```text
1. Rotate or revoke the exposed database password.
2. Update the secret in the hosting platform.
3. Redeploy the application.
4. Check application logs and database activity for suspicious access.
5. Search Git history, issues, tickets, and logs for the leaked value.
6. Remove or rewrite exposed secrets where possible.
7. Create a new credential if needed.
8. Document what happened and how to prevent it again.
```

### Acceptance criteria

- There is a documented recovery path for leaked credentials.
- The team knows how to rotate Neon credentials.
- Backups and restore expectations are understood before production use.

---

## Recommended Build Order

```text
1. Standardize environment configuration
2. Separate runtime and migration database URLs
3. Add Neon staging
4. Secure credential handling
5. Add CI testing with temporary Postgres
6. Prepare Neon production
7. Harden database permissions
8. Document backup, rotation, and recovery process
```

---

## Final Target Architecture

```text
Developer laptop
  -> TypeScript monolith
  -> Docker Compose Postgres
  -> Local .env

CI pipeline
  -> TypeScript monolith
  -> Temporary Postgres service
  -> Test DATABASE_URL from GitHub Actions env

Staging
  -> Hosted TypeScript monolith
  -> Neon staging database
  -> Staging DATABASE_URL and DIRECT_DATABASE_URL from hosting secrets

Production
  -> Hosted TypeScript monolith
  -> Neon production database
  -> Production DATABASE_URL and DIRECT_DATABASE_URL from hosting secrets
```

---

## Key Principle

The database location should change by environment, but the application code should not.

```text
Change environment variables, not application logic.
```

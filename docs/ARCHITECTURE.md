# ARCHITECTURE: Lawyer Management System

This document outlines the core technical architecture, database access boundaries, and per-request security patterns of the system.

---

## 1. Multi-Tier Database Role Separation

To satisfy defense-in-depth and Row-Level Security requirements, database access is segregated across three distinct roles:

```
[ PostgreSQL Instance: lms_dev ]
       │
       ├── 1. lms_owner (Container/Superuser)
       │      • Owns the database and schemas
       │      • Used only for initial container initialization and emergency DBA recovery
       │
       ├── 2. lms_migrator (Privileged Migration Role)
       │      • Runs `prisma migrate` and initial schema setup
       │      • Has DDL permissions (CREATE, ALTER, DROP tables/views/indexes)
       │      • Never used by runtime application web requests
       │
       └── 3. lms_app (Restricted Runtime Application Role)
              • Strictly non-superuser (`rolsuper = false`)
              • Cannot bypass RLS (`rolbypassrls = false`)
              • NO DDL permissions
              • Granted `SELECT, INSERT, UPDATE, DELETE` on case-scoped tables through RLS policies
              • Granted **INSERT only** on `audit_events` (denied `UPDATE` and `DELETE` at engine level)
```

---

## 2. Per-Request User Context Pattern (`withUserContext`)

Direct Prisma queries against protected tables without user context are prohibited. Every protected business query must execute within a transactional boundary setting the PostgreSQL session context:

```typescript
// Shared helper pattern: lib/database/context.ts
import { prisma } from "@/lib/database/client";

export async function withUserContext<T>(
  userId: string,
  fn: (tx: PrismaTransaction) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(async (tx) => {
    // 1. Set local transaction-scoped context variable
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.user_id', $1, true);`,
      userId
    );

    // 2. Execute user query subject to RLS policies
    return await fn(tx);
  });
}
```

### Invariants:
* `set_config('app.user_id', ..., true)` scopes the context variable strictly to the current transaction (`is_local = true`).
* When no transaction context is set (e.g. an unauthenticated request or naked query), `current_setting('app.user_id', true)` returns `NULL`, causing RLS policies to evaluate to `false` and return **0 rows**.

---

## 3. Data Model Invariants

Every domain entity table adheres to standard metadata and concurrency columns:

| Column | Type | Purpose |
| :--- | :--- | :--- |
| `id` | `UUID` | Cryptographically random unique identifier |
| `createdAt` | `timestamptz` | Immutable creation timestamp |
| `updatedAt` | `timestamptz` | Automatic update timestamp |
| `deletedAt` | `timestamptz?` | Soft delete marker (preserves relational integrity) |
| `rowVersion` | `Int` | Optimistic locking counter (prevents concurrent overwrite conflicts) |

---

## 4. Audit Log Immutability

The `audit_events` table captures security and compliance events:
* **Append-Only Grant:** The `lms_app` database role possesses only `INSERT` and `SELECT` grants on `audit_events`.
* Attempts by the runtime application to perform `UPDATE` or `DELETE` on `audit_events` fail at the database engine level.
* No passwords, auth tokens, or client confidential attachment keys are ever recorded in audit payloads.

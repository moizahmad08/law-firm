# Milestone 1: Secure Foundation for Lawyer Management System

Copy everything below into Google Antigravity.

---

## Project context

Build a professional, modular Lawyer Management System for a law office in Pakistan. Development takes place locally on Windows (WSL2 recommended) and the hosting provider is not yet chosen. I will supervise you and review work in small milestones.

Read these files fully before making any decision, and follow them:
- docs/MASTER_SPEC.md (complete requirements; do not silently remove, weaken or reinterpret anything)
- docs/SECURITY_RULES.md (non-negotiable security rules)
- docs/IMPLEMENTATION_PLAN.md (milestones and acceptance criteria)
- docs/DECISIONS.md (record every architectural choice you make here)

## Technology

- Next.js App Router, TypeScript
- Tailwind CSS with accessible, responsive components
- Local PostgreSQL
- Prisma ORM with version-controlled migrations
- Server-side authentication and authorization using an established auth library recorded in docs/DECISIONS.md (D1). Do not write custom password hashing or session handling.
- Vitest for unit and authorization tests; Playwright set up for later end-to-end tests
- Git

Keep the architecture compatible with a future hosting decision. Do not hard-code a cloud provider.

## Required deliverables

1. Inspect the existing project. Present the proposed architecture and file changes and wait for my approval before major changes.
2. Keep docs/MASTER_SPEC.md, docs/IMPLEMENTATION_PLAN.md and docs/SECURITY_RULES.md intact. Add choices to docs/DECISIONS.md.
3. Configure local environment variables (.env.example with placeholders only), database connectivity and migrations.
4. Define roles: Super Admin/developer, Office Admin/senior lawyer, Lawyer, optional Assistant/clerk, Finance Admin, and a permission model.
5. Create initial models: users, clients, cases (include a restricted-case flag from the start), case assignments, configurable case statuses (Draft, Active, Awaiting Hearing, Awaiting Client, Judgment Reserved, Decided, Appealed, Closed) and audit events.
6. Implement a responsive application shell, login screen and role-aware dashboard placeholders. No public registration; admin-created accounts only. MFA (TOTP) for Super Admin, Office Admin and Finance Admin.
7. Enforce authorization on the server and in the database:
   - PostgreSQL Row-Level Security enabled and forced on case-scoped tables.
   - The app connects as a restricted, non-owner database role that cannot bypass RLS.
   - A single shared helper runs each request's protected queries in a transaction that sets the user context (for example SET LOCAL app.user_id). Direct Prisma access to protected tables outside this helper is not allowed.
   - Migrations and seeds use a separate privileged role.
8. Super Admin has no default access to case content. Implement break-glass access as a stub that records audit events.
9. Make the audit table append-only at the database permission level (app role: INSERT only). Never log secrets or passwords.
10. Ensure lawyers cannot access unassigned or restricted cases. Add automated tests for cross-user and cross-role access, a no-user-context query returning zero rows, and audit-table immutability.
11. Use fictional seed data only. No public registration, real client documents or live external messaging.
12. Add input validation, safe error handling, database constraints and migration instructions.
13. Write a README covering local startup, database setup, required environment variables, running migrations and seed, and running tests.
14. Run tests, lint, type-check and the production build. Report the actual results and any unresolved failures. Do not hide or weaken failing checks.

## Non-negotiable security requirements

- Deny access by default.
- Enforce permissions on the server before returning protected records.
- Never expose secrets in source control, browser code or logs.
- Preserve audit history.
- Do not introduce automatic client-message or external-document sending.
- Every external document share requires explicit lawyer approval.
- Never store attachment passwords in audit logs.
- Keep document storage private and prepare a storage abstraction for future local/cloud portability.

## Scope boundaries

Do not implement the whole product in one pass. Do not add live WhatsApp, SMS or email sending, AI document processing, OCR, Google Calendar integration, legal research, document generation, finance modules or hosting configuration in this milestone.

First present the proposed architecture and file changes. Implement incrementally, run tests as you go, and summarize changed files and results after each step.

## Completion criteria

Milestone 1 is complete only when:
- the app starts locally;
- database migrations apply cleanly on an empty database;
- fictional seed data loads;
- authentication and permissions are documented;
- critical authorization tests pass (unassigned and restricted cases are inaccessible, no-context queries return nothing, audit rows cannot be updated or deleted);
- lint, type-check and production build results are reported honestly;
- setup instructions in the README are reproducible on a clean machine.

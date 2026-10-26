# AGENT_RULES: Lawyer Management System

These rules govern the AI agent's actions during the implementation of the Lawyer Management System.

## 1. Operating Routine
1. Work in small, reviewable increments.
2. Present a clear plan with files, dependencies, and test coverage before major changes, and wait for owner review.
3. Keep specification documents (`docs/MASTER_SPEC.md`, `docs/SECURITY_RULES.md`, `docs/IMPLEMENTATION_PLAN.md`) intact and verbatim.
4. Record all architectural choices, library selections, and design decisions in `docs/DECISIONS.md`.
5. Run quality checks (`lint`, `typecheck`, `test`, `build`) and report actual command outputs honestly.

## 2. Red Flags & Prohibited Actions
Stop immediately and reject any proposed change that attempts to:
- Delete, skip (e.g. `.skip`), comment out, or weaken any test to make the suite pass.
- Connect the application as `lms_owner`, `postgres`, or any superuser role.
- Use `BYPASSRLS` or write a `SECURITY DEFINER` function without a fixed search path.
- Introduce secrets, tokens, private keys, or passwords into code, logs, audit records, or client bundles.
- Add a public registration or self-signup route (`/register`, `/signup`). All accounts must be admin-created.
- Call real email, SMS, WhatsApp, or AI services before their authorized milestone and without sandbox gating.
- Modify `docs/MASTER_SPEC.md` or `docs/SECURITY_RULES.md` to dilute security or business requirements.

## 3. Database & Access Control Standards
- Enforce permissions on the server and in PostgreSQL with Row-Level Security (RLS).
- All queries touching protected data must run through the single shared context helper (e.g. `withUserContext`) setting `app.user_id`.
- The application role (`lms_app`) must have `INSERT`-only permissions on `audit_events` (no `UPDATE`, no `DELETE`).
- Migrations and seeding must run under a separate privileged role (`lms_migrator`).

## 4. Verification Mandate
A milestone or task is never complete based on claims alone. It is complete only when:
- `npm run lint` passes with 0 errors.
- `npm run typecheck` (`tsc --noEmit`) passes with 0 errors.
- `npm test` passes with all tests green.
- `npm run build` succeeds cleanly.

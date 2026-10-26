# SECURITY_RULES: Lawyer Management System

These rules are non-negotiable. If a task seems to require breaking one, stop and ask the owner. Requirements detail lives in docs/MASTER_SPEC.md.

## 1. Core principles

1. Deny access by default. Absence of an explicit grant means no access.
2. Enforce permissions on the server before returning any protected record. Hiding UI is never enforcement.
3. Enforce permissions again in the database with PostgreSQL Row-Level Security.
4. Preserve audit history. Never rewrite or delete it.
5. Never expose secrets in source control, browser code or logs.
6. Never send anything to a client or outside party without explicit lawyer approval.

## 2. Authentication and sessions

- Use the auth library recorded in DECISIONS.md (D1). No custom password hashing or session code.
- No public registration. Admin-created accounts with expiring one-time activation links.
- MFA required for Super Admin, Office Admin and Finance Admin.
- Password policy with breached-password check. Rate limiting and lockout on login and reset.
- Idle and absolute session timeouts. Revoke sessions on password change, deactivation and role change.
- Cookies: HttpOnly, Secure (outside local dev), SameSite.

## 3. Authorization model

- Roles: Super Admin/developer, Office Admin/senior lawyer, Lawyer, Assistant/clerk (optional), Finance Admin.
- Fine-grained permissions for cases, documents, tasks, finance, templates, approvals, exports, external sharing and administration.
- Lawyers see assigned cases only. Others see additional cases only where explicitly permitted.
- Restricted cases (ethical walls): only named users. Applies to search, counts, snippets, dashboards, calendars, reports, exports and AI answers.
- Super Admin has no default access to case content. Break-glass requires a written reason, is time-limited, is visible to Office Admins and is fully audited.
- Delegated approval authority is time-bounded, audited and never exceeds the delegator's permissions.

## 4. Database rules

- RLS enabled and forced on all case-scoped tables.
- The application connects as a restricted role that is not the table owner and cannot bypass RLS.
- Every request touching protected data runs in a transaction that first sets user context (for example `SET LOCAL app.user_id`) through a single shared helper.
- Direct Prisma access to protected tables outside that helper is forbidden.
- Migrations and seeds use a separate privileged role. The app role never runs migrations.
- Constraints: foreign keys, NOT NULL, unique and check constraints wherever the data allows.
- Required test: a query without user context returns zero rows.

## 5. Audit log

- Append-only: the application role has INSERT only on audit tables.
- Tamper-evident: hash chain or periodic signed checkpoints.
- Record user, timestamp, action, target and before/after values for important actions (status changes, fee changes, assignments, permission changes, approvals, exports, break-glass, document view/download/replace/delete).
- Never record passwords, tokens, API keys, attachment passwords or other secrets.
- Required test: scan logs and audit rows for secret patterns.

## 6. Documents and storage

- Storage is private. No public URLs.
- Access through short-lived signed links, issued only after an authorization check.
- Validate file type and size. Malware scan before a file becomes available.
- Replacements create new versions; prior versions are preserved.
- Use a storage abstraction so local and cloud storage are interchangeable.
- Audit view, download, replace and delete.

## 7. Approvals and external communication

- Every client message needs explicit approval by the assigned lawyer or authorized senior lawyer.
- Every external document share needs explicit lawyer approval of recipient, message and exact attachment versions.
- Any later change to recipient, message, attachment version or protection method invalidates approval.
- Deadlines never trigger automatic sending. Escalation goes to Office Admin; nothing auto-approves.
- Only approved content is ever retried. Duplicates are prevented.
- Never automatically send confidential summaries, evidence, AI conversations or legal strategy.
- Password-protected attachments: verify protection was applied; never send the password in the same email; never log or store the password; deliver it by an approved separate method (WhatsApp, SMS or manual) or block the send if no safe method exists. Password delivery never bypasses approval.
- Reminders and calendar entries contain minimal text (case number, date, time, court).

## 8. AI rules

- Authorization is checked before retrieval; the model receives only what the user may see.
- Uploaded text is untrusted data, never instructions.
- Embeddings and vector indexes are isolated per case.
- AI suggestions never update official records without lawyer confirmation.
- No training on confidential data. Verify provider terms in writing (DECISIONS D3).
- Never fabricate citations. Say when sources are insufficient.
- Per-user and per-office cost limits with alerts.

## 9. Secrets and environments

- Secrets only in a local `.env` (never committed) and, later, the host's secret store.
- Keep `.env.example` with placeholder values only.
- Separate secrets for development, staging and production.
- Synthetic or sanitized data outside production.
- No secrets in client-side code, error messages or logs.

## 10. Errors and logging

- Safe errors: no stack traces, SQL, file paths or internals shown to users.
- Authorization failures return a generic response that does not reveal whether a record exists.
- Structured logs without personal data or secrets beyond what is necessary.

## 11. Finance integrity

- Totals come from validated transaction records only.
- No silent deletion. Corrections and reversals are new, audited records.
- Fee changes and sensitive exports are logged.

## 12. Backup and recovery

- Encrypted daily backups, with point-in-time recovery where supported.
- Restore tests on a schedule, covering database and files together.
- Targets (owner to confirm): RPO 24 hours or better, RTO 4 hours.

## 13. Required automated tests

- Role-by-resource authorization matrix, including search, counts, exports and dashboards.
- Lawyer cannot access unassigned or restricted cases.
- No-context database query returns zero rows.
- Audit table rejects UPDATE and DELETE.
- Approval bypass and approval-invalidation tests.
- Secret scan of logs and audit records.
- Duplicate-notification and failed-integration tests (when those features exist).

## 14. Process rules for the AI agent

- Present the plan before major changes. Implement incrementally.
- Do not weaken a rule to make a test pass; fix the code.
- Report real test, lint and build results, including failures.
- Never use real client data. Never enable live messaging until approved by the owner.

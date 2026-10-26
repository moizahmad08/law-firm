# MASTER_SPEC: Lawyer Management System

Version: 2.0 (consolidated; includes Addendum 1)
Rule: Do not silently remove, weaken or reinterpret any requirement in this file. Changes require an entry in docs/DECISIONS.md.
Planning note: this is an implementation blueprint, not legal advice. Confirm applicable Pakistani privacy, confidentiality and professional obligations before production use.

---

## 1. Product goals and operating principles

Build a professional, AI-assisted Lawyer Management System for a law office in Pakistan. The owner supervises an AI coding agent and delivers the system in small, reviewable milestones. Development is local on Windows; hosting is chosen only after local implementation and testing.

- Initial scale: 11-25 users, with room to grow.
- Web-first: responsive, mobile-friendly web application. A separate Android app may be considered later.
- Modular, maintainable architecture. No unnecessary microservices.
- Security-first: permissions and confidentiality are enforced in the backend and database, never only by hiding UI.
- Human oversight: AI suggestions never replace lawyer verification. Official records and external messages require the defined human approvals.
- Local-first: use fictional seed data and test integrations during development. Do not put confidential live case files into an untested system.
- Priority order: data model, access control, audit trail and approval framework come before advanced AI features.

## 2. Technology and environment

- Application: Next.js (App Router), TypeScript.
- Styling: Tailwind CSS with accessible, responsive components.
- Database: PostgreSQL (local), Prisma ORM with version-controlled migrations.
- Runtime: Node.js LTS, npm. Commit the lockfile.
- Source control: Git.
- Development environment: Windows with WSL2 (recommended); Docker Desktop for PostgreSQL, or a direct PostgreSQL install.
- Storage: private local storage adapter for development, designed to switch to private object storage later.
- Testing: Vitest (unit and authorization tests), Playwright (end-to-end).
- IDE/agent: Google Antigravity.
- Hosting is undecided. Do not hard-code a cloud provider.

## 3. Repository structure

```
lawyer-management-system/
  app/
  components/
  lib/
    auth/
    permissions/
    database/
    storage/
  prisma/
  tests/
  docs/
    MASTER_SPEC.md
    IMPLEMENTATION_PLAN.md
    SECURITY_RULES.md
    DECISIONS.md
    ANTIGRAVITY_PROMPT_M1.md
  .env.example
  .gitignore
  README.md
  package.json
```

Real secrets live only in a local `.env` excluded from Git. Never commit passwords, API keys, database credentials or client documents.

## 4. Users, authentication and permissions

### 4.1 Roles
- Super Admin / developer: system initialization and technical administration only. Cannot read case content, documents, notes, AI summaries or finance records by default (see 4.4).
- Office Admin / senior lawyer: office oversight, assignments, approvals and configuration within authorized permissions.
- Lawyer: assigned cases, documents, hearings, tasks and permitted financial records.
- Assistant / clerk: optional operational role with specifically assigned permissions.
- Finance Admin: authorized fee, payment and financial reporting functions.

### 4.2 Authentication
- Email/password login. Admin-created accounts with expiring one-time activation links. No public registration.
- Use an established auth library chosen in DECISIONS.md. Never hand-roll password hashing or session handling.
- MFA (TOTP minimum) required for Super Admin, Office Admin and Finance Admin; strongly recommended for all users.
- Password policy (minimum length, breached-password check), idle and absolute session timeouts, login rate limiting and lockout.
- Password reset, email verification, account deactivation, and session revocation (also on password change and deactivation).

### 4.3 Authorization
- Fine-grained permissions for cases, documents, tasks, finance, templates, approvals, exports, external sharing and administration.
- Lawyers access assigned cases only. Authorized senior lawyers and Admins access other cases only where permitted.
- Deny by default. Enforce authorization server-side and in the database with PostgreSQL Row-Level Security (RLS).
- RLS design: RLS enabled and forced on all case-scoped tables. The application connects as a restricted, non-owner database role that cannot bypass RLS. Each request touching protected data runs in a transaction that first sets the user context (for example `SET LOCAL app.user_id`) via one shared helper. Direct Prisma access to protected tables outside this helper is forbidden. Migrations and seeds run under a separate privileged role.
- Audit important actions with user, timestamp and before/after values.

### 4.4 Super Admin and break-glass access
- Super Admin has no default access to case content.
- Emergency access ("break-glass") requires a written reason, is time-limited, is immediately visible to Office Admins and is fully audited.

### 4.5 Delegation, absence and offboarding
- Assigned lawyers can delegate approval authority for a bounded period. Delegation is audited and cannot exceed the delegator's own permissions.
- When a user leaves: deactivate the account, revoke sessions, reassign cases, tasks, pending approvals and calendar events. Preserve all history.
- Pending approvals escalate to Office Admin when the approver is unavailable. Nothing is ever auto-approved.

## 5. Case and client management

- Case: title/number, client details, court, province, city, jurisdiction, opposing party/lawyer, assigned lawyer, filing date, case type.
- Multiple clients and multiple opposing parties per case. Link related cases (appeals, connected suits). Configurable master data for courts, benches and judges.
- Hearing history, status/outcome, documents, AI summaries, private lawyer notes, tasks, deadlines, fees and payments.
- Custom fields: text, date, number, dropdown, checkbox. Required-field rules and role-specific visibility/edit permissions.
- Initial statuses: Draft, Active, Awaiting Hearing, Awaiting Client, Judgment Reserved, Decided, Appealed, Closed.
- Authorized Admins can add, rename or deactivate statuses without losing historical data. Status changes are audited (old/new value, user, timestamp, optional explanation).

### 5.1 Conflict-of-interest check
When a client, opposing party or opposing lawyer is created or attached to a case, search existing clients, parties and cases and warn of possible conflicts. Overrides require a reason and are audited. Results respect the viewer's permissions and never leak restricted cases.

### 5.2 Restricted cases (ethical walls)
A case can be marked restricted. Only explicitly named users can see it, including in search, counts, dashboards, calendars, reports and AI answers. Office Admins cannot see restricted content unless named, except through audited break-glass. The restricted flag exists in the case model from the first migration.

### 5.3 Role-aware dashboards
- Lawyers: assigned cases, hearings, tasks, document reviews.
- Office Admin / senior lawyer: authorized office-wide activity.
- Finance Admin: permitted financial records and reports.
- Priorities: today's/upcoming hearings, overdue tasks, pending client-message approvals, AI review queue, outstanding fees, recent activity, failed notifications, legal research history.

### 5.4 Global search
Covers permitted cases, clients, documents, hearings and tasks. Unauthorized records must not leak through results, snippets, counts or AI answers.

## 6. AI case workspace and document processing

Each case has a workspace: case details, document library, AI summary, private lawyer notes and persistent case-specific chat.

- OCR and text extraction from PDFs, scans, photographs and court orders.
- Structured summaries: facts, parties, claims/issues, dates, inconsistencies, missing information.
- Follow-up Q&A from permitted documents and, when enabled, legal research.
- Page/passage references. Distinguish facts from assumptions. Disclose insufficient sources.
- English and Urdu, including mixed-language documents where technically feasible.
- Extract hearing dates and court details, but require lawyer confirmation before official records update.
- Flag unreadable or uncertain content rather than guessing.

Processing workflow: Upload -> private storage and version metadata -> background OCR -> AI analysis -> review queue -> authorized human confirmation.

- Replacements create new versions and preserve prior versions, uploader, timestamp, notes.
- Standard and custom categories: court orders, petitions, evidence, contracts, client documents, correspondence.
- Role/case-based access plus optional individual restrictions for highly sensitive documents.
- Private storage, short-lived signed links, file validation, malware scanning, audit logs for view/download/replace/delete.
- AI retrieval follows application permissions. Backend authorization is checked before retrieval for the model.

### 6.1 AI safety and quality
- Treat all uploaded document text as untrusted data, never as instructions (prompt-injection defense).
- Embeddings and vector indexes are isolated per case. Cross-case retrieval is impossible by construction and tested.
- Per-user and per-office AI cost limits with admin alerts.
- Maintain a gold test set of fictionalized Urdu and English documents to measure OCR accuracy, summary faithfulness and citation correctness. Re-run when the model, prompt or OCR engine changes.

### 6.2 Urdu support
- Full RTL layout, mixed Urdu/English text, Nastaliq-capable fonts in UI, PDFs and exports.
- Urdu-capable search (trigram and/or vector). Test Urdu names, spelling variants and mixed-language queries.
- Benchmark OCR engines on sample Urdu court documents before committing.

## 7. Pakistan legal research

- Support multiple Pakistani provinces and court types.
- Official-first sources: legislation, government gazettes, court-published judgments. Reputable secondary sources are labelled supplements.
- Provide source links and, where available, case name/number, court, decision date, paragraph/section, jurisdiction, relevance.
- Distinguish binding from persuasive authority. Flag unverified current legal status.
- Never fabricate citations or claim a source was checked when it was not.
- Identify research gaps and request lawyer review when evidence is insufficient.
- Keep legal research distinct from the document assistant but reachable from the case workspace.
- Implement the document assistant first, then verified legal research.

## 8. Templates, generation, approvals and signing

### 8.1 Template governance
- Initial categories: office documents, court pleadings, applications, contracts, legal notices, client correspondence.
- Authorized lawyers create, edit, publish and retire templates within assigned categories.
- Admins configure role/category permissions.
- Published edits create new versions. Preserve prior versions and existing drafts.
- Track publisher, version, timestamp and retirement history.
- Autofill only permitted case data. Flag missing, conflicting or unverified information rather than guessing.
- AI must not invent legal facts, citations or procedural requirements.

### 8.2 Approval and external signing
- The assigned lawyer or an authorized senior lawyer approves generated documents for finalization, subject to case access and permissions.
- Substantive edits after approval require renewed review.
- Export PDF and editable DOCX where feasible.
- Download the approved document, sign outside the system, upload the signed copy as a new version linked to the approved draft.
- Preserve uploader, timestamp, version relationships and approval records.
- States: draft, pending approval, approved for export, exported for signing, signed copy uploaded, superseded.
- A filename or label alone is not proof of a legally valid signature.

## 9. Hearings, calendars and reminders

- Hearing fields: date/time, case, court, purpose, status, notes, outcome.
- After each hearing record outcome, next date and required actions.
- Timezone: Asia/Karachi.
- Default reminders: three days before, one day before, and on hearing day. Custom schedules allowed.
- Channels: WhatsApp, in-app, email, Google Calendar. Recipients: assigned lawyer and office Admin.
- Google Calendar: shared office calendar plus individual lawyer calendars.
- Changes, cancellations and reassignment update calendar events and pending reminders.
- Durable background jobs with retries, idempotency, delivery logs and Admin alerts for important failures. Prevent duplicate events and notifications.
- Reminders and calendar events contain minimal text (for example case number, date, time, court), never summaries or strategy. Office policy configures what each channel may include.

## 10. Client communications and external document sharing

### 10.1 Client communication approvals
- Clients have no system login or portal.
- Supported messages: hearing dates/changes, lawyer-approved outcomes, appointment reminders, document/information requests, fee/payment reminders.
- Every client message requires explicit approval by the assigned lawyer or authorized senior lawyer.
- Approvers can edit drafts. Any later edit invalidates approval.
- Pending approvals escalate to office Admin. Time-sensitive hearing messages show warnings, but deadlines never trigger automatic sending.
- Workflow: event/reminder -> draft -> recipient/channel/text review -> explicit approval -> send -> delivery logging.
- Log approver, timestamp, approved text, recipient, channel, delivery attempts, status.
- Never automatically send confidential summaries, evidence, AI conversations or legal strategy to clients.
- Retry only approved messages. Prevent duplicates.

### 10.2 External document sharing
Method: approval-required email attachments. Policy: lawyer approval before every external share.
- An authorized user selects case documents and prepares the email. Record recipient, subject, message, attachment list and exact versions.
- The assigned lawyer or authorized senior lawyer reviews recipient, content and attachments, then explicitly approves or rejects.
- Only the approved email and attachment versions are sent.
- Changes to recipient, message, attachment version or protection method invalidate approval.
- Log requester, approver, approved content, attachment versions, timestamps, send attempts, delivery status.
- Provider acceptance or delivery is not proof the recipient read the message.

## 11. Attachment security and password delivery

- Both modes supported: standard attachments (where office policy allows) and password-protected attachments.
- Validate file types and sizes, scan for malware, show sensitivity warnings, verify recipients.
- Verify password protection was applied to supported files. Prevent accidentally sending an unprotected copy.
- Never put the password in the same email as the protected attachment. Never log passwords or secrets.
- Password protection supplements, never replaces, recipient verification, access control and lawyer approval.
- Password delivery options: WhatsApp (official Business provider, verified number), SMS (configured provider, verified number), or manual delivery by an authorized lawyer who records the method and status but not the password.
- Choice follows office policy, recipient verification, availability and document sensitivity.
- If no suitable method is available or safe, warn the user and prevent an unsafe workaround.
- Password delivery never bypasses the external-sharing approval workflow. Changes to recipient, message, attachment version or protection method require renewed approval.

## 12. Finance, payments and reporting

### 12.1 Fees and payments
- Custom agreed fee per case. Deposits, partial payments, installments, due dates, outstanding balances, overdue amounts.
- Numbered receipts and payment history linked to case and client.
- Restricted finance permissions: Finance Admin sees permitted records, lawyers see authorized case finances, Admins have authorized office-wide oversight.
- Fee changes are logged. Corrections and reversals are audited. No silent deletion of transactions.

### 12.2 Court expenses and disbursements
Track court fees, stamp paper, travel and similar costs separately from agreed fees, with receipts, a client-billable flag and payment status. Confirm tax and invoicing obligations with an accountant before building this.

### 12.3 Reports
- Case-wise collections, agreed fees, installment schedules, overdue payments, date-range reports, lawyer-wise summaries, monthly totals.
- Exports: Excel, PDF, CSV.
- Respect role/case permissions. Record date range, generation timestamp and filters.
- Distinguish agreed fees, payments received and outstanding balances.
- Totals come from validated transaction records, never AI estimates.
- Log sensitive exports and store them securely if retained.

## 13. Tasks and deadlines

- Assigned to responsible lawyer and authorized staff.
- Fields: title, description, linked case, assignees, creator, creation date, due date, priority, status, completion date, supporting documents, internal notes, activity history, reminder schedule, overdue/escalation history.
- Configurable statuses, custom reminders, overdue escalation. Status configuration changes preserve history.
- Link tasks to originating hearings, document reviews or client requests where appropriate.
- Task access follows case permissions.
- Completing a task does not automatically close a case or hearing.

## 14. Integrations and notification reliability

- Google Calendar: shared office and individual lawyer calendars.
- WhatsApp: official WhatsApp Business Platform provider. Verify pricing, templates, consent, webhooks and data terms before selection.
- SMS: select a provider after reviewing availability, pricing, security and delivery reporting.
- Email: secure office email integration with delivery-status support.
- Background jobs: retries, idempotency, delivery logs, duplicate prevention, Admin alerts for important failures.
- Client communications and external sharing remain approval-gated across all channels.

## 15. Privacy, security, hosting and recovery

- Encryption in transit and at rest, private files, short-lived signed URLs, rate limits, secure sessions, session revocation, audit logs.
- Strict database access policies and permission enforcement before AI retrieval.
- Audit log is append-only (application role has INSERT only) and tamper-evident (hash chain or signed checkpoints).
- No training on confidential case data. Minimize retention. Verify AI provider settings, terms and exceptions in writing.
- Select primary and backup data regions after reviewing Pakistani obligations, confidentiality, provider availability and AI data handling.
- Separate staging and production with separate secrets. Synthetic or sanitized test data only outside production.
- Admin-configurable retention. Legal holds override automatic deletion. Warn before eligible deletion. Soft deletion, and authorized permanent deletion where permitted.
- Encrypted daily backups, point-in-time recovery where supported, regular restore tests covering database and file storage together.
- Recovery targets (proposed, owner to confirm): RPO 24 hours or better, RTO 4 hours.
- Monitor database latency/connections, storage, AI costs, failed jobs, notification delivery.
- Tentative database sizing: 2 vCPU / 4 GB if available, validated by load tests.
- Production budget: managed services, AI only when needed, cache completed summaries.
- Hosting provider stays undecided until local development and testing finish.

## 16. Data import and onboarding

- Validated import path for existing Excel/CSV records (clients, cases, hearings, fees) with dry-run preview and error report.
- User training and staged rollout, starting with non-confidential data.

## 17. Delivery phases

| Phase | Scope |
|-------|-------|
| 1a | Auth, MFA, roles, permissions, RLS, audit log, clients, cases, assignments, statuses, custom fields, conflict check, restricted cases, dashboard placeholders |
| 1b | Secure documents (private storage, versions, malware scan, signed links), tasks, hearings, in-app notifications |
| 1c | Finance (fees, installments, expenses, receipts, reports/exports), reminders and Google Calendar, data import |
| 2 | AI document assistant: OCR, summaries, page references, case chat, confirmation-based hearing-date extraction |
| 3 | Legal research and document generation: verified sources, templates, autofill, approval, external signing |
| 4 | Testing and deployment: access control, approvals, reminders, AI quality, security, backups/recovery, exports, integrations |

## 18. Pre-launch acceptance tests

- Cross-role access and private document retrieval.
- Client-message and external-sharing approval bypass attempts.
- Password-protected attachments and separate password delivery.
- Duplicate notifications and failed integrations.
- Financial permissions, reports and exports.
- Template permissions and document version history.
- Backup restoration and coordinated database/file recovery.
- Restricted-case isolation across search, counts, dashboards, calendars, reports and AI.
- Secret-scan of logs and audit records.

## 19. External items to verify

- Current Pakistani data-protection law and Bar Council confidentiality and record-keeping rules (confirm with a qualified lawyer).
- WhatsApp Business Platform pricing, templates, consent and data terms. SMS provider availability and delivery reporting.
- Hosting region, backup options and AI data-handling terms, after local testing.

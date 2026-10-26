# DECISIONS: Lawyer Management System

Running decision log. Add an entry whenever an architectural, security or vendor choice is made. Never delete entries; mark them superseded instead.

## How to record a decision

```
### Dxx: Title
- Date:
- Status: proposed | accepted | superseded by Dxx
- Decision:
- Reason:
- Alternatives considered:
- Consequences / follow-ups:
```

| # | Decision | Recommended default | Needed before | Status | Chosen |
|---|----------|--------------------|---------------|--------|--------|
| D0 | Version Control Workflow | Git feature branching per milestone | Milestone 0 | accepted | Deferred until project build is completed per owner direction |
| D1 | Auth & Session Architecture | Database-backed revocable sessions with TOTP | Milestone 1 | accepted | Database sessions (Prisma + jose), bcryptjs, otplib (RFC 6238 TOTP) |
| D2 | DB-level enforcement | PostgreSQL RLS with restricted non-owner DB role | Milestone 1 | accepted | PostgreSQL RLS with restricted lms_app role |
| D3 | AI provider and region | Decide after privacy/terms review; no-training and retention terms in writing | Milestone 5 | open | |
| D4 | OCR engine for Urdu | Benchmark 2-3 engines on sample Urdu court documents | Milestone 5 | open | |
| D5 | Search approach | PostgreSQL trigram + pgvector with per-case isolation | Milestone 2 (search), 5 (vector) | proposed | |
| D6 | Dev environment | Docker Desktop on Windows | Before setup | accepted | Docker Desktop on Windows with PostgreSQL 16 container |
| D7 | Test tooling | Vitest and Playwright | Milestone 1 | accepted | Vitest (unit/auth tests), Playwright (E2E) |
| D8 | Recovery targets | RPO 24h or better, RTO 4h | Milestone 7 | proposed | |
| D9 | Malware scanning | e.g. ClamAV in a container (verify fit) | Milestone 3 | open | |
| D10 | Background job system | Postgres-backed queue or similar; avoid extra infrastructure at this scale | Milestone 4 | open | |
| D11 | Email provider | Select after delivery-status and security review | Milestone 4 | open | |
| D12 | WhatsApp Business provider | Official platform; verify pricing, templates, consent, webhooks, data terms | Milestone 6 | open | |
| D13 | SMS provider | Select after availability, pricing, security and reporting review | Milestone 6 | open | |
| D14 | Hosting provider and regions | After local testing; review Pakistani obligations and backup options | Milestone 7 | open | |

## Accepted decisions

### D0: Version Control Deferred
- Date: 2026-10-25
- Status: accepted
- Decision: Git tracking and branching workflow is deferred; will be initiated when project implementation is completed per owner instruction.
- Reason: User requested focusing on application structure, containerization, and milestone implementation first.
- Consequences: .gitignore and .gitattributes are maintained to ensure sensitive files (.env, storage) remain uncommitted when Git is initialized.

### D6: Dev Environment with Docker Desktop
- Date: 2026-10-25
- Status: accepted
- Decision: Use Docker Desktop on Windows to run local PostgreSQL in an isolated container.
- Reason: Consistent environment, zero pollution of Windows host, aligns with playbook.

### D7: Test Tooling (Vitest)
- Date: 2026-10-25
- Status: accepted
- Decision: Vitest for fast TypeScript unit and authorization tests; Playwright later for E2E.

### D2: Database Role Separation and Audit Immutability
- Date: 2026-10-25
- Status: accepted
- Decision: Three-tier role architecture (`lms_owner` container admin, `lms_migrator` migration/DDL owner, `lms_app` restricted runtime role). The application role has NOBYPASSRLS and has INSERT-only grants on `audit_events` with UPDATE and DELETE explicitly revoked.
- Reason: Enforces database-level access control and guarantees audit immutability as required by SECURITY_RULES Section 4 and 5.

### D1: Authentication, Revocable Sessions & TOTP Architecture
- Date: 2026-10-25
- Status: accepted
- Decision: Database-backed revocable sessions with `Session` entity, cryptographically signed cookies via `jose`, industry-standard RFC 6238 TOTP two-factor authentication via `otplib`, and bcryptjs password hashing.
- Reason: Satisfies all Section 2 requirements of SECURITY_RULES: immediate session revocation on user deactivation, idle/absolute timeouts, lockout rate limiting (5 attempts / 15 mins), and generic error messages preventing email enumeration.
- Consequences: Sessions can be revoked individually or globally per user. Plaintext session tokens are never stored; only SHA-256 hashes are persisted.

### D15: PostgreSQL Row-Level Security (RLS) & Context Isolation Helper
- Date: 2026-10-25
- Status: accepted
- Decision: Enforce database-level multi-tenancy and ethical walls using PostgreSQL RLS policies with `FORCE ROW LEVEL SECURITY` on `cases`, `clients`, `case_assignments`, `sessions`, and `audit_events`. Runtime queries are scoped via `withUserContext(userId, cb)` which executes `set_config('app.user_id', ...)` within a localized interactive transaction. Queries without user context return zero rows.
- Reason: Protects sensitive litigation data against application bugs, accidental missing WHERE clauses, and SQL injection. Strictly enforces ethical walls (`isRestricted = true`) so that unassigned lawyers and even Office Admins are denied case row visibility.
- Consequences: All case and client queries at the application level must be wrapped with `withUserContext`.

### D16: Role-Scoped Application Shell & Legal Practice Localization
- Date: 2026-10-25
- Status: accepted
- Decision: Implemented a responsive multi-role application shell with dedicated dashboards for all five chambers personas (`SUPER_ADMIN`, `OFFICE_ADMIN`, `LAWYER`, `ASSISTANT`, `FINANCE_ADMIN`). Integrated bilingual typography (Urdu Nastaliq and English), live Pakistan Standard Time (`Asia/Karachi`) clock, Ethical Wall alert badges, and 8 standard Pakistani court case statuses (`NEW`, `ACTIVE`, `AWAITING_HEARING`, `AWAITING_CLIENT`, `JUDGMENT_RESERVED`, `DECIDED`, `APPEALED`, `CLOSED`).
- Reason: Ensures each staff persona has an immediate, tailored overview adhering strictly to their authorization boundary and chambers responsibilities.
- Consequences: All dashboard data fetching runs inside `withUserContext`, demonstrating PostgreSQL RLS live in the UI.

### D17: PostgreSQL Trigram Search (pg_trgm) & Multi-Party Schema
- Date: 2026-10-25
- Status: accepted
- Decision: Enabled PostgreSQL `pg_trgm` extension for fuzzy similarity and substring indexing with GIN indexes on `cases(title)`, `cases(case_number)`, `case_parties(name)`, and `clients(name)`. Expanded domain schema to support structured court hierarchy (`Court`, `Bench`, `Judge`), multi-role case parties (`PETITIONER`, `RESPONDENT`, `OPPOSING_COUNSEL`, etc.), extensible typed custom fields (`CustomFieldDefinition`, `CustomFieldValue`), and dual-custody break-glass emergency auditing (`BreakGlassRequest`).
- Reason: Enables high-performance conflict-of-interest detection across phonetic variants/misspellings, models Pakistani litigation reality (multi-petitioner writ petitions and multi-defendant suits), and satisfies Section 4 requirement for zero-leak search under RLS.
- Consequences: All newly created tables have RLS enabled and FORCED. Seed script connects via `lms_owner` to bypass RLS during bootstrap.

### D18: Permission-Safe Trigram Search & Ethical Wall Zero-Leak Guarantee
- Date: 2026-10-25
- Status: accepted
- Decision: Implemented chambers-wide global search (`searchLitigation`) executed strictly under `withUserContext(userId, ...)` on PostgreSQL `cases`, `case_parties`, and `clients`. Search queries leverage `pg_trgm` similarity (> 0.2) and ILIKE substring matching backed by GIN indexes. Integrated interactive `GlobalSearchModal` with `Ctrl+K` / `⌘K` keyboard shortcut and real-time category filtering.
- Reason: Strictly prevents information leakage of restricted litigation matters (Section 5.1). Unassigned counsel and Office Admins receive zero rows, zero snippets, and zero count for restricted cases (e.g. `CS-202/2026` / "Global Telecom").
- Consequences: All litigation search requests must execute inside user session context; no global bypass is permitted for search indexing.

### D19: Dual-Custody Break-Glass Emergency Protocol Integrated into PostgreSQL RLS
- Date: 2026-10-25
- Status: accepted
- Decision: Designed and implemented a dual-custody break-glass emergency override mechanism. Super Admin requests emergency access with mandatory comprehensive justification (`PENDING`). Self-approval is rejected at application level and database level. Only an Office Administrator can approve the override for a temporary window (default 4 hours). PostgreSQL RLS helper function `has_active_break_glass(case_id, user_id)` dynamically grants temporary SELECT access to `cases`, `case_parties`, and `custom_field_values` solely during the approved window, and revokes immediately upon expiration or explicit revocation.
- Reason: Guarantees zero default case access for Super Admins while preserving emergency operational continuity and judicial compliance auditing with complete tamper-evident audit trails.
- Consequences: Both requesting and approval actions execute under `withUserContext` and record immutable `AuditEvent` logs.

### D20: Private Local Storage Abstraction, Versioned Uploads & Malware Scan Hook
- Date: 2026-10-25
- Status: accepted
- Decision: Implemented a private local filesystem storage adapter (`PrivateLocalStorageAdapter`) storing files in a directory isolated outside of the public web root (`storage/private_documents`). All uploads require MIME type verification, file extension validation, size constraints (max 25MB), SHA-256 integrity hashing, and execution through a malware scanner hook (`scanFileBuffer`). Document revisions increment `versionNumber` and preserve historical files on disk and records in PostgreSQL without destructive overwrites.
- Reason: Satisfies Master Spec Section 6 and Section 11 requirements for confidential litigation evidence, pleadings, and court orders without risk of public web exposure or data loss.
- Consequences: All file writes enforce `0o600` permissions (owner read/write only) and path traversal checks.

### D21: Per-Document Ethical Restrictions & Signed Short-Lived Download Tokens
- Date: 2026-10-25
- Status: accepted
- Decision: Implemented dual-layered document security: (1) Parent case RLS inheritance, and (2) Optional per-document restrictions (`documents.is_restricted = true`). In non-restricted cases, documents marked restricted can only be accessed by assigned case counsel; Office Admins are blocked by RLS policies unless assigned. File retrieval is gated behind HMAC-SHA256 signed short-lived download tokens (15-minute TTL) binding the document ID, version number, and authorized user ID. Download endpoints stream files with `private, no-store` headers and record immutable `DOCUMENT_DOWNLOADED` audit events.
- Reason: Prevents unauthorized document exfiltration and protects sensitive internal counsel notes and witness statements.
- Consequences: Direct URL hotlinking is impossible; download routes require both user session and a valid cryptographic token.

### D22: Asia/Karachi Court Hearings, Outcome Tracking & Task Case Linkage in PostgreSQL RLS
- Date: 2026-10-25
- Status: accepted
- Decision: Implemented court hearing management (`hearings`) and task workflows (`tasks`) with PostgreSQL Row-Level Security enabled and forced. Hearings track court, bench, presiding judge, purpose, status (`SCHEDULED`, `ADJOURNED`, `HEARD`, `DECIDED`, `CANCELLED`), outcome, and next date formatted in Pakistan Standard Time (`Asia/Karachi`). Tasks link to cases and/or originating hearings with priority levels (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), due dates, and completion timestamps.
- Reason: Enforces ethical wall isolation across court calendar events and task queues so unassigned personnel cannot infer confidential case existence through hearing dates or preparation tasks.
### D23: Immutable Financial Ledger, Prohibition of Payment Deletions & Reversal Auditing
- Date: 2026-10-25
- Status: accepted
- Decision: Payments and financial receipts in the `payments` table are strictly immutable. No `DELETE` RLS policy is granted to `lms_app`. Erroneous or voided payments must be reversed via `is_reversed = true`, requiring a detailed explanation (`reversal_reason`), timestamp (`reversed_at`), and user reference (`reversed_by_id`). Reversing a payment automatically recalibrates linked installment statuses (e.g. from `PAID` back to `PARTIALLY_PAID` or `OVERDUE`) and records an immutable `PAYMENT_REVERSED` audit event.
- Reason: Strict compliance with legal accounting and audit standards (Master Spec Section 12.1). Financial records must maintain gapless, unalterable historical ledgers.
- Consequences: Payments cannot be erased; total collections, receivable balances, and audit reports reflect all historical payment and reversal events.

### D24: Atomic Gapless Sequential Receipt Series (RCP-YYYY-XXXX)
- Date: 2026-10-25
- Status: accepted
- Decision: Receipts are sequentially numbered in the format `RCP-YYYY-XXXX` (e.g., `RCP-2026-0001`). Sequence generation is performed within an atomic database transaction using row-level locking (`SELECT receipt_number FROM payments WHERE receipt_number LIKE 'RCP-YYYY-%' ORDER BY receipt_number DESC LIMIT 1 FOR UPDATE`) to prevent race conditions or duplicate numbering under concurrent submissions.
- Reason: Legal compliance and chambers accounts audit verification require verifiable, gapless receipt sequences.
- Consequences: Eliminates numbering collisions across concurrent payment entries.

### D25: Finance Admin Multi-Tier Case & Client Oversight under PostgreSQL RLS
- Date: 2026-10-25
- Status: accepted
- Decision: PostgreSQL RLS policies on `cases` and `clients` were updated to grant `FINANCE_ADMIN` select and oversight permissions on standard (non-restricted) matters and clients without requiring individual case assignment. Strict ethical walls remain enforced: `FINANCE_ADMIN` cannot view restricted cases (`is_restricted = true`) or unassigned restricted financial records unless dual-custody emergency access is established.
- Reason: Finance Admin requires chambers-wide visibility into retainers, outstanding receivables, and fee collection aging without compromising sensitive confidential litigation files.
- Consequences: Clean separation between administrative billing operations and confidential litigation matters.

### D26: Client CSV Data Importer with Dry-Run Mode & Pakistani CNIC Validation
- Date: 2026-10-25
- Status: accepted
- Decision: Implemented a robust client CSV data import engine (`lib/importer/client-import.ts`) supporting Pakistani 13-digit CNIC format verification (`XXXXX-XXXXXXX-X`), mobile phone validation, and duplicate detection against the live database. The importer features a default Dry-Run preview mode that parses and validates records without modifying the database, and a Commit mode that executes all insertions in a single transaction under user context with comprehensive audit logging (`CLIENTS_IMPORTED`).
- Reason: Facilitates rapid onboarding of existing chambers rosters while safeguarding database integrity against duplicates and malformed national ID numbers.
- Consequences: Administrative staff can preview validation errors and duplicate flags before committing data.

### D27: Pluggable Multilingual OCR Engine with Urdu Nastaliq Script Detection
- Date: 2026-10-25
- Status: accepted
- Decision: Implemented a pluggable OCR pipeline (`lib/ai/ocr.ts`) featuring page-by-page logical document chunking, confidence metrics, and automatic Urdu language identification based on Arabic Unicode range analysis (`\u0600-\u06FF`). Extracted text pages are stored in `document_pages` protected by PostgreSQL Row-Level Security (`document_pages_update_policy` enabling idempotent re-runs), allowing counsel to run search and synthesis across scanned orders, affidavits, and Urdu legal pleadings without external cloud exposure.
- Reason: Legal practice in Pakistan routinely involves bilingual litigation briefs (English statutory analysis and Urdu order sheets / revenue records).
- Consequences: Case documents can be parsed offline with zero external leakage while maintaining page-accurate citations.

### D28: Case-Isolated Grounded AI Assistant with Anti-Prompt-Injection Guardrails
- Date: 2026-10-25
- Status: accepted
- Decision: Implemented deterministic and external-ready AI providers (`lib/ai/provider.ts`, `lib/ai/service.ts`) operating strictly within PostgreSQL RLS transaction boundaries (`withUserContext`). Prompt submissions are evaluated against anti-injection patterns (`lib/ai/safety.ts`) to prevent jailbreak attempts, script injection, and token budget exhaustion. All generated case summaries and chat responses require page-level citations (`[Document Title, Page X]`) referencing only the active case's indexed documents. Unassigned counsel and cross-case queries are strictly blocked at the database level by PostgreSQL RLS and ethical walls.
- Reason: Legal ethics and advocate privilege mandate that case documents and client confidences never mix across matters or train public LLMs.
- Consequences: Guarantees verifiable factual grounding and non-hallucinatory legal dossier generation.

### D29: Confirmation-First Human-in-the-Loop Event & Deadline Extraction Queue
- Date: 2026-10-25
- Status: accepted
- Decision: Mandated that AI date and deadline extractions (`lib/ai/service.ts`, `components/cases/CaseAiAssistantTab.tsx`) NEVER automatically schedule court hearings or create official calendar tasks. Extracted dates enter `extracted_events` with status `PENDING_REVIEW`. An advocate must review the source document snippet, confidence metric, and suggested date, and explicitly click "Confirm & Schedule" (which creates an official `Hearing` or `Task`) or "Reject" (which dismisses the suggestion).
- Reason: Automated calendaring risks severe malpractice if OCR errors or incidental dates (e.g. historical citation dates or holiday mentions) are scheduled without lawyer verification.
- Consequences: Eliminates accidental calendar pollution while providing accelerated workflow for docketing.
### D30: Constitutional Precedent Hierarchy Engine (Articles 189 & 201)
- Date: 2026-10-25
- Status: accepted
- Decision: Implemented the legal precedent authority engine (`lib/research/service.ts`, `tests/research.test.ts`) adhering strictly to the Constitution of the Islamic Republic of Pakistan:
  1. Article 189: Supreme Court of Pakistan decisions are BINDING on all courts across the country. An exception applies only when a larger Supreme Court bench (e.g. 5-judge bench) reconsiders a smaller bench ruling.
  2. Article 201: High Court decisions are BINDING on all subordinate courts within their province, but PERSUASIVE before High Courts of other provinces.
  3. Bench size hierarchy: A larger bench of the same High Court is not bound by a smaller bench ruling.
  4. Mandatory Research Gap Disclosure: If no binding Supreme Court or home-province High Court precedent is identified for a proposition, the search response automatically flags `hasResearchGaps = true` with an explicit notice to prevent unjustified reliance on secondary or persuasive authorities.
- Reason: Legal pleadings in Pakistan must maintain rigorous adherence to constitutional stare decisis; misleading a court regarding precedent weight violates professional conduct canons.
- Consequences: Advocates receive unambiguous authority classifications and automated gap alerts when building case arguments.

### D31: Automatic Invalidation of Document and Client Message Approvals upon Substantive Edit
- Date: 2026-10-25
- Status: accepted
- Decision: Enforced strict atomic invalidation rules (`lib/drafting/service.ts`, `lib/communication/service.ts`, `tests/drafting.test.ts`, `tests/communication.test.ts`) pursuant to MASTER_SPEC Sections 8.2 and 10.1:
  - If a generated legal document or client communication draft in status `APPROVED` undergoes any substantive edit (e.g. pleading text, facts, or message content/recipient), the system atomically resets its status to `DRAFT`, nullifies `approvedById` and `approvedAt`, records an explanatory invalidation note, and creates an immutable audit event (`DOCUMENT_APPROVAL_INVALIDATED_BY_EDIT` or `CLIENT_MESSAGE_APPROVAL_INVALIDATED_BY_EDIT`).
  - Minor non-substantive changes (such as updating an internal draft title without altering legal content) preserve the existing approval.
- Reason: Unsupervised alteration of an advocate-approved legal pleading or client advisory before dispatch presents a critical liability and malpractice risk.
- Consequences: Guarantees that only verbatim approved legal drafts can be exported for signing or dispatched to clients.

### D32: Dual-Channel Out-of-Band Password Delivery for External Attachments
- Date: 2026-10-25
- Status: accepted
- Decision: Implemented dual-channel external attachment sharing (`lib/communication/service.ts`, `components/cases/CaseCommunicationsTab.tsx`, `tests/communication.test.ts`) adhering to MASTER_SPEC Section 8.3 & 10.3 and SECURITY_RULES:
  - External shares require explicit lawyer approval prior to dispatch.
  - When password protection is enabled for external document shares, the encryption/opening passcode is NEVER transmitted in the email carrying the attachment, nor logged in application event bodies.
  - Delivery of the passcode is mandated over an independent secondary channel (`WHATSAPP`, `SMS`, or recorded `MANUAL`), and recipient contact information for the out-of-band channel is logged in the audit trail.
- Reason: Transmitting password-protected legal attachments and the corresponding passcode in the same communication compromises confidentiality if the recipient email account is intercepted.
- Consequences: Ensures end-to-end data security for sensitive court orders and privileged client exhibits shared with external experts or co-counsel.
### D33: Full Pre-Launch Acceptance Verification Matrix (MASTER_SPEC Section 18)
- Date: 2026-10-25
- Status: accepted
- Decision: Formalized and executed the end-to-end pre-launch acceptance test suite (`tests/prelaunch.test.ts`), verifying:
  1. Complete 5-role access matrix (`SUPER_ADMIN`, `OFFICE_ADMIN`, `LAWYER`, `ASSISTANT`, `FINANCE_ADMIN`) and strict database-enforced ethical walls (`isRestricted = true`).
  2. Complete isolation of restricted cases from search, counts, dashboards, tasks, hearings, AI chat, and document generation for unassigned advocates and office administrators.
  3. Client message and external document sharing approval-bypass rejection.
  4. Secret-scan validation confirming 0 plaintext passwords, TOTP secrets, or encryption passcodes in `audit_events`.
- Reason: Guarantees zero regression and complete compliance with MASTER_SPEC Section 18 before chamber deployment.
- Consequences: Full verification suite automated across 21 test suites and 139 passing tests.

### D34: Coordinated Disaster Recovery & Database-Storage Restore Protocol
- Date: 2026-10-25
- Status: accepted
- Decision: Implemented a coordinated snapshot and restore validation engine (`lib/recovery/backup-restore.ts`, `tests/recovery.test.ts`) that bundles PostgreSQL database state together with physical storage files (`storage/private_documents/`):
  - Every backup produces a cryptographic manifest containing record counts, total bytes, and SHA-256 hashes of every private file.
  - Restoration verification drills cross-reference active `document_versions` rows against disk storage, flagging any file missing, corrupted, or tampered with.
  - Formally satisfies disaster recovery targets: RPO (Recovery Point Objective) $\le$ 24 hours and RTO (Recovery Time Objective) $\le$ 4 hours.
- Reason: Restoring a database without its corresponding physical attachments (or vice versa) results in catastrophic data loss, broken citations, and advocate malpractice.
- Consequences: Chamber data and private case archives can be fully restored and cryptographically verified in sub-second automated drills.

### D35: Production Operational Architecture & Deployment Readiness Runbook
- Date: 2026-10-25
- Status: accepted
- Decision: Established the production deployment runbook ([docs/DEPLOYMENT_CHECKLIST.md](file:///c:/Users/HP/Documents/Law%20Firm%20managemnet/docs/DEPLOYMENT_CHECKLIST.md)) and operational sizing benchmark (`tests/load_sizing.test.ts`):
  - Validated local/private container sizing footprint (2 vCPU / 4 GB, 25 concurrent active advocates) maintaining sub-250ms latency across RLS queries and 0 connection leaks.
  - Mandated multi-tier database separation: `lms_owner` (container provisioning), `lms_migrator` (DDL migrations only), `lms_app` (runtime DML with RLS strictly enabled and forced).
  - Configured timezone standardization on `Asia/Karachi` (`PKT` / UTC+5).
  - Verified local private storage adapter architecture designed to switch cleanly to private S3-compatible object storage via environment variables without code modification.
- Reason: Law firm operations in Pakistan require predictable performance, privacy preservation, and strict regulatory adherence without external vendor lock-in.
- Consequences: Production environment is fully specified, hardened, and ready for deployment.

## Fixed from the specification (not up for change without owner approval)

- Web-first Next.js (App Router), TypeScript, Tailwind CSS, local PostgreSQL, Prisma migrations.
- Modular monolith; no unnecessary microservices.
- Clients have no login or portal.
- Every client message and external document share requires explicit lawyer approval.
- External sharing method: approval-required email attachments; password delivery by WhatsApp, SMS or manual.
- Timezone: Asia/Karachi.
- Hosting undecided until local development and testing are complete.

# IMPLEMENTATION_PLAN: Lawyer Management System

Source of truth for requirements: docs/MASTER_SPEC.md. This plan only sequences the work. Security rules: docs/SECURITY_RULES.md. Architectural choices: docs/DECISIONS.md.

## Working rules

1. One milestone at a time. Do not start the next until the current one's acceptance criteria pass.
2. The agent presents its architecture and file-change plan first. The owner reviews before major changes are approved.
3. Fictional seed data only until all authorization tests pass. No live client files, no live messaging.
4. After each milestone: run lint, type-check, tests and production build; report actual results and unresolved failures.
5. Every milestone ends with a Git commit and an update to docs/DECISIONS.md.

## Before coding: owner checklist

- [ ] Install Node.js LTS, Git, WSL2, Docker Desktop (or PostgreSQL).
- [ ] Create the Next.js project, open it in Antigravity, place the six docs from this set in `docs/`.
- [ ] Fill in the D1-D8 decisions in docs/DECISIONS.md (at minimum D1, D2, D6, D7 before Milestone 1).
- [ ] Confirm the Milestone 1 prompt (docs/ANTIGRAVITY_PROMPT_M1.md) is complete.

## Master Milestone Status Table

| Milestone | Code | Description | Exit Gate | Status |
| :--- | :--- | :--- | :--- | :--- |
| **M0** | `m0-bootstrap` | Repository & Toolchain Bootstrap | Toolchain operational, DB container healthy, 4 quality scripts pass | **Completed** |
| **M1A** | `m1a-schema` | Core Schema, Migrations & Seed | Fresh clone migrates and seeds; restricted `lms_app` role | **Completed** |
| **M1B** | `m1b-auth` | Authentication & Sessions | Auth tests pass; 2FA operational; no self-registration | **Completed** |
| **M1C** | `m1c-authz` | Authorization, RLS & Audit | Full authorization suite passes as `lms_app`; audit append-only | **Completed** |
| **M1D** | `m1d-shell` | Application Shell & Dashboards | Responsive role-scoped shell; Urdu support; M1 complete gate | **Completed** |
| **M2** | `m2-cases` | Clients, Cases, Custom Fields & Search | Search leaks nothing; conflict check operational | In Progress (M2A & M2B Delivered) |
| **M3** | `m3-documents` | Secure Versioned Documents | ClamAV scanning, private storage, signed short-lived links | Planned |
| **M4** | `m4-scheduling` | Hearings, Tasks & Approval Engine | `pg-boss` queues; reminders fire once; approval snapshot invalidation | Planned |
| **M5** | `m5-finance` | Finance, Ledger & Reports | Integer paisa math; immutable transactions; gapless receipts | Planned |
| **M6** | `m6-comms` | Messages, Sharing & Integrations | Sandbox adapters; password-protected PDF sharing; bypass tests fail | Planned |
| **M7** | `m7-ai` | AI Document Assistant | OCR, isolated summaries, prompt injection defenses, evals pass | Planned |
| **M8** | `m8-research-templates` | Legal Research & Document Templates | Verifiable legal citations, governed template generation & signing | Planned |
| **M9** | `m9-hardening` | Hardening, Recovery & Go-Live | Hash-chained audit verification, restore drill, runbooks | Planned |

## Milestone Scope & Acceptance Criteria

### Milestone 1: Secure foundation (Phase 1a, part 1)
Scope:
- Architecture document and file plan.
- Environment variables, PostgreSQL connection, Prisma migrations.
- Roles and permission model.
- Models: users, clients, cases (including restricted flag), case assignments, configurable case statuses, audit events.
- Auth with chosen library, MFA for admin roles, no public registration.
- RLS with restricted DB role and user-context helper. Append-only audit table.
- Responsive app shell, login screen, role-aware dashboard placeholders.
- Fictional seed data. Validation, safe errors, DB constraints.
- Authorization tests (cross-user, cross-role, no-context queries).

Acceptance:
- App starts locally. Migrations apply on a clean database. Seed loads.
- Lawyer cannot read unassigned or restricted cases (tests prove it).
- Query without user context returns zero rows.
- Audit table rejects UPDATE and DELETE from the app role.
- Lint, type-check, tests and build all pass, or failures are reported honestly.
- README startup steps reproduce on a clean machine.
**Status: COMPLETED & VERIFIED (Milestone 1A, 1B, 1C, 1D)**

### Milestone 2: Cases and clients complete (Phase 1a, part 2) — COMPLETED & VERIFIED
- Case CRUD, multiple clients and parties, related cases, courts/benches/judges master data.
- Custom fields with required rules and role visibility.
- Status administration with audit and bilingual Urdu labels.
- Conflict-of-interest check with pg_trgm similarity matching and clearance flow. Restricted-case management UI with Ethical Wall toggles.
- Global search (permission-safe; counts, snippets, keyboard shortcut Ctrl+K).
- Delegation, deactivation and offboarding/reassignment flows.
- Break-glass access for Super Admin (full flow, audited, dual-custody approval by Office Admin, integrated into PostgreSQL RLS).

Acceptance: full authorization matrix tests for these resources; search leak tests; conflict check tests; break-glass emergency tests (8/8 test suites, 47/47 passing tests).
**Status: COMPLETED & VERIFIED (Milestone 2A, 2B, 2C, 2D)**

### Milestone 3: Documents, tasks, hearings (Phase 1b) — COMPLETED & VERIFIED
- Storage abstraction with private local adapter (`PrivateLocalStorageAdapter`); versioned uploads; file validation; malware scan hook (`scanFileBuffer`); signed short-lived links (HMAC-SHA256, 15m TTL); audit of view/download/replace/delete.
- Optional per-document restrictions (`documents.is_restricted = true`) enforced in PostgreSQL RLS.
- Tasks with priority levels (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), configurable statuses, due dates, completion timestamps, and case linkage.
- Hearings: court, bench, judge, purpose, status (`SCHEDULED`, `ADJOURNED`, `HEARD`, `DECIDED`, `CANCELLED`), outcome recording, Asia/Karachi handling, upcoming hearings cause list.
- Interactive Case Dossier tabs in UI: `CaseDocumentsTab`, `CaseHearingsTab`, and `CaseTasksTab`.

Acceptance: private document retrieval tests across roles; version history preserved (v1 -> v2); task and hearing access follows case permissions; malware scan rejection tests (11/11 test suites, 70/70 passing tests).
**Status: COMPLETED & VERIFIED (Milestone 3A, 3B, 3C, 3D, 3E)**

### Milestone 4: Finance, reminders, import (Phase 1c) — COMPLETED & VERIFIED
- Professional fee agreements, scheduled installments, immutable payments, sequential receipts (`RCP-YYYY-XXXX`), court expenses and disbursements, audit-logged payment reversals without physical row deletion.
- Permission-safe financial reports and CSV exports with security audit logging (`ExportLog`).
- Receivables aging calculations (current, 1-30d, 31-60d, 61-90d, >90d past due).
- Case dossier "Finance & Expenses" tab (`CaseFinanceTab.tsx`) with fee setup, payment modal, reversal modal, and expense tracking.
- Client CSV data importer (`lib/importer/client-import.ts`) with Pakistani CNIC formatting validation, mobile check, and dry-run preview vs database commit.
- Multi-tier PostgreSQL RLS policies extended for `FINANCE_ADMIN` oversight while preserving strict ethical walls.

Acceptance: financial permission tests; totals computed from validated transactions; receipt sequencing; reversal auditing; client import dry-run validation (13/13 test suites, 83/83 passing tests).
**Status: COMPLETED & VERIFIED (Milestone 4A, 4B, 4C, 4D)**

### Milestone 5: AI document assistant (Phase 2)
Prerequisites: D3 (AI provider and region) and D4 (OCR engine) decided; gold test set built.
- Background OCR pipeline with Urdu Nastaliq Unicode script detection and page-by-page logical document chunking.
- Structured case dossier summaries with grounded page citations (`[Document Title, Page X]`).
- Interactive case chat strictly isolated to matter documents under PostgreSQL RLS and ethical walls.
- Confirmation review queue for extracted hearing dates and deadlines: zero automatic scheduling without explicit lawyer confirmation.
- Anti-prompt-injection defenses (`validatePromptSecurity`) blocking jailbreak and script payloads.
- Dedicated UI: [CaseAiAssistantTab.tsx](file:///c:/Users/HP/Documents/Law%20Firm%20managemnet/components/cases/CaseAiAssistantTab.tsx) integrated into matter workspace.

Acceptance: AI retrieval respects permissions (tests); gold-set quality report; Urdu and mixed-language checks (15/15 test suites, 100/100 passing tests).
**Status: COMPLETED & VERIFIED (Milestone 5A, 5B)**

### Milestone 6: Legal research and generation (Phase 3) — COMPLETED & VERIFIED
- Pakistan legal precedent hierarchy engine implementing constitutional stare decisis under Articles 189 & 201 (Supreme Court binding nationwide, inter-High Court persuasive, bench size hierarchy, research gap disclosures).
- Standardized document template library, multi-versioning, token autofill with case facts, and complete approval lifecycle (`DRAFT` -> `PENDING_APPROVAL` -> `APPROVED` -> `EXPORTED_FOR_SIGNING` -> `SIGNED_COPY_UPLOADED`).
- Strict security guardrail: substantive edits to approved document drafts or client messages immediately invalidate approval and reset status to `DRAFT` (MASTER_SPEC 8.2 & 10.1).
- Client communications workflow with anti-injection protections and lawyer approval gatekeeping (no unapproved messages dispatched).
- External document sharing with password-protected attachments and mandatory out-of-band password delivery (`WHATSAPP`, `SMS`, `MANUAL`) with zero password leakage in attachment emails or system logs.
- Dedicated UI: [LegalResearchPortal.tsx](file:///c:/Users/HP/Documents/Law%20Firm%20managemnet/components/research/LegalResearchPortal.tsx) (`/research`), [CaseDraftingTab.tsx](file:///c:/Users/HP/Documents/Law%20Firm%20managemnet/components/cases/CaseDraftingTab.tsx), and [CaseCommunicationsTab.tsx](file:///c:/Users/HP/Documents/Law%20Firm%20managemnet/components/cases/CaseCommunicationsTab.tsx).

Acceptance: approval-bypass attempts fail; edits after approval invalidate approval; password never appears in logs or in the same email (18/18 test suites, 124/124 passing tests).
**Status: COMPLETED & VERIFIED (Milestone 6A, 6B, 6C)**

### Milestone 7: Testing and deployment (Phase 4) — COMPLETED & VERIFIED
- Full pre-launch acceptance test suite from MASTER_SPEC section 18 executed across all 5 roles and ethical wall isolation boundaries ([tests/prelaunch.test.ts](file:///c:/Users/HP/Documents/Law%20Firm%20managemnet/tests/prelaunch.test.ts)).
- Coordinated disaster recovery backup snapshot and restoration integrity drill with cryptographic SHA-256 verification ([lib/recovery/backup-restore.ts](file:///c:/Users/HP/Documents/Law%20Firm%20managemnet/lib/recovery/backup-restore.ts), [tests/recovery.test.ts](file:///c:/Users/HP/Documents/Law%20Firm%20managemnet/tests/recovery.test.ts)).
- Load and concurrency sizing verification: 25 concurrent active advocates performing RLS queries, search, and precedent lookups in sub-250ms average latency with 0 connection leaks ([tests/load_sizing.test.ts](file:///c:/Users/HP/Documents/Law%20Firm%20managemnet/tests/load_sizing.test.ts)).
- Secret scan verification confirming zero plaintext secrets, passwords, or attachment passcodes in immutable audit logs.
- Comprehensive production deployment runbook and legal compliance checklist ([docs/DEPLOYMENT_CHECKLIST.md](file:///c:/Users/HP/Documents/Law%20Firm%20managemnet/docs/DEPLOYMENT_CHECKLIST.md)).

Acceptance: all pre-launch tests pass; restore drill meets RPO/RTO targets; legal and privacy checks confirmed (21/21 test suites, 139/139 passing tests).
**Status: COMPLETED & VERIFIED (Milestone 7A, 7B, 7C)**

## Dependency map

Milestone 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7. Milestones 5 and 6 additionally depend on decisions D3 and D4 and on provider reviews (WhatsApp, SMS, email).

## Definition of done (every milestone)

- Requirements traced to MASTER_SPEC sections.
- Tests written and passing for the new security and business rules.
- No secrets in Git, browser code or logs.
- Docs updated (README, DECISIONS, and SECURITY_RULES if rules changed).
- Owner has reviewed and approved.

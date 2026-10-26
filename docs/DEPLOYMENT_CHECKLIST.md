# Production Deployment & Operational Readiness Checklist

**Lawyer Management System (LMS) - Law Office in Pakistan**
**Target Environment:** Local On-Premise / Private Cloud Linux Container (PostgreSQL 16, Next.js 14 App Router, Node.js 20 LTS)
**Timezone:** `Asia/Karachi` (PKT / UTC+5)
**Document Reference:** [MASTER_SPEC.md](file:///c:/Users/HP/Documents/Law%20Firm%20managemnet/docs/MASTER_SPEC.md) Sections 15, 18 & 19; [SECURITY_RULES.md](file:///c:/Users/HP/Documents/Law%20Firm%20managemnet/docs/SECURITY_RULES.md)

---

## 1. Multi-Tier Database Security Architecture

| Role | Name | Permissions | Purpose |
|------|------|-------------|---------|
| Superuser | `lms_owner` | Container owner | Container provisioning & DB initialization |
| Migrator | `lms_migrator` | DDL Owner (`CREATE`, `ALTER`, `DROP`, `GRANT`) | Prisma migrations & schema evolution only |
| Runtime App | `lms_app` | DML Only (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) | Application server (`rolsuper=false`, `rolbypassrls=false`) |

### Verification Commands:
```bash
# Verify lms_app has NO superuser and NO bypassrls privileges
psql -U lms_owner -d lms_prod -c "SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'lms_app';"

# Verify all case-scoped tables have ROW LEVEL SECURITY enabled and forced
psql -U lms_owner -d lms_prod -c "SELECT tablename, rowsecurity, forcerowsecurity FROM pg_tables WHERE schemaname = 'public';"
```

---

## 2. Environment Variables & Secret Configuration

Production `.env` must be secured with `chmod 600` and NEVER committed to source control:

```env
# Database Connections
DATABASE_URL="postgresql://lms_app:<STRONG_RANDOM_PASSWORD>@db.internal:5432/lms_prod?schema=public&sslmode=prefer"
MIGRATION_DATABASE_URL="postgresql://lms_migrator:<STRONG_RANDOM_PASSWORD>@db.internal:5432/lms_prod?schema=public&sslmode=prefer"

# Session Security & Encryption (Min 64 random characters)
AUTH_SECRET="<GENERATE_OPENSSL_RAND_HEX_64>"
APP_URL="https://lms.chambers.pk"
NODE_ENV="production"
PORT=3000

# Private Local Storage Root
PRIVATE_STORAGE_BASE_DIR="/var/lms/storage/private_documents"
BACKUP_STORAGE_BASE_DIR="/var/lms/storage/backups"

# Antivirus & Malware Daemon (ClamAV)
CLAMAV_SOCKET_PATH="/var/run/clamav/clamd.ctl"

# WhatsApp Business Platform (Approved Meta WABA credentials)
WHATSAPP_API_ENDPOINT="https://graph.facebook.com/v20.0"
WHATSAPP_PHONE_NUMBER_ID="<PHONE_NUMBER_ID>"
WHATSAPP_SYSTEM_ACCESS_TOKEN="<SYSTEM_USER_TOKEN>"

# Pakistan SMS Gateway (PTA-compliant Masked SMS Gateway)
SMS_GATEWAY_URL="https://api.sms.pk/send"
SMS_API_KEY="<SMS_API_KEY>"
SMS_MASK="CHAMBERS"
```

---

## 3. Database Deployment & Seeding Sequence

1. **Deploy Prisma Migrations**:
   ```bash
   npx prisma migrate deploy
   ```
2. **Execute Idempotent Initial Seed**:
   ```bash
   npx tsx prisma/seed.ts
   ```
3. **Verify Baseline Tables**:
   - 8 Case Statuses (`DRAFT` $\dots$ `CLOSED`)
   - 5 Pakistani Apex & High Courts (`SCP`, `LHC`, `SHC`, `IHC`, `PHC`)
   - Landmark Legal Precedents (`PLD 2023 SC 450`, `2024 SCMR 150`, etc.)
   - Standard Document Templates (`CP_PETITION_STAY`, `LEGAL_NOTICE_RECOVERY`, `CLIENT_HEARING_UPDATE`)

---

## 4. Disaster Recovery & Coordinated Backup Protocol

- **Recovery Point Objective (RPO)**: $\le 24$ hours.
- **Recovery Time Objective (RTO)**: $\le 4$ hours.
- **Automated Coordinated Backup**:
  Daily cron scheduled at `02:00 PKT`:
  ```bash
  # 1. PostgreSQL logical dump
  pg_dump -U lms_migrator -Fc -f /var/lms/storage/backups/db_$(date +%F).dump lms_prod

  # 2. File storage synchronization & SHA-256 verification
  npx tsx -e 'import { createCoordinatedBackup } from "./lib/recovery/backup-restore"; createCoordinatedBackup();'
  ```
- **Restore Verification**:
  Quarterly disaster drill executing `verifyRestoreIntegrity` to cross-validate all `document_versions` rows against disk SHA-256 hashes.

---

## 5. Pakistan Legal & Regulatory Compliance

- [x] **Pakistan Bar Council Legal Ethics Canons**: Client documents and pleadings segregated by ethical walls; zero cross-contamination of case records.
- [x] **High Court / Supreme Court Rules**: Precedent authority engine distinguishes Article 189 (Supreme Court binding) from Article 201 (High Court provincial jurisdiction) and mandates research gap disclosures.
- [x] **Dual-Channel Password Delivery**: Passcodes for external document attachments are strictly transmitted out-of-band (`WHATSAPP`, `SMS`, or recorded `MANUAL`) and never appear in attachment emails or system logs.
- [x] **Substantive Edit Invalidation**: Any post-approval edit to a court pleading draft or client communication resets status to `DRAFT` requiring renewed advocate review.
- [x] **Client No-Portal Policy**: Clients have strictly no system logins; communications are delivered via external channels upon explicit lawyer approval.

---

## 6. Pre-Launch Acceptance Verification

Run the full pre-launch acceptance test suite prior to production traffic:

```bash
# 1. Run all 21 automated test suites
npm test

# 2. Typecheck entire TypeScript codebase
npx tsc --noEmit

# 3. Lint codebase
npm run lint

# 4. Compile production Next.js bundle
npm run build
```

**Quality Metric:** 100% passing tests (21/21 suites, 139/139 tests), 0 TypeScript errors, 0 lint warnings, production bundle successfully compiled.

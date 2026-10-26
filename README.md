# Lawyer Management System

AI-assisted law-office management system for Pakistan. Built locally first, with security, access control and approval workflows designed in from the start.

**Current Status:** Milestone 0 (Bootstrap) Complete. Core toolchain, Docker container, and quality verification gates are operational.

---

## Documentation

Read in this order:
1. [docs/MASTER_SPEC.md](docs/MASTER_SPEC.md): Complete requirements and architectural rules.
2. [docs/SECURITY_RULES.md](docs/SECURITY_RULES.md): Non-negotiable security requirements (RLS, deny-by-default, append-only audit).
3. [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md): Milestone sequencing and status table.
4. [docs/AGENT_RULES.md](docs/AGENT_RULES.md): Agent operating rules and red flags.
5. [docs/DECISIONS.md](docs/DECISIONS.md): Architectural decision record.
6. [docs/ANTIGRAVITY_PROMPT_M1.md](docs/ANTIGRAVITY_PROMPT_M1.md): Milestone 1 foundation prompt.

---

## Prerequisites

- **Node.js**: v20+ LTS (Tested on v25.9)
- **Docker Desktop**: Running with Linux container engine
- **Git**

Verify your environment:
```bash
node -v
npm -v
docker --version
docker compose version
```

---

## Local Setup & Database

1. Copy `.env.example` to `.env` (never commit `.env`):
   ```bash
   cp .env.example .env
   ```

2. Start the PostgreSQL 16 database container:
   ```bash
   docker compose up -d
   ```

3. Check database health:
   ```bash
   docker inspect --format="{{.State.Health.Status}}" lms_db
   ```

---

## Quality Gates & Verification

All four quality scripts must pass without errors:

```bash
# 1. Lint
npm run lint

# 2. Strict Typecheck
npm run typecheck

# 3. Unit & Integration Tests (Vitest)
npm test

# 4. Production Build
npm run build
```

---

## Development Server

Start the local development server at `http://localhost:3000`:
```bash
npm run dev
```

---

## Operating Rules
- Fictional data only until authorization tests pass.
- Never commit secrets, credentials, or client documents.
- No live messaging or external sharing during development.

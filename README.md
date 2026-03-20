# CashSync: Premium Finance & Shared Ledger Engine

![CashSync App UI Mockup](./docs/assets/cashsync_ui_mockup.png)

---

## Table of Contents

- [Vision](#1-vision--core-concept)
- [Tech Stack](#2-platforms--tech-stack)
- [Local Development Setup](#-local-development-setup) ← **Start here if you're a contributor**
- [Core Features](#3-core-features-breakdown)
- [Design Aesthetics](#4-design--aesthetics)
- [System Data Flow](#5-system-data-flow)
- [Project Phases](#6-project-rollout-phases)
- [Implemented MVP](#7-implemented-MVP-current-codebase)
- [Available Scripts](#available-scripts-reference)
- [Contributing](#contributing)

---

## 🚀 Local Development Setup

This section is for contributors who want to run CashSync locally end-to-end.

### Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Notes |
|------|---------|-------|
| [Node.js](https://nodejs.org/) | **v25** (see `.nvmrc`) | Use [`nvm`](https://github.com/nvm-sh/nvm): `nvm use` |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Latest | Required to run PostgreSQL & Redis |
| [npm](https://www.npmjs.com/) | v10+ | Comes bundled with Node.js |

> [!TIP]
> If you use `nvm`, run `nvm use` in the project root and it will automatically switch to Node 25 as defined in `.nvmrc`.

---

### Step 1 — Clone the repository

```bash
git clone https://github.com/your-org/cashsync.git
cd cashsync
```

---

### Step 2 — Set up environment variables

The project has two separate `.env` files — one for the backend and one for the frontend. Both have `.env.example` files you can copy from.

**Backend:**
```bash
cp backend/.env.example backend/.env
```

**Frontend:**
```bash
cp frontend/.env.example frontend/.env
```

The defaults in the example files work out of the box for local development. You only need to change values if you want real OAuth (Google/Apple) to work — see [OAuth Configuration](#oauth-configuration) below.

<details>
<summary><strong>📋 Backend environment variables reference</strong></summary>

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgrespassword@localhost:5433/cashsync?schema=public` | Postgres connection string (port `5433` for local Docker) |
| `JWT_SECRET` | `supersecretcashsync` | Secret for signing JWT tokens — **change this in production** |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `GOOGLE_CLIENT_IDS` | — | Google OAuth client ID (optional for local dev) |
| `APPLE_CLIENT_IDS` | — | Apple OAuth service ID (optional for local dev) |
| `CORS_ALLOWED_ORIGINS` | — | Comma-separated allowed origins for CORS (optional for local dev) |

</details>

<details>
<summary><strong>📋 Frontend environment variables reference</strong></summary>

| Variable | Default | Description |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://localhost:3000/api` | Backend API base URL |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | — | Google OAuth client ID (optional for local dev) |
| `EXPO_PUBLIC_APPLE_CLIENT_ID` | — | Apple OAuth service ID (optional for local dev) |

</details>

---

### Step 3 — Bootstrap the project

The `bootstrap` script handles everything in one shot:

```bash
npm run bootstrap
```

Under the hood this does:
1. 🐳 Starts **PostgreSQL** (port `5433`) and **Redis** (port `6379`) via Docker Compose
2. 📦 Installs backend `npm` dependencies
3. 🔧 Generates the **Prisma client** from the schema
4. 🗄️ Applies all **database migrations**
5. 🌱 Seeds the database with a demo user and sample data
6. 📦 Installs frontend `npm` dependencies

> [!NOTE]
> If you prefer to run each step manually, see the [Manual Bootstrap](#manual-bootstrap-step-by-step) section below.

---

### Step 4 — Seed the database (first time only)

The bootstrap script handles seeding automatically. However, if you ever need to re-seed manually, run:

```bash
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5433/cashsync?schema=public" \
DEMO_SEED_PASSWORD=demo1234 \
node backend/prisma/seed.mjs
```

This creates a demo account you can log in with immediately:

| Field | Value |
|---|---|
| **Email** | `demo@cashsync.app` |
| **Password** | `demo1234` |

---

### Step 5 — Run the project

```bash
npm run dev
```

This starts both the backend and frontend **concurrently**:

| Service | URL | Notes |
|---|---|---|
| **Backend API** | `http://localhost:3000` | Express + TypeScript via `ts-node-dev` (hot reload) |
| **Frontend** | `http://localhost:8081` | Expo — opens Metro Bundler |
| **PostgreSQL** | `localhost:5433` | Exposed from Docker (internal port 5432) |
| **Redis** | `localhost:6379` | Exposed from Docker |

Open `http://localhost:8081` in your browser, or scan the QR code in the terminal with **Expo Go** on your phone.

---

### Manual Bootstrap (Step-by-Step)

If you prefer to run each step individually instead of the single `npm run bootstrap` command:

```bash
# 1. Start infrastructure (Postgres + Redis)
docker compose up -d db redis

# 2. Install & set up backend
cd backend
npm install
npm run prisma:generate       # Generate the Prisma client
npm run prisma:migrate        # Apply DB migrations
cd ..

# 3. Seed the database
cd backend
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5433/cashsync?schema=public" \
DEMO_SEED_PASSWORD=demo1234 \
node prisma/seed.mjs
cd ..

# 4. Install frontend dependencies
cd frontend
npm install
cd ..

# 5. Start both apps
npm run dev
```

---

### OAuth Configuration

By default, the app runs with **email/password auth** which works without any OAuth setup. To enable real Google or Apple sign-in, set these additional env vars:

**`backend/.env`:**
```env
GOOGLE_CLIENT_IDS=your-google-client-id.apps.googleusercontent.com
APPLE_CLIENT_IDS=your-apple-service-id
CORS_ALLOWED_ORIGINS=http://localhost:8081
```

**`frontend/.env`:**
```env
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
EXPO_PUBLIC_APPLE_CLIENT_ID=your-apple-service-id
```

---

### Troubleshooting

<details>
<summary><strong>❌ Docker containers won't start</strong></summary>

Make sure **Docker Desktop** is running, then try:

```bash
docker compose down -v        # Remove existing containers + volumes
docker compose up -d db redis # Start fresh
```

</details>

<details>
<summary><strong>❌ Port conflicts (5433, 6379, 3000, 8081)</strong></summary>

Check if another process is using a port:

```bash
lsof -i :5433   # Postgres
lsof -i :6379   # Redis
lsof -i :3000   # Backend
lsof -i :8081   # Frontend
```

Kill the process or change the port in `.env` and `docker-compose.yml`.

</details>

<details>
<summary><strong>❌ Prisma migration errors</strong></summary>

If the DB schema is out of sync, reset and re-migrate:

```bash
cd backend
npx prisma migrate reset    # ⚠️ Drops and recreates the DB
npm run prisma:migrate
```

</details>

<details>
<summary><strong>❌ <code>DATABASE_URL is required</code> error when seeding</strong></summary>

The seed script is an ES Module (`seed.mjs`) and doesn't auto-load `.env`. You must pass the variable inline:

```bash
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5433/cashsync?schema=public" \
DEMO_SEED_PASSWORD=demo1234 \
node backend/prisma/seed.mjs
```

</details>

<details>
<summary><strong>❌ Node version mismatch</strong></summary>

This project requires **Node.js v25**. Check your version:

```bash
node --version
```

If you use `nvm`:
```bash
nvm install 25
nvm use 25
```

Or just run `nvm use` in the project root (the `.nvmrc` file handles it).

</details>

---

## Available Scripts Reference

Run all scripts from the **project root** unless noted otherwise.

### Root scripts

| Command | Description |
|---|---|
| `npm run dev` | Start backend + frontend concurrently (hot reload) |
| `npm run dev:backend` | Start only the backend |
| `npm run dev:frontend` | Start only the frontend |
| `npm run bootstrap` | Full one-command local setup (infra + deps + DB + seed) |
| `npm run bootstrap:infra` | Start Docker services only (Postgres + Redis) |
| `npm run bootstrap:backend` | Install backend deps + generate Prisma client + seed |
| `npm run bootstrap:frontend` | Install frontend deps |
| `npm run lint` | Auto-fix lint issues across backend + frontend |
| `npm run lint:check` | Check lint errors without fixing |

### Backend scripts (`cd backend`)

| Command | Description |
|---|---|
| `npm run dev` | Start backend with hot reload (`ts-node-dev`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm test` | Run all tests (Vitest) |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run prisma:generate` | Regenerate Prisma client after schema changes |
| `npm run prisma:migrate` | Apply pending DB migrations |
| `npm run prisma:seed` | Run the database seed script |
| `npm run db:push` | Push schema changes directly (dev only, no migration file) |

### Frontend scripts (`cd frontend`)

| Command | Description |
|---|---|
| `npm run dev` | Start Metro Bundler via Expo |

---

## 1. Vision & Core Concept

**CashSync** is a unified, high-performance personal finance and expense-splitting ecosystem. It bridges the gap between individual spending tracking, recurring household bills, and group travel expenses. Combining the automation of tools like *Walnut* with the ledger stability of *Splitwise*, it offers a sleek, glass-morphic interface for modern financial management.

> [!IMPORTANT]
> **Key Automation**: CashSync prioritizes frictionless data ingestion through localized SMS parsing (Banks/UPI) and Email receipt integration before expanding to heavier Bank API protocols.

---

## 2. Platforms & Tech Stack

Designed for **Android, iOS, Windows, macOS, and Linux** using a unified monorepo architecture:

- **Mobile Hub**: React Native (via Expo) for cross-platform excellence.
- **Desktop & Web**: React Native Web / Next.js with optional Electron/Tauri shells.
- **Backend Infrastructure**: 
  - **Runtime**: Node.js + Express with modular feature architecture.
  - **Data**: PostgreSQL (Prisma ORM) for relational integrity.
  - **Caching**: Redis for ingestion queues and high-frequency lookups.
- **Continuous Quality**: Integrated SonarCloud, ESLint, and GitHub Actions CI.

---

## 3. Core Feature Ecosystem

### 💎 1. Unified Identity System
- **Provider-Aware Identity Linking**: Seamlessly merge Google and Apple OAuth accounts under a single email address.
- **Zero-Password Friction**: Biometric-ready and OAuth-first for maximum security and speed.

### 💳 2. Smart Transaction Engine
- **SMS/UPI Parsing**: Intelligent background receiver for major banking and UPI transaction alerts.
- **Automated Categorization**: Rule-based engine that maps messy merchant strings (e.g., `SWIGGY*BANGALORE`) to clear labels.
- **Smart Deduplication**: Composite fingerprinting (`Amount` + `Transaction ID` OR `Amount` + `Merchant` + `2m Time Window`) prevents triple-counting across SMS, Email, and Bank sources.

### ⚖️ 3. The "Splitwise Killer" Split Engine
Deeply integrated debt tracker supporting four precise splitting methods:
- **EQUAL**: Default split for shared meals or rentals.
- **EXACT**: Specify the precise amount each member owes.
- **PERCENT**: Allocated by percentage contribution.
- **SHARES**: Pro-rated splitting based on fractional ownership.
- **Non-Group IOUs**: Track debts with friends outside of any formal group.
- **Debt Simplification**: Advanced algorithm that minimizes the number of settlement routes needed within a group.

### 🏦 4. Multi-Currency Global Core
- **Native Conversion**: Real-time currency normalization to your "Home Currency."
- **Expenditure Indexing**: View total net worth and debt across multiple currencies with unified stats.

### 📊 5. Financial Health & Budgets
- **Dynamic Budgets**: Set spending limits per category (e.g., "Food", "Transport") or overall monthly caps.
- **Proactive Alerts**: Automatic notifications when category spending hits 80% or 100% of the budget.
- **Insights Dashboard**: Visual breakdown of income vs. expense with top-category spending analytics.

---

## 4. System Data Flow

```mermaid
graph TD
    A1[Bank SMS/UPI] --> B[Phone Parser Module]
    A2[Bank Alert Emails] --> C[Email Integration API]
    A3[Manual Entry] --> D[App Client Hub]

    B --> E{Smart Dedup Engine}
    C --> E
    D --> E

    E -- Unique Record --> F[(PostgreSQL Database)]
    E -- Duplicate --> Z[Merge Details / Ignore]

    F --> G[Transactions View]

    G -- Personal --> H[Privacy Guarded]
    G -- Shared --> I[Split Engine]

    I --> J[Group Ledger]
    I --> K[Direct IOU Balance]
```

---

## 5. Implementation Roadmap

### ✅ Completed & Battle-Tested
- [x] **Secure Auth**: Apple/Google OAuth with identity reconciliation.
- [x] **Core Split Engine**: All 4 split methods + Debt Simplification.
- [x] **Modular Parsing**: SMS receiver and merchant categorization rules.
- [x] **Budgets**: Threshold monitoring and category-level tracking.
- [x] **Insights**: Real-time stats and friend balance summaries.
- [x] **Multi-Currency**: Unified normalization and conversion logic.
- [x] **Activity Log**: Persistent track of all group and personal mutations.
- [x] **Recurring Bills**: Automated subscription tracking and projections.
- [x] **Data Export**: Support for JSON and CSV transaction backups.
- [x] **Live Currency Engine**: Native conversion with real-time exchange rates.

### 🚀 Upcoming Features (Phase 4-5)
- [ ] **OCR Receipt Scanner**: Extract amounts and line items from photos using Vision APIs.
- [ ] **Real-time Push Notifications**: Instant alerts for group activity and settles.
- [ ] **Advanced Bank API**: Direct ledger sync via Salt Edge or Plaid integration.

---

## 6. Local Setup (One Command)

Quick-start the entire infrastructure:

We welcome contributions! Here's the recommended workflow:

Launch both development servers:

```bash
npm run dev
```

### Environment Configuration

Configure your OAuth providers and API endpoints to enable real-world sync:

**Backend (`backend/.env`):**
- `DATABASE_URL`: PostgreSQL connection string.
- `GOOGLE_CLIENT_IDS`: OAuth ID for Google Identity.
- `APPLE_CLIENT_IDS`: OAuth ID for Apple Identity.

**Frontend (`frontend/.env`):**
- `EXPO_PUBLIC_API_URL`: Backend endpoint (default: `http://localhost:3000/api`).
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID`: Public Google OAuth key.

---

## 7. Documentation & Architecture

For deeper technical deep-dives:
- [Architecture & Data Flow](./docs/ARCHITECTURE.md)
- [Code Quality & CI/CD](./docs/CODE_QUALITY.md)

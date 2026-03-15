# CashSync

> A unified personal finance and expense-splitting app — combining the power of transaction aggregation with intelligent group ledgering, wrapped in a modern, ultra-premium UI.

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

**CashSync** is a unified personal finance and expense-splitting application. It is designed to bridge the gap between keeping track of individual spending, household bills, and group trip expenses. It takes the transaction aggregation of tools like _Walnut_ or _Mint_, combines it with the powerful ledgering of _Splitwise_, and wraps it in a modern, ultra-premium UI.

> [!NOTE]
> CashSync aims to automate as much as possible through SMS parsing and email receipts before rolling out heavier Bank API integrations.

---

## 2. Platforms & Tech Stack

### Cross-Platform Architecture

To support **Android, iOS, Windows, macOS, and Linux**, a unified codebase strategy is required:

- **Core Mobile (Android/iOS)**: React Native (via Expo).
- **Core Web & Desktop (Windows/macOS/Linux)**: React Native Web / Next.js OR React with Electron/Tauri for native desktop behavior.
- **Backend Infrastructure**:
  - **Server**: Node.js with Express
  - **Database**: PostgreSQL (Structured relationships like users, groups, transactions, splits)
  - **Cache & Queues**: Redis (for parsing queues and fast lookups)
  - **Deployment**: Vercel / AWS.

---

## 3. Core Features Breakdown

### 1. Unified Authentication (OAuth Identity Linking)

Users can log in via multiple providers seamlessly.

- **Providers**: Google, Apple
- **Identity Linking**: If a user logs in via Google today and Apple tomorrow with the same underlying email address, the accounts automatically merge into a single `User ID`.
- **No Passwords**: Reduces friction and enhances security.

### 2. Multi-Source Transaction Engine

Aggregates expenses from all connected sources automatically.

- **SMS Parsing Module**: A background service (mainly for Android) that reads localized bank SMS templates to extract:
  - Amount Debited/Credited
  - Merchant/Tag
  - Date and Time
- **Email Parsing Module**: Uses Gmail/Outlook APIs safely to read transaction alerts and digital receipts.
- **Bank API (Phase 2)**: Placeholder architecture for direct integration via Plaid / Salt Edge.

> [!TIP]
> **Smart Deduplication Engine**: To avoid duplicate entries across SMS, Email, and Bank API, CashSync will match `Amount` + `Transaction ID`. If ID is not present, it will use a composite fingerprint hash (`amount` + `fuzzy_date_within_2m` + `fuzzy_merchant`).

### 3. Smart Expense Splitting (The "Splitwise Killer")

A flexible debt tracker embedded directly inside the transaction feed.

- **Privacy Toggle (Personal Use)**: Each transaction has a "Personal Use" toggle. If marked as personal, splitting options are completely hidden from the UI.
- **Individual & Group Splitting**:
  - Easily assign transaction fractions to specific individuals.
  - Add transaction to previously created groups (e.g., "Goa Trip", "Apartment 4B").
- **Split Methods**: Equals, By Exact Amounts, By Percentages, or By Shares.
- **Settling Up**: Tracks who owes whom with simplified debt routes (minimizing the number of transactions needed to settle up within a group).

### 4. Categorization & Renaming

Make messy bank statements human-readable.

- **Auto-Tagging**: Initial mapping via Regex/ML (e.g., "SWIGGY\*BANGALORE" -> "Food").
- **Custom Labels & Renaming**: Users can rename transactions for easier tracking, and the system remembers these mappings for future entries.

---

## 4. Design & Aesthetics

The product must look and feel **modern, affluent, and heavily polished**.

- **Theme**: True Dark Mode with vivid accent glows (e.g., Neon Green for credits/positive actions, Soft Purple for analytics).
- **Material**: Heavy use of "Glassmorphism" inside cards, subtle border radiuses, and dynamic micro-interactions (hover states, spring animations).
- **Typography**: Uncluttered, geometric sans-serif (e.g., _Inter_, _Outfit_, or _SF Pro Display_).
- **Navigation**: Clean bottom tab bar on mobile, sleek sidebar on desktop.

---

## 5. System Data Flow

```mermaid
graph TD
    A1[Bank SMS] --> B[Phone Parser Module]
    A2[Bank Alert Emails] --> C[Email Integration API]
    A3[Manual Entry] --> D[App Client]

    B --> E{Deduplication Engine}
    C --> E
    D --> E

    E -- Unique Record --> F[(PostgreSQL Database)]
    E -- Duplicate --> Z[Merge Details / Ignore]

    F --> G[Transactions View]

    G -- Marked Personal --> H[Hide Split Options]
    G -- Marked Shared --> I[Split Engine]

    I --> J[Group Ledger]
    I --> K[Individual Ledger]
```

## 6. Project Rollout Phases

1. **Phase 1: Foundation & UI**
   - Build out the React Native/Web application shells.
   - Implement dark mode styling, UI components, and mock interactions.
   - Setup OAuth identity linking (Google/Apple).
2. **Phase 2: Data Ingestion Engine**
   - Develop SMS Receiver (Android).
   - Develop Manual entry flows.
   - Implement the Smart Deduplication logic.
3. **Phase 3: The Split Engine**
   - Database schema for Groups, Debts, and Settlements.
   - UI for selecting friends, splitting bills, and privacy toggling.
4. **Phase 4: Multi-platform Polish**
   - Wrap React Web logic via Electron for Windows/Linux/macOS native installers.
   - Finalize Email integration and push notifications.

---

## 7. Implemented MVP (Current Codebase)

### Backend

- User identity sync with provider-aware account linking (`/api/users/sync`)
- Transaction ingestion + analytics (`/api/transactions`)
- SMS parser + deduplication with fallback fingerprint hash (amount + 2-minute bucket + merchant signature)
- Split support with methods: `EQUAL`, `EXACT`, `PERCENT`, `SHARES`
- Group APIs:
  - `GET /api/groups?userId=...`
  - `POST /api/groups`
  - `POST /api/groups/:id/members`
  - `GET /api/groups/:id/ledger`
  - `POST /api/groups/:id/settle`
- Debt simplification in group ledger (minimized settle-up routes)

### Frontend (Expo, mobile + web)

- Auth screen with email/password and simulated OAuth flows
- Home dashboard with analytics, quick actions, and premium dark UI
- Transactions screen:
  - filtering by type/category
  - SMS ingestion modal
  - rename/re-categorize transactions
  - personal/shared toggle
  - split assignment flow
- New Groups screen:
  - create groups
  - add members by email
  - view suggested settle-up routes
  - settle from debtor side

### Verified Build

- Backend TypeScript build passes (`npm run build` in `backend`)
- Frontend type-check passes (`npx tsc --noEmit` in `frontend`)
- ESLint checks are available across backend + frontend (`npm run lint:check`)

---

## Contributing

We welcome contributions! Here's the recommended workflow:

1. **Fork** the repository and create your branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Set up your local environment** following the [Local Development Setup](#-local-development-setup) section above.
3. **Make your changes** and ensure:
   - All tests pass: `cd backend && npm test`
   - Lint is clean: `npm run lint:check` from the root
   - TypeScript compiles: `cd backend && npm run build`
4. **Commit** with a clear, descriptive message.
5. **Push** your branch and open a **Pull Request** against `main`.

For full architecture and endpoint reference, see:

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- [`docs/CODE_QUALITY.md`](./docs/CODE_QUALITY.md) — ESLint + SonarCloud setup, CI integration, troubleshooting

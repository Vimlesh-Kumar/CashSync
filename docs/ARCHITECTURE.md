# CashSync Architecture (Production-Oriented)

## 1. Complete Architecture

CashSync uses a monorepo with shared domain contracts and multi-client frontends.

- Clients:
  - Mobile (Expo React Native): Android + iOS
  - Desktop/Web shell (React Native Web; Electron wrapper optional)
- Backend API:
  - Node.js + Express feature modules
  - JWT auth + OAuth identity linking
- Data layer:
  - PostgreSQL (Prisma)
  - Redis queue/cache (ingestion and notifications)
- Ingestion pipeline:
  - SMS parser
  - Email parser (Gmail/Outlook)
  - Bank API parser placeholder
  - Dedup and merge worker

Data flow:

1. Source message/event arrives (SMS/email/api/manual)
2. Parser extracts normalized transaction payload
3. Dedup fingerprint generated
4. Existing transaction found -> merge source metadata
5. New transaction created otherwise
6. Analytics + budgets + split ledgers updated
7. Notification events emitted

## 2. Backend Folder Structure

```txt
backend/src
  features
    user
    transaction
    group
    category
    budget
  services
    oauth.service.ts
    sms.service.ts
    email.service.ts
    bank-api.service.ts
    categorization.service.ts
    queue.service.ts
  parsers
    sms
      bankParser.ts
      upiParser.ts
    email
      gmailParser.ts
      outlookParser.ts
    api
      bankApiParser.ts
  workers
    ingestion.worker.ts
  lib
    db.ts
  server.ts
```

## 3. Database Schema

Implemented Prisma models and mapped tables:

- `users`
- `auth_providers`
- `transactions`
- `transaction_sources`
- `transaction_splits`
- `people`
- `groups`
- `group_members`
- `categories`
- `budgets`

Also includes operational models:

- `category_rules`
- `sms_templates`
- `sms_logs`

Primary schema file:

- `backend/prisma/schema.prisma`

Migration baseline SQL:

- `backend/prisma/migrations/202603080001_cashsync_foundation/migration.sql`

## 4. API Endpoints

Auth:

- `POST /api/users/sync`
- `GET /api/users/:id`

Transactions:

- `GET /api/transactions`
  - filters: `date`, `merchant/search (q)`, `category`, `type`, `source`
- `POST /api/transactions`
- `PATCH /api/transactions/:id`
- `POST /api/transactions/sms`
- `POST /api/transactions/:id/splits`
- `PATCH /api/transactions/splits/:splitId/settle`
- `GET /api/transactions/debts/:userId`
- `GET /api/transactions/stats`
- Category rules: `GET/POST/DELETE /api/transactions/rules...`

Groups:

- `GET /api/groups?userId=...`
- `POST /api/groups`
- `POST /api/groups/:id/members` (userId or email)
- `GET /api/groups/:id/ledger`
- `POST /api/groups/:id/settle`

Categories:

- `GET /api/categories/:userId`
- `POST /api/categories`

Budgets:

- `GET /api/budgets/:userId?month=YYYY-MM`
- `POST /api/budgets`

## 5. Parser Structure

Implemented modular parser architecture:

- SMS:
  - `backend/src/parsers/sms/bankParser.ts`
  - `backend/src/parsers/sms/upiParser.ts`
- Email:
  - `backend/src/parsers/email/gmailParser.ts`
  - `backend/src/parsers/email/outlookParser.ts`
- Bank API:
  - `backend/src/parsers/api/bankApiParser.ts` (future placeholder)

## 6. Frontend Screen List

Current tabbed app (Expo Router):

- Home (`/(tabs)/index`)
- Transactions (`/(tabs)/explore`)
- Split (`/(tabs)/split`)
- Insights (`/(tabs)/insights`)
- Profile (`/(tabs)/profile`)

Supporting auth screen:

- `app/index.tsx`

## 7. Example Snippets

OAuth identity sync payload:

```json
{
  "provider": "GOOGLE",
  "idToken": "<google-id-token>"
}
```

Split transaction payload:

```json
{
  "method": "EQUAL",
  "totalAmount": 1200,
  "splits": [
    { "userId": "user-1" },
    { "userId": "user-2" },
    { "userId": "user-3" }
  ]
}
```

## 8. Deduplication Algorithm

Implemented strategy:

- If `transaction_id` present:
  - key = `transaction_id + amount`
- Else:
  - key = `amount + normalized_merchant + 2_minute_timestamp_bucket`

Where implemented:

- `backend/src/features/transaction/transactionService.ts`
- `backend/src/workers/ingestion.worker.ts`

## 9. Split Transaction Logic

Supported methods:

- Equal split
- Exact/custom split
- Percentage split
- Shares split

Behavior:

- `isPersonal=true` hides split UX
- Group ledger computes net balances
- Debt simplification minimizes settlement routes
- Settlement endpoint applies payment across oldest unsettled splits

Where implemented:

- `backend/src/features/transaction/transactionService.ts`
- `backend/src/features/group/groupService.ts`

## Bootstrap

One-command local setup:

```bash
npm run bootstrap
```

What it does:

1. Starts Postgres + Redis
2. Installs backend deps
3. Generates Prisma client
4. Applies baseline SQL migration
5. Seeds default data
6. Installs frontend deps

Then run:

```bash
npm run dev
```

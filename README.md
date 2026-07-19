# Selaras

**Multi-outlet POS with offline-first sync, built for SMBs with unreliable internet.**

Selaras is a Point of Sale system designed for businesses running 2+ branches, particularly in regions where internet connectivity isn't always reliable (a common reality across much of Southeast Asia). Cashiers keep transacting even when the connection drops — data syncs automatically once it's back, with zero risk of stock discrepancies, double-counted sales, or silently lost transactions.

This is a personal project, deliberately dual-purpose: solid enough to run a real business on, and technically deep enough — delta-based conflict resolution, atomic stock operations, role-scoped multi-tenancy — to be worth studying as an engineering portfolio piece.

---

## Table of Contents

- [Why This Exists](#why-this-exists)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [API Overview](#api-overview)
- [Getting Started](#getting-started)
- [Testing Methodology](#testing-methodology)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)
- [License](#license)

---

## Why This Exists

Most POS software assumes a stable internet connection. That assumption breaks down constantly for small businesses in areas with inconsistent connectivity — a dropped connection mid-sale shouldn't mean a cashier can't ring up a customer, and it definitely shouldn't mean stock counts silently go wrong once the connection comes back.

Selaras treats "offline" as a first-class state, not an error condition. The core design bet is: **local-first writes, server-authoritative validation, delta-based reconciliation** — detailed further below.

## Features

### Core POS
- Multi-payment transactions (cash, QRIS, card)
- Product & category management with soft delete (deactivated products keep historical transaction integrity intact)
- Per-outlet stock tracking via an append-only ledger — not a mutable counter
- Manual stock adjustment (restock, correction) with the same atomicity guarantees as sales
- Stock transfer between outlets — atomic two-sided ledger entries in a single DB transaction
- Sales reports: daily/monthly, per-outlet or combined across outlets, top-5 best sellers
- Excel export for reports
- Thermal receipt printing (80mm), rendered client-side from the transaction snapshot

### Multi-Outlet & Role-Based Access
| Role | Scope |
|---|---|
| **Owner** | Full access across all outlets; can view combined data or switch to any single outlet |
| **Manager** | Locked to one outlet; manages cashiers and stock within that outlet only |
| **Cashier** | Transactions only, locked to their assigned outlet |

Every role boundary above is enforced **server-side**, not just hidden in the UI — a Manager sending a crafted request for another outlet's data gets a 403, not a data leak.

### Offline-First Sync
- Transactions write to local IndexedDB immediately, then sync automatically once online — the cashier gets instant confirmation regardless of connectivity
- Two-layer connectivity detection: `navigator.onLine` alone is unreliable (a device can be connected to Wi-Fi with no actual internet access), so it's paired with an active health-check against the API
- **Delta-based stock merge**, not last-write-wins — every stock change is a signed delta in an append-only ledger, summed and applied atomically at sync time
- Idempotency keys on every transaction and stock delta, enforced via database unique constraints (not application-level pre-checks, which are vulnerable to race conditions)
- A conflict review screen surfaces transactions that fail to sync (e.g., stock ran out before the sync caught up) for manual owner review — the system never silently guesses how to resolve a stock conflict

### Security
- JWT stored in httpOnly cookies, not localStorage — mitigates token theft via XSS
- Rate limiting on the login endpoint (5 attempts/minute per IP)
- bcrypt password hashing
- Parameterized queries throughout (GORM) — no raw SQL string concatenation

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Zustand, Framer Motion |
| Offline Storage | IndexedDB via Dexie.js |
| Backend | Go, Fiber v2, GORM |
| Database | PostgreSQL |
| Auth | JWT (HS256), httpOnly cookies, bcrypt |
| Receipt Printing | react-to-print |

## Architecture

### Backend layering

Every endpoint follows a strict **Handler → Service → Repository** chain. Handlers never touch the database directly — they parse the request and delegate.

```
Request → Router → Middleware (Auth, Role check)
                        │
                        ▼
                    Handler        (parse request/response, no business logic)
                        │
                        ▼
                    Service        (validation, business rules, transactions)
                        │
                        ▼
                    Repository     (raw GORM queries only)
```

### Sync strategy: delta-based merge

The naive approach to offline sync — last-write-wins — silently loses data. If two outlets are both offline and both sell the last unit of the same product, one of those sales just vanishes when whichever write lands second overwrites the first.

Selaras instead records every stock change as a **signed delta** in an append-only `stock_ledger` table (the source of truth), while a `stocks` table holds a cached running total for fast reads. On sync:

1. The server sums pending deltas ordered by `client_created_at` (when the sale actually happened on the device, not when it happened to sync)
2. Applies them atomically: `UPDATE stocks SET quantity = quantity + delta WHERE quantity + delta >= 0`
3. If the atomic update affects zero rows (stock would go negative), the transaction is rejected outright and flagged for manual review — never silently resolved
4. A unique idempotency key per transaction/delta, enforced with `ON CONFLICT DO NOTHING` at the database level, prevents double-counting if a sync retries after a partial failure

### Money handling

All currency values are `int64` (`BIGINT` in Postgres), never `float64` — floating-point rounding errors have no place in financial totals that get summed across thousands of transactions.

## Database Schema

| Table | Purpose |
|---|---|
| `outlets` | Branch locations |
| `users` | Accounts with `role` and (nullable for Owner) `outlet_id` |
| `categories`, `products` | Catalog, soft-deletable |
| `stocks` | Cached current quantity per product/outlet — **derived**, never written to directly |
| `stock_ledger` | Append-only source of truth for every stock change (`sale`, `restock`, `adjustment`, `transfer_in`, `transfer_out`) |
| `transactions`, `transaction_items`, `payments` | Sales records |
| `sync_audit_log` | Debugging trail for sync conflicts |

## API Overview

| Endpoint | Access | Notes |
|---|---|---|
| `POST /api/auth/login` | Public | Rate-limited, sets httpOnly cookie |
| `POST /api/transactions` | Authenticated | Atomic stock check + idempotency-protected |
| `GET/POST/PUT /api/products` | Read: all · Write: owner/manager | Soft delete + restore |
| `GET /api/stocks` | Authenticated | Role-scoped to outlet for non-owners |
| `POST /api/stocks/adjust` | owner/manager | Manual stock correction |
| `POST /api/stocks/transfer` | owner only | Two-sided atomic transfer between outlets |
| `GET /api/reports/sales` | owner/manager | Date range + outlet filter |
| `GET/POST/PUT /api/users` | owner (all) / manager (own outlet's cashiers only) | Password reset support |

## Getting Started

### Prerequisites
- Go 1.22+
- Node.js 20+
- PostgreSQL 15+

### Backend

```bash
cd backend
cp .env.example .env
```

Fill in `.env`:

| Variable | Description |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL connection |
| `JWT_SECRET` | Random string — **never use the placeholder value in production** |
| `PORT` | API server port (default 8080) |

```bash
go mod tidy
createdb selaras
go run main.go   # auto-migrates schema and seeds initial data
```

Seeded accounts: `owner` / `password123` (full access), `kasir1` / `password123` (cashier).

### Frontend

```bash
cd frontend
cp .env.example .env.local
```

Set `NEXT_PUBLIC_API_URL` to your backend URL.

```bash
npm install
npm run dev
```

Visit `http://localhost:3000/login`.

## Testing Methodology

There's no automated test suite yet (noted honestly in the roadmap below) — but every feature listed above was manually verified end-to-end against both happy paths and adversarial edge cases before being considered done, including:

- Concurrent transactions against the same low-stock item (race condition check)
- Insufficient-stock rejection with full transaction rollback (no partial writes)
- Duplicate request replay (idempotency key collision → rejected, not double-processed)
- Network drop mid-sync, and resumption afterward
- Expired/tampered auth tokens
- Role boundary probing via direct API calls (not just UI navigation)

## Project Structure

```
selaras/
├── backend/
│   ├── config/         # env loading, DB connection
│   ├── database/       # GORM models, AutoMigrate, seeder
│   ├── handlers/       # HTTP controllers (Fiber)
│   ├── middleware/     # JWT auth, role-based access
│   ├── repository/     # DB queries
│   ├── service/        # business logic, validation, transactions
│   └── main.go
│
└── frontend/
    └── src/
        ├── app/         # Next.js App Router pages
        ├── components/  # UI components
        ├── db/          # Dexie (IndexedDB) schema
        ├── services/    # HTTP client functions
        ├── store/       # Zustand stores
        └── proxy.ts     # auth route guard
```

## Roadmap

- [ ] Automated test suite (unit tests for delta-merge logic, integration tests for the transaction flow)
- [ ] Peak-hour sales analytics
- [ ] PDF report export (Excel export already shipped)
- [ ] Push notifications for low stock (in-app threshold alerts already shipped)
- [ ] Profit margin tracking
- [ ] Production deployment guide

## License

MIT

---

*Built with Go, Next.js, and PostgreSQL.*

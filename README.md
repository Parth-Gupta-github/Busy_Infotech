# Restaurant Order Management System

A full-stack web application that replaces paper-ticket restaurant workflows with a digital order management system. Managers maintain the menu, waiters place and track orders through a defined lifecycle, and everyone can see which orders need attention.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React + Vite | UI framework with fast dev server |
| Styling | Tailwind CSS v3 | Utility-first CSS with dark mode |
| Backend | Node.js + Express | REST API server |
| Database | PostgreSQL (Supabase) | Cloud-hosted relational database |
| ORM | Prisma | Type-safe database access |
| Auth | bcryptjs + JWT | Password hashing + token-based auth |

## Architecture

```
React (Vite)  →  Express API  →  Prisma ORM  →  Supabase PostgreSQL
:5173              :3000                           (cloud)
```

The frontend makes HTTP requests to the Express API, which enforces business rules (role-based access, order lifecycle transitions) and talks to the database through Prisma.

## Features

1. **Accounts & Roles** — Manager and Waiter roles with server-enforced permissions
2. **Menu Management** — CRUD + bulk price/availability updates with per-item error reporting
3. **Orders** — Create, view, filter, search, paginate (all server-side)
4. **Order Lifecycle** — Placed → Accepted → Preparing → Ready → Served (with cancellation rules)
5. **Order Lines** — Add items with quantity and special instructions, void with required reason
6. **Collaborators** — Multiple waiters can work on the same order
7. **Dashboard** — Live stats, breakdowns by status/waiter, 14-day trend chart
8. **Immutable Audit Trail** — Every action logged, nothing editable after the fact
9. **Slow-Order Alerts** — Auto-detection with acknowledge and re-alert
10. **CSV Export** — Download the day's orders

## Setup

### Prerequisites
- Node.js 18+
- A Supabase account (free tier works)

### Server
```bash
cd server
npm install
cp .env.example .env
# Fill in your Supabase DATABASE_URL and JWT secrets in .env
npx prisma db push    # Creates tables in Supabase
npm run seed          # Seeds demo data
npm run dev           # Starts on http://localhost:3000
```

### Client
```bash
cd client
npm install
npm run dev           # Starts on http://localhost:5173
```

## Design Decisions

*This section will be updated as the project progresses.*

- **Prisma over raw SQL**: Provides type safety, automatic migrations, and prevents SQL injection. Trade-off: slight performance overhead vs raw queries, acceptable for this scale.
- **JWT over sessions**: Stateless auth — no session store needed. Trade-off: can't instantly revoke tokens, but refresh token rotation mitigates this.
- **priceAtAdd snapshot on OrderLine**: Captures the menu item price at the moment the line is added, so the total reflects historical prices. This matches the assignment's "current prices at the time each line was added."
- **Soft-delete (archived flag)**: Orders and menu items are never physically deleted, preserving history and allowing restoration.

## Trade-offs

- **SQLite vs PostgreSQL**: Chose PostgreSQL (Supabase) for production-grade features (proper decimal types, robust aggregations, concurrent access). SQLite would be simpler for local dev but less realistic.
- **No real-time (WebSockets)**: Polling-based alerts instead of push notifications. Simpler to implement within the time budget; WebSockets would be a natural enhancement.
- **No test framework yet**: Focused on feature completeness first. Integration tests would be the highest-value addition.

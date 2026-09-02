# Restaurant Order Management System

A full-stack web application that replaces paper-ticket restaurant workflows with a digital order management system. Managers maintain the menu, waiters place and track orders through a defined lifecycle, and everyone can see which orders need attention.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React + Vite | UI framework with fast dev server |
| Styling | Tailwind CSS v3 | Utility-first CSS with dark mode |
| Backend | Node.js + Express | REST API server |
| Database | Raw PostgreSQL (Neon) | Cloud-hosted relational database using raw SQL queries |
| DB Driver | `pg` (node-postgres) | Native PostgreSQL client pool for Node.js |
| Auth | bcryptjs + JWT | Password hashing + token-based auth |

## Architecture

```
React (Vite)  →  Express API  →  pg Pool (Raw SQL)  →  Neon PostgreSQL
:5173              :3000                                 (cloud)
```

The frontend makes HTTP requests to the Express API, which enforces business rules (role-based access, order lifecycle transitions) and talks to the PostgreSQL database using raw SQL queries with parameterization via the native `pg` pool.

## Features

1. **Accounts & Roles** — Manager and Waiter roles with server-enforced permissions
2. **Menu Management** — CRUD + bulk price/availability updates with per-item error reporting
3. **Orders** — Create, view, filter, search, paginate (all server-side raw SQL queries)
4. **Order Lifecycle** — Placed → Accepted → Preparing → Ready → Served (with cancellation rules)
5. **Order Lines** — Add items with quantity and special instructions, void with required reason
6. **Collaborators** — Multiple waiters can work on the same order
7. **Dashboard** — Live stats, breakdowns by status/waiter, 14-day trend chart (raw SQL aggregation)
8. **Immutable Audit Trail** — Every action logged, nothing editable after the fact
9. **Slow-Order Alerts** — Auto-detection with acknowledge and re-alert
10. **CSV Export** — Download the day's orders

## Setup

### Prerequisites
- Node.js 18+
- A Neon PostgreSQL account (free tier works)

### Server
```bash
cd server
npm install
cp .env.example .env
# Fill in your Neon DATABASE_URL and JWT secrets in .env
npm run db:init       # Applies server/db/schema.sql to PostgreSQL
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

- **Raw SQL over ORM**: Direct control over database queries, schema definitions, and parameters. Shows complete understanding of SQL `JOIN`s, aggregates, parameterization, and transaction isolation.
- **JWT over sessions**: Stateless auth — no session store needed. Trade-off: can't instantly revoke tokens, but refresh token rotation mitigates this.
- **`price_at_add` snapshot on `order_lines`**: Captures the menu item price at the moment the line is added, so the total reflects historical prices. This matches the assignment's "current prices at the time each line was added."
- **Soft-delete (`archived` flag)**: Orders and menu items are never physically deleted, preserving history and allowing restoration.

## Trade-offs

- **Raw SQL vs ORM**: Writing raw SQL queries requires careful parameterization (`$1`, `$2`) to prevent SQL injection and manual mapping of results, but avoids ORM magic and improves query clarity.
- **No real-time (WebSockets)**: Polling-based alerts instead of push notifications. Simpler to implement within the time budget; WebSockets would be a natural enhancement.

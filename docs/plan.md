# Work Plan & Sequencing

## Approach

The project is built in **10 phases**, ordered by dependency — each phase builds on what the previous one established.

## Phase Breakdown

### Phase 1: Project Scaffolding ✅
**What:** Set up the project structure, install dependencies, create raw SQL schema script, configure `pg` connection pool module.

**Deliverables:**
- [x] Server directory with Express + PostgreSQL `pg` pool
- [x] Raw SQL schema (`server/db/schema.sql`) with all 7 tables & indexes
- [x] Database initializer script (`server/db/init.js`)
- [x] `.env.example` with configuration template
- [x] Documentation templates updated for raw SQL
- [ ] Client directory with React + Vite + Tailwind v3
- [ ] Seed script (`server/db/seed.js`) with demo data

---

### Phase 2: Authentication & Authorization
**What:** User registration, login, JWT token issuance, auth middleware, role-based access control middleware using raw SQL queries for user authentication.

### Phase 3: Menu Management
**What:** CRUD for menu items using raw SQL `SELECT`, `INSERT`, `UPDATE` queries, bulk update with per-item error handling.

### Phase 4: Orders — Core CRUD & Filtering
**What:** Create orders, list with server-side SQL parameterized queries for filtering, searching, pagination, and sorting (`COUNT(*) OVER()`, `LIMIT`, `OFFSET`).

### Phase 5: Order Lifecycle
**What:** Status transition endpoint with rule enforcement, transaction-safe raw SQL queries, audit logging on every status change.

### Phase 6: Order Lines
**What:** Add lines to orders (with price snapshot `price_at_add`), void lines with required reason, running total SQL calculations (`SUM(price_at_add * quantity)`).

### Phase 7: Collaborators
**What:** Add/remove collaborators on orders, "My Orders" SQL query (`JOIN order_collaborators`).

### Phase 8: Dashboard
**What:** Raw SQL aggregation queries (`COUNT`, `SUM`, `GROUP BY`, `DATE_TRUNC`) for live stats, breakdowns by status/waiter, and 14-day served-per-day trends.

### Phase 9: Slow-Order Alerts
**What:** Time-based SQL query to detect open orders exceeding threshold, acknowledge logic with re-alert support.

### Phase 10: Polish & Documentation
**What:** CSV export via streaming SQL results, audit timeline UI, final documentation.

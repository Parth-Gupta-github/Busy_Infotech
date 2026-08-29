# Key Technical Decisions

This document records every significant technical choice made during the project, what alternatives were considered, and why the chosen approach won. Each decision includes the trade-off.

---

## Decision 1: PostgreSQL (Supabase) over SQLite

**Context:** We need a database that supports relational data, server-side aggregations, and decimal types.

**Decision:** PostgreSQL via Supabase.

---

## Decision 2: Raw SQL (`pg` driver) over Prisma / ORM

**Context:** We need to query PostgreSQL from Node.js.

**Options considered:**

| Option | Pros | Cons |
|--------|------|------|
| **Prisma ORM** | Schema generator, auto-typed client | Abstraction layer hides SQL execution; magic behavior |
| **Raw SQL (`pg` driver)** ✅ | Complete query control, direct SQL execution, explicit JOINs and parameterization, no ORM overhead | Must write SQL DDL scripts, manually map rows, carefully handle parameter placeholders (`$1`, `$2`) |

**Decision:** Raw SQL using `pg` (node-postgres) connection pool.

**Rationale:** Using raw SQL directly demonstrates complete understanding of SQL design, index utilization, transaction management, `JOIN` queries, and explicit aggregation functions (`SUM`, `COUNT`, `DATE_TRUNC`). It removes any ORM abstraction layer and gives precise control over every query executed against Supabase PostgreSQL.

**What we gave up:** Auto-generated TypeScript/JS types from schema; must maintain SQL schema DDL (`schema.sql`) manually.

---

## Decision 3: JWT Authentication over Sessions

**Decision:** JWT with short-lived access tokens (15 min) and longer refresh tokens (7 days).

---

## Decision 4: Price Snapshot (`price_at_add`) on `order_lines`

**Decision:** Snapshot the current price into `order_lines.price_at_add` when the line item is added.

---

## Decision 5: Soft Deletes over Hard Deletes

**Decision:** Maintain an `archived` boolean flag on `orders` and `menu_items`.

---

## Decision 6: Void Instead of Delete for Order Lines

**Decision:** Mark lines as `voided = true` with a required `void_reason`.

---

## Decision 7: Tailwind CSS v3 over Vanilla CSS

**Decision:** Tailwind CSS v3.

---

## Decision 8: Polling over WebSockets for Alerts

**Decision:** Poll `/api/alerts` every 30 seconds from the frontend.

---

## Decision 9: Server-Side Raw SQL Filtering & Pagination

**Decision:** Execute parameterized SQL queries with `WHERE`, `LIKE`, `ORDER BY`, `LIMIT`, and `OFFSET`.

---

## Decision 10: Append-Only `audit_logs` Table

**Decision:** No `updated_at` column and no UPDATE/DELETE queries exist in the server logic for audit logs.

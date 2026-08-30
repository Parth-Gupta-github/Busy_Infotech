# Restaurant Orders — Master Checklist

This document tracks all required deliverables, architectural rules, and 10 core assignment goals.

---

## 📋 1. Core Deliverables Checklist

- [x] **Repository Structure**: Public GitHub repository with clean, incremental git history.
- [x] **Submission File**: `SUBMISSION.md` populated with stack details, links, demo credentials, and goals status.
- [x] **5 Core Documentation Files** in `docs/`:
  - [x] `docs/ai-prompts.md` — Log of prompts used, outputs received, and corrections made.
  - [x] `docs/architecture.md` — Moving pieces, execution environment, end-to-end request flow, and deliberate omissions.
  - [x] `docs/schema.md` — Table definitions, relationships, constraint enforcement split, denormalization, and 100x data bottlenecks.
  - [x] `docs/plan.md` — Session breakdown, build sequence rationale, estimates vs actuals, and scope cuts.
  - [x] `docs/decisions.md` — Log of 7 technical decisions with Chose/Rejected/Why and required `Later reversed:` entry.
- [x] **Database DDL**: `server/db/schema.sql` raw PostgreSQL DDL script with tables, enums, FK constraints, and indexes.
- [x] **Database Module & Seeder**: `server/src/db.js` (`pg` connection pool) and `server/db/seed.js` demo data seeder.
- [x] **Frontend Setup**: React + Vite + Tailwind CSS v3 client initialized.

---

## 🎯 2. The 10 Assignment Goals Checklist

| # | Goal | Key Requirements | Status | Phase |
|---|------|------------------|--------|-------|
| 1 | **Accounts & Roles** | Email/password sign-in; `MANAGER` & `WAITER` roles; server-enforced permissions (waiters cannot touch menu or unauthorized orders). | Done | Phase 2 |
| 2 | **Orders** | Table number identifier; creator becomes primary waiter; archive & restore functionality preserving history. | Pending | Phase 4 |
| 3 | **Order Lines** | Quantity, menu item, special instructions; price snapshot `price_at_add`; server-calculated running total. | Pending | Phase 6 |
| 4 | **Order Lifecycle & Rules** | State flow: `Placed → Accepted → Preparing → Ready → Served`; cancel allowed ONLY in `Placed`/`Accepted`; line voiding with required reason. | Pending | Phase 5 |
| 5 | **Collaborators** | Primary waiter can add other waiters as collaborators; waiters see all orders they own or collaborate on. | Pending | Phase 7 |
| 6 | **Finding Orders** | Server-side text search over table numbers, status/waiter/date filters, sorting, and pagination. | Pending | Phase 4 |
| 7 | **Bulk Actions & CSV Export** | Manager bulk price/availability change reporting per-item pass/fail; export daily orders as CSV. | Done (Bulk Actions) | Phase 3 & 10 |
| 8 | **A Dashboard** | Live stats (open orders, placed today, served today, revenue today); breakdowns by status & waiter; 14-day served trend chart. | Pending | Phase 8 |
| 9 | **History You Cannot Rewrite** | Append-only audit trail logging status changes, line additions, voids with reason, and notes (uneditable). | Pending | Phase 5 |
| 10 | **Slow-Order Alerts** | Time threshold detection (> N mins without `Ready`); navigation count badge; acknowledge & re-alert (after M mins). | Pending | Phase 9 |

---

## 🛠️ 3. Execution Phase Plan

- [x] **Phase 1: Scaffolding & Setup** — Express server, raw PostgreSQL schema, React client, Tailwind v3, 5 docs, `.gitignore`.
- [x] **Phase 2: Authentication & Authorization** — Register/Login APIs, JWT middleware, role checks, React Auth Context, Login/Register pages.
- [x] **Phase 3: Menu Management & Bulk Actions** — Menu CRUD, availability toggle, bulk update with per-item pass/fail reporting, Manager UI.
- [ ] **Phase 4: Orders Core & Server Search/Pagination** — Create order API, filterable/searchable/paginated SQL queries, Orders List UI.
- [ ] **Phase 5: Lifecycle Transition Rules & Audit Trail** — Server state machine validation, append-only `audit_logs` insertion, Lifecycle UI buttons.
- [ ] **Phase 6: Order Lines & Voiding** — Add line with price snapshot `price_at_add`, void line with mandatory reason, Order Detail UI.
- [ ] **Phase 7: Collaborators Management** — Add/remove collaborators, consolidated "My Orders" waiter view.
- [ ] **Phase 8: Dashboard & Recharts Visualization** — SQL aggregations (`SUM`, `COUNT`, `DATE_TRUNC`), live KPI cards, status/waiter breakdowns, 14-day trend line chart.
- [ ] **Phase 9: Slow-Order Alerts System** — Alert threshold SQL queries, 30s polling, navbar badge, acknowledge & re-alert mechanism.
- [ ] **Phase 10: Daily CSV Export & Final Polish** — Streaming CSV download API endpoint, timeline UI component, final verification & `SUBMISSION.md` update.

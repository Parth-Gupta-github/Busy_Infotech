# Plan

## How did you break the work into sessions?

I broke the work into **7 focused daily sessions** spread across the week, totaling approximately 15 hours:

- **Session 1 — Day 1 (~1.5 hrs):** Project planning, requirements scoping, architecture decisions (raw SQL vs ORM, Tailwind vs vanilla CSS), evaluating cloud hosting options (Vercel + Render + Neon), mapping the 10-phase execution order, and setting up doc templates.
- **Session 2 — Day 2 (~2.5 hrs):** Database schema creation with 7 tables, Neon connection pooling, seed script with bcrypt passwords, JWT authentication middleware, and role enforcement (`requireRole('MANAGER')` / `requireRole('WAITER')`).
- **Session 3 — Day 3 (~2.0 hrs):** Menu management with bulk price/availability updates (per-item pass/fail reporting), order creation, and the lifecycle state machine (Placed → Accepted → Preparing → Ready → Served) with strict cancellation restrictions.
- **Session 4 — Day 4 (~2.0 hrs):** Order lines with price snapshots (`price_at_add`), line voiding with mandatory reasons, Collaborators management with `UNIQUE(order_id, waiter_id)` DB constraint, and the consolidated "My Orders" waiter view.
- **Session 5 — Day 5 (~2.0 hrs):** Dashboard analytics with headline KPI cards, status distribution breakdown, waiter performance leaderboard, Recharts 14-day trend line chart, slow-order alert polling with 10-minute acknowledgment suppression, and streaming CSV export.
- **Session 6 — Day 6 (~2.0 hrs):** Security hardening (JWT_SECRET fail-fast check, input validation standardization, database price constraints), date search filters, sorting controls, and UI theme refinements.
- **Session 7 — Day 7 (~3.0 hrs - Today):** Extended restaurant workflows — Kitchen Display System (KDS at `/kitchen`), printable thermal receipts with Order ID headers, filter-aware CSV exports, light/dark mode contrast fixes, full portal modal overlays, and comprehensive end-to-end goal testing.

---

## What order did you build in, and why that order?

I built in strict dependency order:

1. **Scaffolding & DB Schema:** Establishing database tables and `pg` pool first because all features rely on persistent data.
2. **Auth & Role Enforcement:** Implementing user auth early so every subsequent route can immediately enforce role-based access (`MANAGER` vs `WAITER`).
3. **Menu Management:** Creating menu items before orders because orders require menu items to create order lines.
4. **Orders & Lifecycle Rules:** Building order creation and state transition logic before adding line items and collaborators.
5. **Order Lines & Voiding:** Adding line item management and price snapshots once orders exist.
6. **Collaborators & My Orders:** Adding collaboration layer on top of completed orders.
7. **Dashboard & Analytics:** Aggregating data from existing orders, lines, and statuses.
8. **Slow-Order Alerts & CSV Export:** Adding background monitoring and export features once all core workflows function cleanly.
9. **KDS & Stretch Enhancements:** Kitchen Display System, thermal receipts, and light/dark theme toggle after all 10 core goals were verified.

---

## What did you estimate versus what it actually took?

| Session / Feature Area | Estimated Time | Actual Time | Difference & Notes |
|────────────────-|────────────────|─────────────|───────────────────|
| Session 1 (Day 1): Planning & Architecture | 1.0 hr | 1.5 hrs | Took longer evaluating raw SQL vs Prisma ORM and finalizing the 7-table schema design |
| Session 2 (Day 2): DB Schema, Auth & Roles | 2.0 hrs | 2.5 hrs | Raw SQL DDL, UUID extensions, and JWT role-guard middleware |
| Session 3 (Day 3): Menu CRUD & Lifecycle State Machine | 2.0 hrs | 2.0 hrs | Bulk update per-item pass/fail reporting and state machine transition validation |
| Session 4 (Day 4): Lines, Price Snapshots & Collaborators | 2.0 hrs | 2.0 hrs | Price snapshot `price_at_add`, line voiding reasons, and unique collaborator constraints |
| Session 5 (Day 5): Dashboard, Alerts & CSV Export | 2.0 hrs | 2.0 hrs | Dashboard aggregation SQL queries, Recharts integration, and alert suppression logic |
| Session 6 (Day 6): Security Hardening & Polish | 1.5 hrs | 2.0 hrs | JWT fail-fast checks, input validation error formatting, and date filters |
| Session 7 (Day 7): Testing, KDS, Thermal Bills & Polish | 2.0 hrs | 3.0 hrs | Comprehensive end-to-end goal testing, KDS bump screen, thermal receipts, and portal modal overlays |

---

## What did you cut when you ran short?

- **WebSockets / Server-Sent Events for Alerts:** Cut real-time socket infrastructure in favor of clean HTTP polling every 30 seconds. For a 15-minute alert threshold, polling delivers the feature reliably without complex socket lifecycle code.
- **Nodemailer / Email Verification on Registration:** Skipped email verification workflows to ensure testing and demo evaluation are frictionless without requiring SMTP configuration.
- **Complex UI Component Libraries:** Avoided heavy third-party component libraries (like Material UI or Ant Design) in favor of lightweight Tailwind CSS v3 utility styling.


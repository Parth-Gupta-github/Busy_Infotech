# Plan

## How did you break the work into sessions?

I broke the work into **5 focused sessions** spread across days, totaling approximately 12 hours:

- **Session 1 — Saturday (~1.5 hrs):** Project planning, architecture decisions (raw SQL vs ORM, Tailwind vs vanilla CSS), evaluating hosting options (Vercel + Render + Neon), mapping out the 10-phase execution order, and setting up doc templates.
- **Session 2 — Sunday (~4.5 hrs):** Core implementation — database schema creation with 7 tables, JWT authentication, role middleware (`MANAGER`/`WAITER`), Menu CRUD with bulk price/availability updates (per-item pass/fail reporting), Order creation, lifecycle state machine (Placed → Accepted → Preparing → Ready → Served), and append-only audit logging.
- **Session 3 — Monday (~2 hrs):** Order lines with price snapshots (`price_at_add`), line voiding with mandatory reasons, Collaborators management with `UNIQUE(order_id, waiter_id)` DB constraint, and the consolidated "My Orders" waiter view.
- **Session 4 — Tuesday (~2.5 hrs):** Dashboard analytics with headline KPI cards, status distribution breakdown, waiter performance leaderboard, 14-day trend line chart (Recharts), slow-order alert polling with 10-minute acknowledgment suppression, and daily CSV export endpoint.
- **Session 5 — Wednesday (~1.5 hrs+):** UI polish (date search filters, sorting controls, portal-based modal overlays), deployment configuration (Vercel + Render), application branding (favicon, title), documentation updates, and final testing.

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

---

## What did you estimate versus what it actually took?

| Session / Feature Area | Estimated Time | Actual Time | Difference & Notes |
|────────────────-|────────────────|─────────────|───────────────────|
| Session 1: Planning & Architecture | 1.0 hr | 1.5 hrs | Took longer evaluating raw SQL vs Prisma ORM and finalizing the 7-table schema design |
| Session 2: Auth, Menu, Orders & Lifecycle | 4.0 hrs | 4.5 hrs | Bulk update per-item pass/fail reporting and lifecycle state machine validation took extra care |
| Session 3: Lines, Voiding & Collaborators | 2.0 hrs | 2.0 hrs | On target; price snapshot `price_at_add` and unique collaborator constraints |
| Session 4: Dashboard, Alerts & CSV Export | 2.5 hrs | 2.5 hrs | Dashboard aggregation SQL queries, Recharts integration, and alert suppression logic |
| Session 5: Polish, Deployment & Docs | 1.5 hrs | 1.5 hrs+ | Date filters, sorting, portal overlays, Vercel/Render deployment, and documentation |

---

## What did you cut when you ran short?

- **WebSockets / Server-Sent Events for Alerts:** Cut real-time socket infrastructure in favor of clean HTTP polling every 30 seconds. For a 15-minute alert threshold, polling delivers the feature reliably without complex socket lifecycle code.
- **Stretch Goals (Kitchen Display Screen, Loyalty Program, Handheld Ordering):** Deliberately skipped all optional stretch goals to ensure all 10 core required goals are rock-solid and fully verified.
- **Complex UI Component Libraries:** Avoided heavy third-party component libraries (like Material UI or Ant Design) in favor of lightweight Tailwind CSS v3 utility styling.

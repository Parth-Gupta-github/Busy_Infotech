# Plan

## How did you break the work into sessions?

I broke the 12-hour budget into **5 focused sessions** spread across days:

- **Session 1 (Phase 1):** Scaffolding, architecture selection, raw PostgreSQL schema creation, client setup, and doc templates. (~2 hours)
- **Session 2 (Phases 2 & 3):** JWT Authentication, role middleware (`MANAGER`/`WAITER`), Menu CRUD, and bulk price/availability update with per-item pass/fail reporting. (~2.5 hours)
- **Session 3 (Phases 4 & 5):** Core Order creation, server-side filtering/search/pagination, and Order Lifecycle state transition rules with append-only audit logging. (~2.5 hours)
- **Session 4 (Phases 6, 7 & 8):** Order lines with price snapshots (`price_at_add`), line voiding with required reason, Collaborators management, and Dashboard live stats / 14-day trend charts. (~2.5 hours)
- **Session 5 (Phases 9 & 10):** Slow-order alert polling, acknowledge & re-alert logic, daily CSV export stream, polish, and doc updates. (~2 hours)

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

| Phase / Feature | Estimated Time | Actual Time | Difference & Notes |
|────────────────-|────────────────|─────────────|───────────────────|
| Phase 1: Scaffolding & Setup | 1.0 hr | 1.2 hrs | Took slightly longer setting up Tailwind v3 and raw PostgreSQL schema DDL |
| Phase 2: Auth & Role Middleware | 1.5 hrs | 1.5 hrs | On target; simple JWT payload with user role |
| Phase 3: Menu Management & Bulk Actions | 1.5 hrs | 1.5 hrs | Bulk update per-item pass/fail reporting required individual row handling |
| Phase 4: Orders & Server Filtering | 2.0 hrs | 2.0 hrs | Server-side text search over table numbers and pagination query tuning |
| Phase 5: Lifecycle Rules & Audit Log | 1.5 hrs | 1.5 hrs | Implemented transition validation logic and append-only audit logs |
| Phase 6 & 7: Lines & Collaborators | 2.0 hrs | 1.8 hrs | Built price snapshot `price_at_add` and unique collaborator constraints |
| Phase 8 & 9: Dashboard & Alerts | 2.0 hrs | 1.8 hrs | Dashboard aggregation SQL queries and slow-order polling endpoints |
| Phase 10: Polish & CSV Export | 1.5 hrs | 1.5 hrs | CSV stream formatting and documentation completeness |

---

## What did you cut when you ran short?

- **WebSockets / Server-Sent Events for Alerts:** Cut real-time socket infrastructure in favor of clean HTTP polling every 30 seconds. For a 15-minute alert threshold, polling delivers the feature reliably without complex socket lifecycle code.
- **Stretch Goals (Kitchen Display Screen, Loyalty Program, Handheld Ordering):** Deliberately skipped all optional stretch goals to ensure all 10 core required goals are rock-solid and fully verified.
- **Complex UI Component Libraries:** Avoided heavy third-party component libraries (like Material UI or Ant Design) in favor of lightweight Tailwind CSS v3 utility styling.

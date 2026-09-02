# Submission

Fill this in and commit it. This is the first file we open.

## Links
- **GitHub repository:** https://github.com/Parth-Gupta-github/Busy_Infotech
- **Live application:** https://restaurant-orders-seven.vercel.app
- **Backend API:** https://restaurant-orders-api-p5zb.onrender.com

> **Note on Cold Starts:** Hosted on Render free tier. If the backend service is idle, the initial request may take ~50 seconds to spin up.

## Notes for the reviewer
All role-based permissions, order lifecycle transition rules, search/pagination, bulk item error reporting, collaborators management, dashboard aggregations with 14-day trend analysis, slow-order alerts with 10-minute acknowledgment suppression, daily CSV order exports, and append-only audit logs are strictly enforced on the server using raw SQL queries with parameterization against PostgreSQL.

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Manager | `manager@restaurant.com` | `manager123` |
| Waiter 1 | `waiter1@restaurant.com` | `waiter123` |
| Waiter 2 | `waiter2@restaurant.com` | `waiter123` |

## Stack

| Layer | What you used | Why |
|-------|---------------|-----|
| **Frontend** | React (Vite) + Tailwind CSS v3 + Recharts | Fast dev setup, responsive UI components, interactive analytics data charts, real-time alert polling |
| **Backend** | Node.js + Express.js | Lightweight REST API server with middleware-based role enforcement |
| **Database** | PostgreSQL (Neon) via `pg` pool | Relational schema with raw SQL queries for explicit JOINs, transactions, and precision aggregations |
| **Hosting** | Vercel (Frontend) + Render (Backend API) + Neon PostgreSQL DB | Full stack cloud deployment with HTTPS endpoints |

## Goal checklist

| # | Goal | Status | Notes |
|---|------|--------|-------|
| 1 | **Accounts and roles** | Done | Email/password login with JWT. Server-enforced `MANAGER` & `WAITER` role permissions via middleware (`roleCheck.js`). |
| 2 | **Orders** | Done | Creator automatically set as primary waiter, table numbers, archive/restore. |
| 3 | **Order lines** | Done | Price snapshot (`price_at_add`), quantities, dish special instructions, server-calculated running total, live dish line additions, line voiding with mandatory reason & partial quantity voiding. |
| 4 | **Order lifecycle with rules** | Done | Enforced state transitions (Placed → Accepted → Preparing → Ready → Served) & cancellation rules (cancellation blocked in Preparing/Ready/Served). |
| 5 | **Collaborators** | Done | Primary waiters & managers can assign co-waiters; `UNIQUE(order_id, waiter_id)` DB constraint; consolidated "My Orders" waiter view. |
| 6 | **Finding orders** | Done | Server-side text search (`ILIKE`), status & waiter filters, sorting, and `LIMIT/OFFSET` pagination. |
| 7 | **Acting on many items & CSV export** | Done | Manager bulk updates with per-item pass/fail reporting and streaming daily orders CSV export (`GET /api/orders/export/csv`). |
| 8 | **A dashboard** | Done | Headline numbers (Open, Placed today, Served today, Revenue today), status distribution, waiter performance breakdown (Served vs Pending revenue), 14-day trend line chart with Recharts. |
| 9 | **History you cannot rewrite** | Done | Append-only audit trail logging all status updates, line additions, line voids with mandatory reason, collaborator changes, and notes (uneditable). |
| 10 | **Slow-order alerts** | Done | 15-minute slow-order threshold detection query, 30s navbar badge polling, 10-minute acknowledgment suppression logic. |

---

### Reflection Questions

- **How much time did you actually spend?**  
  Approximately 12 hours spread across 5 days:
  - **Saturday (~1.5 hrs):** Project planning, architecture decisions, evaluating tech stack options (raw SQL vs ORM, Tailwind vs vanilla CSS), and mapping out the 10-phase execution order.
  - **Sunday (~4.5 hrs):** Core implementation — database schema, JWT authentication, role middleware, menu CRUD with bulk actions, order creation, lifecycle state machine, and audit logging.
  - **Monday (~2 hrs):** Order lines with price snapshots, line voiding, collaborators management, and the consolidated "My Orders" waiter view.
  - **Tuesday (~2.5 hrs):** Dashboard analytics with KPI cards, 14-day trend charts (Recharts), slow-order alert polling with acknowledgment suppression, and daily CSV export.
  - **Wednesday (~1.5 hrs):** UI polish, date search filters, sorting controls, deployment fixes, documentation updates, and final testing.

- **What would you do next, with another 12 hours?**  
  1. **Kitchen Display Screen (KDS):** A dedicated touch-friendly view for kitchen staff showing only orders in `ACCEPTED`/`PREPARING` status with large "Mark Ready" bump buttons — replacing the paper ticket corkboard entirely.
  2. **WebSocket Real-Time Updates:** Replace the 30-second polling mechanism with Socket.io for instant push notifications on order status changes and new alert triggers.
  3. **Automated Test Suite:** Add Jest + Supertest integration tests covering all 5 lifecycle transitions, role permission blocks, bulk update edge cases, and collaborator authorization rules.
  4. **Visual Table Floor Plan:** A graphical restaurant layout showing color-coded table statuses (Available, Occupied, Ready for Pickup) so waiters and managers get an instant visual snapshot.

- **What are you least happy with in this codebase, and why?**  
  The 30-second HTTP polling for slow-order alerts. While it works reliably for a 15-minute alert threshold and was a pragmatic choice within the time budget, it introduces unnecessary network overhead on every poll cycle. WebSockets would deliver instant push notifications without repeated round-trips, and would also enable real-time order status updates across all connected clients — making the system feel truly live instead of slightly delayed.

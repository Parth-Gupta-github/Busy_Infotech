# Submission

Fill this in and commit it. This is the first file we open.

## Links
- **GitHub repository:** https://github.com/Parth-Gupta-github/Busy_Infotech
- **Live application:** Local development (or deployed URL when live)

## Notes for the reviewer
All role-based permissions, order lifecycle transition rules, search/pagination, bulk item error reporting, and audit logs are strictly enforced on the server using raw SQL queries with parameterization against PostgreSQL.

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Manager | `manager@restaurant.com` | `manager123` |
| Waiter 1 | `waiter1@restaurant.com` | `waiter123` |
| Waiter 2 | `waiter2@restaurant.com` | `waiter123` |

## Stack

| Layer | What you used | Why |
|-------|---------------|-----|
| **Frontend** | React (Vite) + Tailwind CSS v3 | Fast dev setup, responsive UI components, rapid dark-mode styling |
| **Backend** | Node.js + Express.js | Lightweight REST API server with middleware-based role enforcement |
| **Database** | PostgreSQL (Supabase/Neon) via `pg` pool | Relational schema with raw SQL queries for explicit JOINs, transactions, and precision aggregations |
| **Hosting** | Local / Neon PostgreSQL Cloud DB | Reliable PostgreSQL cloud instance |

## Goal checklist

| # | Goal | Status | Notes |
|---|------|--------|-------|
| 1 | **Accounts and roles** | Done | Email/password login with JWT. Server-enforced `MANAGER` & `WAITER` role permissions via middleware (`roleCheck.js`). |
| 2 | **Orders** | Pending | Primary waiter tracking, table numbers, archive/restore |
| 3 | **Order lines** | Pending | Price snapshot (`price_at_add`), quantity, special instructions, server running total |
| 4 | **Order lifecycle with rules** | Pending | Enforced state transitions (Placed → Accepted → Preparing → Ready → Served) & cancellation rules |
| 5 | **Collaborators** | Pending | Multi-waiter collaboration & consolidated waiter order lists |
| 6 | **Finding orders** | Pending | Server-side text search, filtering, sorting, and pagination |
| 7 | **Acting on many items & CSV export** | Done | Manager bulk updates with per-item pass/fail reporting (Goal 7 complete; CSV export in Phase 10) |
| 8 | **A dashboard** | Pending | Headline numbers, status/waiter breakdowns, 14-day served trend chart |
| 9 | **History you cannot rewrite** | Pending | Append-only audit trail logging all status updates, line additions, voids, and notes |
| 10 | **Slow-order alerts** | Pending | Time-threshold alerts, navbar badge count, acknowledge & re-alert logic |

---

### Reflection Questions

- **How much time did you actually spend?**  
  *(Will be updated upon final submission)*

- **What would you do next, with another 12 hours?**  
  Add a real-time Kitchen Display Screen (KDS) using WebSockets and automated integration test coverage for all lifecycle edge cases.

- **What are you least happy with in this codebase, and why?**  
  Polling every 30 seconds for slow-order alerts instead of WebSockets — polling was chosen for simplicity within the time budget, but WebSockets would provide instant push notifications.

# Submission

## Links
- **GitHub repository:** https://github.com/Parth-Gupta-github/Busy_Infotech
- **Live application:** https://restaurant-orders-seven.vercel.app
- **Backend API:** https://restaurant-orders-api-p5zb.onrender.com

> **Note on Cold Starts:** Hosted on Render free tier. If the backend service is idle, the initial request may take ~50 seconds to spin up.

---

## Notes for the Reviewer

### 🔑 Key Architectural & Testing Context
- **1-Click Demo Login:** On `/login`, click **"Manager Account"** or **"Waiter Account"** to fill credentials instantly.
- **Role Landing Pages:** Logging in as **Manager** opens the **Dashboard (`/`)** with live revenue metrics and 14-day trend charts. Logging in as **Waiter** opens the **Orders Page (`/orders`)** directly to create and manage table orders (follow the **5-Step Testing Flow** below to test from scratch).
- **Kitchen Display System (`/kitchen`) Access:** Currently accessible to both Managers and Waiters so reviewers can simulate the entire table-to-kitchen-to-table lifecycle without logging in and out. In production, this can be locked down to a dedicated `KITCHEN_STAFF` / `CHEF` role.
- **Instant Onboarding (No Email Verification Bottleneck):** Sign in with the demo accounts below or create a new account via `/register` (direct bcrypt password hashing without Nodemailer/SMTP delays).
- **Strict Server-Side Enforcement:** All role checks (`MANAGER` vs `WAITER`), lifecycle transitions, cancellation locks, mandatory void reasons, price snapshots (`price_at_add`), and immutable audit trails are enforced in PostgreSQL raw SQL transactions.

---

### 🧪 Recommended End-to-End Testing Flow

To test the system naturally like a restaurant workflow:

1. **Step 1 — Create Order ([Orders Page](file:///orders)):**  
   Log in as **Waiter** (`waiter1@restaurant.com` / `waiter123` or click *"Waiter Account"*). Click **"+ New Order"**, choose a table (e.g. Table 4), pick dishes, add special instructions (e.g. *"Extra spicy"*), and create the order.
2. **Step 2 — Kitchen Preparation ([Kitchen Screen](file:///kitchen)):**  
   Navigate to the **Kitchen Screen** in the top navbar. View the active ticket appear with its live elapsed timer. Bump the order through: **Accept Order** $\rightarrow$ **Start Cooking** $\rightarrow$ **Mark Ready**.
3. **Step 3 — Serve & Complete Table ([Orders Page](file:///orders)):**  
   Return to the **Orders** page. Notice the order is now marked **READY**. Click **"Mark as Served"** to deliver food to the table, or click **"Complete & Archive Table"** when the dining session finishes.
4. **Step 4 — Thermal Receipts & Audit Trail:**  
   Click **"Print Bill"** to preview the thermal POS receipt format with Order ID headers, or click **📜 History** to review the immutable audit timeline (status changes, dish additions, and void logs).
5. **Step 5 — Analytics & Menu Management (Manager Access):**  
   Log in as **Manager** (`manager@restaurant.com` / `manager123` or click *"Manager Account"*) to view live KPIs and 14-day trend charts on the **Dashboard** (`/`), perform bulk price updates on the **Menu** (`/menu`), and test filter-aware **CSV Export**.

## Demo Credentials

| Role | Email | Password | Primary Capabilities |
|------|-------|----------|----------------------|
| **Manager** | `manager@restaurant.com` | `manager123` | Full access: Analytics Dashboard, Menu CRUD & Bulk Edits, All Orders, KDS, Thermal Receipts, All Audit Logs |
| **Waiter 1** | `waiter1@restaurant.com` | `waiter123` | Table order creation, dish addition, line voiding, status updates, collaborator assignments, KDS, "My Orders" default view |
| **Waiter 2** | `waiter2@restaurant.com` | `waiter123` | Multi-waiter collaboration testing, isolated order views, status updates |

---

## Stack

| Layer | What we used | Why |
|-------|---------------|-----|
| **Frontend** | React (Vite) + Tailwind CSS v3 + Recharts + Lucide Icons | Fast SPA bundling, responsive UI, interactive trend charts, full-screen portal modals, light/dark themes |
| **Backend** | Node.js + Express.js | Lightweight REST API server with modular middleware for JWT role enforcement and transaction management |
| **Database** | PostgreSQL (Neon) via `pg` pool | Enterprise relational schema with raw SQL queries for explicit JOINs, transactions, and precision aggregations |
| **Hosting** | Vercel (Frontend) + Render (Backend API) + Neon PostgreSQL DB | Full-stack cloud deployment with HTTPS endpoints |

---

## Goal Checklist

| # | Goal | Status | Notes |
|---|------|--------|-------|
| 1 | **Accounts and roles** | ✅ Done | Email/password login with JWT. Server-enforced `MANAGER` & `WAITER` role permissions via middleware (`roleCheck.js`). |
| 2 | **Orders** | ✅ Done | Creator automatically set as primary waiter, table numbers, soft archive/restore preserving history. |
| 3 | **Order lines** | ✅ Done | Price snapshot (`price_at_add`), quantities, dish special instructions, server-calculated running total, live dish line additions, line voiding with mandatory reason. |
| 4 | **Order lifecycle with rules** | ✅ Done | Enforced state transitions (Placed → Accepted → Preparing → Ready → Served) & cancellation rules (cancellation blocked in Preparing/Ready/Served). |
| 5 | **Collaborators** | ✅ Done | Primary waiters & managers can assign co-waiters; `UNIQUE(order_id, waiter_id)` DB constraint; consolidated "My Orders" waiter view. |
| 6 | **Finding orders** | ✅ Done | Server-side text search over Table Number & Order ID (`ILIKE`), status/waiter/date filters, sorting, and `LIMIT/OFFSET` pagination. |
| 7 | **Acting on many items & CSV export** | ✅ Done | Manager bulk updates with per-item pass/fail reporting and filter-aware streaming orders CSV export. |
| 8 | **A dashboard** | ✅ Done | Headline numbers (Open, Placed today, Served today, Revenue today), status distribution, waiter performance breakdown, 14-day trend line chart with Recharts. |
| 9 | **History you cannot rewrite** | ✅ Done | Append-only audit trail logging all status updates, line additions, line voids with mandatory reason, collaborator changes, and notes (immutable). |
| 10 | **Slow-order alerts** | ✅ Done | 15-minute slow-order threshold detection query, 30s navbar badge polling, 10-minute acknowledgment suppression logic. |
| **+** | **Stretch: Kitchen Display (KDS)** | ✅ Done | Live bump screen at `/kitchen` for kitchen workflow management. |
| **+** | **Stretch: Thermal Receipts** | ✅ Done | Clean printable receipt modal formatted with Order ID headers and thermal print CSS. |
| **+** | **Stretch: Light / Dark Modes** | ✅ Done | Global theme toggle with high-contrast floating docks and portal overlays. |

---

### Reflection Questions

- **How much time did you actually spend?**  
  Approximately 15 hours total across 7 daily sessions throughout the week:
  - **Day 1 (~1.5 hrs):** Project planning, scoping, architecture decisions (raw SQL vs ORM), and repository scaffolding.
  - **Day 2 (~2.5 hrs):** PostgreSQL migrations, seed data, JWT authentication, and server-side role middleware (`MANAGER`/`WAITER`).
  - **Day 3 (~2.0 hrs):** Menu CRUD with bulk pass/fail reporting, and the order lifecycle state machine with cancellation rules.
  - **Day 4 (~2.0 hrs):** Order lines with price snapshots (`price_at_add`), line voiding with mandatory reasons, and collaborator management with `UNIQUE` constraints.
  - **Day 5 (~2.0 hrs):** Dashboard analytics with Recharts 14-day trend charts, slow-order alerts with 10-minute suppression, and streaming CSV export.
  - **Day 6 (~2.0 hrs):** Security hardening (JWT fail-fast validation, database price constraints), rate limiting, date search filters, and UI theme refinements.
  - **Day 7 (~3.0 hrs):** Extended workflows (Kitchen Display System at `/kitchen`, thermal receipts with Order ID headers), filter-aware CSV downloads, light mode contrast fixes, full portal overlays, and comprehensive end-to-end goal testing.

- **What would you do next, with another 12 hours?**  
  1. **Automated Integration & E2E Testing:** Build a comprehensive test suite using Jest + Supertest for backend API route testing (covering state machine transitions, concurrent updates, and role blocks) and Playwright for browser-level KDS bump flows.
  2. **Customer Table QR Ordering:** Generate unique table QR codes allowing dining guests to scan, browse live menu availability, and place orders directly from their mobile browsers straight into the waiter/kitchen queue.
  3. **Online Takeaway & Delivery System:** Build an external customer storefront for online ordering and pickup with payment gateway integration (Stripe / Razorpay) and SMS/Email order status notifications.
  4. **Dedicated Kitchen & Bartender Roles:** Decouple `/kitchen` into separate `KITCHEN_STAFF` and `BARTENDER` roles with category-filtered station views (food to kitchen, drinks to bar).
  5. **WebSocket Real-Time Push:** Replace the 30-second polling mechanism with Socket.io / Server-Sent Events for instant live updates across waiter tablets and kitchen displays.
  6. **Split Bills & Multiple Payment Methods:** Enable table-side bill splitting (equal split or by individual seat) supporting mixed cash/card payment recording.

- **What are you least happy with in this codebase, and why?**  
  The 30-second HTTP polling for slow-order alerts. While it functions reliably for a 15-minute alert threshold and was a pragmatic choice within the time budget, it generates recurring HTTP traffic. Migrating to WebSockets would provide instantaneous event broadcasting for order status changes, dish voiding, and alert notifications across all connected waiter and kitchen screens with minimal network overhead.


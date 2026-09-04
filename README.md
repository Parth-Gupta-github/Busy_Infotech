# 🍽️ Restaurant Order Management System

A full-stack, enterprise-grade restaurant order and kitchen management platform built with React, Node.js, Express, and PostgreSQL. It replaces chaotic paper tickets with an end-to-end digital lifecycle: Managers maintain menus and track real-time analytics; Waiters manage table orders and line-item customizations; and Kitchen Staff bump order tickets through a dedicated Kitchen Display System (KDS).

---

## 🌐 Live Deployments & Documentation

- **🚀 Live Application (Vercel):** [https://restaurant-orders-seven.vercel.app](https://restaurant-orders-seven.vercel.app)
- **⚙️ Backend API (Render):** [https://restaurant-orders-api-p5zb.onrender.com](https://restaurant-orders-api-p5zb.onrender.com)
- **🗄️ Database:** Cloud PostgreSQL on Neon
- **📋 Project Submission & Audit:** [`SUBMISSION.md`](./SUBMISSION.md)
- **📐 Architecture Guide:** [`docs/architecture.md`](./docs/architecture.md)
- **🏛️ Architectural Decisions:** [`docs/decisions.md`](./docs/decisions.md)
- **🗓️ 7-Day Session Plan:** [`docs/plan.md`](./docs/plan.md)
- **🗃️ Database Schema & ER Model:** [`docs/schema.md`](./docs/schema.md)

> ⏳ **Note on Cold Starts:** The backend API is hosted on Render's free tier. If the service is idle, the initial request may take ~45–50 seconds to spin up.

---

## 🔑 Demo Credentials

> 💡 **1-Click Demo Login:** On the Login page (`/login`), click the **"Manager Account"** or **"Waiter Account"** buttons to auto-populate credentials instantly.

| Role | Email | Password | Access Capabilities |
|------|-------|----------|---------------------|
| **Manager** | `manager@restaurant.com` | `manager123` | Full portfolio view: Analytics Dashboard, Menu CRUD & Bulk Price Updates, All Orders, Kitchen Screen, Thermal Receipts, Immutable Audit Trail |
| **Waiter 1** | `waiter1@restaurant.com` | `waiter123` | Order creation, dish additions, line-item voiding with reasons, status progression, collaborator assignments, KDS screen, "My Orders" default filter |
| **Waiter 2** | `waiter2@restaurant.com` | `waiter123` | Multi-waiter collaboration testing, isolated waiter order queues, status updates |

*Instant Registration:* You can also register a new account instantly on `/register` (direct bcrypt password hashing without email verification delays).

---

## 🧭 5-Step Evaluation Walkthrough

1. **Step 1 — Create an Order ([Orders Page](https://restaurant-orders-seven.vercel.app/orders)):**  
   Log in as **Waiter** (`waiter1@restaurant.com` or click *"Waiter Account"*). Click **"+ New Order"**, choose a table (e.g., Table 4), select dishes, add special instructions (e.g., *"Extra crispy"*), and create the order.
2. **Step 2 — Kitchen Preparation ([Kitchen Screen](https://restaurant-orders-seven.vercel.app/kitchen)):**  
   Open the **Kitchen Screen** from the top navbar. View the new ticket appear with its live timer badge. Bump the ticket through: **Accept Order** $\rightarrow$ **Start Cooking** $\rightarrow$ **Mark Ready**.
3. **Step 3 — Serve & Complete Table ([Orders Page](https://restaurant-orders-seven.vercel.app/orders)):**  
   Return to Orders, verify the order transitioned to **Ready**, and click **Mark as Served**.
4. **Step 4 — Thermal Receipts & Audit Trail:**  
   Click **"Print Bill"** to preview the thermal POS receipt format with Order ID headers, or click **📜 History** to review the immutable audit timeline (status changes, dish additions, and void logs).
5. **Step 5 — Analytics & Menu Management (Manager Access):**  
   Log in as **Manager** (`manager@restaurant.com` or click *"Manager Account"*) to inspect live KPI cards and 14-day trend charts on the **Dashboard**, perform bulk price updates on the **Menu**, and download filter-aware **CSV exports**.

---

## 🛠️ Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS v3 | Ultra-fast client build, responsive UI, glassmorphic dark/light design system |
| **Charts** | Recharts | Dual-axis 14-day revenue & order volume trend visualizations |
| **Backend** | Node.js, Express | Modular REST API with role-based JWT middleware |
| **Database** | PostgreSQL (Neon Cloud) | Cloud relational database using parameterized raw SQL queries (`$1, $2`) |
| **DB Driver** | `pg` (`pg.Pool`) | Native PostgreSQL connection pooling with transactional consistency |
| **Auth** | bcryptjs + JWT | Stateless bearer token authorization with server-enforced role checks |
| **Deployment** | Vercel (Client) + Render (Server) | Decoupled client/server hosting with automated CI/CD pipelines |

---

## 🚀 Key Implemented Features

### 🎯 10 Core Specification Goals
1. **Accounts & Roles:** Manager & Waiter roles with strict server-side JWT authorization.
2. **Orders & Table Management:** Primary waiter assignments, soft-delete archiving, and restoration.
3. **Order Lines & Pricing:** Snapshot pricing (`price_at_add`), special instructions, server-calculated totals.
4. **Order Lifecycle State Machine:** `PLACED → ACCEPTED → PREPARING → READY → SERVED` (cancellations locked once in `PREPARING` or beyond).
5. **Collaborators:** Multi-waiter assignment with database `UNIQUE` constraints and "My Orders" default filter.
6. **Server-Side Finding & Sorting:** Text search across Table Number & Order ID hash, status/waiter/date filters, and pagination executed via SQL parameters.
7. **Bulk Menu Actions & Filter-Aware CSV:** Batch price updates with per-item pass/fail reporting and dynamic CSV downloads.
8. **Real-Time Analytics Dashboard:** 4 KPI cards, status breakdown, waiter performance table, and 14-day historical trend charts.
9. **Immutable Audit Trail:** Append-only timeline logging all status transitions, dish additions, and void reasons.
10. **Slow-Order Alert System:** Automatic detection of orders open > 15 mins without reaching Ready, with 30s navbar polling and 10-minute suppression.

### 🌟 Extended Stretch Features
- **Kitchen Display System (KDS):** Touch-friendly kitchen display (`/kitchen`) with ticket bump actions and live elapsed timers.
- **Printable Thermal Receipts:** POS receipt layout with Order ID headers and `@media print` thermal formatting.
- **Light & Dark Theme Switcher:** High-contrast color palettes and full portal overlays for modals.

---

## 🔮 Future Roadmap

1. **Automated Integration & E2E Testing Suite:** Comprehensive test suite with Jest + Supertest for backend route validation and Playwright for browser-level KDS workflows.
2. **Customer Table QR Ordering:** Table-specific QR codes allowing dining guests to scan, browse live menu items, and place orders directly into the kitchen queue.
3. **Online Takeaway & Delivery Storefront:** Public ordering portal for delivery and takeaway with payment gateway integration (Stripe / Razorpay).
4. **Dedicated Kitchen & Bartender Roles:** Decoupling `/kitchen` into separate `KITCHEN_STAFF` and `BARTENDER` views with station-filtered queues.
5. **WebSocket Real-Time Push:** Socket.io / Server-Sent Events replacing 30s polling for instantaneous live updates across waiter tablets and kitchen displays.
6. **Split Checks & Multi-Payer Invoicing:** Table-side bill division across individual seats or equal split percentages.

---

## 💻 Local Setup & Development

### 1. Prerequisites
- Node.js 18+
- PostgreSQL database (or Neon connection string)

### 2. Backend Server Setup
```bash
cd server
npm install
cp .env.example .env
# Configure DATABASE_URL and JWT_SECRET in .env
npm run db:init       # Applies server/db/schema.sql schema to PostgreSQL
npm run seed          # Seeds demo users and default menu dishes
npm run dev           # Starts Express API on http://localhost:3000
```

### 3. Frontend Client Setup
```bash
cd client
npm install
npm run dev           # Starts Vite dev server on http://localhost:5173
```



# AI prompts

The prompts you actually used, in the order you used them, grouped by what you were trying to achieve. For each significant one: what you asked, what you got back, and what you had to correct.

Include at least one prompt that produced something wrong, and what you did about it.

If you did not use AI at all, say so here, and describe your process instead.

## Project Scaffolding & Architecture Selection

### Prompt
"Read the assignment brief for Assignment 09 — Restaurant Orders. Help me design the architecture, select the tech stack, write the technical documentation, and lay out a 10-phase implementation plan."

### What you got
A detailed architectural breakdown recommending:
1. Node.js + Express backend using **Prisma ORM** with **SQLite**.
2. **Vanilla CSS** for frontend styling.
3. JWT-based authentication and a 10-phase build sequence.

### What you corrected
- **Rejected Prisma ORM + SQLite:** I overrode this recommendation to use direct **Raw SQL with `pg` (node-postgres)** and Supabase/Neon PostgreSQL. This provides direct control over SQL DDL (`CREATE TABLE`, foreign key constraints, indexes) and parameterized query execution (`$1`, `$2`), avoiding ORM abstraction hiding.
- **Rejected Vanilla CSS:** I changed the styling approach to **Tailwind CSS v3** to ensure fast, consistent, dark-mode component styling within the 12-hour budget.

---

## Database Schema Creation & Setup Scripting

### Prompt
"Generate a raw PostgreSQL schema.sql script containing all 7 tables (users, menu_items, orders, order_lines, order_collaborators, audit_logs, alert_acknowledgments) with proper ENUM types, CASCADE rules, price snapshot fields, and performance indexes. Also write a db.js connection module using pg.Pool and an init.js runner script."

### What you got
Complete `server/db/schema.sql` script containing PostgreSQL DDL, `server/src/db.js` exporting `pg.Pool`, and `server/db/init.js`.

### What you corrected
- Verified `order_lines.price_at_add NUMERIC(10,2)` correctly captures historical prices when lines are added.
- Confirmed `audit_logs` table has no `updated_at` column to ensure audit log immutability.
- Checked `CONSTRAINT unique_order_waiter UNIQUE(order_id, waiter_id)` to prevent duplicate collaborator assignments at the database layer.

---

## Terminal Command Execution Issues

### Prompt
"Install frontend dependencies (react-router-dom, lucide-react, recharts, tailwindcss@3, postcss, autoprefixer) in client directory."

### What you got
An attempted chained command execution (`npm install && npm install react-router-dom ...`) which threw a parser syntax error in PowerShell (`The token '&&' is not a valid statement separator`).

### What you corrected
Split the execution into separate single-command statements compatible with PowerShell environment syntax:
1. `npm install react-router-dom lucide-react recharts`
2. `npm install -D tailwindcss@3 postcss autoprefixer`

---

## Seed Data Scripting

### Prompt
"Write a server/db/seed.js script to populate demo users (1 Manager, 2 Waiters with bcrypt password hashing) and default menu items into PostgreSQL."

### What you got
`server/db/seed.js` script using `bcrypt.hash()` for credentials (`manager123`, `waiter123`) and parameterized SQL for menu items.

### What you corrected
- Verified that password hashing was generated asynchronously before inserting user rows.
- Fixed SQL conflict handling on `menu_items` re-seeding to use clean deletion before re-inserting default dishes with Indian Rupee (₹) prices.

---

## Authentication & Role Enforcement Implementation (Phase 2)

### Prompt
"Build Phase 2 authentication: JWT verification middleware, server-enforced role checking middleware (requireRole('MANAGER')), auth service with bcrypt hashing and raw SQL user queries, Express routes (/api/auth/register, /api/auth/login, /api/auth/me), React Auth Context, ProtectedRoute component, and dark-mode Login/Register pages."

### What you got
Complete authentication implementation across `server/src/middleware/auth.js`, `server/src/middleware/roleCheck.js`, `server/src/services/authService.js`, `server/src/routes/auth.js`, `client/src/context/AuthContext.jsx`, `client/src/components/ProtectedRoute.jsx`, `client/src/pages/LoginPage.jsx`, and `client/src/pages/RegisterPage.jsx`.

### What you corrected
- **Server-Side Enforcement Check:** Verified that `roleCheck.js` returns HTTP 403 Forbidden on unauthorized roles at the middleware layer before business logic executes, satisfying Goal 1's requirement that role separation is server-enforced, not just hidden in the UI.
- **Password Hash Safety:** Ensured `delete user.password` is called in `authService.login()` before returning user data, so password hashes are never leaked over network responses.
- **Token Persistence:** Verified that `AuthContext.jsx` restores session user profiles from `GET /api/auth/me` on initial render if a valid JWT token exists in `localStorage`.

---

## Menu Management & Bulk Actions Implementation (Phase 3)

### Prompt
"Build Phase 3 Menu Management & Bulk Actions: raw SQL menu service (menuService.js), Express router (routes/menu.js) with requireRole('MANAGER') enforcement, bulk update endpoint with per-item pass/fail reporting, inline table price editing, clickable availability toggles, sticky bottom action bar, and execution report modal."

### What you got
Complete menu service, routes, and `MenuPage.jsx` component supporting inline table price edits, clickable availability status badges, sticky action bar, and per-item bulk results report modal.

### What you corrected
- **Per-Item Error Reporting:** Ensured `bulkUpdateMenuItems` in `menuService.js` processes items individually in a `try...catch` loop so invalid items (e.g. negative prices `₹-5.00`) report explicit failure reasons (`"Rejected price ₹-5: price cannot be negative."`) without crashing or rolling back the rest of the batch.
- **Currency Standardization:** Updated default seed prices, error messages, and frontend UI components to use Indian Rupees (₹).

---

## Orders Core, Order Lines & Server Search/Pagination (Phase 4)

### Prompt
"Build Phase 4 Orders Core & Server Search/Pagination: raw SQL order service (orderService.js), Express router (routes/orders.js), order creation with menu item line picker, price snapshot (price_at_add), special instructions, server-side ILIKE search, status filters, PostgreSQL LIMIT/OFFSET pagination, and OrdersPage.jsx UI."

### What you got
Complete order service, order routes, and `OrdersPage.jsx` component supporting order creation, menu dish selection, dish-specific special instructions, price snapshots, server-side text search, status tabs, and order details modal.

### What you corrected
- **Connection Checkout Fix:** Replaced `pool.getClient()` in `server/src/db.js` with `pool.connect()` (the correct native `node-postgres` method) to fix transactional client checkout for multi-query `BEGIN / COMMIT` transactions.
- **Schema Column Type Patch:** Executed `patch_schema.js` to alter `orders.table_number` column to `VARCHAR(255)` in PostgreSQL so table identifiers like `"Table 4"` or `"Bar 1"` are accepted without integer type errors.
- **Goal #3 Price Snapshot Enforcement:** Verified that `createOrder` queries `menu_items.price` at insertion time and writes it directly to `order_lines.price_at_add`, preserving historical item pricing even if menu prices change later.

---

## Order Lifecycle State Machine & Audit Trail Implementation (Phase 5)

### Prompt
"Build Phase 5 Order Lifecycle State Machine & Audit Trail: updateOrderStatus function in orderService.js enforcing PLACED -> ACCEPTED -> PREPARING -> READY -> SERVED transitions and cancellation rules, append-only audit_logs insertion, PATCH /api/orders/:id/status, GET /api/orders/:id/audit endpoints, active table order guard, POST /api/orders/:id/lines endpoint, and OrdersPage.jsx lifecycle action buttons & audit log timeline modal."

### What you got
Complete state machine validation logic, audit log insertion queries, status transition endpoints, duplicate active table order guard, live dish addition to active orders, and dark glassmorphism timeline modal.

### What you corrected
- **Cancellation Rule Enforcement:** Ensured `updateOrderStatus()` blocks cancellation if the order has already reached `PREPARING`, `READY`, or `SERVED` status.
- **Duplicate Active Table Guard:** Added a database check blocking new order creation for a table number if an un-archived active order (`PLACED`, `ACCEPTED`, `PREPARING`, `READY`) is already open.
- **Comment Cleanup:** Simplified all block comments across server files to clean 1-line comments.

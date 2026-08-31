# AI Prompts & Iteration Log

This document logs prompts used, AI outputs received, corrections made, and design decisions iterated during development.

---

## 📝 Session Prompt History

### Scaffolding & Setup (Phase 1)

#### Prompt
"Create a raw PostgreSQL DDL script for a restaurant orders system with users, menu_items, orders, order_lines, order_collaborators, audit_logs, and alert_acknowledgments using raw SQL, UUID primary keys, and appropriate foreign key constraints."

#### What you got
Generated `server/db/schema.sql` with PostgreSQL table definitions, `role_enum`, `order_status_enum`, `audit_action_enum`, FK constraints, and indexes.

#### What you corrected
- Added `archived` boolean flags on `menu_items` and `orders` to support soft-deletion.
- Created `client` directory using `npm create vite@latest client -- --template react`.
- Installed Tailwind CSS v3 using:
  1. `npm install react-router-dom lucide-react recharts`
  2. `npm install -D tailwindcss@3 postcss autoprefixer`

---

### Seed Data Scripting

#### Prompt
"Write a server/db/seed.js script to populate demo users (1 Manager, 2 Waiters with bcrypt password hashing) and default menu items into PostgreSQL."

#### What you got
`server/db/seed.js` script using `bcrypt.hash()` for credentials (`manager123`, `waiter123`) and parameterized SQL for menu items.

#### What you corrected
- Verified that password hashing was generated asynchronously before inserting user rows.
- Fixed SQL conflict handling on `menu_items` re-seeding to use clean deletion before re-inserting default dishes with Indian Rupee (₹) prices.

---

### Authentication & Role Enforcement Implementation (Phase 2)

#### Prompt
"Build Phase 2 authentication: JWT verification middleware, server-enforced role checking middleware (requireRole('MANAGER')), auth service with bcrypt hashing and raw SQL user queries, Express routes (/api/auth/register, /api/auth/login, /api/auth/me), React Auth Context, ProtectedRoute component, and dark-mode Login/Register pages."

#### What you got
Complete authentication implementation across `server/src/middleware/auth.js`, `server/src/middleware/roleCheck.js`, `server/src/services/authService.js`, `server/src/routes/auth.js`, `client/src/context/AuthContext.jsx`, `client/src/components/ProtectedRoute.jsx`, `client/src/pages/LoginPage.jsx`, and `client/src/pages/RegisterPage.jsx`.

#### What you corrected
- **Server-Side Enforcement Check:** Verified that `roleCheck.js` returns HTTP 403 Forbidden on unauthorized roles at the middleware layer before business logic executes, satisfying Goal 1's requirement that role separation is server-enforced, not just hidden in the UI.
- **Password Hash Safety:** Ensured `delete user.password` is called in `authService.login()` before returning user data, so password hashes are never leaked over network responses.
- **Token Persistence:** Verified that `AuthContext.jsx` restores session user profiles from `GET /api/auth/me` on initial render if a valid JWT token exists in `localStorage`.

---

### Menu Management & Bulk Actions Implementation (Phase 3)

#### Prompt
"Build Phase 3 Menu Management & Bulk Actions: raw SQL menu service (menuService.js), Express router (routes/menu.js) with requireRole('MANAGER') enforcement, bulk update endpoint with per-item pass/fail reporting, inline table price editing, clickable availability toggles, sticky bottom action bar, and execution report modal."

#### What you got
Complete menu service, routes, and `MenuPage.jsx` component supporting inline table price edits, clickable availability status badges, sticky action bar, and per-item bulk results report modal.

#### What you corrected
- **Per-Item Error Reporting:** Ensured `bulkUpdateMenuItems` in `menuService.js` processes items individually in a `try...catch` loop so invalid items (e.g. negative prices `₹-5.00`) report explicit failure reasons (`"Rejected price ₹-5: price cannot be negative."`) without crashing or rolling back the rest of the batch.
- **Currency Standardization:** Updated default seed prices, error messages, and frontend UI components to use Indian Rupees (₹).

---

### Orders Core, Order Lines & Server Search/Pagination (Phase 4)

#### Prompt
"Build Phase 4 Orders Core & Server Search/Pagination: raw SQL order service (orderService.js), Express router (routes/orders.js), order creation with menu item line picker, price snapshot (price_at_add), special instructions, server-side ILIKE search, status filters, PostgreSQL LIMIT/OFFSET pagination, and OrdersPage.jsx UI."

#### What you got
Complete order service, order routes, and `OrdersPage.jsx` component supporting order creation, menu dish selection, dish-specific special instructions, price snapshots, server-side text search, status tabs, and order details modal.

#### What you corrected
- **Connection Checkout Fix:** Replaced `pool.getClient()` in `server/src/db.js` with `pool.connect()` (the correct native `node-postgres` method) to fix transactional client checkout for multi-query `BEGIN / COMMIT` transactions.
- **Schema Column Type Patch:** Executed `patch_schema.js` to alter `orders.table_number` column to `VARCHAR(255)` in PostgreSQL so table identifiers like `"Table 4"` or `"Bar 1"` are accepted without integer type errors.
- **Goal #3 Price Snapshot Enforcement:** Verified that `createOrder` queries `menu_items.price` at insertion time and writes it directly to `order_lines.price_at_add`, preserving historical item pricing even if menu prices change later.

---

### Order Lifecycle State Machine & Audit Trail Implementation (Phase 5)

#### Prompt
"Build Phase 5 Order Lifecycle State Machine & Audit Trail: updateOrderStatus function in orderService.js enforcing PLACED -> ACCEPTED -> PREPARING -> READY -> SERVED transitions and cancellation rules, append-only audit_logs insertion, PATCH /api/orders/:id/status, GET /api/orders/:id/audit endpoints, active table order guard, POST /api/orders/:id/lines endpoint, and OrdersPage.jsx lifecycle action buttons & audit log timeline modal."

#### What you got
Complete state machine validation logic, audit log insertion queries, status transition endpoints, duplicate active table order guard, live dish addition to active orders, and dark glassmorphism timeline modal.

#### What you corrected
- **Cancellation Rule Enforcement:** Ensured `updateOrderStatus()` blocks cancellation if the order has already reached `PREPARING`, `READY`, or `SERVED` status.
- **Duplicate Active Table Guard:** Added a database check blocking new order creation for a table number if an un-archived active order (`PLACED`, `ACCEPTED`, `PREPARING`, `READY`) is already open.
- **Comment Cleanup:** Simplified all block comments across server files to clean 1-line comments.

---

### Order Lines Voiding & Mandatory Reason Enforcement (Phase 6)

#### Prompt
"Build Phase 6 Order Line Voiding & Mandatory Reason Enforcement: voidOrderLine function in orderService.js with mandatory void_reason check, partial line quantity voiding support, audit log insertion, PATCH /api/orders/:id/lines/:lineId/void endpoint, and OrdersPage.jsx void modal with quantity selector and strikethrough styling."

#### What you got
Complete line voiding service logic, route handler, void quantity selector, mandatory reason prompt modal, strikethrough styling, and audit trail insertion.

#### What you corrected
- **Partial Line Quantity Voiding:** Added support for voiding 1 out of N quantity (e.g., voiding 1 of 3 pizzas decrements active line quantity to 2 and inserts a new voided line item row for 1x for audit precision).
- **Mandatory Void Reason Guard:** Ensured both server and client validate that `void_reason` is non-empty before updating PostgreSQL.

---

### Collaborators Management & "My Orders" Consolidated View (Phase 7)

#### Prompt
"Build Phase 7 Collaborators Management & Consolidated My Orders View: addOrderCollaborator and removeOrderCollaborator functions in orderService.js with UNIQUE(order_id, waiter_id) constraint handling and audit trail logging, POST/DELETE/GET collaborator endpoints in routes/orders.js, GET /api/auth/waiters endpoint, and OrdersPage.jsx Manage Collaborators modal & My Orders role-based default view toggle."

#### What you got
Complete collaborator management functions, API endpoints, waiter selection dropdown, collaborator assignment modal, and role-based default view filter.

#### What you corrected
- **Role-Based Default View:** Configured `showMyOrdersOnly` to default to `true` for Waiter roles (showing only orders they placed or collaborate on) and `false` for Manager roles (showing all restaurant orders).
- **Session Profile Restoration:** Fixed `AuthContext.jsx` profile restoration on `GET /api/auth/me` to prevent session logout redirects.

---

### Dark / Light Mode Theme Switcher Feature

#### Prompt
"Build Dark / Light Mode Theme Switcher toggle button on top navbar with localStorage persistence, Moon/Sun icons, and global CSS theme rules in index.css for high-contrast card, table, and modal styling."

#### What you got
Complete theme toggle button in `App.jsx`, localStorage preference saving, Sun/Moon icon toggle, and light mode CSS overrides in `index.css`.

#### What you corrected
- **Icon Tooltip Logic:** Set Moon icon for Dark Mode and Sun icon for Light Mode with clear descriptive tooltips.
- **Light Mode UI Overrides:** Added light mode CSS rules for modal backdrops, cards, slate buttons, table headers, and input fields.

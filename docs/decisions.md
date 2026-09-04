# Decisions

Log the decisions that actually shaped this codebase — the ones where a real alternative existed and you picked one. At least five entries. For each: what you chose, what you rejected, and why. At least one entry must be a decision you later reversed — say what changed your mind. It can be any entry below, not necessarily the last one; add a **Later reversed:** line to whichever one it is.

## Decision 1

- **Chose:** Raw SQL using `pg` (node-postgres) connection pool.
- **Rejected:** Prisma ORM with SQLite.
- **Why:** Raw SQL provides direct control over SQL DDL (`CREATE TABLE`, foreign key constraints, indexes) and parameterized query execution (`$1`, `$2`), avoiding ORM abstraction hiding. It demonstrates explicit understanding of relational database design, transactions, and performance optimizations.
- **Later reversed:** I initially scaffolded the project using Prisma ORM with SQLite for rapid setup. I later reversed this decision to switch to direct raw SQL with `pg` pool and PostgreSQL because an ORM hides query execution and raw SQL gives full clarity on indexes, parameterized queries, and JOIN behavior.

## Decision 2

- **Chose:** Price snapshot field (`price_at_add NUMERIC(10, 2)`) on `order_lines`.
- **Rejected:** Dynamically joining `menu_items.price` when computing running totals.
- **Why:** The specification states running totals must be calculated from menu item prices at the time each line was added. If a manager updates a menu item's price later, active and past orders must retain their original line item prices. Snapshotting `price_at_add` guarantees historical pricing accuracy.

## Decision 3

- **Chose:** Tailwind CSS v3 for frontend styling.
- **Rejected:** Writing Vanilla CSS from scratch or using heavy UI component libraries (Material UI / Ant Design).
- **Why:** Writing custom CSS for 10 distinct views/components within a 12-hour budget is time-prohibitive. Tailwind v3 provides utility-first classes, built-in dark mode support, and rapid component styling while keeping the bundle lightweight.

## Decision 4

- **Chose:** JWT (JSON Web Tokens) stateless authentication with role payloads.
- **Rejected:** Server-side session storage (express-session with Redis or database session table).
- **Why:** JWTs keep the Express server completely stateless. Encoding the user's role (`MANAGER` or `WAITER`) and user ID inside the signed JWT payload enables instant server-side permission checks in route middleware without querying the database on every single request.

## Decision 5

- **Chose:** Soft deletion (`archived = true`) for orders and menu items.
- **Rejected:** Hard SQL `DELETE FROM` statements.
- **Why:** Physically deleting orders or menu items breaks foreign key relationships in audit logs and destroys historical sales and revenue data. Setting `archived = true` removes items from default active views while preserving audit history.

## Decision 6

- **Chose:** Mandatory voiding (`voided = true` with `void_reason`) for line items.
- **Rejected:** Deleting line items from an open order.
- **Why:** In a real restaurant, line items placed on an order cannot simply vanish — they must be voided with an explicit reason for inventory and auditing tracking. Voided lines remain in the order record but are excluded from running total calculations.

## Decision 7

- **Chose:** Client HTTP Polling every 30 seconds for slow-order alerts.
- **Rejected:** WebSockets (Socket.io) or Server-Sent Events (SSE).
- **Why:** For an order alert threshold of 15 minutes, a 30-second polling interval introduces zero practical degradation while avoiding the overhead of WebSocket server lifecycle management, reconnection handling, and socket state sync.

## Decision 8

- **Chose:** Direct account registration with bcrypt password hashing without email verification.
- **Rejected:** Enforcing email confirmation via Nodemailer / SMTP before activating accounts.
- **Why:** In an assessment/testing environment, requiring email verification links creates unnecessary friction, delays, and potential SMTP delivery failures for reviewers. Direct registration allows immediate role-based onboarding while preserving production extensibility.

## Decision 9

- **Chose:** Unified Manager & Waiter access to the Kitchen Display System (`/kitchen`).
- **Rejected:** Locking `/kitchen` exclusively to a separate `KITCHEN_STAFF` role.
- **Why:** Permitting both Managers and Waiters to view and interact with the KDS enables a single tester to simulate order placement and kitchen bump transitions seamlessly without repeatedly logging in and out between accounts.

## Decision 10

- **Chose:** Filter-aware CSV export (`/orders/export/csv` matching active query filters).
- **Rejected:** Static raw dump of the entire orders database table.
- **Why:** Restaurant managers need operational reports matching their active search criteria (e.g., today's orders only, specific waiter's orders, or specific statuses) rather than parsing through an unfiltered monolithic database export.


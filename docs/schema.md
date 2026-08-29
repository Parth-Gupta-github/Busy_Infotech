# Schema

## Table by table: what columns and types does each one have?

### 1. `users`
- `id` (VARCHAR(36), Primary Key, default UUID)
- `email` (VARCHAR(255), Unique, Not Null) — sign-in email
- `password` (VARCHAR(255), Not Null) — bcrypt-hashed password
- `name` (VARCHAR(255), Not Null) — user's name
- `role` (`role_enum`: 'MANAGER' | 'WAITER', Not Null)
- `created_at` (TIMESTAMPTZ, Default CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMPTZ, Default CURRENT_TIMESTAMP)

### 2. `menu_items`
- `id` (VARCHAR(36), Primary Key, default UUID)
- `name` (VARCHAR(255), Not Null) — dish name
- `price` (NUMERIC(10, 2), Not Null) — price
- `available` (BOOLEAN, Default true) — whether item is in stock
- `archived` (BOOLEAN, Default false) — soft delete flag
- `created_at` (TIMESTAMPTZ, Default CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMPTZ, Default CURRENT_TIMESTAMP)

### 3. `orders`
- `id` (VARCHAR(36), Primary Key, default UUID)
- `table_number` (INT, Not Null) — table number
- `status` (`order_status_enum`: 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED')
- `archived` (BOOLEAN, Default false) — soft delete flag
- `primary_waiter_id` (VARCHAR(36), Foreign Key → `users.id`)
- `created_at` (TIMESTAMPTZ, Default CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMPTZ, Default CURRENT_TIMESTAMP)

### 4. `order_lines`
- `id` (VARCHAR(36), Primary Key, default UUID)
- `order_id` (VARCHAR(36), Foreign Key → `orders.id`)
- `menu_item_id` (VARCHAR(36), Foreign Key → `menu_items.id`)
- `quantity` (INT, Not Null, CHECK quantity > 0)
- `special_instructions` (TEXT, Nullable)
- `price_at_add` (NUMERIC(10, 2), Not Null) — snapshot of price when added
- `voided` (BOOLEAN, Default false)
- `void_reason` (TEXT, Nullable)
- `created_at` (TIMESTAMPTZ, Default CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMPTZ, Default CURRENT_TIMESTAMP)

### 5. `order_collaborators`
- `id` (VARCHAR(36), Primary Key, default UUID)
- `order_id` (VARCHAR(36), Foreign Key → `orders.id`)
- `waiter_id` (VARCHAR(36), Foreign Key → `users.id`)
- `created_at` (TIMESTAMPTZ, Default CURRENT_TIMESTAMP)
- Unique constraint: `UNIQUE(order_id, waiter_id)`

### 6. `audit_logs` (Immutable)
- `id` (VARCHAR(36), Primary Key, default UUID)
- `order_id` (VARCHAR(36), Foreign Key → `orders.id`)
- `user_id` (VARCHAR(36), Foreign Key → `users.id`)
- `action` (`audit_action_enum`: 'ORDER_CREATED' | 'STATUS_CHANGED' | 'LINE_ADDED' | 'LINE_VOIDED' | 'COLLABORATOR_ADDED' | 'COLLABORATOR_REMOVED' | 'NOTE_ADDED' | 'ORDER_ARCHIVED' | 'ORDER_RESTORED')
- `old_status` (`order_status_enum`, Nullable)
- `new_status` (`order_status_enum`, Nullable)
- `details` (JSONB, Nullable)
- `created_at` (TIMESTAMPTZ, Default CURRENT_TIMESTAMP)
- *(Deliberately no `updated_at` column)*

### 7. `alert_acknowledgments`
- `id` (VARCHAR(36), Primary Key, default UUID)
- `order_id` (VARCHAR(36), Foreign Key → `orders.id`)
- `user_id` (VARCHAR(36), Foreign Key → `users.id`)
- `acknowledged_at` (TIMESTAMPTZ, Default CURRENT_TIMESTAMP)

---

## Which relationships are one-to-many, and which are many-to-many?

- **One-to-Many:**
  - `users` → `orders` (One primary waiter creates many orders)
  - `orders` → `order_lines` (One order contains many order lines)
  - `menu_items` → `order_lines` (One menu item appears on many order lines)
  - `orders` → `audit_logs` (One order has many timeline log entries)
  - `orders` → `alert_acknowledgments` (One order can have multiple alert acknowledgments over time)

- **Many-to-Many:**
  - `users` ↔ `orders` via `order_collaborators` (A waiter can collaborate on many orders, and an order can have many collaborating waiters).

---

## Which constraints are enforced by the database, and which by application code — and why did you draw the line there?

- **Enforced by Database:**
  - `UNIQUE(email)` on `users` — hard guarantee against duplicate accounts.
  - `UNIQUE(order_id, waiter_id)` on `order_collaborators` — database prevents duplicate waiter assignments even if concurrent requests race.
  - `CHECK (quantity > 0)` on `order_lines` — guards against zero or negative item quantities.
  - Foreign key cascades (`ON DELETE CASCADE`) — maintains referential integrity.
  - Data types (`NUMERIC(10, 2)`, ENUMs) — prevents invalid money formats or bogus status values.

- **Enforced by Application Code:**
  - **Lifecycle state transitions** (e.g. `PREPARING → CANCELLED` rejected) — Business workflow rules belong in service code where error messages can explain *why* the move was rejected.
  - **Voiding line items requirement** (mandatory `void_reason` when `voided = true`) — Complex conditional rule checks are cleaner in application code.
  - **Role permissions** (Waiters cannot modify menu or act on uncollaborated orders) — Application layer inspects JWT role and ownership context before executing queries.

---

## What did you deliberately denormalise?

- **`order_lines.price_at_add`:** We explicitly copy `menu_items.price` into `order_lines.price_at_add` at the exact moment a line is created. While technically duplicating price data, this is necessary so that subsequent menu price changes by a manager do not retroactively alter the total of past or active orders.

---

## What would break first if this had 100x the data?

1. **Slow-Order Alert Polling Query (`/api/alerts`):**  
   Scanning all active orders and joining with `alert_acknowledgments` to check timestamps every 30 seconds across thousands of concurrent orders would stress PostgreSQL CPU. We created an index on `orders(status, created_at)`, but at 100x data scale, this query would need Redis caching or materialized views.

2. **Unpaginated Aggregations on 14-Day Dashboard Charts:**  
   Calculating 14-day daily served trends requires scanning historical `orders` rows. With millions of orders, this should be pre-aggregated into a daily summary analytics table instead of live `COUNT()` group-by queries.

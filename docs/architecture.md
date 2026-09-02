# Architecture

## What are the moving pieces, and how do they talk to each other?

The system consists of three main moving pieces:
1. **Frontend (Browser):** A React Single-Page Application built with Vite and Tailwind CSS v3. It manages user state (logged-in waiter/manager, token storage) and presents interactive UI views (Dashboard, Menu, Orders, Order Details, Alerts).
2. **Backend Server (Node.js/Express):** A RESTful API running on Node.js and Express.js. It handles authentication, validates request inputs, enforces role-based permissions (Manager vs Waiter), manages order lifecycle transitions, and creates append-only audit entries.
3. **Database (Neon PostgreSQL):** A relational PostgreSQL database that persists all domain data across 7 tables (`users`, `menu_items`, `orders`, `order_lines`, `order_collaborators`, `audit_logs`, `alert_acknowledgments`).

**Communication:**  
The frontend talks to the Express server using standard `fetch` HTTP requests sending JSON payloads. Authenticated requests pass a JWT in the `Authorization: Bearer <token>` header. The Express server talks to PostgreSQL using native TCP sockets managed by the `pg` pool client, executing parameterized SQL queries (`$1`, `$2`).

## Where does each piece run?

- **Frontend:** Deployed on **Vercel** as a React SPA (`https://restaurant-orders-seven.vercel.app`).
- **Backend API:** Deployed on **Render** as a Node.js/Express service (`https://restaurant-orders-api-p5zb.onrender.com`).
- **Database:** Runs in the cloud on **Neon PostgreSQL** using raw SQL connection pooling (`pg`).

## What is the request path for one representative user action, end to end?

**Representative Action:** A Waiter updates an order status from `ACCEPTED` to `PREPARING`.

1. **User Action (Browser):** Waiter clicks the "Start Preparing" button on Order #12.
2. **HTTP Request:** React sends a `PATCH /api/orders/12/status` request with body `{ "status": "PREPARING" }` and header `Authorization: Bearer <jwt_token>`.
3. **Authentication Middleware:** Express checks the JWT token, verifies signature, and attaches user info (`req.user = { id, email, role: 'WAITER' }`) to the request object.
4. **Authorization Check:** The order service queries `orders` and `order_collaborators` to verify that `req.user.id` is either the primary waiter or an assigned collaborator on Order #12 (or a Manager).
5. **Lifecycle Rule Validation:** Server checks current status (`ACCEPTED`). Moving `ACCEPTED → PREPARING` is valid.
6. **Database Transaction (Raw SQL):**
   - Updates status: `UPDATE orders SET status = 'PREPARING', updated_at = NOW() WHERE id = $1`
   - Inserts audit log: `INSERT INTO audit_logs (order_id, user_id, action, old_status, new_status) VALUES ($1, $2, 'STATUS_CHANGED', 'ACCEPTED', 'PREPARING')`
7. **HTTP Response:** Server returns `200 OK` with updated order object and timeline.
8. **UI Update:** React updates local component state, showing status badge as `PREPARING` and adding an entry to the timeline view.

## What did you decide *not* to build, and why?

1. **WebSockets / Server-Sent Events for Real-Time Updates:**  
   *Why:* Real-time push adds complex socket connection lifecycle management and state synchronization. For a restaurant alert threshold of 15 minutes, polling `/api/alerts` every 30 seconds is completely sufficient and fits within the time budget.

2. **Client-Side Order Filtering & Sorting:**  
   *Why:* The specification explicitly forbids loading all orders into the browser and filtering there. All text search, status/waiter filtering, sorting, and pagination happen on PostgreSQL via SQL parameters (`WHERE`, `LIKE`, `LIMIT`, `OFFSET`).

3. **Physical Order & Line Item Deletion:**  
   *Why:* Deleting orders or line items destroys historical record accuracy and corrupts audit trails. We built soft-deletion (`archived = true`) for orders and voiding (`voided = true` with reason) for line items.

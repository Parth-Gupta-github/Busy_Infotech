# Architecture

## What are the moving pieces, and how do they talk to each other?

The system consists of three main moving pieces:
1. **Frontend (Browser):** A React Single-Page Application built with Vite, Tailwind CSS v3, Recharts, and Lucide icons. It manages authentication state (stored JWT in localStorage, role-based routing) and renders distinct workflows:
   - **Manager Dashboard:** Real-time KPI cards, status distribution, waiter performance breakdown, and a 14-day historical trend line chart.
   - **Menu Management:** Inline pricing/availability toggling, bulk action execution with itemized error reporting, and menu item creation/archiving.
   - **Order Management & POS:** Multi-table order creation, live dish line additions, price snapshotting, partial line voiding with mandatory reasons, waiter collaboration assignments, server-side search & filtering, filter-aware CSV exports, and printable thermal bill receipts.
   - **Kitchen Display Screen (KDS):** A dedicated bump station at `/kitchen` allowing kitchen staff to accept, cook, and mark orders ready with elapsed time counters.
   - **Audit Trail Modal:** An append-only chronological timeline inspecting order state transitions and user attribution.
   - **Slow-Order Alert Notifications:** A top navbar bell counter with 30-second polling and 10-minute suppression drawer modal.
2. **Backend Server (Node.js/Express):** A RESTful API running on Node.js and Express.js. It handles authentication, validates request inputs, enforces role-based permissions (`requireRole('MANAGER')` vs `requireRole('WAITER')`), manages order lifecycle state machine transitions, executes parameterized raw SQL queries, and records append-only audit entries.
3. **Database (Neon PostgreSQL):** A relational PostgreSQL database that persists all domain data across 7 tables (`users`, `menu_items`, `orders`, `order_lines`, `order_collaborators`, `audit_logs`, `alert_acknowledgments`).

**Communication:**  
The frontend communicates with the Express server using standard `fetch` HTTP requests sending JSON payloads. Authenticated requests pass a JWT in the `Authorization: Bearer <token>` header. The Express server talks to PostgreSQL using native TCP sockets managed by the `pg` pool client, executing parameterized SQL queries (`$1`, `$2`) inside ACID transactions where atomicity is required.

---

## Where does each piece run?

- **Frontend:** Deployed on **Vercel** as a React SPA (`https://restaurant-orders-seven.vercel.app`).
- **Backend API:** Deployed on **Render** as a Node.js/Express service (`https://restaurant-orders-api-p5zb.onrender.com`).
- **Database:** Runs in the cloud on **Neon PostgreSQL** using raw SQL connection pooling (`pg`).

---

## What is the request path for one representative user action, end to end?

**Representative Action:** A Waiter adds a dish (`2x Paneer Butter Masala`, price `₹299.00`) with special instructions (`"Extra spicy"`) to an open order for Table 4.

Here is the exact journey from the browser click down to the database and back:

1. **User Gesture (Browser / UI):**  
   Waiter John opens Table 4's order modal in the React app, selects *"Paneer Butter Masala"*, sets quantity to `2`, types *"Extra spicy"* in the instructions field, and clicks **"Add to Order"**.

2. **HTTP API Request (Network):**  
   The browser sends an HTTP `POST` request to `https://restaurant-orders-api-p5zb.onrender.com/api/orders/{orderId}/lines` containing:
   - **JSON Body:** `{ "menuItemId": "item-uuid-123", "quantity": 2, "specialInstructions": "Extra spicy" }`
   - **Header:** `Authorization: Bearer <signed_jwt_token>`

3. **Authentication & Identity Verification (Express Middleware):**  
   The server intercepts the request via `auth.js`. It cryptographically verifies the JWT signature using the server's `JWT_SECRET`, decodes John's user ID and role (`WAITER`), and attaches the authenticated user object to `req.user`.

4. **Role & Resource Authorization (Order Service):**  
   Before touching any data, `orderService.js` performs security checks:
   - Verifies the order exists and is currently open (in `PLACED`, `ACCEPTED`, or `PREPARING` — dish additions are strictly blocked on `SERVED` or `CANCELLED` orders).
   - Verifies that John is authorized to modify this order (he must be either the primary waiter who created it, an assigned collaborator, or a Manager).

5. **Atomic Database Execution (Neon PostgreSQL Transaction):**  
   Inside an ACID transaction via the native `pg` connection pool:
   - **Price Snapshot:** Queries `menu_items` to grab the current price (`₹299.00`).
   - **Line Creation:** Inserts a new row into `order_lines` with `price_at_add = 299.00`, capturing the exact price at the moment of addition so future menu price changes never corrupt past bill totals.
   - **Immutable Audit Logging:** Inserts a new row into `audit_logs` recording the action `LINE_ADDED`, the item name, quantity `2`, price `₹299.00`, and John's user ID.
   - **Commit:** PostgreSQL safely commits the transaction to disk.

6. **HTTP Response (Server → Client):**  
   The server recalculates the order's running total across all active (non-voided) lines and returns a `201 Created` JSON response with the updated order details, lines array, and new running total.

7. **Instant UI Re-render (React State):**  
   React receives the response, updates the component state, updates the running total badge on Table 4's card, renders the new dish row, and makes the dish immediately visible on the Kitchen Display Screen (`/kitchen`).

---

## What did you decide *not* to build, and why?

1. **Customer-Side QR Code Ordering App (Self-Ordering):**  
   *Why:* We deliberately prioritized building a robust, rule-enforced system for in-restaurant staff (Waiters, Managers, Kitchen) first. Customer table self-ordering via QR code scans is a natural next-phase extension that builds directly on top of our existing order creation and KDS endpoints.

2. **Online Parcel / Takeaway & Home Delivery Storefront:**  
   *Why:* Building external customer parcel ordering with third-party payment gateways (Stripe / Razorpay) and delivery tracking addresses a different operational scope than table dine-in management. We kept our focus on nailing the 10 core restaurant floor requirements.

3. **Dedicated Physical Hardware Station Terminals:**  
   *Why:* Instead of tying the application to proprietary POS hardware or isolated physical bump bars, we built a responsive web-based Kitchen Display System (`/kitchen`) that runs seamlessly on any tablet, mobile device, or kitchen monitor.

4. **Nodemailer / Email Verification on Registration:**  
   *Why:* We used direct bcrypt password hashing on user registration rather than requiring email confirmation links via Nodemailer/SMTP. This avoids email delivery delays and ensures evaluators can test role transitions immediately without configuring SMTP credentials.

5. **WebSockets / Server-Sent Events for Real-Time Updates:**  
   *Why:* Real-time push connections introduce socket lifecycle and reconnection handling complexity. For a restaurant alert threshold of 15 minutes, polling `/api/alerts` every 30 seconds provides reliable, zero-maintenance alerting within the project's time budget.


---

## Future Architectural Roadmap

1. **Customer Table QR Ordering Architecture:**  
   - Generate static or dynamic signed QR codes for each physical table.
   - Customers scan the QR code to access a guest ordering web interface (`/table/:tableNumber`).
   - Orders placed by customers directly create `orders` in `PLACED` status, alerting the assigned primary waiter and routing kitchen items straight to the KDS.
2. **Online Takeaway & Delivery API Integration:**  
   - Dedicated customer checkout portal with Stripe / Razorpay webhooks creating external delivery orders with customer delivery address and contact information.
3. **Split Checks & Multi-Payer Invoicing:**  
   - Adding a `bill_splits` relational table to track multiple partial payments against an order before closing it as `SERVED`.
4. **Automated Inventory Stock Deduction:**  
   - Adding a `recipes` / `ingredients` table. When the kitchen transitions an order line to `PREPARING` or `READY`, a database transaction automatically decrements raw ingredient quantities from the stock balance.
5. **Automated Integration & E2E Testing Suite:**  
   - Jest + Supertest suites for backend API route testing (covering state machine transitions, concurrent updates, and role blocks) and Playwright for browser-level KDS bump flows.



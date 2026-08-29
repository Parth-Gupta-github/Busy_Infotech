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
- **Rejected Prisma ORM + SQLite:** I overrode this recommendation to use direct **Raw SQL with `pg` (node-postgres)** and Supabase PostgreSQL. This provides direct control over SQL DDL (`CREATE TABLE`, foreign key constraints, indexes) and parameterized query execution (`$1`, `$2`), avoiding ORM abstraction hiding.
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
`server/db/seed.js` script using `bcrypt.hash()` for credentials (`manager123`, `waiter123`) and parameterized SQL `INSERT ON CONFLICT DO NOTHING` for menu items.

### What you corrected
Verified that password hashing was generated asynchronously before inserting user rows and confirmed ON CONFLICT behavior to prevent duplicate seed errors when running repeatedly.

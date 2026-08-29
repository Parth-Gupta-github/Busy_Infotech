# AI Prompts & Development Log

This document records how AI assistance (Google Gemini via Antigravity IDE) was utilized during the development of the Restaurant Order Management System. It logs the prompts sent, initial outputs, missteps/bad suggestions, developer corrections, and verification steps.

---

## Log Entry 1: Project Setup & Architecture Scaffolding

### Prompt Given:
> "Read the assignment brief for Assignment 09 — Restaurant Orders. Help me design the architecture, select the tech stack, write the technical documentation, and lay out a 10-phase implementation plan."

### Initial AI Output & Analysis:
The AI generated a full breakdown suggesting:
1. Node.js + Express backend with **Prisma ORM** and **SQLite**.
2. **Vanilla CSS** for frontend styling.
3. standard JWT authentication and a 10-phase sequence.

### Developer Evaluation & Corrections:
- **Database Switch (SQLite/Prisma → Raw PostgreSQL):** I rejected the SQLite + Prisma recommendation. I have PostgreSQL/pgAdmin environment available and preferred direct **raw SQL (`pg` driver)** for explicit control over database DDL (`CREATE TABLE`, indexes, constraints) and query parameterization (`$1`, `$2`), avoiding ORM abstraction hiding.
- **Styling Switch (Vanilla CSS → Tailwind CSS v3):** I rejected Vanilla CSS because writing raw CSS from scratch for 10 full pages/views within the time budget would be inefficient. Tailwind v3 allows rapid, consistent dark-mode styling.

---

## Log Entry 2: Database Schema & Setup Scripting

### Prompt Given:
> "Generate a raw PostgreSQL schema.sql script containing all 7 tables (users, menu_items, orders, order_lines, order_collaborators, audit_logs, alert_acknowledgments) with proper ENUM types, CASCADE rules, price snapshot fields, and performance indexes. Also write a db.js connection module using pg.Pool and an init.js runner script."

### Initial AI Output & Analysis:
The AI generated the DDL script and `pg` pool helper.

### Developer Verification & Edge Cases Checked:
1. **Price Snapshot Verification:** Inspected `order_lines.price_at_add NUMERIC(10,2)` to ensure it stores the historical price at order time so menu price updates don't alter past totals.
2. **Audit Trail Immutability:** Verified `audit_logs` has no `updated_at` column and that no `UPDATE`/`DELETE` queries are included in the application logic.
3. **Collaborator Uniqueness:** Checked `CONSTRAINT unique_order_waiter UNIQUE(order_id, waiter_id)` to prevent duplicate collaborator rows at the DB constraint layer.

---

## Log Entry 3: Command & Environment Iteration

### Issue Encountered during Scaffolding:
When attempting to run chained npm installation commands in PowerShell:
```powershell
npm install && npm install react-router-dom ...
```
The command failed with a parser error because `&&` is not valid in PowerShell standard syntax.

### Solution Applied:
Corrected the script calls to separate single-line execution statements in PowerShell:
```powershell
npm install react-router-dom lucide-react recharts
npm install -D tailwindcss@3 postcss autoprefixer
```

---

## Log Entry 4: Seed Data & Frontend Init

### Prompt Given:
> "Create a server/db/seed.js script to seed default users (1 Manager, 2 Waiters with bcrypt-hashed passwords) and initial menu items. Then scaffold the React client with Vite and Tailwind v3 configuration."

### Review & Testing:
- Verified `bcryptjs` password hashing works correctly in `seed.js` (`manager123`, `waiter123`).
- Verified Tailwind v3 config includes `./index.html` and `./src/**/*.{js,ts,jsx,tsx}` content paths.
- Verified dark theme base rules in `client/src/index.css`.

# System Architecture

## Overview

The Restaurant Order Management System follows a **three-tier architecture**: a React single-page application (SPA) communicates with a Node.js/Express REST API, which in turn talks directly to a PostgreSQL database hosted on Supabase using raw SQL queries via the `pg` (node-postgres) driver pool.

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER                                  │
│                                                                 │
│   React SPA (Vite)          Tailwind CSS v3                     │
│   ┌──────────────┐          ┌──────────────┐                    │
│   │   Pages      │          │  Dark theme  │                    │
│   │  ─ Dashboard │          │  Glassmorphic│                    │
│   │  ─ Menu Mgmt │          │  cards       │                    │
│   │  ─ Orders    │          │  Responsive  │                    │
│   │  ─ Alerts    │          └──────────────┘                    │
│   └──────┬───────┘                                              │
│          │ HTTP (JSON) — JWT in Authorization header             │
└──────────┼──────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     EXPRESS API SERVER (:3000)                    │
│                                                                  │
│  ┌─────────────┐   ┌──────────────┐   ┌───────────────────────┐ │
│  │  Middleware  │   │   Routes     │   │   Services            │ │
│  │  ─ CORS     │──▶│  /api/auth   │──▶│  ─ authService        │ │
│  │  ─ JSON     │   │  /api/menu   │   │  ─ menuService        │ │
│  │  ─ Auth JWT │   │  /api/orders │   │  ─ orderService       │ │
│  │  ─ Roles    │   │  /api/dash   │   │  ─ dashboardService   │ │
│  │  ─ Errors   │   │  /api/alerts │   │  ─ alertService       │ │
│  └─────────────┘   └──────────────┘   └───────────┬───────────┘ │
│                                                    │             │
│                                           pg Pool (Raw SQL)      │
└────────────────────────────────────────────┬─────────────────────┘
                                             │ SQL Query Pool
                                             ▼
                                  ┌─────────────────────┐
                                  │   Supabase           │
                                  │   PostgreSQL         │
                                  │                     │
                                  │  Tables:            │
                                  │  ─ users            │
                                  │  ─ menu_items       │
                                  │  ─ orders           │
                                  │  ─ order_lines      │
                                  │  ─ order_collaborators│
                                  │  ─ audit_logs       │
                                  │  ─ alert_acknowledgments│
                                  └─────────────────────┘
```

## How the Components Connect

### 1. Client → Server Communication

The React frontend makes **HTTP requests** to the Express API using `fetch` or a lightweight HTTP client. Every request after login includes a **JWT token** in the `Authorization: Bearer <token>` header.

### 2. Server — Layered Architecture

The server follows a **three-layer pattern** to separate concerns:

| Layer | Responsibility | Example |
|-------|---------------|---------|
| **Routes** | Parse HTTP requests, validate input, return HTTP responses | `POST /api/orders` → validate body → call service → `res.json()` |
| **Services** | Business logic, rules enforcement, audit logging | Check lifecycle rules, verify user permissions, execute SQL queries |
| **DB Pool (`db.js`)** | Database connection pooling & query execution using `pg` | `db.query('SELECT * FROM orders WHERE ...', [params])` |

### 3. Server → Database Communication (Raw SQL)

Using the `pg` pool module, all parameterized SQL queries are sent directly to PostgreSQL:

```javascript
// Parameterized SQL query:
const result = await db.query(
  `SELECT o.*, u.name as primary_waiter_name 
   FROM orders o
   JOIN users u ON o.primary_waiter_id = u.id
   WHERE o.status = $1 AND o.primary_waiter_id = $2
   ORDER BY o.created_at DESC LIMIT $3 OFFSET $4`,
  ['PLACED', userId, 20, 0]
);
```

### 4. Authentication Flow

```
┌──────┐      ┌──────────┐      ┌──────────┐
│Client│      │  Server  │      │ Database │
└──┬───┘      └────┬─────┘      └────┬─────┘
   │               │                 │
   │ POST /login   │                 │
   │──────────────▶│                 │
   │               │ SELECT * FROM   │
   │               │ users WHERE     │
   │               │ email = $1      │
   │               │────────────────▶│
   │               │   user record   │
   │               │◀────────────────│
   │               │                 │
   │               │ bcrypt.compare  │
   │               │ (password, hash)│
   │               │                 │
   │  accessToken  │                 │
   │  (15 min TTL) │                 │
   │  refreshToken │                 │
   │  (7 day TTL)  │                 │
   │◀──────────────│                 │
```

## Directory Structure

```
restaurant-orders/
├── server/
│   ├── db/
│   │   ├── schema.sql             # Raw PostgreSQL DDL script
│   │   ├── init.js                # Database initialization script
│   │   └── seed.js                # Data seeder
│   ├── src/
│   │   ├── db.js                  # pg pool connection module
│   │   ├── index.js               # Express app entry point
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT verification
│   │   │   ├── roleCheck.js       # Role-based access control
│   │   │   └── errorHandler.js    # Centralized error handling
│   │   ├── routes/
│   │   └── services/
│   ├── .env.example
│   └── package.json
├── client/
└── docs/                          # Project documentation
```

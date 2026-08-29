# Database Schema Design (Raw PostgreSQL)

## Overview

The database uses **PostgreSQL** (hosted on Supabase) with **7 tables** defined via raw SQL DDL script (`server/db/schema.sql`).

Key design principles:
- **Referential integrity** — foreign keys with cascade rules (`ON DELETE CASCADE`)
- **Monetary precision** — prices stored as `NUMERIC(10, 2)`, never floating point
- **Immutable audit trail** — `audit_logs` has no `updated_at` column and no UPDATE/DELETE queries exist in the app
- **Soft deletes** — `archived` boolean flags instead of physical deletion
- **Price snapshots** — `order_lines` captures `price_at_add` when line items are added

## Entity-Relationship Diagram

```
┌──────────────────┐         ┌──────────────────────┐
│      users       │         │     menu_items       │
├──────────────────┤         ├──────────────────────┤
│ id       (PK)    │         │ id         (PK)      │
│ email    (unique)│         │ name                 │
│ password (hashed)│         │ price      (NUMERIC) │
│ name             │         │ available  (bool)    │
│ role     (enum)  │         │ archived   (bool)    │
│ created_at       │         │ created_at           │
│ updated_at       │         │ updated_at           │
└──────┬───────────┘         └──────────┬───────────┘
       │                                │
       │ 1:many                         │ 1:many
       │                                │
       ▼                                ▼
┌──────────────────────┐     ┌──────────────────────┐
│       orders         │     │     order_lines      │
├──────────────────────┤     ├──────────────────────┤
│ id           (PK)    │◀───▶│ id             (PK)  │
│ table_number         │  1:N│ order_id       (FK)  │
│ status       (enum)  │     │ menu_item_id   (FK)  │
│ archived     (bool)  │     │ quantity             │
│ primary_waiter_id(FK)│     │ special_instructions │
│ created_at           │     │ price_at_add (NUMERIC│
│ updated_at           │     │ voided       (bool)  │
└──────┬───────────────┘     │ void_reason          │
       │                     │ created_at           │
       │                     │ updated_at           │
       │                     └──────────────────────┘
       │
       │ 1:many
       ▼
┌──────────────────────────┐
│   order_collaborators    │
├──────────────────────────┤
│ id         (PK)          │
│ order_id   (FK)          │
│ waiter_id  (FK)          │
│ created_at               │
│                          │
│ UNIQUE(order_id,waiter_id│
└──────────────────────────┘

┌──────────────────────────┐     ┌──────────────────────────┐
│       audit_logs         │     │   alert_acknowledgments  │
├──────────────────────────┤     ├──────────────────────────┤
│ id         (PK)          │     │ id             (PK)      │
│ order_id   (FK)          │     │ order_id       (FK)      │
│ user_id    (FK)          │     │ user_id        (FK)      │
│ action     (enum)        │     │ acknowledged_at          │
│ old_status (enum, null)  │     └──────────────────────────┘
│ new_status (enum, null)  │
│ details    (JSONB, null) │
│ created_at               │
│                          │
│ ⚠ NO updated_at          │
│ ⚠ NO delete queries      │
└──────────────────────────┘
```

## Raw SQL DDL (`schema.sql`)

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE role_enum AS ENUM ('MANAGER', 'WAITER');
CREATE TYPE order_status_enum AS ENUM ('PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED');
CREATE TYPE audit_action_enum AS ENUM (
    'ORDER_CREATED', 'STATUS_CHANGED', 'LINE_ADDED', 'LINE_VOIDED', 
    'COLLABORATOR_ADDED', 'COLLABORATOR_REMOVED', 'NOTE_ADDED', 
    'ORDER_ARCHIVED', 'ORDER_RESTORED'
);

CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role role_enum NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE menu_items (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    available BOOLEAN NOT NULL DEFAULT true,
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    table_number INT NOT NULL,
    status order_status_enum NOT NULL DEFAULT 'PLACED',
    archived BOOLEAN NOT NULL DEFAULT false,
    primary_waiter_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_lines (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    order_id VARCHAR(36) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id VARCHAR(36) NOT NULL REFERENCES menu_items(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    special_instructions TEXT,
    price_at_add NUMERIC(10, 2) NOT NULL,
    voided BOOLEAN NOT NULL DEFAULT false,
    void_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_collaborators (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    order_id VARCHAR(36) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    waiter_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_order_waiter UNIQUE(order_id, waiter_id)
);

CREATE TABLE audit_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    order_id VARCHAR(36) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    action audit_action_enum NOT NULL,
    old_status order_status_enum,
    new_status order_status_enum,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE alert_acknowledgments (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    order_id VARCHAR(36) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_primary_waiter ON orders(primary_waiter_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_table_number ON orders(table_number);
CREATE INDEX idx_order_lines_order_id ON order_lines(order_id);
CREATE INDEX idx_audit_logs_order_id ON audit_logs(order_id);
```

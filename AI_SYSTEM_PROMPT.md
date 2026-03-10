You are a senior SaaS backend architect and Supabase expert.

Design and generate a complete SaaS backend architecture using Supabase and PostgreSQL.

This application includes the following modules:

Dashboard
Customers
Tasks
Documents
Inventory
Reports
Settings
Authentication

The system must be designed as a **multi-tenant SaaS application**, meaning multiple organizations use the platform but their data must remain completely isolated.

Use Supabase features:

Supabase Auth
PostgreSQL Database
Row Level Security
Supabase Storage

---

MULTI TENANT ARCHITECTURE

Each organization must have its own data.

Every table must include:

organization_id

All queries must be restricted so users only access records belonging to their organization.

---

DATABASE SCHEMA

Generate SQL migrations compatible with Supabase.

Tables required:

organizations
users
customers
tasks
documents
suppliers
spares
systems
system_components
stock_transactions
reports
dashboard_widgets
organization_settings
user_settings
activity_logs

---

ORGANIZATIONS TABLE

Fields:

id uuid primary key default uuid_generate_v4()
name text
industry text
plan text
logo_url text
created_at timestamp default now()

---

USERS TABLE

This table extends Supabase auth.users.

Fields:

id uuid primary key references auth.users(id)
organization_id uuid references organizations(id)
name text
email text
role text
avatar_url text
status text
created_at timestamp default now()

Roles allowed:

admin
manager
employee
viewer

---

CUSTOMERS TABLE

Fields:

id uuid primary key
organization_id uuid
name text
email text
phone text
company text
address text
city text
state text
country text
status text
assigned_to uuid
notes text
created_at timestamp default now()

---

TASKS TABLE

Fields:

id uuid primary key
organization_id uuid
title text
description text
status text
priority text
assigned_to uuid
created_by uuid
due_date timestamp
created_at timestamp default now()

Status values:

pending
in_progress
completed
cancelled

---

DOCUMENTS TABLE

Fields:

id uuid primary key
organization_id uuid
name text
file_url text
file_type text
file_size integer
uploaded_by uuid
related_customer_id uuid
created_at timestamp default now()

Files must be stored in Supabase Storage bucket named:

documents

---

INVENTORY TABLES

SUPPLIERS

id uuid primary key
organization_id uuid
name text
contact text
email text
phone text
created_at timestamp

---

SPARES

id uuid primary key
organization_id uuid
name text
category text
unit text
stock_quantity integer
min_stock integer
supplier_id uuid
cost_price numeric
created_at timestamp

---

SYSTEMS

id uuid primary key
organization_id uuid
system_name text
capacity_kw numeric
description text
created_at timestamp

Example systems:

5KW Solar System
10KW Solar System
15KW Solar System

---

SYSTEM COMPONENTS

Defines bill of materials for systems.

Fields:

id uuid primary key
system_id uuid
spare_id uuid
quantity_required numeric
created_at timestamp

---

STOCK TRANSACTIONS

Tracks inventory changes.

Fields:

id uuid primary key
organization_id uuid
spare_id uuid
type text
quantity numeric
reference text
created_at timestamp

Types allowed:

purchase
usage
adjustment

---

REPORTS TABLE

Fields:

id uuid primary key
organization_id uuid
name text
report_type text
generated_by uuid
file_url text
created_at timestamp

---

DASHBOARD WIDGETS

Fields:

id uuid primary key
organization_id uuid
widget_name text
widget_type text
settings_json jsonb
created_at timestamp

---

SETTINGS TABLES

ORGANIZATION SETTINGS

id uuid primary key
organization_id uuid
company_name text
logo_url text
timezone text
currency text
language text
created_at timestamp

---

USER SETTINGS

id uuid primary key
user_id uuid
theme text
notifications_enabled boolean
created_at timestamp

---

ACTIVITY LOGS

id uuid primary key
organization_id uuid
user_id uuid
action text
entity_type text
entity_id uuid
details jsonb
created_at timestamp

---

ROW LEVEL SECURITY

Enable RLS on all tables.

Create policies that restrict access so users can only view records belonging to their organization.

Example policy:

organization_id =
(select organization_id from users where id = auth.uid())

---

AUTHENTICATION SYSTEM

Use Supabase Auth for login and signup.

Required features:

email/password login
session management
password reset
user profile creation
organization assignment

When a new user registers:

create organization
assign user to organization
set role to admin

---

PROTECTED ROUTES

Frontend must include route protection.

If user is not authenticated:

redirect to /login

If authenticated:

allow access to:

/dashboard
/customers
/tasks
/inventory
/documents
/reports
/settings

---

INVENTORY AVAILABILITY CALCULATION

Create a database view or SQL function that calculates how many solar systems can be built from available spare inventory.

Formula:

available_systems = minimum(
spares.stock_quantity / system_components.quantity_required
)

Return:

system_name
capacity_kw
available_systems

---

SUPABASE STORAGE

Create storage bucket:

documents

Allow users to upload and download files.

---

CODE STRUCTURE

Frontend architecture must follow:

Page → Service Layer → Supabase Client → Database

Example services:

authService
customerService
taskService
inventoryService
documentService

---

OUTPUT

Provide:

1. Full SQL schema
2. Row level security policies
3. Inventory calculation SQL
4. Example Supabase queries
5. Authentication flow
6. File upload example

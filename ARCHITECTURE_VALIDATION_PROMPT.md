You are a senior SaaS architect reviewing a Next.js + Supabase project.

Analyze the current project structure and validate that it follows a scalable SaaS architecture.

The project contains modules such as:

Dashboard
Customers
Tasks
Documents
Inventory
Reports
Settings
Authentication

The backend uses Supabase.

Perform the following tasks:

1. Validate the folder structure inside the project.
2. Detect duplicate folders or unnecessary directories.
3. Suggest structural improvements for a scalable SaaS product.
4. Ensure the architecture separates:

UI Layer
Service Layer
Repository Layer
Database Layer

5. Ensure the Supabase client is centralized in:

src/lib/supabaseClient.ts

6. Validate that services do NOT directly contain UI logic.

7. Ensure database calls are placed inside a repository layer.

8. Detect duplicate folders like:

service
services

and recommend consolidation.

9. Detect if both Next.js routing systems exist:

src/app
src/pages

and recommend using only one routing system.

10. Validate that environment variables are used instead of hardcoded values.

Environment variables must include:

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY

11. Verify the existence of these folders:

src/components
src/hooks
src/services
src/lib
src/types
src/middleware
supabase/migrations

12. Validate that database migrations exist and are used instead of manual schema edits.

13. Ensure that the application supports multi-tenant architecture using organization_id.

14. Check if Row Level Security (RLS) testing scripts exist.

15. Suggest missing architectural layers if required.

Provide the following output:

* Recommended folder structure
* Files to remove
* Files to rename
* New folders to create
* Best practices for scaling the SaaS backend

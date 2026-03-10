You are a senior backend architect refactoring a Next.js SaaS project.

Refactor the existing project structure to follow a scalable architecture suitable for a production SaaS platform.

The system uses:

Next.js
Supabase
TypeScript
TailwindCSS

Perform the following tasks:

1. Consolidate duplicate folders such as:

service
services

into a single folder:

src/services

2. Ensure only one routing system is used.

Prefer:

src/app (Next.js App Router)

Remove:

src/pages if it exists.

3. Create the following architecture layers:

src/lib
src/services
src/repositories
src/hooks
src/middleware
src/types

4. Move Supabase client initialization into:

src/lib/supabaseClient.ts

5. Create repository layer responsible for database queries.

Example:

customerRepository.ts
taskRepository.ts
inventoryRepository.ts

6. Services should contain business logic only.

Example:

customerService.ts
taskService.ts
inventoryService.ts

7. UI components must only call services.

8. Add middleware for authentication.

src/middleware/authMiddleware.ts

9. Ensure environment variables replace any hardcoded configuration values.

10. Validate Supabase migrations folder exists:

supabase/migrations

11. Ensure the project supports multi-tenant SaaS architecture using organization_id in all data tables.

Provide the final improved folder structure and refactor suggestions.

# Module 2: Company & Profile Management

## Module Overview
This module governs the core entities of the business logic: Companies and their associated Customer Profiles. It handles the lifecycle of corporate data, including onboarding, profile enrichment, tax declaration uploads, and role-based viewing permissions (where a user can only access companies they are mapped to).
A major feature of this module is its integration with the **Rasmio API**, which automatically fetches, validates, and enriches corporate data (like National IDs, board members, and financial statuses) based on external governmental databases.

**Core Responsibilities:**
*   CRUD operations for companies and linking them to customer users.
*   Validating corporate identity against the Rasmio API.
*   Enriching local company records with comprehensive external data (directors, capital, status).
*   Role-based access gating (e.g., ensuring a `customer` can only query `/api/companies/:id` if they have a mapped relationship).
*   Managing tax declarations tied to the company profile.

## Technical Stack & Dependencies
*   **Controllers & Routes:** `server/controllers/companies.controller.ts`, `server/routes/companies.routes.ts`, `server/controllers/rasmio-integration.controller.ts`
*   **Services:** `server/services/companies.service.ts`, `server/services/rasmio.ts`
*   **Database Schema:** `companies`, `user_companies`, `tax_declarations` (in `shared/schema.ts`)
*   **Storage Interface:** `server/storage.ts`
*   **Frontend UI:** `client/src/pages/companies.tsx`, `client/src/pages/company-profile.tsx`
*   **External Integrations:** Rasmio API (`rasmio.ts`).

## Current Shortcomings (Technical Debt)
*   **In-Memory Caching Flaw:** `server/services/rasmio.ts` uses a non-persistent, in-memory cache (`RasmioService.cache`). When the Node server restarts or scales across multiple Docker containers, the cache is lost, leading to redundant, expensive, and rate-limited API calls to Rasmio.
*   **JSON Serialization Risks:** In `server/storage.ts` and `companies.service.ts`, there is heavy manual handling of JSON fields (e.g., `JSON.parse` and `JSON.stringify` for enriched API data). This frequently leads to runtime crashes if the database contains malformed JSON or if the schema type is `unknown`.
*   **Monolithic Storage Dependency:** Similar to the Auth module, company queries reside in the 4000+ line `storage.ts` file, featuring hardcoded mapping functions bridging PostgreSQL snake_case rows to TypeScript camelCase objects.
*   **Data Synchronization:** Enriched data fetched from Rasmio is sometimes disconnected from the localized schema, meaning UI updates might overwrite enriched data if form payloads are not strictly merged.

## Improvement Steps
1.  **Implement Persistent Caching (Redis/Postgres):** Replace the in-memory cache in `server/services/rasmio.ts` with a persistent caching layer. For a quick win, create a `rasmio_cache` table in PostgreSQL with a TTL, or integrate Redis if available in the Docker stack.
2.  **Drizzle JSON Types:** Refactor the `companies` schema in `shared/schema.ts` to strictly type the JSONB columns using Drizzle's `$type<MyInterface>()` modifier. This will eliminate the need for manual `JSON.parse()` in the services and controllers, delegating serialization to the ORM.
3.  **Extract Company Repository:** Move all company-related data access logic out of `server/storage.ts` and into a dedicated `server/repositories/company.repository.ts`.
4.  **Enrichment Merge Strategy:** Update `companiesService.enrichCompanyData` to perform a deep merge of the Rasmio payload with existing database fields, ensuring no localized user overrides (like custom phone numbers) are accidentally erased by the API sync.

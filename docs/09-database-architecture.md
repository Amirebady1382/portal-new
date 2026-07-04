# Module 9: Database Architecture

## Module Overview
This module governs the entire data persistence layer. The system is currently in a complex transitional state: it was originally built for SQLite but has been migrated to run on a PostgreSQL cluster for production stability. 
To avoid rewriting the massive legacy `storage.ts` file, a custom runtime SQL translation layer was engineered within the database connection module. This layer intercepts raw SQL queries, translating SQLite syntax (e.g., `INTEGER PRIMARY KEY AUTOINCREMENT`, `datetime('now')`) into valid PostgreSQL syntax (e.g., `SERIAL PRIMARY KEY`, `NOW()`) just-in-time before execution.

**Core Responsibilities:**
*   **Database Connectivity:** Establishing and pooling connections to the PostgreSQL database.
*   **Schema Definition:** Defining tables, columns, and relationships using Drizzle ORM.
*   **Runtime Translation (Compatibility Layer):** Intercepting and converting legacy SQLite raw queries to PostgreSQL dialect.
*   **Migrations Management:** Executing Drizzle schema migrations and custom seed scripts on startup.

## Technical Stack & Dependencies
*   **Core Logic:** `server/db.ts`, `server/migration.ts`
*   **Schema Definitions:** `shared/schema.ts`, `shared/schema-postgres.ts`
*   **ORM:** `drizzle-orm/node-postgres`, `drizzle-kit`
*   **Migration Tools:** `server/migration-tools/`
*   **Storage Access:** `server/storage.ts` (Legacy raw SQL executor)

## Current Shortcomings (Technical Debt)
*   **Brittle Translation Layer:** The regex-based `translateSql` function in `server/db.ts` is highly experimental. It is prone to missing complex edge cases or corrupting strings if a payload happens to match a translation regex pattern.
*   **Raw SQL over ORM:** `server/storage.ts` predominantly uses raw SQL strings (`db.execute(sql\`...\`)`) rather than Drizzle's native, type-safe query builders. This defeats the purpose of using a modern ORM and forces the system to rely on the dangerous translation layer.
*   **Fragmented Schema & Connection Files:** There are duplicate files for schemas (`schema.ts` vs `schema-postgres.ts`) and connections (`db.ts` vs `db-postgres.ts`), leading to confusion regarding which file is actively governing the production schema.
*   **Dual Migration Strategy:** Migrations are handled by both standard Drizzle generated files and a custom procedural `runMigrations` script, making schema updates unpredictable.

## Improvement Steps
1.  **Refactor Storage Layer:** The most critical task is to rewrite `server/storage.ts`. Replace all raw `db.execute(sql\`...\`)` calls with native Drizzle ORM syntax (`db.insert()`, `db.select()`, etc.).
2.  **Remove the Translation Layer:** Once `storage.ts` is refactored to use Drizzle's abstract builders, the `translateSql` function in `server/db.ts` must be completely removed to eliminate the regex parsing overhead and risk.
3.  **Consolidate Configuration:** Delete the duplicate/obsolete `-postgres.ts` schema and db files. Maintain a single `shared/schema.ts` tailored explicitly for PostgreSQL (using `serial`, `timestamp`, `jsonb`).
4.  **Standardize Migrations:** Rely exclusively on Drizzle's CLI (`drizzle-kit generate` / `migrate`) for schema changes. Remove custom procedural migration scripts that attempt to manually diff the database state.

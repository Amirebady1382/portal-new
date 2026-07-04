# Portal Project Instructions & Memory

## Project Overview
This is a comprehensive portal application (likely for "صندوق پژوهش و فناوری گیلان" - Gilan Research and Technology Fund) built with a React frontend (Vite) and an Express.js backend (Node.js). It handles user authentication, OTP verification via SMS/Bale Bot, dynamic document (contract/report) generation using `docxtemplater`, and integrates with several external APIs (Bale Bot, SMS.ir, Rasmio, and multiple AI providers like OpenAI, Anthropic, GapGPT, Perplexity).

## Architectural Details
*   **Frontend**: React, Vite, Tailwind CSS, TypeScript.
*   **Backend**: Node.js, Express, Drizzle ORM, TypeScript.
*   **Database**: PostgreSQL (migrated from SQLite).
*   **Deployment**: Docker & Docker Compose.
*   **Document Generation**: Uses `.docx` templates, replacing variables using `docxtemplater` and a custom `UnifiedVariableManager`.
*   **AI Integrations**: Extensive use of AI for text generation, analysis, and fallback mechanisms (e.g., trying Claude, then falling back to GapGPT).
*   **Service Request Workflow (State Machine)**: The lifecycle of a service request is managed across two fields: a master `status` ('pending', 'in_review', 'completed', 'rejected') and a granular `workflowStage` (e.g., 'investment_forms_pending', 'administrative_review'). A request is only truly finished when `status === 'completed'` or `workflowStage === 'completed'`.

## Key Troubleshooting & Fixes Applied
1.  **Database Migration (SQLite to PostgreSQL)**:
    *   **Issue**: Manual migration scripts contained SQLite-specific syntax (`INTEGER PRIMARY KEY AUTOINCREMENT`, `DATETIME`, `BOOLEAN DEFAULT 1/0`, `INSERT OR IGNORE`) which caused fatal crashes when running against the production PostgreSQL database via Docker.
    *   **Fix**: Implemented a robust regex-based SQL translation layer in `server/db.ts` to automatically convert SQLite syntax to PostgreSQL syntax at runtime before execution.
2.  **Production Dependencies**:
    *   **Issue**: The production Docker container was crashing because critical runtime packages (`cross-env`, `dotenv`, `uuid`, `vite`, `@vitejs/plugin-react`) were listed under `devDependencies` and omitted during the `npm ci` build step.
    *   **Fix**: Audited `package.json` and moved necessary runtime dependencies to the `dependencies` section. Also, updated the `Dockerfile` to include native build dependencies (like `python3`, `make`, `g++`) required by packages like `canvas`.
3.  **Vite Import in Production**:
    *   **Issue**: The server was statically importing Vite and its plugins, causing `MODULE_NOT_FOUND` errors in production where Vite should ideally not be bundled.
    *   **Fix**: Modified `server/vite.ts` to use dynamic imports for Vite components, ensuring `esbuild` doesn't bundle them into the production server script.
4.  **OTP Expiration Bug**:
    *   **Issue**: OTP codes were expiring immediately upon creation.
    *   **Fix**: Found a timestamp inconsistency between Node.js (`toISOString()`) and SQLite/Postgres. Standardized the timestamp generation in `server/services/otp.service.ts` using `NOW()` for database queries to ensure timezone consistency. Also fixed the `is_used` boolean check for PostgreSQL.
5.  **Bale Bot Webhook & Configuration**:
    *   **Issue**: The Bale Bot webhook was attempting to register to `http://localhost:5173` or failing with a syntax error due to an incorrect API base URL (`https://tapi.bale.ai/bot/` - extra slash).
    *   **Fix**: Updated the `.env` file to correctly set `CLIENT_URL`, `APP_URL`, and `FRONTEND_URL` to the production domain (`https://portal.gilanfund.ir`). Corrected `BALE_API_BASE` to `https://tapi.bale.ai/bot`.

## Known Issues / Things to Monitor
*   **GapGPT (AI) Fallbacks**: The system relies heavily on `GapGPT` as a fallback when primary AI providers (Claude, Perplexity) fail. Ensure the `GAPGPT_API_KEY` remains valid.
* **AI Services Health Monitoring**: Integrated health checks for Claude, GapGPT, and Perplexity on the Admin "Test Services" page (`/admin/test-services`). If AI features begin failing, check this page to see if one of the third-party providers is experiencing downtime. These checks use a 5-second timeout and are accessible via the `/api/health/detailed` endpoint.
*   **Contract Generation (docxtemplater)**: The system handles complex `.docx` variable replacements. If template formats change significantly, the `UnifiedVariableManager` or legacy fallback processing in `ContractsService` might need adjustments.

## Rules & Conventions
*   **Do not modify business logic** unless explicitly instructed. Focus on structural, deployment, and bug-fixing tasks.
*   **Layout Standardization**: Use the `DashboardLayout` component in `client/src/components/layout/dashboard-layout.tsx` for all page-level components to ensure consistent responsive sidebar and main content positioning.
*   When executing database migrations or adding features, ensure compatibility with **PostgreSQL**. Avoid SQLite-specific functions like `datetime('now')`.
*   Maintain the strict separation of `dependencies` (required for the compiled `dist/index.js` to run) and `devDependencies` (only needed for `npm run build`).
*   **Backend Filtering for Workflows:** When querying service requests by department (`services.service.ts`), always allow cross-departmental visibility based on the granular `current_stage` OR explicitly allow `completed` statuses to bypass department locks. Otherwise, requests will vanish from employee dashboards upon handoff or completion.
*   **Database Seeding:** The `server/seed.ts` script primarily provisions default users. Missing organizational structures (like specific `departments` or `services`) must be manually seeded via SQL during a hard reset, as they are not currently programmatically generated by `seed.ts`.

## Recent Deployment & Migration Fixes (May 2026)
- **Database Migration**: Implemented programmatic Drizzle migrations (`migrate()`) in `server/db.ts` to execute on server startup, ensuring PostgreSQL schema is correctly initialized in fresh environments.
- **Dockerfile Updates**: Updated the Docker production stage to include the `migrations-pg` directory, making schema files available at runtime for automated migrations.
- **SSL/CORS Resolution**: Restored strict `helmet` security headers for production, as the application will now run behind an SSL-terminated domain (`https://portal.gilanfund.ir`).
- **Deployment Workflow**: Established an offline deployment pattern using Docker image archives (`.tar`) and a custom `DEPLOYMENT_GUIDE.md` for servers without internet access.
- **Database Query Stabilization**: Intercepted SQLite `PRAGMA` commands within the SQL translation layer in `server/db.ts` to prevent fatal PostgreSQL syntax errors, preserving legacy queries safely.
- **TypeScript Strict Mode Resolutions**: Resolved critical type mismatches causing runtime crashes. Fixed circular dependency typing in schemas with Drizzle `AnyPgColumn`. Handled `rowsAffected` nullability in storage calls. Fixed `AuthRequest` type mismatches in `investment-reports.routes.ts`. Cleaned up React UI Error Boundary crashes (e.g., `filteredUsers` in `admin-dashboard.tsx`).
- **Data Integrations**: Fixed `rasmio-integration.service.ts` data mapping to avoid "undefined" errors when auto-creating companies from the UI, and correctly typed dynamic form JSON parsers to expect `unknown` database payload types.
- **Admin Test Services Expansion**: Upgraded the standalone "Test Services" admin dashboard feature from an inline Rasmio check to a dedicated `/admin/test-services` UI grid. It now includes isolated, backend-powered (with 5-second `Promise.race` timeouts) health checks for Rasmio, SMS.ir, Bale Bot, Claude, GapGPT, and Perplexity. The UI routing logic was also corrected to expose this page safely in production Docker builds.
- **Financial Summary & Credit Status Page**: Implemented a comprehensive investment reporting page (`/financial-summary`) with 3-year comparative financial tables (1402-1404), automated ratios calculation, Article 141 compliance checking, and Rasmio API data auto-fill.
- **Official PDF Export**: Integrated `jspdf` and `html2canvas` to generate professional, A4-formatted official investment reports directly from the UI.
- **Socket.io Stability**: Fixed a critical initialization bug where the `socketManager` was not being initialized with the HTTP server instance in `server/routes.ts`, causing persistent connection errors.
- **Layout & Sidebar Consistency**: Audited and fixed global layout overlap issues by standardizing main content margins (`md:mr-72`) to match the fixed sidebar width across all dashboard pages.
- **PDF Font Integrity**: Standardized the inclusion of Persian `.ttf` fonts in `assets/fonts/` and updated `.dockerignore` to ensure they are available in production for professional PDF generation without character corruption.
- **Mass Codebase Repair**: Resolved a critical corruption issue where multiple `apiRequest` calls were mangled with literal `"JSON"` strings during a previous refactor, restoring functional API payloads and fixing production build failures.
- **Repository Cleanup**: Eliminated obsolete `.broken` files and corrected mangled code blocks in several key pages (`notifications.tsx`, `system-health.tsx`, etc.) to maintain a clean and buildable codebase.
- **Service Workflow End-to-End Fixes**: Hardened the workflow state transitions. Implemented robust server-side rejection for duplicate active customer service requests (`400 Bad Request` if `status` is 'pending', 'in_review', etc.). Repaired the administrative pipeline by updating `services.service.ts` so `administrative` employees inherit visibility of `investment` services when `workflowStage` enters administrative phases. Fixed frontend logic to display 'completed' requests by checking both `status` and `workflowStage` markers.
# Module 8: Admin Dashboard & System Monitoring Module

## Module Overview
This module serves as the command center for high-level system administrators (`admin` role). It provides tools for broad user management, role assignments, dynamic system settings adjustments, and comprehensive audit trailing.
Crucially, it acts as the primary diagnostic tool for the platform, offering deep, real-time health checks of internal resources (CPU, Memory) and vital external APIs (Rasmio, SMS, AI Providers) to ensure system reliability.

**Core Responsibilities:**
*   **System Diagnostics:** Real-time monitoring of Node.js host metrics and the connection status of PostgreSQL.
*   **External API Health:** Dedicated pinging and latency checking of critical third-party dependencies via isolated API tests.
*   **Audit Logging:** Tracking critical state changes, logins, and data mutations across the platform for security compliance.
*   **Global Settings:** Managing dynamic `system_settings` (like AI prompts or feature flags) without requiring a codebase deployment.

## Technical Stack & Dependencies
*   **Controllers & Routes:** `server/controllers/admin.controller.ts`, `server/controllers/admin-management.controller.ts`, `server/routes/health.routes.ts`
*   **Services:** `server/services/health.service.ts`, `server/services/admin.service.ts`
*   **Database Schema:** `system_settings`, `audit_logs` (in `shared/schema.ts`)
*   **Frontend UI:** `client/src/pages/admin-dashboard.tsx`, `client/src/pages/system-health.tsx`, `client/src/pages/test-services.tsx`
*   **External Integrations:** Acts as a meta-monitor for all integrated external services.

## Current Shortcomings (Technical Debt)
*   **Incomplete System Metrics:** The `HealthService.getSystemMetrics` function is incomplete; specifically, the logic intended to calculate server disk usage is missing or stubbed, reducing the dashboard's diagnostic value.
*   **Broken Pagination Logic:** The `getAuditLogs` endpoint in the `AdminController` contains a logic bug where pagination metadata (total pages/counts) is incorrectly calculated or returned, leading to a broken UI experience when browsing deep history.
*   **Manual Audit Tracing:** Currently, audit logs are created manually scattered throughout various controllers (e.g., `storage.createAuditLog(...)`). This is highly prone to human omission during rapid development.

## Improvement Steps
1.  **Fix Audit Pagination:** Review the database query in `getAuditLogs` to ensure it performs a separate `COUNT(*)` query before applying `LIMIT/OFFSET`, and correctly calculate the metadata for the frontend data grid.
2.  **Complete Health Metrics:** Implement cross-platform native Node.js methods (or a lightweight package like `systeminformation`) to accurately report actual disk usage in the `HealthService`.
3.  **Automate Audit Logs:** Move away from manual `createAuditLog` calls in controllers. Instead, implement a centralized logging mechanism, such as Drizzle ORM middleware/hooks or Express request interceptors, to automatically log mutations (`POST`, `PUT`, `PATCH`, `DELETE`) with the corresponding authenticated user ID.

# Module 3: Services & Workflow Module

## Module Overview
This module manages the definition of dynamic customer services and orchestrates the lifecycle of "Service Requests". A core feature of this module is a two-department state machine handled by the `WorkflowService`. The workflow dictates that a service request typically transitions between two main departments: Investment and Administrative.

**Core Responsibilities:**
*   **Service Definition:** Allows admins to define dynamic services, link them to specific form requirements (`DocumentRequirements`), and assign them to companies.
*   **Request Lifecycle (Workflow):** Manages the state machine for service requests. A typical flow is: `investment_forms_pending` -> `investment_review` -> `administrative_forms_pending` -> `administrative_review` -> `completed`.
*   **Departmental Handoff:** Ensures that transition to the next department is blocked until all required forms for the current department are successfully submitted.
*   **Filtering & View Restrictions:** Provides complex filtering to ensure employees in specific departments only see requests relevant to their current stage.

## Technical Stack & Dependencies
*   **Controllers & Routes:** `server/controllers/services.controller.ts`, `server/routes/services.routes.ts`
*   **Services:** `server/services/services.service.ts`, `server/services/workflow.service.ts`
*   **Database Schema:** `services`, `service_requests`, `company_services_mapping`, `service_forms_mapping` (in `shared/schema.ts`)
*   **Storage Interface:** `server/storage.ts`
*   **Frontend UI:** `client/src/pages/services-management-enhanced.tsx`, `client/src/pages/service-requests-workflow.tsx`

## Current Shortcomings (Technical Debt)
*   **Hardcoded Workflow Stages:** The workflow states (e.g., `'investment_forms_pending'`, `'completed'`) are hardcoded strings scattered across both backend and frontend, making it difficult to add new stages or modify the flow without widespread changes.
*   **Dormant Notification System:** The notification logic triggered upon state transitions is currently a no-op (logged as skipped), meaning users are not actively informed of status changes.
*   **Inconsistent Data Access:** Database access is fragmented; some services utilize raw SQL queries while others rely on the `storage.ts` abstraction layer.
*   **Complex Filtering Logic:** The department-based filtering logic within `getServiceRequests` is complex and tightly coupled to the hardcoded states, posing a scalability issue if new departments or workflows are introduced.

## Improvement Steps
1.  **Extract State Machine Config:** Centralize workflow stages into a strict TypeScript `Enum` or, ideally, a database-backed configuration table. This will eliminate magic strings and allow for dynamic workflow definitions.
2.  **Standardize Data Access:** Refactor the `services.service.ts` and `workflow.service.ts` to exclusively use native Drizzle ORM queries, removing any raw SQL executions.
3.  **Activate Notifications:** Implement the pending notification hooks within `WorkflowService` to trigger real emails, SMS (via SMS.ir), or Bale Bot messages upon stage transitions.
4.  **Refactor Request Filtering:** Simplify the department filtering logic by mapping abstract workflow stages to department IDs in a configuration object, decoupling the database query from hardcoded stage strings.

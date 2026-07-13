# Module 4: Document & Requirements Module

## Module Overview
This module is the backbone for data collection, handling both raw file uploads and complex, dynamic data entry forms (`DocumentRequirements`). It allows administrators to build JSON-schema-backed forms with conditional logic, which customers then fill out as part of their service requests or company profiles.

**Core Responsibilities:**
*   **Dynamic Form Builder:** Manages the creation of `DocumentRequirements`, defining forms with JSON field schemas (supporting text, number, file, select, etc., with conditional visibility like `showIf`).
*   **Form Submissions:** Validates and stores user data (`FormSubmissions`) submitted against the dynamic form schemas.
*   **File Management:** Handles raw file uploads, storage, and metadata management (`Documents`).
*   **Bulk Operations:** Provides ZIP archiving functionality for downloading multiple documents associated with a specific entity or request.
*   **AI Triggers:** Includes special hooks to trigger AI processing workflows for specific document types (e.g., parsing uploaded Tax Declarations).

## Technical Stack & Dependencies
*   **Controllers & Routes:** `server/controllers/documents.controller.ts`, `server/controllers/document-requirements.controller.ts`, `server/routes/documents.routes.ts`
*   **Services:** `server/services/documents.service.ts`, `server/services/document-requirements.service.ts`
*   **Middleware:** `server/middleware/upload.ts` (Multer integration for file handling)
*   **Database Schema:** `documents`, `document_requirements`, `form_submissions` (in `shared/schema.ts`)
*   **Storage Interface:** `server/storage.ts`
*   **Frontend UI:** `client/src/pages/documents.tsx`, `client/src/pages/document-requirements.tsx`

## Current Shortcomings (Technical Debt)
*   **Brittle Document Linking:** A major structural flaw exists where documents uploaded via a dynamic form are linked to the `FormSubmission` using a hardcoded string prefix in the document's description field (e.g., `فایل آپلود شده از فرم: ...`). This is highly fragile and prone to breaking if descriptions are edited.
*   **Manual Case Mapping:** The system struggles with mapping database `snake_case` to application `camelCase`, leading to frequent manual object mapping and dangerous `(any)` type casting in the service layer.
*   **Hardcoded Validation Logic:** The conditional visibility logic (`showIf`) is basic and hardcoded within the service layer, making it difficult to implement complex, multi-field dependencies or external data validations.
*   **Performance Bottlenecks:** The bulk ZIP generation process iterates through files synchronously on the main Node thread, which could block the event loop and cause performance bottlenecks under heavy load.

## Improvement Steps
1.  **Implement Relational Linking:** Replace the brittle string-based linking between `Documents` and `FormSubmissions` with an explicit relational mapping. Add a `formSubmissionId` column to the `documents` table or create a mapping table (`form_submission_documents`).
2.  **Standardize ORM Mapping:** Implement Drizzle's built-in naming strategy or custom column mappers in `shared/schema.ts` to automatically handle `snake_case` to `camelCase` conversions, eliminating manual mapping in `storage.ts`.
3.  **Enhance Form Validation:** Integrate a robust JSON schema validation library (like `ajv` or `zod`) to handle dynamic form validation and conditional logic dynamically, removing hardcoded logic from the service layer.
4.  **Offload Heavy Tasks:** Move CPU-intensive operations, such as ZIP generation and AI processing triggers, to background workers (e.g., using BullMQ) to prevent blocking the main server thread.

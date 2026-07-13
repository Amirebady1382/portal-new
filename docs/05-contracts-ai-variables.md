# Module 5: Contracts & AI Variable Management Module

## Module Overview
This module is designed to automate the generation of official `.docx` contracts and documents. It utilizes a highly sophisticated `UnifiedVariableManager` capable of reading Microsoft Word XML, extracting template variables (e.g., `{company_name}`), and even "self-healing" broken XML tags that occur when Word splits text nodes across formatting boundaries. 
The system employs an AI Orchestrator with a multi-provider fallback mechanism to intelligently map and extract complex variables from unstructured text or external sources when direct mappings are insufficient.

**Core Responsibilities:**
*   **Template Parsing & Healing:** Deep inspection and repair of uploaded `.docx` template XML structures.
*   **Variable Extraction & Mapping:** Identifying required variables within a document and mapping them to system data sources (Rasmio API, User Forms, System Settings).
*   **Document Generation:** Compiling data and injecting it into templates using `docxtemplater`.
*   **AI Fallback Orchestration:** Utilizing AI (Claude, Perplexity, GapGPT) to analyze contract requirements or infer missing data points.

## Technical Stack & Dependencies
*   **Services:** `server/services/contracts.service.ts`, `server/services/unified-variable-manager.service.ts`, `server/services/ai-orchestrator.service.ts`
*   **Libraries:** `docxtemplater`, `pizzip`
*   **Database Schema:** `contract_templates`, `template_variables`, `variable_mappings` (in `shared/schema.ts`)
*   **Frontend UI:** `client/src/pages/contract-generator.tsx`, `client/src/pages/contract-variables-management.tsx`
*   **External Integrations:** AI Providers (OpenAI, Anthropic, GapGPT, Perplexity).

## Recent Improvements (Resolved Technical Debt)
*   **Robust XML "Gap Removal" Healing:** Replaced the fragile regex-based string replacement with a surgical "Gap Removal" strategy. This logic identifies redundant XML formatting tags (e.g., `</w:t></w:r><w:r><w:t>`) that Word injects *between* characters of a placeholder and removes them while preserving the outer XML hierarchy. This ensures `docxtemplater` receives contiguous, valid tags (e.g., `{{company_name}}`).
*   **Unified Variable Persistence:** Template variables and their metadata (source, type, label) are now automatically extracted during validation and persisted to the database. This ensures consistent display in the UI and reliable mapping during generation.
*   **Absolute Form Mapping:** The generation pipeline now performs an "Absolute Mapping" check, scanning all available form submissions (prioritizing the latest data) for *every* mappable variable, regardless of its initial source.
*   **UI Stability:** Fixed frontend crashes related to the transition from string-based to object-based variable arrays and implemented interactive validation panels.

## Current Shortcomings (Technical Debt)
*   **Performance Overhead:** The AI fallback mechanism can introduce significant latency into the contract generation process if primary data sources fail, leading to poor UX during generation.

## Future Improvement Steps
1.  **Asynchronous Generation:** Refactor the contract generation endpoint to operate asynchronously. Return a job ID to the client and use WebSockets or polling to notify the user when the contract (especially if AI-assisted) is ready for download.
2.  **Advanced XML Parsing:** While the Gap Removal strategy is robust for placeholders, future complex mutations (like injecting tables or dynamic lists) may still benefit from a full DOM-based parser (like `xmldom`) for safer tree traversal.
3.  **Extensive Test Coverage:** Write exhaustive unit tests for `UnifiedVariableManager.fixBrokenVariables` using diverse `.docx` edge cases (nested tables, headers/footers) to ensure long-term stability.

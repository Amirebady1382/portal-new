# Module 6: Financial & Investment Reports Module

## Module Overview
This module handles the aggregation, calculation, and presentation of complex financial data and investment reports. It features a custom `FormulaEngineService` that uses graph theory (Kahn's Algorithm for topological sorting) to resolve dependencies between custom financial formulas (e.g., calculating Article 141 compliance based on dynamic equity and loss data).
The module presents multi-year (e.g., 1402-1404) financial comparisons and allows for the generation of official A4 PDFs directly from the UI.

**Core Responsibilities:**
*   **Financial Data Aggregation:** Extracting financial metrics from user-submitted forms (`FormSubmissions`) and standardizing them into comparative multi-year tables.
*   **Dynamic Formula Resolution:** Evaluating mathematical formulas that depend on other calculated metrics, ensuring correct calculation order.
*   **Investment Reporting:** Orchestrating the lifecycle of an investment report, integrating AI analysis on the financial data.
*   **Official PDF Export:** Generating print-ready, formatted reports directly from the web interface.

## Technical Stack & Dependencies
*   **Controllers & Routes:** `server/controllers/investment-reports.controller.ts`
*   **Services:** `server/services/investment-reports.service.ts`, `server/services/formula-engine.service.ts`
*   **Database Schema:** `financial_summaries`, `investment_reports`, `financial_formulas` (in `shared/schema.ts`)
*   **Frontend UI:** `client/src/pages/investment-financial-summary.tsx`
*   **Frontend Libraries:** `jspdf`, `html2canvas` (for PDF generation)

## Current Shortcomings (Technical Debt)
*   **Client-Side PDF Generation:** The official PDF export relies entirely on `jspdf` and `html2canvas` running in the user's browser. This approach is notoriously memory-intensive, slow on low-end devices, and prone to CSS rendering bugs (especially with complex tables or Persian fonts).
*   **Circular Dependency Risks:** While the `FormulaEngineService` uses topological sorting, deep or accidental circular dependencies in user-defined formulas could cause runtime evaluation failures if not strictly validated during the formula creation phase.
*   **Data Duplication:** Financial data is often extracted from `FormSubmissions` and duplicated into `financial_summaries`. Keeping these two data stores perfectly synchronized during updates is challenging and error-prone.

## Improvement Steps
1.  **Server-Side PDF Generation:** Migrate the PDF generation logic from the client to the backend using a headless browser (like Puppeteer/Playwright) or a dedicated PDF generation library (like `pdfmake` or `wkhtmltopdf`). This ensures 100% consistent rendering and offloads processing.
2.  **Pre-Calculation Validation:** Enhance the formula creation endpoint to perform the topological sort and circular dependency check *before* saving a formula to the database, rather than waiting for evaluation time to fail.
3.  **Single Source of Truth:** Refactor the schema so `financial_summaries` acts as a materialized view or uses strict foreign-key referencing to `form_submissions` rather than duplicating the raw financial values.
4.  **Optimize Formula Engine:** Add memoization to the `FormulaEngineService` so that intermediate formula results are cached during a single evaluation pass, improving performance for large report datasets.

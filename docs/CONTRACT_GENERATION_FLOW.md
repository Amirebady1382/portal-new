# 📄 Contract Generation Flow: From Forms to Print

This guide provides an end-to-end architectural and operational walkthrough of how the Portal dynamically generates `.docx` contracts. It covers everything from initial data collection to the final printable document.

---

## 🔄 The 5-Step Contract Lifecycle

### Step 1: Data Collection Setup (Forms & Sources)
Before a contract can be populated, the system needs raw data. The Portal gathers data from multiple structured sources:
1.  **Rasmio API (Automatic):** Fetches official corporate data (National ID, Registration Number, Board Members, Capital).
2.  **Dynamic Forms (User Input):** Administrators create custom data-entry forms using the **Document Requirements** module. Customers fill out these forms during their Service Requests (e.g., entering `loan_amount`, `project_duration`).
3.  **Financial Engine (Calculated):** The system computes complex financial ratios and multi-year summaries.
4.  **System Settings:** Global variables like "Current Year Base Interest Rate".

### Step 2: Template Creation (`.docx`)
The legal team or administrator prepares a standard Microsoft Word document (`.docx`).
*   **Syntax:** Dynamic placeholders are defined using `docxtemplater` syntax (curly braces). 
    *   *Example:* `شرکت {company_name} به شناسه ملی {national_id} مبلغ {loan_amount} ریال دریافت می‌کند.`
*   **Upload:** The admin uploads this `.docx` file via the **Template Management** page.

### Step 3: Variable Extraction & Mapping
Once the template is uploaded, the system automatically scans the `.docx` XML to find all `{placeholders}`. 
In the **Contract Variables Management** UI, the admin maps these extracted variables to their respective data sources:
*   **Source = Rasmio:** Map `{company_name}` -> `company.name`.
*   **Source = Form:** Map `{loan_amount}` -> *Loan Application Form* -> `amount_field`.
*   **Source = Manual:** Leave unmapped. The system will prompt the employee to type this value manually at the exact time of generation.

### Step 4: The Generation Engine (Under the Hood)
When an employee clicks "Generate Contract" for a specific company or service request, the backend (`ContractsService` & `UnifiedVariableManager`) takes over:

1.  **Data Aggregation:** The backend queries the database, fetching the mapped Rasmio data, and pulling the specific JSON payload from the customer's `FormSubmissions`. **Optimization:** The system automatically sorts submissions and selects the *latest available data* for each mapped field.
2.  **XML Healing (Gap Removal):** Microsoft Word often breaks tags behind the scenes. The `UnifiedVariableManager` runs a surgical "Gap Removal" algorithm. This identifies fragmented braces (e.g., `{` `</w:t><w:t>` `{`) and variable names, removing the internal XML "gaps" to make the tag contiguous without corrupting the document's XML structure.
3.  **Normalization:** All detected tags (even if written as single braces `{var}` in Word) are automatically normalized to the standard `{{var}}` format before processing.
4.  **AI Fallback (If Enabled):** If certain variables are missing or unstructured, the `AIOrchestratorService` can be invoked to infer data from previously uploaded PDF documents.
5.  **Injection:** `docxtemplater` injects the aggregated data payload into the healed and normalized `.docx` template.

### Step 5: Finalization, Review & Print
1.  **Output:** A completed, customized `.docx` file is generated and saved to the server's `uploads/` directory.
2.  **Download:** The employee downloads the file.
3.  **Manual Tweaks:** Because it is a native `.docx` file, the legal team can open it in Microsoft Word to make final manual adjustments, fix pagination, or add wet signatures.
4.  **Print/PDF:** The finalized document is printed or exported to PDF natively via Microsoft Word for physical signing.

---

## 🛠️ Troubleshooting Common Issues

*   **Variable Not Replacing:** 
    *   Check the **Contract Variables Management** page to ensure the mapping points to an existing, non-empty data source.
    *   The system now handles formatting *within* a tag automatically, but ensure the tag itself is not nested inside a Word "Field" (like a Page Number field).
*   **Document Generation Crash:**
    *   The new "Gap Removal" logic prevents most crashes. If a crash still occurs, it is likely due to an unclosed brace (e.g., `{{company_name`) in the template.
*   **Permission Denied Error:**
    *   The system uses absolute paths (`uploads/temp`) for processing. Ensure the Docker container has write permissions for the `uploads` directory.
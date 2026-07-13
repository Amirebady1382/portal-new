# Antigravity Developer Handover (agy.md)

Welcome! This document outlines the architectural setup, key modules, constraints, and operational guides for the Gilan Research and Technology Fund Portal. Use this as a reference guide for future development and debugging sessions.

---

## 🏗️ System Architecture

*   **Frontend**: React (Vite), TypeScript, Tailwind CSS, TanStack Query (v5).
*   **Backend**: Node.js, Express, Drizzle ORM, TypeScript (compiled via esbuild into `dist/index.js`).
*   **Database**: PostgreSQL. Drizzle migrations run automatically on startup.
*   **Reverse Proxy**: Caddy (proxies port `80` to port `5000` where the Express app listens).
*   **Process Manager**: PM2 handles persistence (`pm2 start ecosystem.config.cjs` as `portal`).

---

## 🤖 AI Systems & Gateways

1.  **GapGPT Gateway**: 
    *   Direct calls to `api.anthropic.com` are blocked/firewalled on this server.
    *   All Anthropic SDK (`new Anthropic`) calls are intercepted dynamically. If `DISABLE_DIRECT_CLAUDE=true` is set in `.env`, the client wrappers route the prompt to `gapGPTService.generateResponse` using the model **`claude-sonnet-4-6`** via the GapGPT API proxy (`https://api.gapgpt.app/v1`).
2.  **AI Orchestrator (`ai-orchestrator.service.ts`)**:
    *   Handles unified AI requests and executes a fallback pattern from Claude direct to GapGPT.
3.  **Local PDF Parser Integration**:
    *   To prevent timeouts and network overhead, `extractFileContent` in `ai-analysis.ts` attempts **local text extraction** using `pdf2json` first. If successful, it bypasses the LLM call entirely, ensuring fast response times (especially for large/multiple PDF documents).

---

## 🔧 Core Configurations & Environment (`.env`)

*   `DISABLE_DIRECT_CLAUDE=true`: Bypasses direct Anthropic initialization and intercepts Claude calls to direct them to GapGPT.
*   `GAPGPT_API_KEY`: API key for the GapGPT proxy gateway.
*   `GAPGPT_MODEL=claude-sonnet-4-6`: Target model ID for Claude 3.5 Sonnet calls.
*   `DATABASE_URL`: PostgreSQL connection string.
*   `CORS / CORS Origins`: Production domain is `https://portal.gilanfund.ir`, fallback is `http://185.214.101.247`.

---

## 🛠️ Operational Commands

When modifying client or server code, you must recompile and restart the service:

```bash
# 1. Compile client and bundle server
npm run build

# 2. Restart the persistent portal process
pm2 restart portal

# 3. Monitor active logs and debug outputs
pm2 logs portal
```

---

## 📝 Recent Key Fixes Applied

*   **OTP Code Verification**: Fixed timezone offsets where SQLite `NOW()` and JavaScript UTC timestamps diverged, standardizing on Javascript `Date` objects for expiration calculations.
*   **White Screen Fixes**:
    *   Disabled Helmet `upgradeInsecureRequests` to prevent browser forcing HTTPS resource loading when accessing via HTTP.
    *   Protected `formatNumber` and `.toFixed()` metrics formatting in pages like `financial-summary.tsx` and `tax-declaration-modal.tsx` against `null`/`undefined` data values.
    *   Patched `ErrorBoundary` to fallback to a custom PRNG when `crypto.randomUUID()` is disabled by browsers on non-HTTPS origins.
*   **Investment Report Generator**:
    *   Implemented local PDF text extraction (`pdf2json`) to avoid huge base64 document processing overhead.
    *   Added document de-duplication inside the aggregator loop.
    *   Configured AI reports to write their output HTML content to the filesystem and persist in the `generated_investment_reports` database table (with type `ai_freetext`).
    *   Added a **History & Previous Reports Pane** in `investment-report-generator-enhanced.tsx` to let employees view past reports and download DOCX/HTML documents directly.

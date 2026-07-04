# 🏢 Portal Management System (صندوق پژوهش و فناوری گیلان)

<div dir="rtl">
سیستم جامع مدیریت مشتریان، درخواست‌های خدمات، و گردش کار برای صندوق تحقیقات و فناوری غیردولتی گیلان.
</div>

---

A comprehensive customer management, service request, and workflow system for the Guilan Non-Governmental Research and Technology Fund.

## 🏗️ High-Level System Architecture

This project is built using a modern **React/Vite** frontend and an **Express/Node.js** backend, powered by a robust **PostgreSQL** database (migrated from SQLite) via **Drizzle ORM**. It heavily integrates with external governmental APIs (Rasmio) and advanced AI LLMs (Claude, GapGPT, Perplexity) to automate corporate data entry, dynamic contract generation, and multi-year financial reporting.

The system is highly modularized to handle distinct business operations ranging from secure authentication to complex mathematical financial formulas and `.docx` template manipulation.

## 📚 Technical Documentation & Modules Index

We have extensively documented the architecture, technical debt, and improvement strategies for the core sub-systems of this platform. Please consult the documentation below for an in-depth understanding of how the system operates under the hood.

*   [**Modules Architecture Index**](docs/modules-index.md)
*   [**Contract Generation Flow Guide**](docs/CONTRACT_GENERATION_FLOW.md)

### Detailed Module Documentation:

1.  **[Authentication & Authorization Module](docs/01-authentication-authorization.md)**
    *   *User authentication, OTP verification (SMS/Bale), Role-Based Access Control.*
2.  **[Company & Profile Management Module](docs/02-company-profile-management.md)**
    *   *Customer profiles, tax declarations, Rasmio API integrations.*
3.  **[Services & Workflow Module](docs/03-services-workflow.md)**
    *   *Dynamic services, service request lifecycles, cross-department state machine.*
4.  **[Document & Requirements Module](docs/04-document-requirements.md)**
    *   *Dynamic form building, system-wide file requirements, raw uploads.*
5.  **[Contracts & AI Variable Management Module](docs/05-contracts-ai-variables.md)**
    *   *`.docx` template generation, XML self-healing, AI-assisted variable mapping.*
6.  **[Financial & Investment Reports Module](docs/06-financial-investment-reports.md)**
    *   *Kahn's Algorithm formula engine, automated multi-year financial summaries, PDF exports.*
7.  **[Communication & Notification Module](docs/07-communication-notification.md)**
    *   *Bale Messenger bot, internal ticketing, SMS dispatching, AI auto-replies.*
8.  **[Admin Dashboard & System Monitoring Module](docs/08-admin-system-monitoring.md)**
    *   *Global metrics, audit trailing, external AI/API health checks.*
9.  **[Database Architecture Module](docs/09-database-architecture.md)**
    *   *Drizzle ORM schema, SQLite-to-PostgreSQL compatibility translation layer.*
10. **[Docker & Deployment Infrastructure Module](docs/10-docker-deployment.md)**
    *   *Multi-stage containerization, PM2 orchestration, offline deployment capabilities.*


---

## Stack Overview

**Frontend:**
- React 18 with TypeScript
- Vite, Tailwind CSS + Shadcn/ui
- TanStack Query (React Query)
- jspdf, html2canvas (Exporting)

**Backend:**
- Node.js + Express.js
- TypeScript
- Drizzle ORM
- PostgreSQL (via Docker)
- Docxtemplater, Pizzip

**AI & External APIs:**
- Anthropic Claude, GapGPT, Perplexity
- Rasmio API (Company Registry)
- SMS.ir (OTP)
- Bale Messenger API

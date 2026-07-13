# Module 10: Docker & Deployment Infrastructure

## Module Overview
This module defines the containerization strategy and orchestration required to deploy the application reliably across different environments. It packages the React frontend, Node.js backend, and a PostgreSQL database into isolated, reproducible containers.
The infrastructure is designed to handle "offline" deployments (e.g., air-gapped servers) by exporting `.tar` Docker images and includes necessary OS-level dependencies for complex tasks like PDF generation and Word document processing.

**Core Responsibilities:**
*   **Containerization:** Multi-stage `Dockerfile` to build the frontend, transpile the backend, and package only the necessary runtime artifacts into a slim production image.
*   **Orchestration:** `docker-compose.yml` to define the application services, networking, and persistent storage volumes for the PostgreSQL database and user uploads.
*   **Environment Configuration:** Passing `.env` variables securely into the containerized environment.
*   **System Dependencies:** Installing native OS packages (like Python, g++, fonts) required by Node.js modules like `canvas` or `pizzip`.

## Technical Stack & Dependencies
*   **Container Files:** `Dockerfile`, `.dockerignore`
*   **Orchestration:** `docker-compose.yml`
*   **Process Management:** `ecosystem.config.cjs` (PM2, though currently Docker is prioritized)
*   **Automation Scripts:** `run_migrations.sh`, `package.json` (build/start scripts)

## Current Shortcomings (Technical Debt)
*   **Bloated Production Image:** The `Dockerfile` includes heavy build dependencies (`python3`, `make`, `g++`) in the final production stage because certain modules (like `canvas`) compile from source during `npm ci`. This dramatically increases the image size and potential attack surface.
*   **Brittle Automation:** The `run_migrations.sh` script utilizes `expect` to automate interactive CLI prompts. This is a very fragile automation method that breaks if terminal output changes slightly.
*   **Vite in Production:** There are remnants of Vite being loaded or configured during the production start script (`server/vite.ts`), which occasionally causes `MODULE_NOT_FOUND` errors if `devDependencies` are correctly pruned.
*   **Redundant Startup Checks:** The server startup script executes complex migration checks and procedural data seeding every time the container spins up, delaying the application's availability and risking race conditions.

## Improvement Steps
1.  **Optimize Multi-Stage Build:** Refactor the `Dockerfile` to compile native dependencies in the `builder` stage, then copy only the compiled `.node` binaries or `node_modules` into an alpine-based `runner` stage without OS build tools.
2.  **Remove Interactive CLI Automation:** Replace the `expect`-based `run_migrations.sh` with non-interactive, programmatic execution. Use direct `drizzle-orm/migrator` functions triggered programmatically via `node server/migrate.js`.
3.  **Strict Dependency Separation:** Ensure that `vite`, `@vitejs/plugin-react`, and all build tools are strictly in `devDependencies`. The compiled backend `dist/index.js` must be self-contained and not attempt to dynamically import Vite in production.
4.  **Decouple Migrations from Startup:** Separate the database migration step from the main server startup. Utilize an init container in `docker-compose` or run a manual migration command *before* starting the main application server to prevent lock contention.

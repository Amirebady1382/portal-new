# Portal Architecture: Modules Index

1. **Authentication & Authorization Module**
   Handles user authentication, OTP verification via SMS/Bale Bot, and role-based access control (Admin, Employee, CEO, Customer).

2. **Company & Profile Management Module**
   Manages customer/company profiles, tax declarations, and automatically fetches/integrates external corporate data using the Rasmio API.

3. **Services & Workflow Module**
   Provides dynamic, configurable customer services and handles the lifecycle and state transitions of service requests.

4. **Document & Requirements Module**
   Manages user document uploads, system-wide file requirements, and dynamic validations based on required attachments.

5. **Contracts & AI Variable Management Module**
   Powers the dynamic generation of `.docx` contracts and templates using `docxtemplater`, supported by AI agents that extract and manage complex contract variables.

6. **Financial & Investment Reports Module**
   Generates comprehensive multi-year financial summaries, performs automated ratio calculations (e.g., Article 141), and handles official A4 PDF exports.

7. **Communication & Notification Module**
   Manages multi-channel communication, including internal messaging, SMS notifications, and interactive Bale Bot sessions.

8. **Admin Dashboard & System Monitoring Module**
   Provides global administrative oversight, user management, and real-time health checks for external APIs (Claude, GapGPT, SMS.ir, Rasmio).

9. **Database Architecture Module**
   Governs the data persistence layer, schema definitions using Drizzle ORM, and the complex SQLite-to-PostgreSQL compatibility translation layer.

10. **Docker & Deployment Infrastructure Module**
   Defines the containerization strategy, multi-stage builds, process orchestration, and OS-level dependency management for production environments.

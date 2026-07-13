# Module 1: Authentication & Authorization

## Module Overview
This module is responsible for identifying users, establishing their authenticated sessions, and enforcing role-based access control (RBAC) across the entire system. 
The system primarily utilizes a 2-Factor Authentication (2FA) workflow via One Time Passwords (OTP). OTPs are distributed via SMS (SMS.ir) or internal secure messaging systems (Bale Bot). 
Upon successful verification, it issues JSON Web Tokens (JWT) for subsequent stateless authentication. The roles handled by the system include `admin`, `employee`, `ceo`, and `customer`, each dictating different levels of access mapping to companies and features.

**Core Responsibilities:**
*   Step 1 Login (Credentials/Phone validation and OTP generation).
*   Step 2 Login (OTP Verification and JWT issuance).
*   User registration and profile updates.
*   Route protection and Role-Based Access Control via Express middleware.
*   System audit logging for authentication events.

## Technical Stack & Dependencies
*   **Controllers & Routes:** `server/controllers/auth.controller.ts`, `server/routes/auth.routes.ts`
*   **Services:** `server/services/auth.service.ts`, `server/services/otp.service.ts`
*   **Middleware:** `server/middleware/auth.ts` (Validates JWT from Authorization header)
*   **Database Schema:** `users`, `otp_codes`, `user_companies` (in `shared/schema.ts`)
*   **Storage Interface:** `server/storage.ts` (CRUD methods for user records)
*   **Frontend UI:** `client/src/pages/login.tsx`, which wraps the `TwoFactorLogin` component (`client/src/components/auth/TwoFactorLogin.tsx`).
*   **External Integrations:** SMS Providers, Bale Bot API.

## Current Shortcomings (Technical Debt)
*   **Raw SQL in OTP Service:** `server/services/otp.service.ts` heavily relies on raw SQL strings and manual transaction management (`db.execute`), which breaks away from the Drizzle ORM standards used elsewhere, increasing security risks (SQL injection) and making migrations difficult.
*   **Bug in Profile Update:** There is an identified flaw in the `updatePhone` logic within the `auth.controller.ts` where the new phone number may fail to pass correctly to the persistent storage layer.
*   **Storage Bottleneck:** User operations are routed through a massive, monolithic `storage.ts` file (4000+ lines). The manual snake_case to camelCase property mapping within this file is extremely prone to human error and typing mismatches.
*   **Redundant Type Casts:** The route definitions (`auth.routes.ts`) repeatedly use `(req as any, res)` to bypass strict typing for the custom `AuthRequest`, defeating TypeScript's safety mechanisms.

## Improvement Steps
1.  **Refactor OTP Service to Drizzle ORM:** Rewrite all raw SQL queries (`db.execute(...)`) in `server/services/otp.service.ts` to utilize native Drizzle ORM query builders (e.g., `db.insert(otpCodes).values(...)`, `db.select().from(otpCodes).where(...)`).
2.  **Fix the Update Phone Bug:** Review the `updatePhone` function inside `auth.controller.ts` and `auth.service.ts`. Ensure the validated new phone number is explicitly passed to `storage.updateUser`. Write a unit test simulating a phone number update.
3.  **Fix TypeScript Route Signatures:** Update the type definitions in `server/middleware/auth.ts` to extend the global Express Request interface natively. Remove `(req as any, res)` casts in `auth.routes.ts` by ensuring `authController` methods accurately expect the extended `Request` type.
4.  **Extract User Storage Operations:** Decouple user-specific database operations from the massive `storage.ts` file into a dedicated `server/repositories/user.repository.ts` to improve maintainability.

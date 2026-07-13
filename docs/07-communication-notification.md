# Module 7: Communication & Notification Module

## Module Overview
This module is the central hub for all system communications, acting as a multi-channel bridge between customers, employees, and the system itself. It manages traditional internal support ticketing, automated system notifications (via SMS), and a bidirectional chatbot integration using the Bale API. 
The module also features an AI-assisted messaging layer designed to draft automatic responses or summarize long support conversations.

**Core Responsibilities:**
*   **Internal Ticketing:** Managing a traditional thread-based messaging system between roles.
*   **Bale Bot Integration:** Webhook-based integration allowing users to interact with the system via the Bale messenger application.
*   **SMS Notifications:** Dispatching OTPs and critical workflow state changes via external SMS providers (e.g., SMS.ir).
*   **AI Auto-Replies:** Generating suggested responses for support staff using LLMs.

## Technical Stack & Dependencies
*   **Controllers & Routes:** `server/controllers/messages.controller.ts`, `server/controllers/bale-chat.controller.ts`
*   **Services:** `server/services/messages.service.ts`, `server/services/bale-bot.ts`
*   **Database Schema:** `messages`, `bale_chat_sessions`, `notifications` (in `shared/schema.ts`)
*   **Frontend UI:** `client/src/pages/messages.tsx`, `client/src/pages/notifications.tsx`
*   **External Integrations:** Bale Messenger API, SMS Providers.

## Current Shortcomings (Technical Debt)
*   **Frontend Polling:** The `messages.tsx` client interface relies on HTTP polling (`setInterval` or frequent data refetching) to update the chat UI, which is inefficient and creates unnecessary server load compared to WebSockets.
*   **Stubbed Implementation:** Critical bidirectional features, such as `handleStaffReply` in the `bale-bot.ts` service, are currently stubs, preventing staff from responding to Bale messages directly from the admin dashboard.
*   **Isolated AI Logic:** The `createAIResponse` function within `messages.service.ts` makes direct LLM calls and fails to utilize the global `AIOrchestratorService`. This means the messaging AI lacks the robust fallback mechanisms (e.g., switching from Claude to GapGPT) implemented elsewhere in the system.
*   **Unimplemented Storage Methods:** The service layer references `storage.updateConversation`, but this method is missing or unimplemented in the actual storage interface.

## Improvement Steps
1.  **WebSocket Migration:** Refactor the messaging frontend and backend to use the existing `Socket.io` implementation for real-time, event-driven chat updates instead of HTTP polling.
2.  **Complete Bale Integration:** Implement the `handleStaffReply` logic to map an internal staff message back to the correct `bale_chat_session` and dispatch it via the Bale API.
3.  **Standardize AI Calls:** Refactor the messaging service to route all AI request generations through the `AIOrchestratorService`, ensuring stability through fallback redundancy.
4.  **Implement Storage Updates:** Implement the missing `updateConversation` logic in the database abstraction layer or migrate the related code directly to Drizzle ORM calls.

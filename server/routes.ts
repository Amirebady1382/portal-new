import type { Express } from "express";
import { createServer, type Server } from "http";
import adminManagementRoutes from "./routes/admin-management.routes";
import { adminRoutes } from "./routes/admin.routes";
import aiChatSessionsRoutes from "./routes/ai-chat-sessions.routes";
import aiChatRoutes from "./routes/ai-chat.routes";
import aiVariableDetectionAdvancedRoutes from "./routes/ai-variable-detection-advanced.routes";
import aiVariableDetectionRoutes from "./routes/ai-variable-detection.routes";
import { authRoutes } from "./routes/auth.routes";
import { baleChatRoutes } from "./routes/bale-chat.routes";
import { companiesRoutes } from "./routes/companies.routes";
import { contractVariablesRoutes } from "./routes/contract-variables.routes";
import { contractsRoutes } from "./routes/contracts.routes";
import { documentRequirementsRoutes } from "./routes/document-requirements.routes";
import { documentsRoutes } from "./routes/documents.routes";
import { healthRoutes } from "./routes/health.routes";
import investmentReportsRoutes from "./routes/investment-reports.routes";
import { messagesRoutes } from "./routes/messages.routes";
import { miscellaneousRoutes } from "./routes/miscellaneous.routes";
import { rasmioRoutes, companyRasmioRoutes } from "./routes/rasmio-integration.routes";
import { reportsRoutes } from "./routes/reports.routes";
import { servicesRoutes } from "./routes/services.routes";
import { settingsRoutes } from "./routes/settings.routes";
import verificationRoutes from "./routes/verification.routes";
import clientLogsRoutes from "./routes/client-logs.routes";

export async function registerRoutes(app: Express): Promise<Server> {
  const server = createServer(app);

  app.use("/api/logs/client", clientLogsRoutes);
  app.use("/api/admin-management", adminManagementRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/ai-chat-sessions", aiChatSessionsRoutes);
  app.use("/api/ai-chat", aiChatRoutes);
  app.use("/api/ai-variable-detection-advanced", aiVariableDetectionAdvancedRoutes);
  app.use("/api/ai-variable-detection", aiVariableDetectionRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/bale-chat", baleChatRoutes);
  app.use("/api/bale", baleChatRoutes); // Add alias for /api/bale/webhook
  app.use("/api/companies", companiesRoutes);
  app.use("/api/companies", companyRasmioRoutes); // Additional routes for companies
  app.use("/api/contract-variables", contractVariablesRoutes);
  app.use("/api/contracts", contractsRoutes);
  app.use("/api/document-requirements", documentRequirementsRoutes);
  app.use("/api/documents", documentsRoutes);
  app.use("/api/health", healthRoutes);
  app.use("/api/investment-reports", investmentReportsRoutes);
  app.use("/api/messages", messagesRoutes);
  app.use("/api/miscellaneous", miscellaneousRoutes);
  app.use("/api/rasmio", rasmioRoutes);
  app.use("/api/reports", reportsRoutes);
  app.use("/api/services", servicesRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/verify", verificationRoutes);

  return server;
}

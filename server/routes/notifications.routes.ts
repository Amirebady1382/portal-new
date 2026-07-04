import { Router } from "express";
import { authMiddleware } from "../middleware/auth";

export const notificationsRoutes = Router();

notificationsRoutes.use(authMiddleware);

notificationsRoutes.get("/", (req, res) => {
  res.json([]);
});

notificationsRoutes.put("/read/:id", (req, res) => {
  res.json({ success: true });
});

notificationsRoutes.put("/read-all", (req, res) => {
  res.json({ success: true });
});

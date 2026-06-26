import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requirePermission } from "../../lib/authMiddleware";
import { dashboardService as svc } from "./service";

const canView = requirePermission("dashboard.view");

export const dashboardRouter = Router();

dashboardRouter.get("/dashboard/stats", canView, asyncHandler(async (_req, res) => {
  res.json(await svc.getDashboardStats());
}));

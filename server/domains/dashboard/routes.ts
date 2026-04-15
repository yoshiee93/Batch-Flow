import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { dashboardService as svc } from "./service";

export const dashboardRouter = Router();

dashboardRouter.get("/dashboard/stats", asyncHandler(async (_req, res) => {
  res.json(await svc.getDashboardStats());
}));

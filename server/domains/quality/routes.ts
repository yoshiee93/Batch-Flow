import { Router } from "express";
import { insertQualityCheckSchema } from "@shared/schema";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../lib/authMiddleware";
import { qualityService as svc } from "./service";

const productionOrAdmin = requireRole("production", "admin");

export const qualityRouter = Router();

qualityRouter.get("/batches/:id/quality-checks", asyncHandler(async (req, res) => {
  res.json(await svc.getQualityChecks(req.params.id));
}));

qualityRouter.post("/batches/:id/quality-checks", productionOrAdmin, asyncHandler(async (req, res) => {
  const userId = req.session.userId ?? null;
  const data = insertQualityCheckSchema.parse({
    ...req.body,
    batchId: req.params.id,
    checkedBy: userId,
  });
  res.status(201).json(await svc.createQualityCheck(data));
}));

import { Router } from "express";
import { insertQualityCheckSchema } from "@shared/schema";
import { asyncHandler } from "../../lib/asyncHandler";
import { qualityService as svc } from "./service";

export const qualityRouter = Router();

qualityRouter.get("/batches/:id/quality-checks", asyncHandler(async (req, res) => {
  res.json(await svc.getQualityChecks(req.params.id));
}));

qualityRouter.post("/batches/:id/quality-checks", asyncHandler(async (req, res) => {
  const data = insertQualityCheckSchema.parse({ ...req.body, batchId: req.params.id });
  res.status(201).json(await svc.createQualityCheck(data));
}));

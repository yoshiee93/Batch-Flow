import { Router } from "express";
import { insertQualityCheckSchema } from "@shared/schema";
import { asyncHandler } from "../../lib/asyncHandler";
import { qualityRepository as repo } from "./repository";

export const qualityRouter = Router();

qualityRouter.get("/batches/:id/quality-checks", asyncHandler(async (req, res) => {
  res.json(await repo.getQualityChecks(req.params.id));
}));

qualityRouter.post("/batches/:id/quality-checks", asyncHandler(async (req, res) => {
  const data = insertQualityCheckSchema.parse({ ...req.body, batchId: req.params.id });
  res.status(201).json(await repo.createQualityCheck(data));
}));

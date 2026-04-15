import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { traceabilityService as svc } from "./service";

export const traceabilityRouter = Router();

traceabilityRouter.get("/traceability/forward/:lotId", asyncHandler(async (req, res) => {
  const trace = await svc.getTraceabilityForward(req.params.lotId);
  if (!trace) return res.status(404).json({ error: "Lot not found" });
  res.json(trace);
}));

traceabilityRouter.get("/traceability/backward/:batchId", asyncHandler(async (req, res) => {
  const trace = await svc.getTraceabilityBackward(req.params.batchId);
  if (!trace) return res.status(404).json({ error: "Batch not found" });
  res.json(trace);
}));

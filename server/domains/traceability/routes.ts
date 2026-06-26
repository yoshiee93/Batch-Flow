import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requirePermission } from "../../lib/authMiddleware";
import { traceabilityService as svc } from "./service";

const canView = requirePermission("traceability.view");

export const traceabilityRouter = Router();

traceabilityRouter.get("/traceability/forward/:lotId", canView, asyncHandler(async (req, res) => {
  const trace = await svc.getTraceabilityForward(req.params.lotId);
  if (!trace) return res.status(404).json({ error: "Lot not found" });
  res.json(trace);
}));

traceabilityRouter.get("/traceability/backward/:batchId", canView, asyncHandler(async (req, res) => {
  const trace = await svc.getTraceabilityBackward(req.params.batchId);
  if (!trace) return res.status(404).json({ error: "Batch not found" });
  res.json(trace);
}));

traceabilityRouter.get("/orders/:orderId/traceability", canView, asyncHandler(async (req, res) => {
  const trace = await svc.getOrderProvenance(req.params.orderId);
  if (!trace) return res.status(404).json({ error: "Order not found" });
  res.json(trace);
}));

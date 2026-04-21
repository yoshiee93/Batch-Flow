import { Router } from "express";
import {
  insertBatchSchema, insertBatchMaterialSchema,
} from "@shared/schema";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../lib/authMiddleware";
import { productionService as svc } from "./service";

const productionOrAdmin = requireRole("production", "admin");

export const productionRouter = Router();

productionRouter.get("/batches", asyncHandler(async (_req, res) => {
  res.json(await svc.getBatches());
}));

productionRouter.get("/batches/:id/materials", asyncHandler(async (req, res) => {
  res.json(await svc.getBatchMaterials(req.params.id));
}));

productionRouter.get("/batches/:id/outputs", asyncHandler(async (req, res) => {
  res.json(await svc.getBatchOutputs(req.params.id));
}));

productionRouter.get("/batches/:id/input-lots", asyncHandler(async (req, res) => {
  res.json(await svc.getBatchInputLots(req.params.id));
}));

productionRouter.get("/batches/:id/output-lots", asyncHandler(async (req, res) => {
  res.json(await svc.getBatchOutputLots(req.params.id));
}));

productionRouter.get("/batches/barcode/:value", asyncHandler(async (req, res) => {
  const batch = await svc.getBatchByBarcode(req.params.value);
  if (!batch) return res.status(404).json({ error: "Batch not found for barcode" });
  res.json(batch);
}));

productionRouter.get("/batches/:id", asyncHandler(async (req, res) => {
  const batch = await svc.getBatch(req.params.id);
  if (!batch) return res.status(404).json({ error: "Batch not found" });
  res.json(batch);
}));

productionRouter.patch("/batches/:id/barcode-printed", productionOrAdmin, asyncHandler(async (req, res) => {
  const batch = await svc.updateBatchBarcodePrinted(req.params.id);
  if (!batch) return res.status(404).json({ error: "Batch not found" });
  res.json(batch);
}));

productionRouter.post("/batches", productionOrAdmin, asyncHandler(async (req, res) => {
  const data = insertBatchSchema.parse(req.body);
  res.status(201).json(await svc.createBatch(data));
}));

productionRouter.patch("/batches/:id", productionOrAdmin, asyncHandler(async (req, res) => {
  const data = insertBatchSchema.partial().parse(req.body);
  const batch = await svc.updateBatch(req.params.id, data);
  if (!batch) return res.status(404).json({ error: "Batch not found" });
  res.json(batch);
}));

productionRouter.delete("/batches/:id", productionOrAdmin, asyncHandler(async (req, res) => {
  await svc.deleteBatch(req.params.id);
  res.status(204).send();
}));

productionRouter.post("/batches/:id/materials", productionOrAdmin, asyncHandler(async (req, res) => {
  const data = insertBatchMaterialSchema.parse({ ...req.body, batchId: req.params.id });
  res.status(201).json(await svc.addBatchMaterial(data));
}));

productionRouter.delete("/batch-materials/:id", productionOrAdmin, asyncHandler(async (req, res) => {
  await svc.removeBatchMaterial(req.params.id);
  res.status(204).send();
}));

productionRouter.patch("/batch-materials/:id", productionOrAdmin, asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  if (!quantity) return res.status(400).json({ error: "quantity is required" });
  const qty = parseFloat(quantity);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: "quantity must be a positive number" });
  }
  res.json(await svc.updateBatchMaterial(req.params.id, quantity));
}));

productionRouter.post("/batches/:id/input", productionOrAdmin, asyncHandler(async (req, res) => {
  const { materialId, productId, quantity, sourceLotId, lotId } = req.body;

  if (!quantity) return res.status(400).json({ error: "quantity is required" });
  if (!materialId && !productId) {
    return res.status(400).json({ error: "Either materialId or productId is required" });
  }
  if (materialId && productId) {
    return res.status(400).json({ error: "Provide either materialId or productId, not both" });
  }

  if (materialId && !lotId) {
    return res.status(400).json({ error: "lotId is required for material inputs (lot-based compliance)" });
  }

  if (lotId) {
    const lot = await svc.getLot(lotId);
    if (!lot) return res.status(404).json({ error: "Lot not found" });
    if (lot.status !== "active") {
      return res.status(400).json({ error: `Lot is not available for production (status: ${lot.status})` });
    }
    const existingMaterials = await svc.getBatchMaterials(req.params.id);
    const alreadyAdded = existingMaterials.some(m => m.lotId === lotId);
    if (alreadyAdded) {
      return res.status(409).json({
        error: `Lot has already been added to this batch. Remove it first if you need to change the quantity.`,
      });
    }
  }

  let batchMaterial;
  if (materialId) {
    batchMaterial = await svc.recordBatchInput(req.params.id, materialId, quantity, lotId);
  } else {
    batchMaterial = await svc.recordBatchProductInput(req.params.id, productId, quantity, sourceLotId);
  }
  res.status(201).json(batchMaterial);
}));

productionRouter.post("/batches/:id/output", productionOrAdmin, asyncHandler(async (req, res) => {
  const { actualQuantity, wasteQuantity, millingQuantity, markCompleted } = req.body;
  res.json(await svc.recordBatchOutput(
    req.params.id,
    actualQuantity || "0",
    wasteQuantity || "0",
    millingQuantity || "0",
    markCompleted || false
  ));
}));

productionRouter.post("/batches/:id/outputs", productionOrAdmin, asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;
  if (!productId || !quantity) {
    return res.status(400).json({ error: "productId and quantity are required" });
  }
  const qty = parseFloat(quantity);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: "quantity must be a positive number" });
  }
  res.status(201).json(await svc.addBatchOutput(req.params.id, productId, quantity));
}));

productionRouter.delete("/batch-outputs/:id", productionOrAdmin, asyncHandler(async (req, res) => {
  await svc.removeBatchOutput(req.params.id);
  res.status(204).send();
}));

productionRouter.post("/batches/:id/finalize", productionOrAdmin, asyncHandler(async (req, res) => {
  const { wasteQuantity, millingQuantity, wetQuantity, markCompleted } = req.body;
  res.json(await svc.finalizeBatch(
    req.params.id,
    wasteQuantity || "0",
    millingQuantity || "0",
    wetQuantity || "0",
    markCompleted || false
  ));
}));

productionRouter.post("/batches/:id/lot-input", productionOrAdmin, asyncHandler(async (req, res) => {
  const { lotId, quantity } = req.body;
  if (!lotId || !quantity) {
    return res.status(400).json({ error: "lotId and quantity are required" });
  }
  const qty = parseFloat(quantity);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: "quantity must be a positive number" });
  }
  try {
    res.status(201).json(await svc.recordBatchLotInput(req.params.id, lotId, quantity));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record lot input";
    res.status(400).json({ error: message });
  }
}));

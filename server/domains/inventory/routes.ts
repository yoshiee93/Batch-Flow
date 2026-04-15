import { Router } from "express";
import { z } from "zod";
import { insertLotSchema, insertStockMovementSchema } from "@shared/schema";
import type { ReceiveStockInput } from "../../storage";
import { asyncHandler } from "../../lib/asyncHandler";
import { inventoryRepository as repo } from "./repository";

export const inventoryRouter = Router();

const receiveStockSchema = z.object({
  materialId: z.string().min(1),
  quantity: z.string().min(1),
  supplierName: z.string().optional(),
  sourceName: z.string().optional(),
  supplierLot: z.string().optional(),
  sourceType: z.enum(["supplier", "farmer", "internal_batch"]).optional(),
  receivedDate: z.union([z.string(), z.date()])
    .transform(v => typeof v === "string" ? new Date(v) : v)
    .optional(),
  expiryDate: z.union([z.string(), z.date()])
    .transform(v => typeof v === "string" ? new Date(v) : v)
    .optional(),
  notes: z.string().optional(),
});

inventoryRouter.get("/lots/barcode/:value", asyncHandler(async (req, res) => {
  const lot = await repo.getLotByBarcode(req.params.value);
  if (!lot) return res.status(404).json({ error: "Lot not found for barcode" });
  let materialName: string | undefined;
  let materialUnit: string | undefined;
  let productName: string | undefined;
  let productUnit: string | undefined;
  if (lot.materialId) {
    const material = await repo.getMaterial(lot.materialId);
    materialName = material?.name;
    materialUnit = material?.unit;
  }
  if (lot.productId) {
    const product = await repo.getProduct(lot.productId);
    productName = product?.name;
    productUnit = product?.unit;
  }
  res.json({ ...lot, materialName, materialUnit, productName, productUnit });
}));

inventoryRouter.get("/lots/:id/usage", asyncHandler(async (req, res) => {
  res.json(await repo.getLotUsage(req.params.id));
}));

inventoryRouter.get("/lots/:id/lineage", asyncHandler(async (req, res) => {
  const lineage = await repo.getLotLineage(req.params.id);
  if (!lineage) return res.status(404).json({ error: "Lot not found" });
  res.json(lineage);
}));

inventoryRouter.patch("/lots/:id/barcode-printed", asyncHandler(async (req, res) => {
  const lot = await repo.updateLotBarcodePrinted(req.params.id);
  if (!lot) return res.status(404).json({ error: "Lot not found" });
  res.json(lot);
}));

inventoryRouter.get("/lots/:id", asyncHandler(async (req, res) => {
  const lot = await repo.getLot(req.params.id);
  if (!lot) return res.status(404).json({ error: "Lot not found" });
  res.json(lot);
}));

inventoryRouter.get("/lots", asyncHandler(async (_req, res) => {
  res.json(await repo.getLots());
}));

inventoryRouter.post("/lots", asyncHandler(async (req, res) => {
  const data = insertLotSchema.parse(req.body);
  res.status(201).json(await repo.createLot(data));
}));

inventoryRouter.patch("/lots/:id", asyncHandler(async (req, res) => {
  const data = insertLotSchema.partial().parse(req.body);
  const lot = await repo.updateLot(req.params.id, data);
  if (!lot) return res.status(404).json({ error: "Lot not found" });
  res.json(lot);
}));

inventoryRouter.delete("/lots/:id", asyncHandler(async (req, res) => {
  await repo.deleteLot(req.params.id);
  res.status(204).send();
}));

inventoryRouter.get("/materials/:id/lots", asyncHandler(async (req, res) => {
  res.json(await repo.getLotsByMaterial(req.params.id));
}));

inventoryRouter.get("/products/:id/lots", asyncHandler(async (req, res) => {
  res.json(await repo.getLotsByProduct(req.params.id));
}));

inventoryRouter.post("/receive-stock", asyncHandler(async (req, res) => {
  const data = receiveStockSchema.parse(req.body) as ReceiveStockInput;
  const qty = parseFloat(data.quantity);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: "quantity must be a positive number" });
  }
  res.status(201).json(await repo.receiveStock(data));
}));

inventoryRouter.get("/stock-movements", asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const batchId = req.query.batchId as string | undefined;
  res.json(await repo.getStockMovements(limit, batchId));
}));

inventoryRouter.post("/stock-movements", asyncHandler(async (req, res) => {
  const data = insertStockMovementSchema.parse(req.body);
  res.status(201).json(await repo.createStockMovement(data));
}));

inventoryRouter.get("/audit-logs", asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.query;
  res.json(await repo.getAuditLogs(entityType as string, entityId as string));
}));

import { Router } from "express";
import { z } from "zod";
import { insertLotSchema, insertStockMovementSchema } from "@shared/schema";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../lib/authMiddleware";
import { inventoryService as svc } from "./service";

const inventoryOrAdmin = requireRole("inventory", "admin");

export const inventoryRouter = Router();

const PHOTO_DATA_URL_RE = /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/;
const photoSchema = z.object({
  dataUrl: z.string()
    .min(1)
    .max(1_500_000, "Photo too large (max ~1MB each)")
    .regex(PHOTO_DATA_URL_RE, "Photo must be a base64 image data URL"),
  name: z.string().max(255).optional(),
  size: z.number().int().nonnegative().optional(),
});

const receiveStockSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  itemType: z.enum(["material", "product"]),
  quantity: z.string()
    .min(1, "Quantity is required")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, { message: "Quantity must be a positive number" }),
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
  productTemperature: z.union([z.string(), z.number()])
    .transform(v => typeof v === "number" ? String(v) : v)
    .refine(v => v === "" || !isNaN(parseFloat(v)), { message: "Temperature must be a number" })
    .optional(),
  visualInspection: z.enum(["pass", "fail", "conditional"]).optional(),
  receivedById: z.string().optional(),
  freight: z.string().optional(),
  photos: z.array(photoSchema)
    .max(8, "At most 8 photos")
    .refine(arr => arr.reduce((s, p) => s + p.dataUrl.length, 0) <= 7_500_000, {
      message: "Photos exceed 5MB total",
    })
    .optional(),
});

inventoryRouter.get("/receivable-items", asyncHandler(async (_req, res) => {
  res.json(await svc.getReceivableItems());
}));

inventoryRouter.get("/lots/barcode/:value", asyncHandler(async (req, res) => {
  const lot = await svc.getLotByBarcode(req.params.value);
  if (!lot) return res.status(404).json({ error: "Lot not found for barcode" });
  let materialName: string | undefined;
  let materialUnit: string | undefined;
  let productName: string | undefined;
  let productUnit: string | undefined;
  if (lot.materialId) {
    const material = await svc.getMaterial(lot.materialId);
    materialName = material?.name;
    materialUnit = material?.unit;
  }
  if (lot.productId) {
    const product = await svc.getProduct(lot.productId);
    productName = product?.name;
    productUnit = product?.unit;
  }
  res.json({ ...lot, materialName, materialUnit, productName, productUnit });
}));

inventoryRouter.get("/lots/:id/usage", asyncHandler(async (req, res) => {
  res.json(await svc.getLotUsage(req.params.id));
}));

inventoryRouter.get("/lots/:id/lineage", asyncHandler(async (req, res) => {
  const lineage = await svc.getLotLineage(req.params.id);
  if (!lineage) return res.status(404).json({ error: "Lot not found" });
  res.json(lineage);
}));

const recordTestingSchema = z.object({
  testingStatus: z.enum(["not_required", "pending", "passed", "failed"]),
  testingNotes: z.string().max(2000).optional().nullable(),
  testingCertificate: z.string().max(500).optional().nullable(),
});

inventoryRouter.patch("/lots/:id/testing", requireRole("admin"), asyncHandler(async (req, res) => {
  const data = recordTestingSchema.parse(req.body);
  const lot = await svc.recordLotTesting(req.params.id, data);
  if (!lot) return res.status(404).json({ error: "Lot not found" });
  res.json(lot);
}));

inventoryRouter.patch("/lots/:id/barcode-printed", inventoryOrAdmin, asyncHandler(async (req, res) => {
  const lot = await svc.updateLotBarcodePrinted(req.params.id);
  if (!lot) return res.status(404).json({ error: "Lot not found" });
  res.json(lot);
}));

inventoryRouter.get("/lots/:id", asyncHandler(async (req, res) => {
  const lot = await svc.getLot(req.params.id);
  if (!lot) return res.status(404).json({ error: "Lot not found" });
  res.json(lot);
}));

inventoryRouter.get("/lots", asyncHandler(async (_req, res) => {
  res.json(await svc.getLots());
}));

inventoryRouter.post("/lots", inventoryOrAdmin, asyncHandler(async (req, res) => {
  const data = insertLotSchema.parse(req.body);
  res.status(201).json(await svc.createLot(data));
}));

inventoryRouter.patch("/lots/:id", inventoryOrAdmin, asyncHandler(async (req, res) => {
  const data = insertLotSchema
    .omit({ testingStatus: true, testingNotes: true, testingCertificate: true, testedAt: true, testedById: true })
    .partial()
    .parse(req.body);
  const lot = await svc.updateLot(req.params.id, data);
  if (!lot) return res.status(404).json({ error: "Lot not found" });
  res.json(lot);
}));

inventoryRouter.delete("/lots/:id", inventoryOrAdmin, asyncHandler(async (req, res) => {
  await svc.deleteLot(req.params.id);
  res.status(204).send();
}));

inventoryRouter.get("/materials/:id/lots", asyncHandler(async (req, res) => {
  res.json(await svc.getLotsByMaterial(req.params.id));
}));

inventoryRouter.get("/products/:id/lots", asyncHandler(async (req, res) => {
  res.json(await svc.getLotsByProduct(req.params.id));
}));

inventoryRouter.post("/receive-stock", inventoryOrAdmin, asyncHandler(async (req, res) => {
  const data = receiveStockSchema.parse(req.body);
  res.status(201).json(await svc.receiveStock(data));
}));

inventoryRouter.get("/stock-movements", asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const batchId = req.query.batchId as string | undefined;
  res.json(await svc.getStockMovements(limit, batchId));
}));

inventoryRouter.post("/stock-movements", inventoryOrAdmin, asyncHandler(async (req, res) => {
  const data = insertStockMovementSchema.parse(req.body);
  res.status(201).json(await svc.createStockMovement(data));
}));

import { eq, and, desc, isNotNull } from "drizzle-orm";
import { db } from "../../db";
import {
  batches, batchMaterials, batchOutputs, lots, products, materials,
  type Batch, type InsertBatch,
  type BatchMaterial, type InsertBatchMaterial,
  type BatchOutput, type InsertBatchOutput,
  type Lot, type InsertLot,
} from "@shared/schema";

export const productionRepository = {
  async getBatches(): Promise<Batch[]> {
    return db.select().from(batches).orderBy(desc(batches.createdAt));
  },

  async getBatch(id: string): Promise<Batch | undefined> {
    const [row] = await db.select().from(batches).where(eq(batches.id, id));
    return row;
  },

  async getBatchByBarcode(barcodeValue: string): Promise<Batch | undefined> {
    const [row] = await db.select().from(batches).where(eq(batches.barcodeValue, barcodeValue));
    return row;
  },

  async updateBatchBarcodePrinted(id: string): Promise<Batch | undefined> {
    const [updated] = await db.update(batches).set({ barcodePrintedAt: new Date() }).where(eq(batches.id, id)).returning();
    return updated;
  },

  async createBatchRaw(data: InsertBatch): Promise<Batch> {
    const [created] = await db.insert(batches).values(data).returning();
    return created;
  },

  async updateBatchRaw(id: string, data: Partial<InsertBatch>): Promise<Batch | undefined> {
    const [updated] = await db.update(batches).set(data).where(eq(batches.id, id)).returning();
    return updated;
  },

  async getBatchMaterials(batchId: string): Promise<BatchMaterial[]> {
    return db.select().from(batchMaterials).where(eq(batchMaterials.batchId, batchId));
  },

  async getBatchMaterialById(id: string): Promise<BatchMaterial | undefined> {
    const [row] = await db.select().from(batchMaterials).where(eq(batchMaterials.id, id));
    return row;
  },

  async insertBatchMaterial(data: InsertBatchMaterial): Promise<BatchMaterial> {
    const [created] = await db.insert(batchMaterials).values(data).returning();
    return created;
  },

  async updateBatchMaterialQty(id: string, quantity: string): Promise<BatchMaterial> {
    const [updated] = await db.update(batchMaterials).set({ quantity }).where(eq(batchMaterials.id, id)).returning();
    return updated;
  },

  async deleteBatchMaterialById(id: string): Promise<void> {
    await db.delete(batchMaterials).where(eq(batchMaterials.id, id));
  },

  async getBatchOutputs(batchId: string): Promise<BatchOutput[]> {
    return db.select().from(batchOutputs).where(eq(batchOutputs.batchId, batchId));
  },

  async getBatchOutputById(id: string): Promise<BatchOutput | undefined> {
    const [row] = await db.select().from(batchOutputs).where(eq(batchOutputs.id, id));
    return row;
  },

  async insertBatchOutput(data: InsertBatchOutput): Promise<BatchOutput> {
    const [created] = await db.insert(batchOutputs).values(data).returning();
    return created;
  },

  async deleteBatchOutputById(id: string): Promise<void> {
    await db.delete(batchOutputs).where(eq(batchOutputs.id, id));
  },

  async getProductById(productId: string) {
    const [row] = await db.select().from(products).where(eq(products.id, productId));
    return row;
  },

  async getMaterialById(materialId: string) {
    const [row] = await db.select().from(materials).where(eq(materials.id, materialId));
    return row;
  },

  async getLotById(lotId: string) {
    const [row] = await db.select().from(lots).where(eq(lots.id, lotId));
    return row;
  },

  async updateProductStock(productId: string, newStock: string): Promise<void> {
    await db.update(products).set({ currentStock: newStock }).where(eq(products.id, productId));
  },

  async updateMaterialStock(materialId: string, newStock: string): Promise<void> {
    await db.update(materials).set({ currentStock: newStock }).where(eq(materials.id, materialId));
  },

  async updateLotRemainingAndStatus(lotId: string, remainingQuantity: string, status: "active" | "quarantined" | "released" | "consumed" | "expired"): Promise<void> {
    await db.update(lots).set({ remainingQuantity, status }).where(eq(lots.id, lotId));
  },

  async updateLotRemaining(lotId: string, remainingQuantity: string): Promise<void> {
    await db.update(lots).set({ remainingQuantity }).where(eq(lots.id, lotId));
  },

  async getLotsForBatch(batchId: string) {
    return db.select().from(lots).where(eq(lots.sourceBatchId, batchId));
  },

  async getLotsForBatchAndProduct(batchId: string, productId: string) {
    return db.select().from(lots)
      .where(and(eq(lots.sourceBatchId, batchId), eq(lots.productId, productId)));
  },

  async insertLot(data: InsertLot): Promise<Lot> {
    const [created] = await db.insert(lots).values(data).returning();
    return created;
  },

  async updateLotFields(lotId: string, data: Partial<InsertLot>): Promise<void> {
    await db.update(lots).set(data).where(eq(lots.id, lotId));
  },

  async getBatchMaterialsByBatch(batchId: string): Promise<BatchMaterial[]> {
    return db.select().from(batchMaterials).where(eq(batchMaterials.batchId, batchId));
  },
};

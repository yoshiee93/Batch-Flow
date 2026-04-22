import { eq, and, desc, or, isNotNull } from "drizzle-orm";
import { db } from "../../db";
import {
  lots, stockMovements, auditLogs, materials, products, batchMaterials, batches,
  type Lot, type InsertLot,
  type StockMovement, type InsertStockMovement,
  type AuditLog,
} from "@shared/schema";

export type LotUsageEntry = {
  batchId: string;
  batchNumber: string;
  batchStatus: string;
  productId: string;
  productName: string;
  quantityConsumed: string;
  addedAt: Date | null;
};

export type BatchInputLotEntry = {
  batchMaterialId: string;
  lotId: string;
  lotNumber: string;
  barcodeValue: string | null;
  lotType: string;
  status: string;
  materialId: string | null;
  materialName: string | null;
  productId: string | null;
  productName: string | null;
  supplierName: string | null;
  supplierLot: string | null;
  sourceType: string | null;
  receivedDate: Date | null;
  expiryDate: Date | null;
  quantityConsumed: string;
  remainingQuantity: string | null;
  addedAt: Date | null;
};

export type BatchOutputLotEntry = {
  lotId: string;
  lotNumber: string;
  barcodeValue: string | null;
  lotType: string;
  status: string;
  productId: string | null;
  productName: string | null;
  quantity: string;
  remainingQuantity: string | null;
  producedDate: Date | null;
  expiryDate: Date | null;
  barcodePrintedAt: Date | null;
};

export const inventoryRepository = {
  async getLots(): Promise<Lot[]> {
    return db.select().from(lots).orderBy(desc(lots.createdAt));
  },

  async getLot(id: string): Promise<Lot | undefined> {
    const [row] = await db.select().from(lots).where(eq(lots.id, id));
    return row;
  },

  async getLotsByMaterial(materialId: string): Promise<Lot[]> {
    return db.select().from(lots).where(eq(lots.materialId, materialId)).orderBy(desc(lots.createdAt));
  },

  async getLotsByProduct(productId: string): Promise<Lot[]> {
    return db.select().from(lots).where(eq(lots.productId, productId)).orderBy(desc(lots.createdAt));
  },

  async getLotByBarcode(query: string): Promise<Lot | undefined> {
    const [row] = await db.select().from(lots).where(
      or(eq(lots.barcodeValue, query), eq(lots.lotNumber, query), eq(lots.supplierLot, query))
    );
    return row;
  },

  async createLotRaw(data: InsertLot): Promise<Lot> {
    const [created] = await db.insert(lots).values(data).returning();
    return created;
  },

  async updateLotRaw(id: string, data: Partial<InsertLot>): Promise<Lot | undefined> {
    const [updated] = await db.update(lots).set(data).where(eq(lots.id, id)).returning();
    return updated;
  },

  async deleteLotRaw(id: string): Promise<void> {
    await db.delete(lots).where(eq(lots.id, id));
  },

  async updateMaterialStock(materialId: string, newStock: string): Promise<void> {
    await db.update(materials).set({ currentStock: newStock }).where(eq(materials.id, materialId));
  },

  async updateProductStock(productId: string, newStock: string): Promise<void> {
    await db.update(products).set({ currentStock: newStock }).where(eq(products.id, productId));
  },

  async getMaterialById(materialId: string) {
    const [row] = await db.select().from(materials).where(eq(materials.id, materialId));
    return row;
  },

  async getReceivableItems(): Promise<Array<{ id: string; name: string; sku: string; unit: string; itemType: "material" | "product" }>> {
    const mats = await db.select({ id: materials.id, name: materials.name, sku: materials.sku, unit: materials.unit })
      .from(materials)
      .where(and(eq(materials.isReceivable, true), eq(materials.active, true)));
    const prods = await db.select({ id: products.id, name: products.name, sku: products.sku, unit: products.unit })
      .from(products)
      .where(and(eq(products.isReceivable, true), eq(products.active, true)));
    return [
      ...mats.map(m => ({ ...m, itemType: "material" as const })),
      ...prods.map(p => ({ ...p, itemType: "product" as const })),
    ];
  },

  async getLotUsage(lotId: string): Promise<LotUsageEntry[]> {
    const directUsage = await db
      .select({ bm: batchMaterials, batch: batches, product: products })
      .from(batchMaterials)
      .innerJoin(batches, eq(batchMaterials.batchId, batches.id))
      .innerJoin(products, eq(batches.productId, products.id))
      .where(eq(batchMaterials.lotId, lotId));

    const sourceUsage = await db
      .select({ bm: batchMaterials, batch: batches, product: products })
      .from(batchMaterials)
      .innerJoin(batches, eq(batchMaterials.batchId, batches.id))
      .innerJoin(products, eq(batches.productId, products.id))
      .where(eq(batchMaterials.sourceLotId, lotId));

    const seen = new Set<string>();
    return [...directUsage, ...sourceUsage]
      .filter(r => { if (seen.has(r.bm.id)) return false; seen.add(r.bm.id); return true; })
      .map(r => ({
        batchId: r.batch.id,
        batchNumber: r.batch.batchNumber,
        batchStatus: r.batch.status,
        productId: r.product.id,
        productName: r.product.name,
        quantityConsumed: r.bm.quantity,
        addedAt: r.bm.addedAt,
      }));
  },

  async getBatchInputLots(batchId: string): Promise<BatchInputLotEntry[]> {
    const materialLotInputs = await db
      .select({ bm: batchMaterials, lot: lots, material: materials })
      .from(batchMaterials)
      .innerJoin(lots, eq(batchMaterials.lotId, lots.id))
      .leftJoin(materials, eq(lots.materialId, materials.id))
      .where(and(eq(batchMaterials.batchId, batchId), isNotNull(batchMaterials.lotId)));

    const productLotInputs = await db
      .select({ bm: batchMaterials, lot: lots, product: products })
      .from(batchMaterials)
      .innerJoin(lots, eq(batchMaterials.sourceLotId, lots.id))
      .leftJoin(products, eq(lots.productId, products.id))
      .where(and(eq(batchMaterials.batchId, batchId), isNotNull(batchMaterials.sourceLotId)));

    return [
      ...materialLotInputs.map(row => ({
        batchMaterialId: row.bm.id,
        lotId: row.lot.id,
        lotNumber: row.lot.lotNumber,
        barcodeValue: row.lot.barcodeValue,
        lotType: row.lot.lotType,
        status: row.lot.status,
        materialId: row.material?.id ?? null,
        materialName: row.material?.name ?? null,
        productId: null as string | null,
        productName: null as string | null,
        supplierName: row.lot.supplierName,
        supplierLot: row.lot.supplierLot,
        sourceType: row.lot.sourceType,
        receivedDate: row.lot.receivedDate,
        expiryDate: row.lot.expiryDate,
        quantityConsumed: row.bm.quantity,
        remainingQuantity: row.lot.remainingQuantity,
        addedAt: row.bm.addedAt,
      })),
      ...productLotInputs.map(row => ({
        batchMaterialId: row.bm.id,
        lotId: row.lot.id,
        lotNumber: row.lot.lotNumber,
        barcodeValue: row.lot.barcodeValue,
        lotType: row.lot.lotType,
        status: row.lot.status,
        materialId: null as string | null,
        materialName: null as string | null,
        productId: row.product?.id ?? null,
        productName: row.product?.name ?? null,
        supplierName: row.lot.supplierName,
        supplierLot: row.lot.supplierLot,
        sourceType: row.lot.sourceType,
        receivedDate: row.lot.receivedDate,
        expiryDate: row.lot.expiryDate,
        quantityConsumed: row.bm.quantity,
        remainingQuantity: row.lot.remainingQuantity,
        addedAt: row.bm.addedAt,
      })),
    ];
  },

  async getBatchOutputLots(batchId: string): Promise<BatchOutputLotEntry[]> {
    const outputLots = await db
      .select({ lot: lots, product: products })
      .from(lots)
      .leftJoin(products, eq(lots.productId, products.id))
      .where(and(eq(lots.sourceBatchId, batchId), eq(lots.lotType, "finished_good")));

    return outputLots.map(row => ({
      lotId: row.lot.id,
      lotNumber: row.lot.lotNumber,
      barcodeValue: row.lot.barcodeValue,
      lotType: row.lot.lotType,
      status: row.lot.status,
      productId: row.product?.id ?? null,
      productName: row.product?.name ?? null,
      quantity: row.lot.quantity,
      remainingQuantity: row.lot.remainingQuantity,
      producedDate: row.lot.producedDate,
      expiryDate: row.lot.expiryDate,
      barcodePrintedAt: row.lot.barcodePrintedAt,
    }));
  },

  async getStockMovements(limit = 100, batchId?: string): Promise<StockMovement[]> {
    if (batchId) {
      return db.select().from(stockMovements)
        .where(eq(stockMovements.batchId, batchId))
        .orderBy(desc(stockMovements.createdAt))
        .limit(limit);
    }
    return db.select().from(stockMovements).orderBy(desc(stockMovements.createdAt)).limit(limit);
  },

  async createStockMovement(data: InsertStockMovement): Promise<StockMovement> {
    const [created] = await db.insert(stockMovements).values(data).returning();
    return created;
  },

  async getProductById(productId: string) {
    const [row] = await db.select().from(products).where(eq(products.id, productId));
    return row;
  },

  async getAuditLogs(entityType?: string, entityId?: string): Promise<AuditLog[]> {
    if (entityType && entityId) {
      return db.select().from(auditLogs)
        .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)))
        .orderBy(desc(auditLogs.createdAt));
    } else if (entityType) {
      return db.select().from(auditLogs)
        .where(eq(auditLogs.entityType, entityType))
        .orderBy(desc(auditLogs.createdAt));
    }
    return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
  },
};

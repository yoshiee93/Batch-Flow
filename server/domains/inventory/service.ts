import { inventoryRepository as repo, type BatchInputLotEntry, type BatchOutputLotEntry } from "./repository";
import { createAuditLog } from "../../lib/auditLog";
import { generateLotNumber, generateBarcodeValue } from "../../lib/lotUtils";
import type { InsertLot, InsertStockMovement, Lot, StockMovement, Batch } from "@shared/schema";
import type { LotUsageEntry } from "./repository";

export type LotLineageNode = {
  lot: Lot;
  sourceBatch: Batch | null;
  sourceInputLots: (BatchInputLotEntry & { lineage: LotLineageNode | null })[];
  usedInBatches: LotUsageEntry[];
  outputLots: (BatchOutputLotEntry & { lineage: LotLineageNode | null })[];
} | null;

export type ReceiveStockInput = {
  itemId: string;
  itemType: "material" | "product";
  quantity: string;
  supplierName?: string;
  sourceName?: string;
  supplierLot?: string;
  sourceType?: "supplier" | "farmer" | "internal_batch";
  receivedDate?: Date;
  expiryDate?: Date;
  notes?: string;
};

export const inventoryService = {
  getLots: repo.getLots.bind(repo),
  getLot: repo.getLot.bind(repo),
  getLotsByMaterial: repo.getLotsByMaterial.bind(repo),
  getLotsByProduct: repo.getLotsByProduct.bind(repo),
  getLotByBarcode: repo.getLotByBarcode.bind(repo),
  getLotUsage: repo.getLotUsage.bind(repo),
  getBatchInputLots: repo.getBatchInputLots.bind(repo),
  getBatchOutputLots: repo.getBatchOutputLots.bind(repo),
  getStockMovements: repo.getStockMovements.bind(repo),
  createStockMovement: repo.createStockMovement.bind(repo),
  getAuditLogs: repo.getAuditLogs.bind(repo),
  getReceivableItems: repo.getReceivableItems.bind(repo),

  async createLot(data: InsertLot): Promise<Lot> {
    const created = await repo.createLotRaw(data);
    await createAuditLog({ entityType: "lot", entityId: created.id, action: "create", changes: JSON.stringify(data) });
    return created;
  },

  async updateLot(id: string, data: Partial<InsertLot>): Promise<Lot | undefined> {
    const updated = await repo.updateLotRaw(id, data);
    if (updated) {
      await createAuditLog({ entityType: "lot", entityId: id, action: "update", changes: JSON.stringify(data) });
    }
    return updated;
  },

  async deleteLot(id: string): Promise<void> {
    await repo.deleteLotRaw(id);
    await createAuditLog({ entityType: "lot", entityId: id, action: "delete", changes: JSON.stringify({ deleted: true }) });
  },

  async updateLotBarcodePrinted(lotId: string): Promise<Lot | undefined> {
    const updated = await repo.updateLotRaw(lotId, { barcodePrintedAt: new Date() });
    if (updated) {
      await createAuditLog({
        entityType: "lot",
        entityId: lotId,
        action: "barcode_printed",
        changes: JSON.stringify({ barcodePrintedAt: updated.barcodePrintedAt }),
      });
    }
    return updated;
  },

  async receiveStock(data: ReceiveStockInput): Promise<{ lot: Lot; movement: StockMovement }> {
    const { itemId, itemType, quantity, supplierName, sourceName, supplierLot, sourceType, receivedDate, expiryDate, notes } = data;
    const quantityNum = parseFloat(quantity);

    let lotType: "raw_material" | "finished_good";
    let lotPrefix: string;
    let materialId: string | null = null;
    let productId: string | null = null;
    let currentStock: string;

    if (itemType === "product") {
      const product = await repo.getProductById(itemId);
      if (!product) throw new Error("Product not found");
      if (!product.active) throw new Error("Product is not active");
      if (!product.isReceivable) throw new Error("Product is not marked as receivable");
      lotType = "finished_good";
      lotPrefix = "FG";
      productId = itemId;
      currentStock = product.currentStock;
    } else {
      const material = await repo.getMaterialById(itemId);
      if (!material) throw new Error("Material not found");
      if (!material.active) throw new Error("Material is not active");
      if (!material.isReceivable) throw new Error("Material is not marked as receivable");
      lotType = "raw_material";
      lotPrefix = "RM";
      materialId = itemId;
      currentStock = material.currentStock;
    }

    const lotNumber = await generateLotNumber(lotPrefix);
    const barcodeValue = await generateBarcodeValue();

    const lot = await repo.createLotRaw({
      lotNumber,
      lotType,
      status: "active",
      barcodeValue,
      materialId,
      productId,
      supplierName: supplierName || null,
      sourceName: sourceName || supplierName || null,
      supplierLot: supplierLot || null,
      sourceType: sourceType || null,
      originalQuantity: quantity,
      quantity,
      remainingQuantity: quantity,
      receivedDate: receivedDate || new Date(),
      expiryDate: expiryDate || null,
      notes: notes || null,
    });

    const newStock = (parseFloat(currentStock || "0") + quantityNum).toFixed(3);
    if (itemType === "product") {
      await repo.updateProductStock(itemId, newStock);
    } else {
      await repo.updateMaterialStock(itemId, newStock);
    }

    const movement = await repo.createStockMovement({
      movementType: "receipt",
      materialId,
      productId,
      lotId: lot.id,
      quantity,
      reference: `Goods received: ${lot.lotNumber}`,
    });

    await createAuditLog({
      entityType: "lot",
      entityId: lot.id,
      action: "received",
      changes: JSON.stringify({ lotNumber, barcodeValue, itemId, itemType, quantity, supplierName, supplierLot }),
    });

    return { lot, movement };
  },

  async getMaterial(materialId: string) {
    return repo.getMaterialById(materialId);
  },

  async getProduct(productId: string) {
    return repo.getProductById(productId);
  },

  async getLotLineage(lotId: string, depth = 0, maxDepth = 5, visited = new Set<string>()): Promise<LotLineageNode> {
    if (depth > maxDepth || visited.has(lotId)) return null;
    visited.add(lotId);

    const lot = await repo.getLot(lotId);
    if (!lot) return null;

    let sourceBatch: Batch | null = null;
    let sourceInputLots: (BatchInputLotEntry & { lineage: LotLineageNode })[] = [];
    if (lot.sourceBatchId) {
      const { productionRepository } = await import("../production/repository");
      sourceBatch = await productionRepository.getBatch(lot.sourceBatchId) ?? null;
      if (sourceBatch) {
        const rawInputLots = await repo.getBatchInputLots(lot.sourceBatchId);
        sourceInputLots = await Promise.all(
          rawInputLots.map(async (inputLot: BatchInputLotEntry) => {
            if (inputLot.lotId && !visited.has(inputLot.lotId)) {
              const upstreamLineage = await inventoryService.getLotLineage(inputLot.lotId, depth + 1, maxDepth, visited);
              return { ...inputLot, lineage: upstreamLineage };
            }
            return { ...inputLot, lineage: null };
          })
        );
      }
    }

    const usedInBatches: LotUsageEntry[] = await repo.getLotUsage(lotId);
    const outputLots: (BatchOutputLotEntry & { lineage: LotLineageNode })[] = [];
    for (const usage of usedInBatches) {
      const batchOutputLotsResult = await repo.getBatchOutputLots(usage.batchId);
      const enriched = await Promise.all(
        batchOutputLotsResult.map(async (outLot: BatchOutputLotEntry) => {
          if (outLot.lotId && !visited.has(outLot.lotId)) {
            const downstreamLineage = await inventoryService.getLotLineage(outLot.lotId, depth + 1, maxDepth, new Set(visited));
            return { ...outLot, lineage: downstreamLineage };
          }
          return { ...outLot, lineage: null };
        })
      );
      outputLots.push(...enriched);
    }

    return { lot, sourceBatch, sourceInputLots, usedInBatches, outputLots };
  },
};

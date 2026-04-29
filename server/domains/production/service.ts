import { db } from "../../db";
import { productionRepository as repo } from "./repository";
import { inventoryRepository, type BatchInputLotEntry, type BatchOutputLotEntry } from "../inventory/repository";
import { catalogRepository } from "../catalog/repository";
import { createAuditLog } from "../../lib/auditLog";
import { generateLotNumber, generateBarcodeValue } from "../../lib/lotUtils";
import { buildBatchCode } from "@shared/batchCodeConfig";
import {
  batchMaterials, batchOutputs, lots, stockMovements, qualityChecks, auditLogs,
  batches as batchesTable, products as productsTable, materials as materialsTable,
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import type {
  Batch, InsertBatch, BatchMaterial, InsertBatchMaterial, BatchOutput, InsertStockMovement,
} from "@shared/schema";

export interface FinalizeBatchResult {
  batch: Batch;
  outputLots: BatchOutputLotEntry[];
}

async function createStockMovement(data: InsertStockMovement) {
  return inventoryRepository.createStockMovement(data);
}

function twoYearsFrom(date: Date): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + 2);
  return d;
}

export const productionService = {
  getBatches: repo.getBatches.bind(repo),
  getBatch: repo.getBatch.bind(repo),
  getBatchByBarcode: repo.getBatchByBarcode.bind(repo),
  updateBatchBarcodePrinted: repo.updateBatchBarcodePrinted.bind(repo),
  getBatchMaterials: repo.getBatchMaterials.bind(repo),
  getBatchOutputs: repo.getBatchOutputs.bind(repo),

  getLot(lotId: string) {
    return repo.getLotById(lotId);
  },

  async addBatchMaterial(data: InsertBatchMaterial): Promise<BatchMaterial> {
    const created = await repo.insertBatchMaterial(data);
    await createAuditLog({ entityType: "batch_material", entityId: created.id, action: "create", changes: JSON.stringify(data) });
    return created;
  },

  async createBatch(data: InsertBatch): Promise<Batch> {
    let barcodeValue: string;
    let batchCode: string | null = null;

    const product = await catalogRepository.getProduct(data.productId);
    if (product?.fruitCode && product.categoryId) {
      const category = await catalogRepository.getCategory(product.categoryId);
      if (category?.processCode) {
        const batchDate: Date = data.startDate ?? new Date();
        try {
          batchCode = buildBatchCode(product.fruitCode, category.processCode, batchDate);
          barcodeValue = batchCode;
        } catch (err) {
          console.warn("[createBatch] SOP code generation skipped:", (err as Error).message);
          barcodeValue = await generateBarcodeValue();
        }
      } else {
        barcodeValue = await generateBarcodeValue();
      }
    } else {
      barcodeValue = await generateBarcodeValue();
    }

    const created = await repo.createBatchRaw({ ...data, barcodeValue, batchCode });
    await createAuditLog({ entityType: "batch", entityId: created.id, action: "create", changes: JSON.stringify({ ...data, barcodeValue, batchCode }) });
    return created;
  },

  async updateBatch(id: string, data: Partial<InsertBatch>): Promise<Batch | undefined> {
    const updated = await repo.updateBatchRaw(id, data);
    if (updated) {
      await createAuditLog({ entityType: "batch", entityId: id, action: "update", changes: JSON.stringify(data) });
    }
    return updated;
  },

  async deleteBatch(id: string): Promise<void> {
    // Direct db.transaction used here: multi-table cascade + stock reversal must be atomic.
    // Drizzle transactions require the tx context to be threaded through all statements,
    // so repository methods (which use the module-level db) cannot participate in this tx.
    await db.transaction(async (tx) => {
      const outputs = await tx.select().from(batchOutputs).where(eq(batchOutputs.batchId, id));
      for (const output of outputs) {
        const [product] = await tx.select().from(productsTable).where(eq(productsTable.id, output.productId));
        if (product) {
          const newStock = Math.max(0, parseFloat(product.currentStock || "0") - parseFloat(output.quantity)).toFixed(2);
          await tx.update(productsTable).set({ currentStock: newStock }).where(eq(productsTable.id, output.productId));
        }
      }
      const inputMaterials = await tx.select().from(batchMaterials).where(eq(batchMaterials.batchId, id));
      for (const bm of inputMaterials) {
        if (!bm.materialId) continue;
        const [material] = await tx.select().from(materialsTable).where(eq(materialsTable.id, bm.materialId));
        if (material) {
          const restoredStock = (parseFloat(material.currentStock || "0") + parseFloat(bm.quantity)).toFixed(2);
          await tx.update(materialsTable).set({ currentStock: restoredStock }).where(eq(materialsTable.id, bm.materialId));
        }
      }
      await tx.delete(stockMovements).where(eq(stockMovements.batchId, id));
      await tx.delete(lots).where(eq(lots.sourceBatchId, id));
      await tx.delete(batchMaterials).where(eq(batchMaterials.batchId, id));
      await tx.delete(batchOutputs).where(eq(batchOutputs.batchId, id));
      await tx.delete(qualityChecks).where(eq(qualityChecks.batchId, id));
      await tx.delete(batchesTable).where(eq(batchesTable.id, id));
      await tx.insert(auditLogs).values({
        entityType: "batch",
        entityId: id,
        action: "delete",
        changes: JSON.stringify({ deleted: true, outputsReversed: outputs.length, materialsRestored: inputMaterials.length }),
      });
    });
    const { customersService } = await import("../customers/service");
    await customersService.runStockAllocation();
  },

  async recordBatchLotInput(batchId: string, lotId: string, quantity: string): Promise<BatchMaterial> {
    const quantityNum = parseFloat(quantity);
    const lot = await repo.getLotById(lotId);
    if (!lot) throw new Error("Lot not found");
    if (lot.status === "consumed") throw new Error("Lot has been fully consumed");
    if (lot.status === "quarantined") throw new Error("Lot is quarantined and cannot be used");
    if (lot.status === "expired") throw new Error("Lot has expired");

    const remaining = parseFloat(lot.remainingQuantity || "0");
    if (quantityNum > remaining) throw new Error(`Insufficient lot quantity. Available: ${remaining}`);

    const newRemaining = (remaining - quantityNum).toFixed(3);
    const newStatus = parseFloat(newRemaining) === 0 ? "consumed" : lot.status;
    await repo.updateLotRemainingAndStatus(lotId, newRemaining, newStatus);

    if (lot.materialId) {
      const material = await repo.getMaterialById(lot.materialId);
      if (material) {
        const newStock = Math.max(0, parseFloat(material.currentStock || "0") - quantityNum).toFixed(3);
        await repo.updateMaterialStock(lot.materialId, newStock);
      }
    } else if (lot.productId) {
      const product = await repo.getProductById(lot.productId);
      if (product) {
        const newStock = Math.max(0, parseFloat(product.currentStock || "0") - quantityNum).toFixed(3);
        await repo.updateProductStock(lot.productId, newStock);
      }
    }

    const batchMaterial = await repo.insertBatchMaterial({
      batchId,
      materialId: lot.materialId || null,
      productId: lot.productId || null,
      lotId,
      quantity,
    });

    await createStockMovement({
      movementType: "production_input",
      materialId: lot.materialId || null,
      productId: lot.productId || null,
      lotId,
      batchId,
      quantity: `-${quantity}`,
      reference: `Lot consumed: ${lot.lotNumber}`,
    });

    await createAuditLog({
      entityType: "batch",
      entityId: batchId,
      action: "lot_input_recorded",
      changes: JSON.stringify({ lotId, lotNumber: lot.lotNumber, quantity }),
    });

    return batchMaterial;
  },

  async recordBatchInput(batchId: string, materialId: string, quantity: string, lotId?: string | null): Promise<BatchMaterial> {
    if (lotId) return productionService.recordBatchLotInput(batchId, lotId, quantity);

    const quantityNum = parseFloat(quantity);
    const material = await repo.getMaterialById(materialId);
    if (!material) throw new Error("Material not found");

    const currentStock = parseFloat(material.currentStock || "0");
    if (quantityNum > currentStock) throw new Error(`Insufficient stock. Available: ${currentStock} ${material.unit || "KG"}`);

    const newStock = (currentStock - quantityNum).toFixed(2);
    await repo.updateMaterialStock(materialId, newStock);

    const batchMaterial = await repo.insertBatchMaterial({ batchId, materialId, lotId: null, quantity });

    await createStockMovement({ movementType: "production_input", materialId, lotId: null, batchId, quantity: `-${quantity}`, reference: "Production input (no lot)" });
    await createAuditLog({ entityType: "batch", entityId: batchId, action: "input_recorded", changes: JSON.stringify({ materialId, quantity }) });

    return batchMaterial;
  },

  async recordBatchProductInput(batchId: string, productId: string, quantity: string, sourceLotId?: string): Promise<BatchMaterial> {
    const quantityNum = parseFloat(quantity);
    const product = await repo.getProductById(productId);
    if (!product) throw new Error("Product not found");

    const currentStock = parseFloat(product.currentStock || "0");
    if (quantityNum > currentStock) throw new Error(`Insufficient stock. Available: ${currentStock} ${product.unit}`);

    const newStock = (currentStock - quantityNum).toFixed(2);
    await repo.updateProductStock(productId, newStock);

    if (sourceLotId) {
      const lot = await repo.getLotById(sourceLotId);
      if (lot) {
        const newRemainingQty = Math.max(0, parseFloat(lot.remainingQuantity || "0") - quantityNum).toFixed(2);
        await repo.updateLotRemaining(sourceLotId, newRemainingQty);
      }
    }

    const batchMaterial = await repo.insertBatchMaterial({ batchId, materialId: null, productId, lotId: null, sourceLotId: sourceLotId || null, quantity });

    await createStockMovement({ movementType: "production_input", productId, lotId: sourceLotId || null, batchId, quantity: `-${quantity}`, reference: "Production input (product as ingredient)" });
    await createAuditLog({ entityType: "batch", entityId: batchId, action: "product_input_recorded", changes: JSON.stringify({ productId, quantity, sourceLotId }) });

    return batchMaterial;
  },

  async removeBatchMaterial(id: string): Promise<void> {
    const bm = await repo.getBatchMaterialById(id);
    if (!bm) return;

    if (bm.lotId) {
      const lot = await repo.getLotById(bm.lotId);
      if (lot) {
        const restoredQuantity = (parseFloat(lot.remainingQuantity || "0") + parseFloat(bm.quantity)).toFixed(2);
        await repo.updateLotRemaining(bm.lotId, restoredQuantity);
      }
    }
    if (bm.materialId) {
      const material = await repo.getMaterialById(bm.materialId);
      if (material) {
        const restoredStock = (parseFloat(material.currentStock || "0") + parseFloat(bm.quantity)).toFixed(2);
        await repo.updateMaterialStock(bm.materialId, restoredStock);
      }
    }

    await createStockMovement({ movementType: "adjustment", materialId: bm.materialId, lotId: bm.lotId, batchId: bm.batchId, quantity: bm.quantity, reference: "Batch input removed - reversal" });
    await repo.deleteBatchMaterialById(id);
    await createAuditLog({ entityType: "batch_material", entityId: id, action: "delete", changes: JSON.stringify({ deleted: true }) });
  },

  async updateBatchMaterial(id: string, newQuantity: string): Promise<BatchMaterial> {
    const newQty = parseFloat(newQuantity);
    if (isNaN(newQty) || newQty <= 0) throw new Error("Quantity must be a positive number");

    const bm = await repo.getBatchMaterialById(id);
    if (!bm) throw new Error("Batch material not found");

    const batch = await repo.getBatch(bm.batchId);
    if (batch && batch.status === "completed") throw new Error("Cannot edit inputs on a completed batch");

    const oldQty = parseFloat(bm.quantity);
    const delta = newQty - oldQty;
    if (delta === 0) return bm;

    if (bm.materialId) {
      const material = await repo.getMaterialById(bm.materialId);
      if (!material) throw new Error("Material not found");
      const materialStock = parseFloat(material.currentStock || "0");
      if (delta > 0 && delta > materialStock) throw new Error(`Insufficient stock. Available: ${materialStock} KG`);
      await repo.updateMaterialStock(bm.materialId, (materialStock - delta).toFixed(2));
    }
    if (bm.lotId) {
      const lot = await repo.getLotById(bm.lotId);
      if (lot) {
        const newLotRemaining = (parseFloat(lot.remainingQuantity || "0") - delta).toFixed(2);
        await repo.updateLotRemaining(bm.lotId, newLotRemaining);
      }
    }

    const updated = await repo.updateBatchMaterialQty(id, newQuantity);
    await createStockMovement({ movementType: "adjustment", materialId: bm.materialId, lotId: bm.lotId, batchId: bm.batchId, quantity: (-delta).toFixed(2), reference: `Batch input adjusted: ${oldQty} -> ${newQty} KG` });
    await createAuditLog({ entityType: "batch_material", entityId: id, action: "update", changes: JSON.stringify({ oldQuantity: oldQty, newQuantity: newQty, delta }) });

    return updated;
  },

  async addBatchOutput(batchId: string, productId: string, quantity: string): Promise<BatchOutput> {
    const quantityNum = parseFloat(quantity);
    const batch = await repo.getBatch(batchId);
    if (!batch) throw new Error("Batch not found");
    if (batch.status === "completed") throw new Error("Cannot add output to completed batch");

    const product = await repo.getProductById(productId);
    if (!product) throw new Error("Product not found");

    const output = await repo.insertBatchOutput({ batchId, productId, quantity });
    const newStock = (parseFloat(product.currentStock || "0") + quantityNum).toFixed(2);
    await repo.updateProductStock(productId, newStock);

    await createStockMovement({ movementType: "production_output", productId, batchId, quantity, reference: `Production output: ${product.name}` });
    await createAuditLog({ entityType: "batch", entityId: batchId, action: "output_added", changes: JSON.stringify({ productId, quantity }) });

    const { customersService } = await import("../customers/service");
    await customersService.runStockAllocation();

    return output;
  },

  async removeBatchOutput(id: string): Promise<void> {
    const output = await repo.getBatchOutputById(id);
    if (!output) return;

    const batch = await repo.getBatch(output.batchId);
    if (batch && batch.status === "completed") throw new Error("Cannot remove output from completed batch");

    const product = await repo.getProductById(output.productId);
    if (product) {
      const newStock = (parseFloat(product.currentStock || "0") - parseFloat(output.quantity)).toFixed(2);
      await repo.updateProductStock(output.productId, newStock);
    }

    await createStockMovement({ movementType: "adjustment", productId: output.productId, batchId: output.batchId, quantity: `-${output.quantity}`, reference: "Production output removed - reversal" });
    await repo.deleteBatchOutputById(id);
    await createAuditLog({ entityType: "batch", entityId: output.batchId, action: "output_removed", changes: JSON.stringify({ productId: output.productId, quantity: output.quantity }) });

    const { customersService } = await import("../customers/service");
    await customersService.runStockAllocation();
  },

  async finalizeBatch(batchId: string, wasteQuantity: string, millingQuantity: string, wetQuantity: string, markCompleted: boolean): Promise<FinalizeBatchResult> {
    const batch = await repo.getBatch(batchId);
    if (!batch) throw new Error("Batch not found");

    const outputs = await repo.getBatchOutputs(batchId);
    const totalOutput = outputs.reduce((sum, o) => sum + parseFloat(o.quantity), 0);

    const updateData: Partial<InsertBatch> = {
      actualQuantity: totalOutput.toFixed(3),
      wasteQuantity,
      millingQuantity,
      wetQuantity,
    };
    if (markCompleted) {
      updateData.status = "completed";
      updateData.endDate = new Date();
    }

    const updated = await repo.updateBatchRaw(batchId, updateData);
    if (!updated) throw new Error("Batch update failed");

    if (markCompleted) {
      const now = new Date();
      if (outputs.length > 0) {
        for (const output of outputs) {
          const existingLots = await repo.getLotsForBatchAndProduct(batchId, output.productId);
          if (existingLots.length === 0) {
            const lotNumber = await generateLotNumber("FG");
            const barcodeValue = await generateBarcodeValue();
            const finishedLot = await repo.insertLot({
              lotNumber,
              lotType: "finished_good",
              status: "active",
              barcodeValue,
              productId: output.productId,
              originalQuantity: output.quantity,
              quantity: output.quantity,
              remainingQuantity: output.quantity,
              producedDate: now,
              expiryDate: twoYearsFrom(now),
              sourceBatchId: batchId,
            });
            await createStockMovement({ movementType: "production_output", productId: output.productId, lotId: finishedLot.id, batchId, quantity: output.quantity, reference: `Finished lot assigned: ${finishedLot.lotNumber}` });
            await createAuditLog({ entityType: "lot", entityId: finishedLot.id, action: "finished_lot_created", changes: JSON.stringify({ lotNumber, barcodeValue, productId: output.productId, quantity: output.quantity, sourceBatchId: batchId }) });
          } else {
            const existingLot = existingLots[0];
            if (!existingLot.barcodeValue) {
              const barcodeValue = await generateBarcodeValue();
              await repo.updateLotFields(existingLot.id, { lotType: "finished_good", barcodeValue, producedDate: now });
            }
          }
        }
      } else {
        const qty = parseFloat(updated.actualQuantity || "0");
        if (qty > 0) {
          const existingLots = await repo.getLotsForBatch(batchId);
          if (existingLots.length === 0) {
            const lotNumber = await generateLotNumber("FG");
            const barcodeValue = await generateBarcodeValue();
            const finishedLot = await repo.insertLot({
              lotNumber,
              lotType: "finished_good",
              status: "active",
              barcodeValue,
              productId: batch.productId,
              originalQuantity: updated.actualQuantity!,
              quantity: updated.actualQuantity!,
              remainingQuantity: updated.actualQuantity!,
              producedDate: now,
              expiryDate: twoYearsFrom(now),
              sourceBatchId: batchId,
            });
            await createStockMovement({ movementType: "production_output", productId: batch.productId, lotId: finishedLot.id, batchId, quantity: updated.actualQuantity!, reference: `Finished lot assigned: ${finishedLot.lotNumber}` });
            await createAuditLog({ entityType: "lot", entityId: finishedLot.id, action: "finished_lot_created", changes: JSON.stringify({ lotNumber, barcodeValue, productId: batch.productId, quantity: updated.actualQuantity, sourceBatchId: batchId }) });
          }
        }
      }
    }

    await createAuditLog({ entityType: "batch", entityId: batchId, action: markCompleted ? "completed" : "updated", changes: JSON.stringify({ totalOutput, wasteQuantity, millingQuantity, wetQuantity, markCompleted }) });

    const outputLots = await inventoryRepository.getBatchOutputLots(batchId);
    return { batch: updated, outputLots };
  },

  async recordBatchOutput(batchId: string, actualQuantity: string, wasteQuantity: string, millingQuantity: string, markCompleted: boolean): Promise<Batch> {
    const batch = await repo.getBatch(batchId);
    if (!batch) throw new Error("Batch not found");

    const previousActual = parseFloat(batch.actualQuantity || "0");
    const newActual = parseFloat(actualQuantity) || 0;
    const delta = newActual - previousActual;

    const updateData: Partial<InsertBatch> = { actualQuantity, wasteQuantity, millingQuantity };
    if (markCompleted) {
      updateData.status = "completed";
      updateData.endDate = new Date();
    }

    const updated = await repo.updateBatchRaw(batchId, updateData);
    if (!updated) throw new Error("Batch update failed");

    if (delta !== 0) {
      const product = await repo.getProductById(batch.productId);
      if (product) {
        const newStock = (parseFloat(product.currentStock || "0") + delta).toFixed(2);
        await repo.updateProductStock(batch.productId, newStock);

        const existingLots = await repo.getLotsForBatch(batchId);
        const existingLot = existingLots[0];
        if (existingLot) {
          const newLotQty = (parseFloat(existingLot.quantity) + delta).toFixed(3);
          const newRemainingQty = (parseFloat(existingLot.remainingQuantity || "0") + delta).toFixed(3);
          await repo.updateLotFields(existingLot.id, { quantity: newLotQty, remainingQuantity: newRemainingQty });
        } else {
          const lotNumber = await generateLotNumber("FG");
          const barcodeValue = await generateBarcodeValue();
          const producedNow = new Date();
          await repo.insertLot({
            lotNumber,
            lotType: "finished_good",
            status: "active",
            barcodeValue,
            productId: batch.productId,
            originalQuantity: actualQuantity,
            quantity: actualQuantity,
            remainingQuantity: actualQuantity,
            producedDate: producedNow,
            expiryDate: twoYearsFrom(producedNow),
            sourceBatchId: batchId,
          });
        }
        await createStockMovement({ movementType: "production_output", productId: batch.productId, batchId, quantity: delta.toFixed(2), reference: delta > 0 ? "Production output - finished goods" : "Production output adjustment" });
      }
    }

    await createAuditLog({ entityType: "batch", entityId: batchId, action: "output_recorded", changes: JSON.stringify({ actualQuantity, wasteQuantity, millingQuantity, markCompleted, delta }) });

    if (delta !== 0) {
      const { customersService } = await import("../customers/service");
      await customersService.runStockAllocation();
    }

    return updated;
  },

  async getBatchInputLots(batchId: string): Promise<BatchInputLotEntry[]> {
    return inventoryRepository.getBatchInputLots(batchId);
  },

  async getBatchOutputLots(batchId: string): Promise<BatchOutputLotEntry[]> {
    return inventoryRepository.getBatchOutputLots(batchId);
  },

  async regenerateOutputLots(batchId: string): Promise<BatchOutputLotEntry[]> {
    const batch = await repo.getBatch(batchId);
    if (!batch) throw new Error("Batch not found");
    if (batch.status !== "completed") throw new Error("Batch is not yet completed");

    const existingLots = await repo.getLotsForBatch(batchId);
    if (existingLots.length > 0) {
      return inventoryRepository.getBatchOutputLots(batchId);
    }

    const outputs = await repo.getBatchOutputs(batchId);
    const now = new Date();

    if (outputs.length > 0) {
      for (const output of outputs) {
        const existing = await repo.getLotsForBatchAndProduct(batchId, output.productId);
        if (existing.length === 0) {
          const lotNumber = await generateLotNumber("FG");
          const barcodeValue = await generateBarcodeValue();
          const finishedLot = await repo.insertLot({
            lotNumber, lotType: "finished_good", status: "active", barcodeValue,
            productId: output.productId, originalQuantity: output.quantity, quantity: output.quantity,
            remainingQuantity: output.quantity, producedDate: now, expiryDate: twoYearsFrom(now), sourceBatchId: batchId,
          });
          await createStockMovement({ movementType: "production_output", productId: output.productId, lotId: finishedLot.id, batchId, quantity: output.quantity, reference: `Finished lot assigned: ${finishedLot.lotNumber}` });
          await createAuditLog({ entityType: "lot", entityId: finishedLot.id, action: "finished_lot_created", changes: JSON.stringify({ lotNumber, barcodeValue, productId: output.productId, quantity: output.quantity, sourceBatchId: batchId, regenerated: true }) });
        }
      }
    } else {
      const qty = parseFloat(batch.actualQuantity || "0");
      if (qty > 0) {
        const lotNumber = await generateLotNumber("FG");
        const barcodeValue = await generateBarcodeValue();
        const finishedLot = await repo.insertLot({
          lotNumber, lotType: "finished_good", status: "active", barcodeValue,
          productId: batch.productId, originalQuantity: batch.actualQuantity!, quantity: batch.actualQuantity!,
          remainingQuantity: batch.actualQuantity!, producedDate: now, expiryDate: twoYearsFrom(now), sourceBatchId: batchId,
        });
        await createStockMovement({ movementType: "production_output", productId: batch.productId, lotId: finishedLot.id, batchId, quantity: batch.actualQuantity!, reference: `Finished lot assigned: ${finishedLot.lotNumber}` });
        await createAuditLog({ entityType: "lot", entityId: finishedLot.id, action: "finished_lot_created", changes: JSON.stringify({ lotNumber, barcodeValue, productId: batch.productId, quantity: batch.actualQuantity, sourceBatchId: batchId, regenerated: true }) });
      }
    }

    return inventoryRepository.getBatchOutputLots(batchId);
  },
};

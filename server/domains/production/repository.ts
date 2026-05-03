import { eq, and, desc, isNotNull } from "drizzle-orm";
import { db } from "../../db";
import {
  batches, batchMaterials, batchOutputs, lots, products, materials, stockMovements,
  qualityChecks, auditLogs, printHistory, users,
  type Batch, type InsertBatch,
  type BatchMaterial, type InsertBatchMaterial,
  type BatchOutput, type InsertBatchOutput,
  type Lot, type InsertLot,
} from "@shared/schema";

export type TimelineEventKind =
  | "created"
  | "started"
  | "input"
  | "qc"
  | "output"
  | "output_lot"
  | "status"
  | "print"
  | "finalize"
  | "completed"
  | "audit";

export interface TimelineEvent {
  at: string;
  kind: TimelineEventKind;
  title: string;
  detail?: string;
  userId?: string | null;
  userName?: string | null;
  link?: { href: string; label: string };
  meta?: Record<string, unknown>;
}

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

  async updateBatchOutputQty(id: string, quantity: string): Promise<BatchOutput> {
    const [updated] = await db.update(batchOutputs).set({ quantity }).where(eq(batchOutputs.id, id)).returning();
    return updated;
  },

  async deleteBatchOutputById(id: string): Promise<void> {
    await db.delete(batchOutputs).where(eq(batchOutputs.id, id));
  },

  async deleteLotById(id: string): Promise<void> {
    // Null out stock_movements.lotId references to avoid FK constraint violation
    await db.update(stockMovements).set({ lotId: null }).where(eq(stockMovements.lotId, id));
    await db.delete(lots).where(eq(lots.id, id));
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

  async getBatchTimeline(batchId: string): Promise<TimelineEvent[]> {
    const [batchRow] = await db.select().from(batches).where(eq(batches.id, batchId));
    if (!batchRow) return [];

    const [
      productRow,
      allInputs,
      materialInputs,
      productInputs,
      outputRows,
      qcRows,
      auditRows,
      printRows,
      outputLotRows,
    ] = await Promise.all([
      db.select().from(products).where(eq(products.id, batchRow.productId)).then(r => r[0]),
      db
        .select({ bm: batchMaterials, material: materials, product: products, user: users })
        .from(batchMaterials)
        .leftJoin(materials, eq(batchMaterials.materialId, materials.id))
        .leftJoin(products, eq(batchMaterials.productId, products.id))
        .leftJoin(users, eq(batchMaterials.addedBy, users.id))
        .where(eq(batchMaterials.batchId, batchId)),
      db
        .select({ bm: batchMaterials, lot: lots, material: materials, user: users })
        .from(batchMaterials)
        .innerJoin(lots, eq(batchMaterials.lotId, lots.id))
        .leftJoin(materials, eq(lots.materialId, materials.id))
        .leftJoin(users, eq(batchMaterials.addedBy, users.id))
        .where(and(eq(batchMaterials.batchId, batchId), isNotNull(batchMaterials.lotId))),
      db
        .select({ bm: batchMaterials, lot: lots, product: products, user: users })
        .from(batchMaterials)
        .innerJoin(lots, eq(batchMaterials.sourceLotId, lots.id))
        .leftJoin(products, eq(lots.productId, products.id))
        .leftJoin(users, eq(batchMaterials.addedBy, users.id))
        .where(and(eq(batchMaterials.batchId, batchId), isNotNull(batchMaterials.sourceLotId))),
      db
        .select({ bo: batchOutputs, product: products, user: users })
        .from(batchOutputs)
        .leftJoin(products, eq(batchOutputs.productId, products.id))
        .leftJoin(users, eq(batchOutputs.addedBy, users.id))
        .where(eq(batchOutputs.batchId, batchId)),
      db
        .select({ qc: qualityChecks, user: users })
        .from(qualityChecks)
        .leftJoin(users, eq(qualityChecks.checkedBy, users.id))
        .where(eq(qualityChecks.batchId, batchId)),
      db
        .select({ log: auditLogs, user: users })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(and(eq(auditLogs.entityType, "batch"), eq(auditLogs.entityId, batchId))),
      db
        .select({ ph: printHistory, user: users })
        .from(printHistory)
        .leftJoin(users, eq(printHistory.printedByUserId, users.id))
        .where(and(eq(printHistory.entityType, "batch"), eq(printHistory.entityId, batchId))),
      db
        .select({ lot: lots, product: products })
        .from(lots)
        .leftJoin(products, eq(lots.productId, products.id))
        .where(eq(lots.sourceBatchId, batchId)),
    ]);

    const events: TimelineEvent[] = [];
    const productName = productRow?.name ?? "batch";

    if (batchRow.createdAt) {
      events.push({
        at: batchRow.createdAt.toISOString(),
        kind: "created",
        title: "Batch created",
        detail: `${batchRow.batchNumber} for ${productName} · planned ${batchRow.plannedQuantity} KG`,
      });
    }

    if (batchRow.startDate) {
      events.push({
        at: batchRow.startDate.toISOString(),
        kind: "started",
        title: "Production started",
      });
    }

    for (const r of materialInputs) {
      const name = r.material?.name ?? "material";
      events.push({
        at: (r.bm.addedAt ?? batchRow.createdAt).toISOString(),
        kind: "input",
        title: `Consumed ${parseFloat(r.bm.quantity).toFixed(2)} KG of ${name}`,
        detail: `Lot ${r.lot.lotNumber}${r.lot.supplierName ? ` · ${r.lot.supplierName}` : ""}`,
        userId: r.user?.id ?? null,
        userName: r.user?.fullName ?? null,
        link: { href: `/lots/${r.lot.id}`, label: r.lot.lotNumber },
      });
    }

    for (const r of productInputs) {
      const name = r.product?.name ?? "intermediate";
      events.push({
        at: (r.bm.addedAt ?? batchRow.createdAt).toISOString(),
        kind: "input",
        title: `Consumed ${parseFloat(r.bm.quantity).toFixed(2)} KG of ${name}`,
        detail: `Source lot ${r.lot.lotNumber}`,
        userId: r.user?.id ?? null,
        userName: r.user?.fullName ?? null,
        link: { href: `/lots/${r.lot.id}`, label: r.lot.lotNumber },
      });
    }

    // Inputs without any lot reference (legacy product-as-ingredient with no sourceLotId)
    for (const r of allInputs) {
      if (r.bm.lotId || r.bm.sourceLotId) continue;
      const name = r.material?.name ?? r.product?.name ?? "input";
      events.push({
        at: (r.bm.addedAt ?? batchRow.createdAt).toISOString(),
        kind: "input",
        title: `Consumed ${parseFloat(r.bm.quantity).toFixed(2)} KG of ${name}`,
        userId: r.user?.id ?? null,
        userName: r.user?.fullName ?? null,
      });
    }

    for (const r of qcRows) {
      events.push({
        at: r.qc.checkedAt.toISOString(),
        kind: "qc",
        title: `QC ${r.qc.checkType}: ${r.qc.result}`,
        detail: [r.qc.value ? `Value: ${r.qc.value}` : null, r.qc.notes].filter(Boolean).join(" · ") || undefined,
        userId: r.user?.id ?? null,
        userName: r.user?.fullName ?? null,
        meta: { result: r.qc.result },
      });
    }

    for (const r of outputRows) {
      const name = r.product?.name ?? "output";
      events.push({
        at: (r.bo.addedAt ?? batchRow.createdAt).toISOString(),
        kind: "output",
        title: `Output recorded: ${parseFloat(r.bo.quantity).toFixed(2)} KG of ${name}`,
        userId: r.user?.id ?? null,
        userName: r.user?.fullName ?? null,
      });
    }

    for (const r of outputLotRows) {
      if (r.lot.producedDate) {
        const name = r.product?.name ?? "output";
        events.push({
          at: r.lot.producedDate.toISOString(),
          kind: "output_lot",
          title: `Lot ${r.lot.lotNumber} produced (${name})`,
          detail: `Quantity ${parseFloat(r.lot.quantity).toFixed(2)} KG`,
          link: { href: `/lots/${r.lot.id}`, label: r.lot.lotNumber },
        });
      }
      if (r.lot.barcodePrintedAt) {
        events.push({
          at: r.lot.barcodePrintedAt.toISOString(),
          kind: "print",
          title: `Output label printed: ${r.lot.lotNumber}`,
          link: { href: `/lots/${r.lot.id}`, label: r.lot.lotNumber },
        });
      }
    }

    // Actions that are already represented by their corresponding row events
    const SKIP_CREATE_ACTIONS = new Set([
      "create",
      "input_recorded",
      "lot_input_recorded",
      "product_input_recorded",
      "output_added",
    ]);

    for (const r of auditRows) {
      const action = r.log.action;
      if (SKIP_CREATE_ACTIONS.has(action)) continue;

      let parsed: any = null;
      if (r.log.changes) {
        try { parsed = JSON.parse(r.log.changes); } catch { /* ignore */ }
      }

      let title = action.replace(/_/g, " ");
      let detail: string | undefined;
      let kind: TimelineEventKind = "audit";

      const looksLikeFinalize = parsed && typeof parsed === "object" &&
        ("cleaningTime" in parsed || "numberOfStaff" in parsed || "markCompleted" in parsed);

      if (action === "completed" && looksLikeFinalize) {
        // Skip — endDate already emits a `completed` event
        continue;
      } else if (looksLikeFinalize) {
        kind = "finalize";
        title = "Batch finalized";
        const parts: string[] = [];
        if (parsed.cleaningTime != null && parsed.cleaningTime !== "") parts.push(`Cleaning: ${parsed.cleaningTime} min`);
        if (parsed.numberOfStaff != null && parsed.numberOfStaff !== "") parts.push(`Staff: ${parsed.numberOfStaff}`);
        if (parsed.totalOutput) parts.push(`Output: ${parsed.totalOutput} KG`);
        if (parts.length) detail = parts.join(" · ");
      } else if (action === "update" && parsed && typeof parsed === "object") {
        if ("status" in parsed) {
          kind = "status";
          title = `Status changed to ${parsed.status}`;
        } else {
          const keys = Object.keys(parsed).slice(0, 4).join(", ");
          if (keys) detail = `Updated: ${keys}`;
          title = "Batch updated";
        }
      } else if (action === "completed") {
        // Plain completed without finalize payload — skip, endDate covers it
        continue;
      } else if (action === "delete") {
        title = "Batch deleted";
      } else if (action === "output_removed") {
        kind = "output";
        title = "Output removed";
        if (parsed?.productId && parsed?.quantity) {
          detail = `${parseFloat(parsed.quantity).toFixed(2)} KG removed`;
        }
      }

      events.push({
        at: r.log.createdAt.toISOString(),
        kind,
        title,
        detail,
        userId: r.user?.id ?? null,
        userName: r.user?.fullName ?? null,
      });
    }

    for (const r of printRows) {
      events.push({
        at: r.ph.printedAt.toISOString(),
        kind: "print",
        title: `Label printed: ${r.ph.displayName}`,
        detail: r.ph.templateName ?? r.ph.labelKind,
        userId: r.user?.id ?? null,
        userName: r.user?.fullName ?? null,
      });
    }

    if (batchRow.barcodePrintedAt && !printRows.length) {
      events.push({
        at: batchRow.barcodePrintedAt.toISOString(),
        kind: "print",
        title: "Batch label printed",
      });
    }

    if (batchRow.endDate) {
      events.push({
        at: batchRow.endDate.toISOString(),
        kind: "completed",
        title: "Batch completed",
      });
    }

    events.sort((a, b) => a.at.localeCompare(b.at));
    return events;
  },
};

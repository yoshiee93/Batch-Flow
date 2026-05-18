import { eq, sql, inArray } from "drizzle-orm";
import { db } from "../../db";
import {
  batches, batchMaterials, lots, products, materials, recipes,
  orders, orderItems, orderItemAllocations,
  type Lot, type Batch, type Product, type Material, type Recipe,
} from "@shared/schema";

type BatchUsageEntry = {
  batch: Batch;
  product: Product;
  quantityUsed: string;
};

type MaterialUsedEntry = {
  material: Material;
  lot: Lot;
  quantityUsed: string;
};

export type ShippedInOrder = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  packedAt: string | null;
  quantityAllocated: string;
};

export type TraceabilityForwardResult = {
  lot: Lot;
  usedInBatches: BatchUsageEntry[];
  outputLots: Lot[];
  shippedInOrders: ShippedInOrder[];
} | null;

export type TraceabilityBackwardResult = {
  batch: Batch;
  product: Product | undefined;
  recipe: Recipe | null;
  materialsUsed: MaterialUsedEntry[];
} | null;

export type OrderProvenanceIngredient = {
  materialName: string;
  lotNumber: string;
  barcodeValue: string | null;
  supplierLot: string | null;
  quantityUsed: string;
};

export type OrderProvenanceAllocation = {
  allocationId: string;
  lotId: string;
  lotNumber: string;
  barcodeValue: string | null;
  quantityAllocated: string;
  packedAt: string | null;
  sourceBatch: {
    id: string;
    batchNumber: string;
    batchCode: string | null;
    ingredients: OrderProvenanceIngredient[];
  } | null;
};

export type OrderProvenanceLine = {
  orderItemId: string;
  productId: string;
  productName: string;
  quantity: string;
  unit: string;
  allocations: OrderProvenanceAllocation[];
};

export type OrderProvenanceResult = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  status: string;
  shippedAt: string | null;
  lines: OrderProvenanceLine[];
} | null;

export const traceabilityRepository = {
  async getTraceabilityForward(lotId: string): Promise<TraceabilityForwardResult> {
    const [lot] = await db.select().from(lots).where(eq(lots.id, lotId));
    if (!lot) return null;

    const directUsage = await db
      .select({ batchMaterial: batchMaterials, batch: batches, product: products })
      .from(batchMaterials)
      .innerJoin(batches, eq(batchMaterials.batchId, batches.id))
      .innerJoin(products, eq(batches.productId, products.id))
      .where(eq(batchMaterials.lotId, lotId));

    const sourceLotUsage = await db
      .select({ batchMaterial: batchMaterials, batch: batches, product: products })
      .from(batchMaterials)
      .innerJoin(batches, eq(batchMaterials.batchId, batches.id))
      .innerJoin(products, eq(batches.productId, products.id))
      .where(eq(batchMaterials.sourceLotId, lotId));

    const seenBmIds = new Set<string>();
    const allUsage = [...directUsage, ...sourceLotUsage].filter(r => {
      if (seenBmIds.has(r.batchMaterial.id)) return false;
      seenBmIds.add(r.batchMaterial.id);
      return true;
    });

    const batchIdSet: Record<string, boolean> = {};
    allUsage.forEach(r => { batchIdSet[r.batch.id] = true; });
    const usedBatchIds = Object.keys(batchIdSet);

    const outputLots = usedBatchIds.length > 0
      ? await db.select().from(lots).where(
          sql`${lots.sourceBatchId} IN (${sql.join(usedBatchIds.map(id => sql`${id}`), sql`, `)})`
        )
      : [];

    // Find orders that received the output lots (or the lot itself if it's a finished good)
    const lotIdsToCheck = [lotId, ...outputLots.map(l => l.id)];
    const allAllocations = lotIdsToCheck.length > 0
      ? await db
          .select({
            allocation: orderItemAllocations,
            order: orders,
          })
          .from(orderItemAllocations)
          .innerJoin(orders, eq(orderItemAllocations.orderId, orders.id))
          .where(inArray(orderItemAllocations.lotId, lotIdsToCheck))
      : [];

    // Aggregate quantity and pick latest packedAt per order
    const orderAggMap = new Map<string, {
      orderId: string; orderNumber: string; customerName: string;
      totalQty: number; latestPackedAt: Date | null;
    }>();
    for (const row of allAllocations) {
      const entry = orderAggMap.get(row.order.id);
      const qty = parseFloat(row.allocation.quantityAllocated) || 0;
      const packedAt = row.allocation.packedAt ?? null;
      if (!entry) {
        orderAggMap.set(row.order.id, {
          orderId: row.order.id,
          orderNumber: row.order.orderNumber,
          customerName: row.order.customerName,
          totalQty: qty,
          latestPackedAt: packedAt,
        });
      } else {
        entry.totalQty += qty;
        if (packedAt && (!entry.latestPackedAt || packedAt > entry.latestPackedAt)) {
          entry.latestPackedAt = packedAt;
        }
      }
    }
    const shippedInOrders: ShippedInOrder[] = Array.from(orderAggMap.values()).map(e => ({
      orderId: e.orderId,
      orderNumber: e.orderNumber,
      customerName: e.customerName,
      packedAt: e.latestPackedAt ? e.latestPackedAt.toISOString() : null,
      quantityAllocated: e.totalQty.toString(),
    }));

    return {
      lot,
      usedInBatches: allUsage.map(r => ({
        batch: r.batch,
        product: r.product,
        quantityUsed: r.batchMaterial.quantity,
      })),
      outputLots,
      shippedInOrders,
    };
  },

  async getTraceabilityBackward(batchId: string): Promise<TraceabilityBackwardResult> {
    const [batch] = await db.select().from(batches).where(eq(batches.id, batchId));
    if (!batch) return null;

    const [product] = await db.select().from(products).where(eq(products.id, batch.productId));
    const recipe = batch.recipeId
      ? await (async () => { const [r] = await db.select().from(recipes).where(eq(recipes.id, batch.recipeId!)); return r ?? null; })()
      : null;

    const materialsUsed = await db
      .select({ batchMaterial: batchMaterials, lot: lots, material: materials })
      .from(batchMaterials)
      .innerJoin(lots, eq(batchMaterials.lotId, lots.id))
      .innerJoin(materials, eq(batchMaterials.materialId, materials.id))
      .where(eq(batchMaterials.batchId, batchId));

    return {
      batch,
      product,
      recipe,
      materialsUsed: materialsUsed.map(r => ({
        material: r.material,
        lot: r.lot,
        quantityUsed: r.batchMaterial.quantity,
      })),
    };
  },

  async getOrderProvenance(orderId: string): Promise<OrderProvenanceResult> {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) return null;

    // Get all order items
    const items = await db
      .select({ item: orderItems, product: products })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, orderId));

    // Get all allocations for this order, joined with lots
    const allocations = await db
      .select({ allocation: orderItemAllocations, lot: lots })
      .from(orderItemAllocations)
      .innerJoin(lots, eq(orderItemAllocations.lotId, lots.id))
      .where(eq(orderItemAllocations.orderId, orderId));

    // Get unique source batch IDs from allocated lots
    const sourceBatchIds = Array.from(new Set(
      allocations
        .map(r => r.lot.sourceBatchId)
        .filter((id): id is string => !!id)
    ));

    // Fetch batch details and their ingredients for all source batches
    const batchDetailsMap = new Map<string, {
      id: string;
      batchNumber: string;
      batchCode: string | null;
      ingredients: OrderProvenanceIngredient[];
    }>();

    if (sourceBatchIds.length > 0) {
      const batchRows = await db
        .select()
        .from(batches)
        .where(inArray(batches.id, sourceBatchIds));

      const ingredientRows = await db
        .select({ bm: batchMaterials, lot: lots, material: materials })
        .from(batchMaterials)
        .innerJoin(lots, eq(batchMaterials.lotId, lots.id))
        .innerJoin(materials, eq(batchMaterials.materialId, materials.id))
        .where(inArray(batchMaterials.batchId, sourceBatchIds));

      for (const batch of batchRows) {
        const batchIngredients = ingredientRows
          .filter(r => r.bm.batchId === batch.id)
          .map(r => ({
            materialName: r.material.name,
            lotNumber: r.lot.lotNumber,
            barcodeValue: r.lot.barcodeValue,
            supplierLot: r.lot.supplierLot,
            quantityUsed: r.bm.quantity,
          }));

        batchDetailsMap.set(batch.id, {
          id: batch.id,
          batchNumber: batch.batchNumber,
          batchCode: batch.batchCode,
          ingredients: batchIngredients,
        });
      }
    }

    // Group allocations by order item
    const lineMap = new Map<string, OrderProvenanceLine>();

    for (const row of items) {
      lineMap.set(row.item.id, {
        orderItemId: row.item.id,
        productId: row.item.productId,
        productName: row.product.name,
        quantity: row.item.quantity,
        unit: row.product.unit,
        allocations: [],
      });
    }

    for (const row of allocations) {
      const line = lineMap.get(row.allocation.orderItemId);
      if (!line) continue;

      const sourceBatchId = row.lot.sourceBatchId;
      const sourceBatch = sourceBatchId ? (batchDetailsMap.get(sourceBatchId) ?? null) : null;

      line.allocations.push({
        allocationId: row.allocation.id,
        lotId: row.lot.id,
        lotNumber: row.lot.lotNumber,
        barcodeValue: row.lot.barcodeValue,
        quantityAllocated: row.allocation.quantityAllocated,
        packedAt: row.allocation.packedAt ? row.allocation.packedAt.toISOString() : null,
        sourceBatch,
      });
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      status: order.status,
      shippedAt: order.shippedAt ? order.shippedAt.toISOString() : null,
      lines: Array.from(lineMap.values()),
    };
  },
};

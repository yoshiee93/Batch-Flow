import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import {
  batches, batchMaterials, lots, products, materials, recipes,
} from "@shared/schema";

export const traceabilityRepository = {
  async getTraceabilityForward(lotId: string): Promise<any> {
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

    return {
      lot,
      usedInBatches: allUsage.map(r => ({
        batch: r.batch,
        product: r.product,
        quantityUsed: r.batchMaterial.quantity,
      })),
      outputLots,
    };
  },

  async getTraceabilityBackward(batchId: string): Promise<any> {
    const [batch] = await db.select().from(batches).where(eq(batches.id, batchId));
    if (!batch) return null;

    const [product] = await db.select().from(products).where(eq(products.id, batch.productId));
    const recipe = batch.recipeId
      ? await (async () => { const [r] = await db.select().from(recipes).where(eq(recipes.id, batch.recipeId!)); return r; })()
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
};

import { Router } from "express";
import { and, eq, gte, lte, sql, desc } from "drizzle-orm";
import { db } from "../../db";
import { batches, batchOutputs, products, categories } from "@shared/schema";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../lib/authMiddleware";

const adminOrProduction = requireRole("admin", "production");

type Range = "calendar" | "financial" | "last12";

function rangeFor(range: Range): { from: Date; to: Date; label: string } {
  const now = new Date();
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  if (range === "financial") {
    const yr = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
    return { from: new Date(Date.UTC(yr, 6, 1, 0, 0, 0, 0)), to, label: `Financial YTD (FY${yr + 1})` };
  }
  if (range === "last12") {
    const from = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    return { from, to, label: "Last 12 months" };
  }
  return { from: new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0)), to, label: `Calendar YTD ${now.getUTCFullYear()}` };
}

export const reportsRouter = Router();

reportsRouter.get("/reports/production/ytd", adminOrProduction, asyncHandler(async (req, res) => {
  const range = (req.query.range === "financial" || req.query.range === "last12") ? req.query.range as Range : "calendar";
  const { from, to, label } = rangeFor(range);

  const completedBatchesInRange = and(
    eq(batches.status, "completed"),
    gte(sql`COALESCE(${batches.endDate}, ${batches.createdAt})`, from),
    lte(sql`COALESCE(${batches.endDate}, ${batches.createdAt})`, to),
  );

  const [{ totalOutput, totalBatches, totalWaste, totalPlanned }] = await db
    .select({
      totalOutput: sql<string>`COALESCE(SUM(${batches.actualQuantity}), 0)`,
      totalBatches: sql<number>`COUNT(*)::int`,
      totalWaste: sql<string>`COALESCE(SUM(${batches.wasteQuantity}), 0)`,
      totalPlanned: sql<string>`COALESCE(SUM(${batches.plannedQuantity}), 0)`,
    })
    .from(batches)
    .where(completedBatchesInRange);

  const tOutput = parseFloat(totalOutput);
  const tWaste = parseFloat(totalWaste);
  const tPlanned = parseFloat(totalPlanned);

  const byProductRows = await db
    .select({
      productId: batchOutputs.productId,
      name: products.name,
      unit: products.unit,
      output: sql<string>`COALESCE(SUM(${batchOutputs.quantity}), 0)`,
    })
    .from(batchOutputs)
    .innerJoin(batches, eq(batchOutputs.batchId, batches.id))
    .leftJoin(products, eq(batchOutputs.productId, products.id))
    .where(completedBatchesInRange)
    .groupBy(batchOutputs.productId, products.name, products.unit)
    .orderBy(desc(sql`SUM(${batchOutputs.quantity})`))
    .limit(10);

  const byCategoryRows = await db
    .select({
      categoryId: products.categoryId,
      name: categories.name,
      output: sql<string>`COALESCE(SUM(${batchOutputs.quantity}), 0)`,
    })
    .from(batchOutputs)
    .innerJoin(batches, eq(batchOutputs.batchId, batches.id))
    .leftJoin(products, eq(batchOutputs.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(completedBatchesInRange)
    .groupBy(products.categoryId, categories.name)
    .orderBy(desc(sql`SUM(${batchOutputs.quantity})`));

  res.json({
    range,
    label,
    from: from.toISOString(),
    to: to.toISOString(),
    totals: {
      output: tOutput,
      batches: totalBatches,
      waste: tWaste,
      averageYield: tPlanned > 0 ? tOutput / tPlanned : 0,
    },
    byProduct: byProductRows.map(r => ({
      productId: r.productId,
      name: r.name ?? "Unknown",
      unit: r.unit ?? "",
      output: parseFloat(r.output),
    })),
    byCategory: byCategoryRows.map(r => ({
      categoryId: r.categoryId,
      name: r.name ?? "Uncategorized",
      output: parseFloat(r.output),
    })),
  });
}));

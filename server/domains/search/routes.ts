import { Router } from "express";
import { ilike, or, sql } from "drizzle-orm";
import { db } from "../../db";
import { batches, products, materials, customers, lots } from "@shared/schema";
import { asyncHandler } from "../../lib/asyncHandler";

export const searchRouter = Router();

const LIMIT = 8;

searchRouter.get("/search", asyncHandler(async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2) {
    return res.json({ batches: [], products: [], materials: [], customers: [], lots: [] });
  }

  const like = `%${q}%`;

  const [batchRows, productRows, materialRows, customerRows, lotRows] = await Promise.all([
    db
      .select({ id: batches.id, batchNumber: batches.batchNumber, status: batches.status })
      .from(batches)
      .where(ilike(batches.batchNumber, like))
      .orderBy(batches.batchNumber)
      .limit(LIMIT),
    db
      .select({ id: products.id, name: products.name, sku: products.sku })
      .from(products)
      .where(or(ilike(products.name, like), ilike(products.sku, like)))
      .orderBy(products.name)
      .limit(LIMIT),
    db
      .select({ id: materials.id, name: materials.name, sku: materials.sku })
      .from(materials)
      .where(or(ilike(materials.name, like), ilike(materials.sku, like)))
      .orderBy(materials.name)
      .limit(LIMIT),
    db
      .select({ id: customers.id, name: customers.name, code: customers.code })
      .from(customers)
      .where(or(ilike(customers.name, like), ilike(customers.code, like)))
      .orderBy(customers.name)
      .limit(LIMIT),
    db
      .select({ id: lots.id, lotNumber: lots.lotNumber })
      .from(lots)
      .where(ilike(lots.lotNumber, like))
      .orderBy(lots.lotNumber)
      .limit(LIMIT),
  ]);

  res.json({
    batches: batchRows.map(r => ({ id: r.id, label: r.batchNumber, sub: r.status, href: `/batches/${r.id}` })),
    products: productRows.map(r => ({ id: r.id, label: r.name, sub: r.sku, href: `/inventory` })),
    materials: materialRows.map(r => ({ id: r.id, label: r.name, sub: r.sku, href: `/inventory` })),
    customers: customerRows.map(r => ({ id: r.id, label: r.name, sub: r.code, href: `/customers` })),
    lots: lotRows.map(r => ({ id: r.id, label: r.lotNumber, href: `/lots/${r.id}` })),
  });
}));

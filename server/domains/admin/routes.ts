import { Router } from "express";
import { db } from "../../db";
import { sql } from "drizzle-orm";
import {
  users, customers, categories, products, materials, lots, recipes, recipeItems,
  batches, batchMaterials, batchOutputs, orders, orderItems, qualityChecks,
  stockMovements, auditLogs,
} from "@shared/schema";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../lib/authMiddleware";

const adminOnly = requireRole("admin");

export const adminRouter = Router();

adminRouter.get("/admin/export", adminOnly, asyncHandler(async (_req, res) => {
  const [
    usersData, customersData, categoriesData, productsData, materialsData, lotsData,
    recipesData, recipeItemsData, batchesData, batchMaterialsData, batchOutputsData,
    ordersData, orderItemsData, qualityChecksData, stockMovementsData, auditLogsData,
  ] = await Promise.all([
    db.select().from(users),
    db.select().from(customers),
    db.select().from(categories),
    db.select().from(products),
    db.select().from(materials),
    db.select().from(lots),
    db.select().from(recipes),
    db.select().from(recipeItems),
    db.select().from(batches),
    db.select().from(batchMaterials),
    db.select().from(batchOutputs),
    db.select().from(orders),
    db.select().from(orderItems),
    db.select().from(qualityChecks),
    db.select().from(stockMovements),
    db.select().from(auditLogs),
  ]);

  const snapshot = {
    version: 1,
    exportedAt: new Date().toISOString(),
    tables: {
      users: usersData,
      customers: customersData,
      categories: categoriesData,
      products: productsData,
      materials: materialsData,
      lots: lotsData,
      recipes: recipesData,
      recipeItems: recipeItemsData,
      batches: batchesData,
      batchMaterials: batchMaterialsData,
      batchOutputs: batchOutputsData,
      orders: ordersData,
      orderItems: orderItemsData,
      qualityChecks: qualityChecksData,
      stockMovements: stockMovementsData,
      auditLogs: auditLogsData,
    },
  };

  const dateStr = new Date().toISOString().split('T')[0];
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="ginas-table-export-${dateStr}.json"`);
  res.send(JSON.stringify(snapshot, null, 2));
}));

adminRouter.post("/admin/import", adminOnly, asyncHandler(async (req, res) => {
  const payload = req.body;

  if (!payload || typeof payload !== "object" || payload.version !== 1 || !payload.tables) {
    return res.status(400).json({ error: "Invalid export file format. Expected version 1 export." });
  }

  const t = payload.tables;
  const allTables = [
    "users", "customers", "categories", "products", "materials", "lots",
    "recipes", "recipeItems", "batches", "batchMaterials", "batchOutputs",
    "orders", "orderItems", "qualityChecks", "stockMovements", "auditLogs",
  ];
  for (const tbl of allTables) {
    if (!Array.isArray(t[tbl])) {
      return res.status(400).json({ error: `Missing or invalid table "${tbl}" in backup file. This file may be from an incompatible version.` });
    }
  }

  const currentAdminId = req.session?.userId as string | undefined;

  await db.transaction(async (tx) => {
    await tx.execute(sql`
      TRUNCATE customers, categories, products, materials, lots,
        recipes, recipe_items, batches, batch_materials, batch_outputs,
        orders, order_items, quality_checks, stock_movements, audit_logs
      CASCADE
    `);

    const backupUserIds = new Set(t.users.map((u: Record<string, unknown>) => u.id as string));

    if (backupUserIds.size > 0) {
      await tx.execute(sql`
        DELETE FROM users
        WHERE id NOT IN (${sql.join(
          Array.from(backupUserIds).map(id => sql`${id}`),
          sql`, `
        )})
        ${currentAdminId ? sql`AND id != ${currentAdminId}` : sql``}
      `);
    } else if (currentAdminId) {
      await tx.execute(sql`DELETE FROM users WHERE id != ${currentAdminId}`);
    }

    for (const u of t.users as Record<string, unknown>[]) {
      await tx.execute(sql`
        INSERT INTO users (id, username, password, full_name, role, active, created_at)
        VALUES (
          ${u.id}, ${u.username}, ${u.password},
          ${(u.fullName ?? u.full_name) as string},
          ${u.role as string}, ${(u.active ?? true) as boolean},
          ${u.createdAt ? new Date(u.createdAt as string) : u.created_at ? new Date(u.created_at as string) : new Date()}
        )
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          password = EXCLUDED.password,
          full_name = EXCLUDED.full_name,
          role = EXCLUDED.role,
          active = EXCLUDED.active
      `);
    }

    if (currentAdminId) {
      await tx.execute(sql`
        UPDATE users SET role = 'admin', active = true WHERE id = ${currentAdminId}
      `);
    }

    if (t.customers?.length) await tx.insert(customers).values(t.customers);
    if (t.categories?.length) await tx.insert(categories).values(t.categories);
    if (t.products?.length) await tx.insert(products).values(t.products);
    if (t.materials?.length) await tx.insert(materials).values(t.materials);
    if (t.lots?.length) await tx.insert(lots).values(t.lots);
    if (t.recipes?.length) await tx.insert(recipes).values(t.recipes);
    if (t.recipeItems?.length) await tx.insert(recipeItems).values(t.recipeItems);
    if (t.batches?.length) await tx.insert(batches).values(t.batches);
    if (t.batchMaterials?.length) await tx.insert(batchMaterials).values(t.batchMaterials);
    if (t.batchOutputs?.length) await tx.insert(batchOutputs).values(t.batchOutputs);
    if (t.orders?.length) await tx.insert(orders).values(t.orders);
    if (t.orderItems?.length) await tx.insert(orderItems).values(t.orderItems);
    if (t.qualityChecks?.length) await tx.insert(qualityChecks).values(t.qualityChecks);
    if (t.stockMovements?.length) await tx.insert(stockMovements).values(t.stockMovements);
    if (t.auditLogs?.length) await tx.insert(auditLogs).values(t.auditLogs);
  });

  res.json({ success: true, message: "Database restored successfully from backup." });
}));

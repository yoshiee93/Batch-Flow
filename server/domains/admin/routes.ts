import { Router } from "express";
import { db } from "../../db";
import { sql } from "drizzle-orm";
import {
  users, customers, categories, products, materials, lots, recipes, recipeItems,
  batches, batchMaterials, batchOutputs, orders, orderItems, qualityChecks,
  stockMovements, auditLogs, processCodeDefinitions,
} from "@shared/schema";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../lib/authMiddleware";

const adminOnly = requireRole("admin");

export const adminRouter = Router();

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function parseDates<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = typeof v === 'string' && ISO_DATE.test(v) ? new Date(v) : v;
  }
  return out as T;
}

adminRouter.get("/admin/export", adminOnly, asyncHandler(async (_req, res) => {
  const [
    usersData, customersData, categoriesData, productsData, materialsData, lotsData,
    recipesData, recipeItemsData, batchesData, batchMaterialsData, batchOutputsData,
    ordersData, orderItemsData, qualityChecksData, stockMovementsData, auditLogsData,
    processCodeDefsData,
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
    db.select().from(processCodeDefinitions),
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
      processCodeDefinitions: processCodeDefsData,
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
        orders, order_items, quality_checks, stock_movements, audit_logs,
        process_code_definitions
      CASCADE
    `);

    const backupUsers = t.users as Record<string, unknown>[];
    const backupUserIds = new Set(backupUsers.map(u => u.id as string));
    const backupUsernames = backupUsers.map(u => u.username as string);

    // Remove users not in the backup, except the current admin's session ID
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

    // Remove any remaining users whose username conflicts with a backup user
    // but whose ID isn't in the backup (e.g. the kept admin has the same username
    // as a backup user with a different ID). Skip the current admin — handled below.
    if (backupUsernames.length > 0) {
      await tx.execute(sql`
        DELETE FROM users
        WHERE username IN (${sql.join(backupUsernames.map(n => sql`${n}`), sql`, `)})
        AND id NOT IN (${sql.join(
          Array.from(backupUserIds).map(id => sql`${id}`),
          sql`, `
        )})
        ${currentAdminId ? sql`AND id != ${currentAdminId}` : sql``}
      `);
    }

    for (const u of backupUsers) {
      const createdAt = u.createdAt
        ? new Date(u.createdAt as string)
        : u.created_at
          ? new Date(u.created_at as string)
          : new Date();

      // If the current admin has the same username as this backup user but a different ID,
      // update the current admin's row in place instead of inserting a conflicting row.
      if (
        currentAdminId &&
        !backupUserIds.has(currentAdminId) &&
        (u.username as string) === (
          await tx.execute(sql`SELECT username FROM users WHERE id = ${currentAdminId}`)
        ).rows[0]?.username
      ) {
        await tx.execute(sql`
          UPDATE users SET
            username = ${u.username as string},
            password = ${u.password as string},
            full_name = ${(u.fullName ?? u.full_name) as string},
            role = ${u.role as string},
            active = ${(u.active ?? true) as boolean}
          WHERE id = ${currentAdminId}
        `);
        continue;
      }

      await tx.execute(sql`
        INSERT INTO users (id, username, password, full_name, role, active, created_at)
        VALUES (
          ${u.id}, ${u.username}, ${u.password},
          ${(u.fullName ?? u.full_name) as string},
          ${u.role as string}, ${(u.active ?? true) as boolean},
          ${createdAt}
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

    // Query the actual users table to get the real set of IDs present after user import
    const actualUserRows = await tx.execute(sql`SELECT id FROM users`);
    const importedUserIds = new Set<string>(
      actualUserRows.rows.map((r: Record<string, unknown>) => r.id as string)
    );

    if (t.customers?.length) await tx.insert(customers).values(t.customers.map(parseDates));
    if (t.categories?.length) await tx.insert(categories).values(t.categories.map(parseDates));
    if (t.products?.length) await tx.insert(products).values(t.products.map(parseDates));
    if (t.materials?.length) await tx.insert(materials).values(t.materials.map(parseDates));

    if (t.lots?.length) {
      // Null out receivedById if the referenced user isn't in the restored users table
      const lotsRows = (t.lots as Record<string, unknown>[]).map((row) => {
        const parsed = parseDates(row);
        const refId = (parsed.receivedById ?? parsed.received_by_id) as string | null | undefined;
        if (refId && !importedUserIds.has(refId)) {
          return { ...parsed, receivedById: null };
        }
        return parsed;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any[];
      await tx.insert(lots).values(lotsRows);
    }

    if (t.recipes?.length) await tx.insert(recipes).values(t.recipes.map(parseDates));
    if (t.recipeItems?.length) await tx.insert(recipeItems).values(t.recipeItems.map(parseDates));
    if (t.batches?.length) await tx.insert(batches).values(t.batches.map(parseDates));
    if (t.batchMaterials?.length) await tx.insert(batchMaterials).values(t.batchMaterials.map(parseDates));
    if (t.batchOutputs?.length) await tx.insert(batchOutputs).values(t.batchOutputs.map(parseDates));
    if (t.orders?.length) await tx.insert(orders).values(t.orders.map(parseDates));
    if (t.orderItems?.length) await tx.insert(orderItems).values(t.orderItems.map(parseDates));
    if (t.qualityChecks?.length) await tx.insert(qualityChecks).values(t.qualityChecks.map(parseDates));
    if (t.stockMovements?.length) await tx.insert(stockMovements).values(t.stockMovements.map(parseDates));
    if (t.auditLogs?.length) await tx.insert(auditLogs).values(t.auditLogs.map(parseDates));

    // processCodeDefinitions — optional field, present in v1 exports from this version onward
    if (Array.isArray(t.processCodeDefinitions) && t.processCodeDefinitions.length) {
      await tx.insert(processCodeDefinitions).values(t.processCodeDefinitions.map(parseDates));
    }
  });

  res.json({ success: true, message: "Database restored successfully from backup." });
}));

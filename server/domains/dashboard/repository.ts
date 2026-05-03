import { eq, gte, count } from "drizzle-orm";
import { db } from "../../db";
import { products, materials, batches, orders, printHistory } from "@shared/schema";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const dashboardRepository = {
  async getDashboardStats(): Promise<{
    activeBatches: number;
    pendingOrders: number;
    lowStockAlerts: number;
    totalProducts: number;
    batchesCreatedToday: number;
    labelsPrintedToday: number;
  }> {
    const allProducts = await db.select().from(products).where(eq(products.active, true));
    const allMaterials = await db.select().from(materials).where(eq(materials.active, true));
    const allBatches = await db.select().from(batches);
    const allOrders = await db.select().from(orders);

    const activeBatches = allBatches.filter(b =>
      ["planned", "in_progress", "quality_check"].includes(b.status)
    ).length;

    const pendingOrders = allOrders.filter(o =>
      ["pending", "in_production"].includes(o.status)
    ).length;

    const lowStockMaterials = allMaterials.filter(
      m => parseFloat(m.currentStock) <= parseFloat(m.minStock)
    ).length;
    const lowStockProducts = allProducts.filter(
      p => parseFloat(p.currentStock) <= parseFloat(p.minStock)
    ).length;
    const lowStockAlerts = lowStockMaterials + lowStockProducts;

    const today = startOfToday();
    const batchesCreatedToday = allBatches.filter(b => {
      const created = b.createdAt ? new Date(b.createdAt) : null;
      return created && created >= today;
    }).length;

    const [printRow] = await db
      .select({ count: count() })
      .from(printHistory)
      .where(gte(printHistory.printedAt, today));
    const labelsPrintedToday = Number(printRow?.count ?? 0);

    return {
      activeBatches,
      pendingOrders,
      lowStockAlerts,
      totalProducts: allProducts.length,
      batchesCreatedToday,
      labelsPrintedToday,
    };
  },
};

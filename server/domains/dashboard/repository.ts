import { eq } from "drizzle-orm";
import { db } from "../../db";
import { products, materials, batches, orders } from "@shared/schema";

export const dashboardRepository = {
  async getDashboardStats(): Promise<{
    activeBatches: number;
    pendingOrders: number;
    lowStockAlerts: number;
    totalProducts: number;
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

    const lowStockAlerts = allMaterials.filter(
      m => parseFloat(m.currentStock) <= parseFloat(m.minStock)
    ).length;

    return {
      activeBatches,
      pendingOrders,
      lowStockAlerts,
      totalProducts: allProducts.length,
    };
  },
};

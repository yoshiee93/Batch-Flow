import { eq, sql } from "drizzle-orm";
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

    const activeBatches = allBatches.filter(b => b.status === "in_progress").length;
    const pendingOrders = allOrders.filter(o => o.status === "pending" || o.status === "in_production").length;

    const lowStockProducts = allProducts.filter(p => {
      const stock = parseFloat(p.currentStock || "0");
      const threshold = parseFloat(p.minStock || "0");
      return threshold > 0 && stock <= threshold;
    }).length;
    const lowStockMaterials = allMaterials.filter(m => {
      const stock = parseFloat(m.currentStock || "0");
      const threshold = parseFloat(m.minStock || "0");
      return threshold > 0 && stock <= threshold;
    }).length;

    return {
      activeBatches,
      pendingOrders,
      lowStockAlerts: lowStockProducts + lowStockMaterials,
      totalProducts: allProducts.length,
    };
  },
};

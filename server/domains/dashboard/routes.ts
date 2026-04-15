import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { dashboardRepository as repo } from "./repository";

export const dashboardRouter = Router();

dashboardRouter.get("/dashboard/stats", asyncHandler(async (_req, res) => {
  const [products, materials, batches, orders] = await Promise.all([
    repo.getProducts(),
    repo.getMaterials(),
    repo.getBatches(),
    repo.getOrders(),
  ]);

  const activeBatches = batches.filter(b =>
    ["planned", "in_progress", "quality_check"].includes(b.status)
  );
  const pendingOrders = orders.filter(o =>
    ["pending", "in_production"].includes(o.status)
  );
  const lowStockMaterials = materials.filter(
    m => parseFloat(m.currentStock) <= parseFloat(m.minStock)
  );

  res.json({
    activeBatches: activeBatches.length,
    pendingOrders: pendingOrders.length,
    lowStockAlerts: lowStockMaterials.length,
    totalProducts: products.length,
  });
}));

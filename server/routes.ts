import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertProductSchema, insertMaterialSchema, insertLotSchema,
  insertRecipeSchema, insertRecipeItemSchema, insertBatchSchema,
  insertBatchMaterialSchema, insertOrderSchema, insertOrderItemSchema,
  insertQualityCheckSchema, insertStockMovementSchema, insertCustomerSchema,
  insertCategorySchema,
} from "@shared/schema";
import { z } from "zod";

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/categories", asyncHandler(async (req, res) => {
    const categories = await storage.getCategories();
    res.json(categories);
  }));

  app.get("/api/categories/:id", asyncHandler(async (req, res) => {
    const category = await storage.getCategory(req.params.id);
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.json(category);
  }));

  app.post("/api/categories", asyncHandler(async (req, res) => {
    const data = insertCategorySchema.parse(req.body);
    const category = await storage.createCategory(data);
    res.status(201).json(category);
  }));

  app.patch("/api/categories/:id", asyncHandler(async (req, res) => {
    const data = insertCategorySchema.partial().parse(req.body);
    const category = await storage.updateCategory(req.params.id, data);
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.json(category);
  }));

  app.delete("/api/categories/:id", asyncHandler(async (req, res) => {
    await storage.deleteCategory(req.params.id);
    res.status(204).send();
  }));

  app.get("/api/products", asyncHandler(async (req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  }));

  app.get("/api/products/by-category/:categoryId", asyncHandler(async (req, res) => {
    const products = await storage.getProductsByCategory(req.params.categoryId);
    res.json(products);
  }));

  app.get("/api/products/:id", asyncHandler(async (req, res) => {
    const product = await storage.getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  }));

  app.post("/api/products", asyncHandler(async (req, res) => {
    const data = insertProductSchema.parse(req.body);
    const product = await storage.createProduct(data);
    res.status(201).json(product);
  }));

  app.patch("/api/products/:id", asyncHandler(async (req, res) => {
    const data = insertProductSchema.partial().parse(req.body);
    const product = await storage.updateProduct(req.params.id, data);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  }));

  app.delete("/api/products/:id", asyncHandler(async (req, res) => {
    await storage.deleteProduct(req.params.id);
    res.status(204).send();
  }));

  app.get("/api/materials", asyncHandler(async (req, res) => {
    const materials = await storage.getMaterials();
    res.json(materials);
  }));

  app.get("/api/materials/:id", asyncHandler(async (req, res) => {
    const material = await storage.getMaterial(req.params.id);
    if (!material) return res.status(404).json({ error: "Material not found" });
    res.json(material);
  }));

  app.post("/api/materials", asyncHandler(async (req, res) => {
    const data = insertMaterialSchema.parse(req.body);
    const material = await storage.createMaterial(data);
    res.status(201).json(material);
  }));

  app.patch("/api/materials/:id", asyncHandler(async (req, res) => {
    const data = insertMaterialSchema.partial().parse(req.body);
    const material = await storage.updateMaterial(req.params.id, data);
    if (!material) return res.status(404).json({ error: "Material not found" });
    res.json(material);
  }));

  app.delete("/api/materials/:id", asyncHandler(async (req, res) => {
    await storage.deleteMaterial(req.params.id);
    res.status(204).send();
  }));

  app.get("/api/lots", asyncHandler(async (req, res) => {
    const lots = await storage.getLots();
    res.json(lots);
  }));

  app.get("/api/lots/:id", asyncHandler(async (req, res) => {
    const lot = await storage.getLot(req.params.id);
    if (!lot) return res.status(404).json({ error: "Lot not found" });
    res.json(lot);
  }));

  app.get("/api/materials/:id/lots", asyncHandler(async (req, res) => {
    const lots = await storage.getLotsByMaterial(req.params.id);
    res.json(lots);
  }));

  app.post("/api/lots", asyncHandler(async (req, res) => {
    const data = insertLotSchema.parse(req.body);
    const lot = await storage.createLot(data);
    res.status(201).json(lot);
  }));

  app.patch("/api/lots/:id", asyncHandler(async (req, res) => {
    const data = insertLotSchema.partial().parse(req.body);
    const lot = await storage.updateLot(req.params.id, data);
    if (!lot) return res.status(404).json({ error: "Lot not found" });
    res.json(lot);
  }));

  app.delete("/api/lots/:id", asyncHandler(async (req, res) => {
    await storage.deleteLot(req.params.id);
    res.status(204).send();
  }));

  app.get("/api/recipes", asyncHandler(async (req, res) => {
    const recipes = await storage.getRecipes();
    res.json(recipes);
  }));

  app.get("/api/recipes/:id", asyncHandler(async (req, res) => {
    const recipe = await storage.getRecipe(req.params.id);
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });
    res.json(recipe);
  }));

  app.get("/api/products/:id/recipes", asyncHandler(async (req, res) => {
    const recipes = await storage.getRecipesByProduct(req.params.id);
    res.json(recipes);
  }));

  app.post("/api/recipes", asyncHandler(async (req, res) => {
    const data = insertRecipeSchema.parse(req.body);
    const recipe = await storage.createRecipe(data);
    res.status(201).json(recipe);
  }));

  app.get("/api/recipes/:id/items", asyncHandler(async (req, res) => {
    const items = await storage.getRecipeItems(req.params.id);
    res.json(items);
  }));

  app.post("/api/recipes/:id/items", asyncHandler(async (req, res) => {
    const data = insertRecipeItemSchema.parse({ ...req.body, recipeId: req.params.id });
    const item = await storage.createRecipeItem(data);
    res.status(201).json(item);
  }));

  app.get("/api/batches", asyncHandler(async (req, res) => {
    const batches = await storage.getBatches();
    res.json(batches);
  }));

  app.get("/api/batches/:id", asyncHandler(async (req, res) => {
    const batch = await storage.getBatch(req.params.id);
    if (!batch) return res.status(404).json({ error: "Batch not found" });
    res.json(batch);
  }));

  app.post("/api/batches", asyncHandler(async (req, res) => {
    const data = insertBatchSchema.parse(req.body);
    const batch = await storage.createBatch(data);
    res.status(201).json(batch);
  }));

  app.patch("/api/batches/:id", asyncHandler(async (req, res) => {
    const data = insertBatchSchema.partial().parse(req.body);
    const batch = await storage.updateBatch(req.params.id, data);
    if (!batch) return res.status(404).json({ error: "Batch not found" });
    res.json(batch);
  }));

  app.delete("/api/batches/:id", asyncHandler(async (req, res) => {
    await storage.deleteBatch(req.params.id);
    res.status(204).send();
  }));

  app.get("/api/batches/:id/materials", asyncHandler(async (req, res) => {
    const materials = await storage.getBatchMaterials(req.params.id);
    res.json(materials);
  }));

  app.post("/api/batches/:id/materials", asyncHandler(async (req, res) => {
    const data = insertBatchMaterialSchema.parse({ ...req.body, batchId: req.params.id });
    const material = await storage.addBatchMaterial(data);
    res.status(201).json(material);
  }));

  app.delete("/api/batch-materials/:id", asyncHandler(async (req, res) => {
    await storage.removeBatchMaterial(req.params.id);
    res.status(204).send();
  }));

  app.patch("/api/batch-materials/:id", asyncHandler(async (req, res) => {
    const { quantity } = req.body;
    if (!quantity) {
      return res.status(400).json({ error: "quantity is required" });
    }
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: "quantity must be a positive number" });
    }
    const updated = await storage.updateBatchMaterial(req.params.id, quantity);
    res.json(updated);
  }));

  app.post("/api/batches/:id/input", asyncHandler(async (req, res) => {
    const { materialId, quantity } = req.body;
    if (!materialId || !quantity) {
      return res.status(400).json({ error: "materialId and quantity are required" });
    }
    const batchMaterial = await storage.recordBatchInput(req.params.id, materialId, quantity);
    res.status(201).json(batchMaterial);
  }));

  app.post("/api/batches/:id/output", asyncHandler(async (req, res) => {
    const { actualQuantity, wasteQuantity, millingQuantity, markCompleted } = req.body;
    const batch = await storage.recordBatchOutput(
      req.params.id,
      actualQuantity || "0",
      wasteQuantity || "0",
      millingQuantity || "0",
      markCompleted || false
    );
    res.json(batch);
  }));

  app.get("/api/batches/:id/outputs", asyncHandler(async (req, res) => {
    const outputs = await storage.getBatchOutputs(req.params.id);
    res.json(outputs);
  }));

  app.post("/api/batches/:id/outputs", asyncHandler(async (req, res) => {
    const { productId, quantity } = req.body;
    if (!productId || !quantity) {
      return res.status(400).json({ error: "productId and quantity are required" });
    }
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: "quantity must be a positive number" });
    }
    const output = await storage.addBatchOutput(req.params.id, productId, quantity);
    res.status(201).json(output);
  }));

  app.delete("/api/batch-outputs/:id", asyncHandler(async (req, res) => {
    await storage.removeBatchOutput(req.params.id);
    res.status(204).send();
  }));

  app.post("/api/batches/:id/finalize", asyncHandler(async (req, res) => {
    const { wasteQuantity, millingQuantity, markCompleted } = req.body;
    const batch = await storage.finalizeBatch(
      req.params.id,
      wasteQuantity || "0",
      millingQuantity || "0",
      markCompleted || false
    );
    res.json(batch);
  }));

  app.get("/api/orders", asyncHandler(async (req, res) => {
    const orders = await storage.getOrders();
    res.json(orders);
  }));

  app.get("/api/orders/with-allocation", asyncHandler(async (req, res) => {
    const orders = await storage.getOrdersWithAllocation();
    res.json(orders);
  }));

  app.post("/api/allocation/run", asyncHandler(async (req, res) => {
    await storage.runStockAllocation();
    res.json({ success: true, message: "Stock allocation completed" });
  }));

  app.get("/api/orders/:id", asyncHandler(async (req, res) => {
    const order = await storage.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  }));

  app.post("/api/orders", asyncHandler(async (req, res) => {
    const data = insertOrderSchema.parse(req.body);
    const order = await storage.createOrder(data);
    res.status(201).json(order);
  }));

  app.patch("/api/orders/:id", asyncHandler(async (req, res) => {
    const data = insertOrderSchema.partial().parse(req.body);
    const order = await storage.updateOrder(req.params.id, data);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  }));

  app.delete("/api/orders/:id", asyncHandler(async (req, res) => {
    await storage.deleteOrder(req.params.id);
    res.status(204).send();
  }));

  app.get("/api/orders/:id/items", asyncHandler(async (req, res) => {
    const items = await storage.getOrderItems(req.params.id);
    res.json(items);
  }));

  app.post("/api/orders/:id/items", asyncHandler(async (req, res) => {
    const data = insertOrderItemSchema.parse({ ...req.body, orderId: req.params.id });
    const item = await storage.createOrderItem(data);
    res.status(201).json(item);
  }));

  app.delete("/api/order-items/:id", asyncHandler(async (req, res) => {
    await storage.deleteOrderItem(req.params.id);
    res.status(204).send();
  }));

  app.get("/api/customers", asyncHandler(async (req, res) => {
    const customers = await storage.getCustomers();
    res.json(customers);
  }));

  app.get("/api/customers/:id", asyncHandler(async (req, res) => {
    const customer = await storage.getCustomer(req.params.id);
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    res.json(customer);
  }));

  app.post("/api/customers", asyncHandler(async (req, res) => {
    const data = insertCustomerSchema.parse(req.body);
    const customer = await storage.createCustomer(data);
    res.status(201).json(customer);
  }));

  app.patch("/api/customers/:id", asyncHandler(async (req, res) => {
    const data = insertCustomerSchema.partial().parse(req.body);
    const customer = await storage.updateCustomer(req.params.id, data);
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    res.json(customer);
  }));

  app.delete("/api/customers/:id", asyncHandler(async (req, res) => {
    await storage.deleteCustomer(req.params.id);
    res.status(204).send();
  }));

  app.get("/api/batches/:id/quality-checks", asyncHandler(async (req, res) => {
    const checks = await storage.getQualityChecks(req.params.id);
    res.json(checks);
  }));

  app.post("/api/batches/:id/quality-checks", asyncHandler(async (req, res) => {
    const data = insertQualityCheckSchema.parse({ ...req.body, batchId: req.params.id });
    const check = await storage.createQualityCheck(data);
    res.status(201).json(check);
  }));

  app.get("/api/stock-movements", asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const movements = await storage.getStockMovements(limit);
    res.json(movements);
  }));

  app.post("/api/stock-movements", asyncHandler(async (req, res) => {
    const data = insertStockMovementSchema.parse(req.body);
    const movement = await storage.createStockMovement(data);
    res.status(201).json(movement);
  }));

  app.get("/api/audit-logs", asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.query;
    const logs = await storage.getAuditLogs(entityType as string, entityId as string);
    res.json(logs);
  }));

  app.get("/api/traceability/forward/:lotId", asyncHandler(async (req, res) => {
    const trace = await storage.getTraceabilityForward(req.params.lotId);
    if (!trace) return res.status(404).json({ error: "Lot not found" });
    res.json(trace);
  }));

  app.get("/api/traceability/backward/:batchId", asyncHandler(async (req, res) => {
    const trace = await storage.getTraceabilityBackward(req.params.batchId);
    if (!trace) return res.status(404).json({ error: "Batch not found" });
    res.json(trace);
  }));

  app.get("/api/dashboard/stats", asyncHandler(async (req, res) => {
    const [products, materials, batches, orders] = await Promise.all([
      storage.getProducts(),
      storage.getMaterials(),
      storage.getBatches(),
      storage.getOrders(),
    ]);

    const activeBatches = batches.filter(b => ["planned", "in_progress", "quality_check"].includes(b.status));
    const pendingOrders = orders.filter(o => ["pending", "in_production"].includes(o.status));
    const lowStockMaterials = materials.filter(m => parseFloat(m.currentStock) <= parseFloat(m.minStock));

    res.json({
      activeBatches: activeBatches.length,
      pendingOrders: pendingOrders.length,
      lowStockAlerts: lowStockMaterials.length,
      totalProducts: products.length,
    });
  }));

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("API Error:", err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: err.errors });
    }
    res.status(500).json({ error: err.message || "Internal server error" });
  });

  return httpServer;
}

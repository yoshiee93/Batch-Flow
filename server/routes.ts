import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import type { ReceiveStockInput } from "./storage";
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
    try {
      await storage.deleteCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete category";
      const statusCode = message === "Category not found" ? 404 : 400;
      res.status(statusCode).json({ error: message });
    }
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

  app.get("/api/lots/barcode/:value", asyncHandler(async (req, res) => {
    const lot = await storage.getLotByBarcode(req.params.value);
    if (!lot) return res.status(404).json({ error: "Lot not found for barcode" });
    // Enrich with material/product name for UI
    let materialName: string | undefined;
    let materialUnit: string | undefined;
    let productName: string | undefined;
    let productUnit: string | undefined;
    if (lot.materialId) {
      const material = await storage.getMaterial(lot.materialId);
      materialName = material?.name;
      materialUnit = material?.unit;
    }
    if (lot.productId) {
      const product = await storage.getProduct(lot.productId);
      productName = product?.name;
      productUnit = product?.unit;
    }
    res.json({ ...lot, materialName, materialUnit, productName, productUnit });
  }));

  app.get("/api/lots/:id", asyncHandler(async (req, res) => {
    const lot = await storage.getLot(req.params.id);
    if (!lot) return res.status(404).json({ error: "Lot not found" });
    res.json(lot);
  }));

  app.get("/api/lots/:id/usage", asyncHandler(async (req, res) => {
    const usage = await storage.getLotUsage(req.params.id);
    res.json(usage);
  }));

  app.get("/api/lots/:id/lineage", asyncHandler(async (req, res) => {
    const lineage = await storage.getLotLineage(req.params.id);
    if (!lineage) return res.status(404).json({ error: "Lot not found" });
    res.json(lineage);
  }));

  app.patch("/api/lots/:id/barcode-printed", asyncHandler(async (req, res) => {
    const lot = await storage.updateLotBarcodePrinted(req.params.id);
    if (!lot) return res.status(404).json({ error: "Lot not found" });
    res.json(lot);
  }));

  app.get("/api/materials/:id/lots", asyncHandler(async (req, res) => {
    const lots = await storage.getLotsByMaterial(req.params.id);
    res.json(lots);
  }));

  app.get("/api/products/:id/lots", asyncHandler(async (req, res) => {
    const lots = await storage.getLotsByProduct(req.params.id);
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

  const receiveStockSchema = z.object({
    materialId: z.string().min(1),
    quantity: z.string().min(1),
    supplierName: z.string().optional(),
    sourceName: z.string().optional(),
    supplierLot: z.string().optional(),
    sourceType: z.enum(["supplier", "farmer", "internal_batch"]).optional(),
    receivedDate: z.union([z.string(), z.date()]).transform(v => typeof v === "string" ? new Date(v) : v).optional(),
    expiryDate: z.union([z.string(), z.date()]).transform(v => typeof v === "string" ? new Date(v) : v).optional(),
    notes: z.string().optional(),
  });

  app.post("/api/receive-stock", asyncHandler(async (req, res) => {
    const data = receiveStockSchema.parse(req.body) as ReceiveStockInput;
    const qty = parseFloat(data.quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: "quantity must be a positive number" });
    }
    const result = await storage.receiveStock(data);
    res.status(201).json(result);
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
    const items = await storage.getRecipeItemsWithMaterials(req.params.id);
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
    const { materialId, productId, quantity, sourceLotId } = req.body;
    
    if (!quantity) {
      return res.status(400).json({ error: "quantity is required" });
    }
    
    // Must provide either materialId OR productId, but not both
    if (!materialId && !productId) {
      return res.status(400).json({ error: "Either materialId or productId is required" });
    }
    if (materialId && productId) {
      return res.status(400).json({ error: "Provide either materialId or productId, not both" });
    }
    
    const { lotId } = req.body;
    // Material inputs MUST reference a specific lot for full traceability compliance
    if (materialId && !lotId) {
      return res.status(400).json({ error: "lotId is required for material inputs (lot-based compliance)" });
    }
    // Validate lot status: only active lots may be consumed
    if (lotId) {
      const lot = await storage.getLot(lotId);
      if (!lot) return res.status(404).json({ error: "Lot not found" });
      if (lot.status !== 'active') {
        return res.status(400).json({ error: `Lot is not available for production (status: ${lot.status})` });
      }
      // Prevent duplicate lot entries for the same batch
      const existingMaterials = await storage.getBatchMaterials(req.params.id);
      const alreadyAdded = existingMaterials.some(m => m.lotId === lotId);
      if (alreadyAdded) {
        return res.status(409).json({ error: `Lot ${lot.lotNumber} has already been added to this batch. Remove it first if you need to change the quantity.` });
      }
    }
    let batchMaterial;
    if (materialId) {
      batchMaterial = await storage.recordBatchInput(req.params.id, materialId, quantity, lotId);
    } else {
      batchMaterial = await storage.recordBatchProductInput(req.params.id, productId, quantity, sourceLotId);
    }
    
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
    const { wasteQuantity, millingQuantity, wetQuantity, markCompleted } = req.body;
    const batch = await storage.finalizeBatch(
      req.params.id,
      wasteQuantity || "0",
      millingQuantity || "0",
      wetQuantity || "0",
      markCompleted || false
    );
    res.json(batch);
  }));

  app.get("/api/batches/:id/input-lots", asyncHandler(async (req, res) => {
    const inputLots = await storage.getBatchInputLots(req.params.id);
    res.json(inputLots);
  }));

  app.get("/api/batches/:id/output-lots", asyncHandler(async (req, res) => {
    const outputLots = await storage.getBatchOutputLots(req.params.id);
    res.json(outputLots);
  }));

  app.post("/api/batches/:id/lot-input", asyncHandler(async (req, res) => {
    const { lotId, quantity } = req.body;
    if (!lotId || !quantity) {
      return res.status(400).json({ error: "lotId and quantity are required" });
    }
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: "quantity must be a positive number" });
    }
    try {
      const batchMaterial = await storage.recordBatchLotInput(req.params.id, lotId, quantity);
      res.status(201).json(batchMaterial);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to record lot input";
      res.status(400).json({ error: message });
    }
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

  app.post("/api/orders/:id/complete", asyncHandler(async (req, res) => {
    const orderId = req.params.id;
    const order = await storage.getOrder(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status === "shipped") return res.status(400).json({ error: "Order already completed" });
    if (order.status === "cancelled") return res.status(400).json({ error: "Cannot complete cancelled order" });
    
    const result = await storage.completeOrder(orderId);
    res.json(result);
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
    const batchId = req.query.batchId as string | undefined;
    const movements = await storage.getStockMovements(limit, batchId);
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

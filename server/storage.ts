import { eq, desc, and, sql, gte, lte, inArray, isNotNull } from "drizzle-orm";
import { db } from "./db";
import {
  users, products, materials, lots, recipes, recipeItems,
  batches, batchMaterials, batchOutputs, orders, orderItems, qualityChecks,
  stockMovements, auditLogs, customers, categories,
  type User, type InsertUser,
  type Customer, type InsertCustomer,
  type Category, type InsertCategory,
  type Product, type InsertProduct,
  type Material, type InsertMaterial,
  type Lot, type InsertLot,
  type Recipe, type InsertRecipe,
  type RecipeItem, type InsertRecipeItem,
  type Batch, type InsertBatch,
  type BatchMaterial, type InsertBatchMaterial,
  type BatchOutput, type InsertBatchOutput,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
  type QualityCheck, type InsertQualityCheck,
  type StockMovement, type InsertStockMovement,
  type AuditLog, type InsertAuditLog,
} from "@shared/schema";
import { generateLotNumber, generateBarcodeValue } from "./lotUtils";

export type ReceiveStockInput = {
  materialId: string;
  quantity: string;
  supplierName?: string;
  sourceName?: string;
  supplierLot?: string;
  sourceType?: "supplier" | "farmer" | "internal_batch";
  receivedDate?: Date;
  expiryDate?: Date;
  notes?: string;
};

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;

  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<void>;

  getCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<void>;

  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductsByCategory(categoryId: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<void>;

  getMaterials(): Promise<Material[]>;
  getMaterial(id: string): Promise<Material | undefined>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterial(id: string, material: Partial<InsertMaterial>): Promise<Material | undefined>;
  deleteMaterial(id: string): Promise<void>;

  getLots(): Promise<Lot[]>;
  getLot(id: string): Promise<Lot | undefined>;
  getLotsByMaterial(materialId: string): Promise<Lot[]>;
  getLotsByProduct(productId: string): Promise<Lot[]>;
  getLotByBarcode(barcodeValue: string): Promise<Lot | undefined>;
  createLot(lot: InsertLot): Promise<Lot>;
  updateLot(id: string, lot: Partial<InsertLot>): Promise<Lot | undefined>;
  deleteLot(id: string): Promise<void>;
  receiveStock(data: ReceiveStockInput): Promise<{ lot: Lot; movement: StockMovement }>;
  recordBatchLotInput(batchId: string, lotId: string, quantity: string): Promise<BatchMaterial>;
  getBatchInputLots(batchId: string): Promise<any[]>;
  getBatchOutputLots(batchId: string): Promise<any[]>;
  getLotUsage(lotId: string): Promise<any[]>;
  getLotLineage(lotId: string, depth?: number, maxDepth?: number, visited?: Set<string>): Promise<any>;
  updateLotBarcodePrinted(lotId: string): Promise<Lot | undefined>;

  getRecipes(): Promise<Recipe[]>;
  getRecipe(id: string): Promise<Recipe | undefined>;
  getRecipesByProduct(productId: string): Promise<Recipe[]>;
  createRecipe(recipe: InsertRecipe): Promise<Recipe>;
  getRecipeItems(recipeId: string): Promise<RecipeItem[]>;
  getRecipeItemsWithMaterials(recipeId: string): Promise<(RecipeItem & { materialName: string; materialUnit: string })[]>;
  createRecipeItem(item: InsertRecipeItem): Promise<RecipeItem>;

  getBatches(): Promise<Batch[]>;
  getBatch(id: string): Promise<Batch | undefined>;
  createBatch(batch: InsertBatch): Promise<Batch>;
  updateBatch(id: string, batch: Partial<InsertBatch>): Promise<Batch | undefined>;
  deleteBatch(id: string): Promise<void>;
  getBatchMaterials(batchId: string): Promise<BatchMaterial[]>;
  addBatchMaterial(material: InsertBatchMaterial): Promise<BatchMaterial>;
  removeBatchMaterial(id: string): Promise<void>;
  updateBatchMaterial(id: string, quantity: string): Promise<BatchMaterial>;
  recordBatchInput(batchId: string, materialId: string, quantity: string): Promise<BatchMaterial>;
  recordBatchProductInput(batchId: string, productId: string, quantity: string, sourceLotId?: string): Promise<BatchMaterial>;
  getBatchOutputs(batchId: string): Promise<BatchOutput[]>;
  addBatchOutput(batchId: string, productId: string, quantity: string): Promise<BatchOutput>;
  removeBatchOutput(id: string): Promise<void>;
  finalizeBatch(batchId: string, wasteQuantity: string, millingQuantity: string, wetQuantity: string, markCompleted: boolean): Promise<Batch>;
  recordBatchOutput(batchId: string, actualQuantity: string, wasteQuantity: string, millingQuantity: string, markCompleted: boolean): Promise<Batch>;

  getOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined>;
  deleteOrder(id: string): Promise<void>;
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  deleteOrderItem(id: string): Promise<void>;
  completeOrder(orderId: string): Promise<{ order: Order; movements: StockMovement[] }>;

  getQualityChecks(batchId: string): Promise<QualityCheck[]>;
  createQualityCheck(check: InsertQualityCheck): Promise<QualityCheck>;

  getStockMovements(limit?: number): Promise<StockMovement[]>;
  createStockMovement(movement: InsertStockMovement): Promise<StockMovement>;

  getAuditLogs(entityType?: string, entityId?: string): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  getTraceabilityForward(lotId: string): Promise<any>;
  getTraceabilityBackward(batchId: string): Promise<any>;
  
  runStockAllocation(): Promise<void>;
  getOrdersWithAllocation(): Promise<(Order & { allocationStatus: string; items: (OrderItem & { productName: string })[] })[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(users.fullName);
  }

  async getCustomers(): Promise<Customer[]> {
    return db.select().from(customers).where(eq(customers.active, true)).orderBy(customers.name);
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [created] = await db.insert(customers).values(customer).returning();
    await this.createAuditLog({ entityType: "customer", entityId: created.id, action: "create", changes: JSON.stringify(customer) });
    return created;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updated] = await db.update(customers).set(customer).where(eq(customers.id, id)).returning();
    if (updated) {
      await this.createAuditLog({ entityType: "customer", entityId: id, action: "update", changes: JSON.stringify(customer) });
    }
    return updated;
  }

  async deleteCustomer(id: string): Promise<void> {
    await db.update(customers).set({ active: false }).where(eq(customers.id, id));
    await this.createAuditLog({ entityType: "customer", entityId: id, action: "delete", changes: JSON.stringify({ active: false }) });
  }

  async getCategories(): Promise<Category[]> {
    return db.select().from(categories).orderBy(categories.sortOrder);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [created] = await db.insert(categories).values(category).returning();
    await this.createAuditLog({ entityType: "category", entityId: created.id, action: "create", changes: JSON.stringify(category) });
    return created;
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updated] = await db.update(categories).set(category).where(eq(categories.id, id)).returning();
    if (updated) {
      await this.createAuditLog({ entityType: "category", entityId: id, action: "update", changes: JSON.stringify(category) });
    }
    return updated;
  }

  async deleteCategory(id: string): Promise<void> {
    // Check if category exists
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    if (!category) {
      throw new Error("Category not found");
    }
    
    // Check if category is default - cannot delete default categories
    if (category.isDefault) {
      throw new Error("Cannot delete default category");
    }
    
    // Check if any products are using this category
    const productsUsingCategory = await db.select().from(products).where(eq(products.categoryId, id));
    if (productsUsingCategory.length > 0) {
      throw new Error(`Cannot delete category: ${productsUsingCategory.length} product(s) are using it`);
    }
    
    await db.delete(categories).where(eq(categories.id, id));
    await this.createAuditLog({ entityType: "category", entityId: id, action: "delete", changes: JSON.stringify({ deleted: true }) });
  }

  async getProducts(): Promise<Product[]> {
    return db.select().from(products).where(eq(products.active, true)).orderBy(products.name);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    return db.select().from(products).where(and(eq(products.active, true), eq(products.categoryId, categoryId))).orderBy(products.name);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    await this.createAuditLog({ entityType: "product", entityId: created.id, action: "create", changes: JSON.stringify(product) });
    return created;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(product).where(eq(products.id, id)).returning();
    if (updated) {
      await this.createAuditLog({ entityType: "product", entityId: id, action: "update", changes: JSON.stringify(product) });
    }
    return updated;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.update(products).set({ active: false }).where(eq(products.id, id));
    await this.createAuditLog({ entityType: "product", entityId: id, action: "delete", changes: JSON.stringify({ active: false }) });
  }

  async getMaterials(): Promise<Material[]> {
    return db.select().from(materials).where(eq(materials.active, true)).orderBy(materials.name);
  }

  async getMaterial(id: string): Promise<Material | undefined> {
    const [material] = await db.select().from(materials).where(eq(materials.id, id));
    return material;
  }

  async createMaterial(material: InsertMaterial): Promise<Material> {
    const [created] = await db.insert(materials).values(material).returning();
    await this.createAuditLog({ entityType: "material", entityId: created.id, action: "create", changes: JSON.stringify(material) });
    return created;
  }

  async updateMaterial(id: string, material: Partial<InsertMaterial>): Promise<Material | undefined> {
    const [updated] = await db.update(materials).set(material).where(eq(materials.id, id)).returning();
    if (updated) {
      await this.createAuditLog({ entityType: "material", entityId: id, action: "update", changes: JSON.stringify(material) });
    }
    return updated;
  }

  async deleteMaterial(id: string): Promise<void> {
    await db.update(materials).set({ active: false }).where(eq(materials.id, id));
    await this.createAuditLog({ entityType: "material", entityId: id, action: "delete", changes: JSON.stringify({ active: false }) });
  }

  async getLots(): Promise<Lot[]> {
    return db.select().from(lots).orderBy(desc(lots.createdAt));
  }

  async getLot(id: string): Promise<Lot | undefined> {
    const [lot] = await db.select().from(lots).where(eq(lots.id, id));
    return lot;
  }

  async getLotsByMaterial(materialId: string): Promise<Lot[]> {
    return db.select().from(lots).where(eq(lots.materialId, materialId)).orderBy(desc(lots.createdAt));
  }

  async getLotsByProduct(productId: string): Promise<Lot[]> {
    return db.select().from(lots).where(eq(lots.productId, productId)).orderBy(desc(lots.createdAt));
  }

  async createLot(lot: InsertLot): Promise<Lot> {
    const [created] = await db.insert(lots).values(lot).returning();
    await this.createAuditLog({ entityType: "lot", entityId: created.id, action: "create", changes: JSON.stringify(lot) });
    return created;
  }

  async updateLot(id: string, lot: Partial<InsertLot>): Promise<Lot | undefined> {
    const [updated] = await db.update(lots).set(lot).where(eq(lots.id, id)).returning();
    if (updated) {
      await this.createAuditLog({ entityType: "lot", entityId: id, action: "update", changes: JSON.stringify(lot) });
    }
    return updated;
  }

  async deleteLot(id: string): Promise<void> {
    await db.delete(lots).where(eq(lots.id, id));
    await this.createAuditLog({ entityType: "lot", entityId: id, action: "delete", changes: JSON.stringify({ deleted: true }) });
  }

  async getLotByBarcode(barcodeValue: string): Promise<Lot | undefined> {
    const [lot] = await db.select().from(lots).where(eq(lots.barcodeValue, barcodeValue));
    return lot;
  }

  async updateLotBarcodePrinted(lotId: string): Promise<Lot | undefined> {
    const [updated] = await db.update(lots)
      .set({ barcodePrintedAt: new Date() })
      .where(eq(lots.id, lotId))
      .returning();
    if (updated) {
      await this.createAuditLog({
        entityType: "lot",
        entityId: lotId,
        action: "barcode_printed",
        changes: JSON.stringify({ barcodePrintedAt: updated.barcodePrintedAt }),
      });
    }
    return updated;
  }

  async receiveStock(data: ReceiveStockInput): Promise<{ lot: Lot; movement: StockMovement }> {
    const { materialId, quantity, supplierName, sourceName, supplierLot, sourceType, receivedDate, expiryDate, notes } = data;
    const quantityNum = parseFloat(quantity);

    const [material] = await db.select().from(materials).where(eq(materials.id, materialId));
    if (!material) throw new Error("Material not found");

    const lotNumber = await generateLotNumber("RM");
    const barcodeValue = await generateBarcodeValue();

    const [lot] = await db.insert(lots).values({
      lotNumber,
      lotType: "raw_material",
      status: "active",
      barcodeValue,
      materialId,
      supplierName: supplierName || null,
      sourceName: sourceName || supplierName || null,
      supplierLot: supplierLot || null,
      sourceType: sourceType || null,
      originalQuantity: quantity,
      quantity,
      remainingQuantity: quantity,
      receivedDate: receivedDate || new Date(),
      expiryDate: expiryDate || null,
      notes: notes || null,
    }).returning();

    const newStock = (parseFloat(material.currentStock || "0") + quantityNum).toFixed(3);
    await db.update(materials).set({ currentStock: newStock }).where(eq(materials.id, materialId));

    const movement = await this.createStockMovement({
      movementType: "receipt",
      materialId,
      lotId: lot.id,
      quantity,
      reference: `Goods received: ${lot.lotNumber}`,
    });

    await this.createAuditLog({
      entityType: "lot",
      entityId: lot.id,
      action: "received",
      changes: JSON.stringify({ lotNumber, barcodeValue, materialId, quantity, supplierName, supplierLot }),
    });

    return { lot, movement };
  }

  async recordBatchLotInput(batchId: string, lotId: string, quantity: string): Promise<BatchMaterial> {
    const quantityNum = parseFloat(quantity);

    const [lot] = await db.select().from(lots).where(eq(lots.id, lotId));
    if (!lot) throw new Error("Lot not found");
    if (lot.status === "consumed") throw new Error("Lot has been fully consumed");
    if (lot.status === "quarantined") throw new Error("Lot is quarantined and cannot be used");
    if (lot.status === "expired") throw new Error("Lot has expired");

    const remaining = parseFloat(lot.remainingQuantity || "0");
    if (quantityNum > remaining) {
      throw new Error(`Insufficient lot quantity. Available: ${remaining}`);
    }

    const newRemaining = (remaining - quantityNum).toFixed(3);
    const newStatus = parseFloat(newRemaining) === 0 ? "consumed" : lot.status;
    await db.update(lots).set({ remainingQuantity: newRemaining, status: newStatus }).where(eq(lots.id, lotId));

    if (lot.materialId) {
      const [material] = await db.select().from(materials).where(eq(materials.id, lot.materialId));
      if (material) {
        const newStock = Math.max(0, parseFloat(material.currentStock || "0") - quantityNum).toFixed(3);
        await db.update(materials).set({ currentStock: newStock }).where(eq(materials.id, lot.materialId));
      }
    } else if (lot.productId) {
      const [product] = await db.select().from(products).where(eq(products.id, lot.productId));
      if (product) {
        const newStock = Math.max(0, parseFloat(product.currentStock || "0") - quantityNum).toFixed(3);
        await db.update(products).set({ currentStock: newStock }).where(eq(products.id, lot.productId));
      }
    }

    const [batchMaterial] = await db.insert(batchMaterials).values({
      batchId,
      materialId: lot.materialId || null,
      productId: lot.productId || null,
      lotId,
      quantity,
    }).returning();

    await this.createStockMovement({
      movementType: "production_input",
      materialId: lot.materialId || null,
      productId: lot.productId || null,
      lotId,
      batchId,
      quantity: `-${quantity}`,
      reference: `Lot consumed: ${lot.lotNumber}`,
    });

    await this.createAuditLog({
      entityType: "batch",
      entityId: batchId,
      action: "lot_input_recorded",
      changes: JSON.stringify({ lotId, lotNumber: lot.lotNumber, quantity }),
    });

    return batchMaterial;
  }

  async getBatchInputLots(batchId: string): Promise<any[]> {
    const materialLotInputs = await db.select({
      bm: batchMaterials,
      lot: lots,
      material: materials,
    })
    .from(batchMaterials)
    .innerJoin(lots, eq(batchMaterials.lotId, lots.id))
    .leftJoin(materials, eq(lots.materialId, materials.id))
    .where(and(eq(batchMaterials.batchId, batchId), isNotNull(batchMaterials.lotId)));

    const productLotInputs = await db.select({
      bm: batchMaterials,
      lot: lots,
      product: products,
    })
    .from(batchMaterials)
    .innerJoin(lots, eq(batchMaterials.sourceLotId, lots.id))
    .leftJoin(products, eq(lots.productId, products.id))
    .where(and(eq(batchMaterials.batchId, batchId), isNotNull(batchMaterials.sourceLotId)));

    return [
      ...materialLotInputs.map(row => ({
        batchMaterialId: row.bm.id,
        lotId: row.lot.id,
        lotNumber: row.lot.lotNumber,
        barcodeValue: row.lot.barcodeValue,
        lotType: row.lot.lotType,
        status: row.lot.status,
        materialId: row.material?.id ?? null,
        materialName: row.material?.name ?? null,
        productId: null as string | null,
        productName: null as string | null,
        supplierName: row.lot.supplierName,
        supplierLot: row.lot.supplierLot,
        sourceType: row.lot.sourceType,
        receivedDate: row.lot.receivedDate,
        expiryDate: row.lot.expiryDate,
        quantityConsumed: row.bm.quantity,
        remainingQuantity: row.lot.remainingQuantity,
        addedAt: row.bm.addedAt,
      })),
      ...productLotInputs.map(row => ({
        batchMaterialId: row.bm.id,
        lotId: row.lot.id,
        lotNumber: row.lot.lotNumber,
        barcodeValue: row.lot.barcodeValue,
        lotType: row.lot.lotType,
        status: row.lot.status,
        materialId: null as string | null,
        materialName: null as string | null,
        productId: row.product?.id ?? null,
        productName: row.product?.name ?? null,
        supplierName: row.lot.supplierName,
        supplierLot: row.lot.supplierLot,
        sourceType: row.lot.sourceType,
        receivedDate: row.lot.receivedDate,
        expiryDate: row.lot.expiryDate,
        quantityConsumed: row.bm.quantity,
        remainingQuantity: row.lot.remainingQuantity,
        addedAt: row.bm.addedAt,
      })),
    ];
  }

  async getBatchOutputLots(batchId: string): Promise<any[]> {
    const outputLots = await db.select({
      lot: lots,
      product: products,
    })
    .from(lots)
    .leftJoin(products, eq(lots.productId, products.id))
    .where(and(eq(lots.sourceBatchId, batchId), eq(lots.lotType, "finished_good")));

    return outputLots.map(row => ({
      lotId: row.lot.id,
      lotNumber: row.lot.lotNumber,
      barcodeValue: row.lot.barcodeValue,
      lotType: row.lot.lotType,
      status: row.lot.status,
      productId: row.product?.id ?? null,
      productName: row.product?.name ?? null,
      quantity: row.lot.quantity,
      remainingQuantity: row.lot.remainingQuantity,
      producedDate: row.lot.producedDate,
      expiryDate: row.lot.expiryDate,
      barcodePrintedAt: row.lot.barcodePrintedAt,
    }));
  }

  async getLotUsage(lotId: string): Promise<any[]> {
    const directUsage = await db.select({
      bm: batchMaterials,
      batch: batches,
      product: products,
    })
    .from(batchMaterials)
    .innerJoin(batches, eq(batchMaterials.batchId, batches.id))
    .innerJoin(products, eq(batches.productId, products.id))
    .where(eq(batchMaterials.lotId, lotId));

    const sourceUsage = await db.select({
      bm: batchMaterials,
      batch: batches,
      product: products,
    })
    .from(batchMaterials)
    .innerJoin(batches, eq(batchMaterials.batchId, batches.id))
    .innerJoin(products, eq(batches.productId, products.id))
    .where(eq(batchMaterials.sourceLotId, lotId));

    const seen = new Set<string>();
    const allUsage = [...directUsage, ...sourceUsage].filter(row => {
      if (seen.has(row.bm.id)) return false;
      seen.add(row.bm.id);
      return true;
    });

    return allUsage.map(row => ({
      batchId: row.batch.id,
      batchNumber: row.batch.batchNumber,
      batchStatus: row.batch.status,
      productId: row.product.id,
      productName: row.product.name,
      quantityConsumed: row.bm.quantity,
      addedAt: row.bm.addedAt,
    }));
  }

  async getLotLineage(lotId: string, depth: number = 0, maxDepth: number = 5, visited: Set<string> = new Set()): Promise<any> {
    if (depth > maxDepth || visited.has(lotId)) return null;
    visited.add(lotId);

    const lot = await this.getLot(lotId);
    if (!lot) return null;

    // === Upstream (backward) ===
    let sourceBatch = null;
    let sourceInputLots: any[] = [];
    if (lot.sourceBatchId) {
      sourceBatch = await this.getBatch(lot.sourceBatchId);
      if (sourceBatch) {
        const rawInputLots = await this.getBatchInputLots(lot.sourceBatchId);
        sourceInputLots = await Promise.all(
          rawInputLots.map(async (inputLot: any) => {
            if (inputLot.lotId && !visited.has(inputLot.lotId)) {
              const upstreamLineage = await this.getLotLineage(inputLot.lotId, depth + 1, maxDepth, visited);
              return { ...inputLot, lineage: upstreamLineage };
            }
            return inputLot;
          })
        );
      }
    }

    // === Downstream (forward) ===
    const usedInBatches = await this.getLotUsage(lotId);
    const outputLots: any[] = [];
    for (const usage of usedInBatches) {
      const batchOutputLotsResult = await this.getBatchOutputLots(usage.batchId);
      const enriched = await Promise.all(
        batchOutputLotsResult.map(async (outLot: any) => {
          if (outLot.lotId && !visited.has(outLot.lotId)) {
            const downstreamLineage = await this.getLotLineage(outLot.lotId, depth + 1, maxDepth, new Set(visited));
            return { ...outLot, lineage: downstreamLineage };
          }
          return outLot;
        })
      );
      outputLots.push(...enriched);
    }

    return {
      lot,
      sourceBatch,
      sourceInputLots,
      usedInBatches,
      outputLots,
    };
  }

  async getRecipes(): Promise<Recipe[]> {
    return db.select().from(recipes).where(eq(recipes.active, true)).orderBy(recipes.name);
  }

  async getRecipe(id: string): Promise<Recipe | undefined> {
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id));
    return recipe;
  }

  async getRecipesByProduct(productId: string): Promise<Recipe[]> {
    return db.select().from(recipes).where(and(eq(recipes.productId, productId), eq(recipes.active, true))).orderBy(desc(recipes.version));
  }

  async createRecipe(recipe: InsertRecipe): Promise<Recipe> {
    const [created] = await db.insert(recipes).values(recipe).returning();
    await this.createAuditLog({ entityType: "recipe", entityId: created.id, action: "create", changes: JSON.stringify(recipe) });
    return created;
  }

  async getRecipeItems(recipeId: string): Promise<RecipeItem[]> {
    return db.select().from(recipeItems).where(eq(recipeItems.recipeId, recipeId));
  }

  async getRecipeItemsWithMaterials(recipeId: string): Promise<(RecipeItem & { materialName: string; materialUnit: string })[]> {
    const items = await db.select({
      recipeItem: recipeItems,
      material: materials,
    })
    .from(recipeItems)
    .leftJoin(materials, eq(recipeItems.materialId, materials.id))
    .where(eq(recipeItems.recipeId, recipeId));

    return items.map(row => ({
      ...row.recipeItem,
      materialName: row.material?.name || 'Unknown Material',
      materialUnit: row.material?.unit || 'KG',
    }));
  }

  async createRecipeItem(item: InsertRecipeItem): Promise<RecipeItem> {
    const [created] = await db.insert(recipeItems).values(item).returning();
    return created;
  }

  async getBatches(): Promise<Batch[]> {
    return db.select().from(batches).orderBy(desc(batches.createdAt));
  }

  async getBatch(id: string): Promise<Batch | undefined> {
    const [batch] = await db.select().from(batches).where(eq(batches.id, id));
    return batch;
  }

  async createBatch(batch: InsertBatch): Promise<Batch> {
    const [created] = await db.insert(batches).values(batch).returning();
    await this.createAuditLog({ entityType: "batch", entityId: created.id, action: "create", changes: JSON.stringify(batch) });
    return created;
  }

  async updateBatch(id: string, batch: Partial<InsertBatch>): Promise<Batch | undefined> {
    const [updated] = await db.update(batches).set(batch).where(eq(batches.id, id)).returning();
    if (updated) {
      await this.createAuditLog({ entityType: "batch", entityId: id, action: "update", changes: JSON.stringify(batch) });
    }
    return updated;
  }

  async deleteBatch(id: string): Promise<void> {
    // Use transaction to ensure consistency
    await db.transaction(async (tx) => {
      // Get batch outputs to reverse inventory
      const outputs = await tx.select().from(batchOutputs).where(eq(batchOutputs.batchId, id));
      for (const output of outputs) {
        const [product] = await tx.select().from(products).where(eq(products.id, output.productId));
        if (product) {
          const newStock = Math.max(0, parseFloat(product.currentStock || "0") - parseFloat(output.quantity)).toFixed(2);
          await tx.update(products).set({ currentStock: newStock }).where(eq(products.id, output.productId));
        }
      }
      
      // Get batch materials to restore inventory
      const inputMaterials = await tx.select().from(batchMaterials).where(eq(batchMaterials.batchId, id));
      for (const bm of inputMaterials) {
        const [material] = await tx.select().from(materials).where(eq(materials.id, bm.materialId));
        if (material) {
          const restoredStock = (parseFloat(material.currentStock || "0") + parseFloat(bm.quantity)).toFixed(2);
          await tx.update(materials).set({ currentStock: restoredStock }).where(eq(materials.id, bm.materialId));
        }
      }
      
      // Delete stock movements that reference this batch
      await tx.delete(stockMovements).where(eq(stockMovements.batchId, id));
      
      // Delete lots that were created from this batch (finished goods)
      await tx.delete(lots).where(eq(lots.sourceBatchId, id));
      
      // Delete batch materials
      await tx.delete(batchMaterials).where(eq(batchMaterials.batchId, id));
      
      // Delete batch outputs
      await tx.delete(batchOutputs).where(eq(batchOutputs.batchId, id));
      
      // Delete quality checks
      await tx.delete(qualityChecks).where(eq(qualityChecks.batchId, id));
      
      // Finally delete the batch itself
      await tx.delete(batches).where(eq(batches.id, id));
      
      // Create audit log
      await tx.insert(auditLogs).values({
        entityType: "batch",
        entityId: id,
        action: "delete",
        changes: JSON.stringify({ deleted: true, outputsReversed: outputs.length, materialsRestored: inputMaterials.length }),
      });
    });
    
    // Re-run stock allocation after inventory changes
    await this.runStockAllocation();
  }

  async getBatchMaterials(batchId: string): Promise<BatchMaterial[]> {
    return db.select().from(batchMaterials).where(eq(batchMaterials.batchId, batchId));
  }

  async addBatchMaterial(material: InsertBatchMaterial): Promise<BatchMaterial> {
    const [created] = await db.insert(batchMaterials).values(material).returning();
    await this.createAuditLog({ entityType: "batch_material", entityId: created.id, action: "create", changes: JSON.stringify(material) });
    return created;
  }

  async removeBatchMaterial(id: string): Promise<void> {
    const [bm] = await db.select().from(batchMaterials).where(eq(batchMaterials.id, id));
    if (bm) {
      // Restore the quantity back to the lot (if lot exists)
      if (bm.lotId) {
        const [lot] = await db.select().from(lots).where(eq(lots.id, bm.lotId));
        if (lot) {
          const restoredQuantity = (parseFloat(lot.remainingQuantity || "0") + parseFloat(bm.quantity)).toFixed(2);
          await db.update(lots).set({ remainingQuantity: restoredQuantity }).where(eq(lots.id, bm.lotId));
        }
      }
      
      // Restore material stock
      const [material] = await db.select().from(materials).where(eq(materials.id, bm.materialId));
      if (material) {
        const restoredStock = (parseFloat(material.currentStock || "0") + parseFloat(bm.quantity)).toFixed(2);
        await db.update(materials).set({ currentStock: restoredStock }).where(eq(materials.id, bm.materialId));
      }
      
      // Create reversal stock movement
      await this.createStockMovement({
        movementType: "adjustment",
        materialId: bm.materialId,
        lotId: bm.lotId,
        batchId: bm.batchId,
        quantity: bm.quantity, // positive = reversal of consumption
        reference: "Batch input removed - reversal",
      });
      
      await db.delete(batchMaterials).where(eq(batchMaterials.id, id));
      await this.createAuditLog({ entityType: "batch_material", entityId: id, action: "delete", changes: JSON.stringify({ deleted: true }) });
    }
  }

  async updateBatchMaterial(id: string, newQuantity: string): Promise<BatchMaterial> {
    const newQty = parseFloat(newQuantity);
    
    // Validate quantity
    if (isNaN(newQty) || newQty <= 0) {
      throw new Error("Quantity must be a positive number");
    }
    
    // Get the batch material record
    const [bm] = await db.select().from(batchMaterials).where(eq(batchMaterials.id, id));
    if (!bm) throw new Error("Batch material not found");
    
    // Check if batch is completed
    const [batch] = await db.select().from(batches).where(eq(batches.id, bm.batchId));
    if (batch && batch.status === "completed") {
      throw new Error("Cannot edit inputs on a completed batch");
    }
    
    const oldQty = parseFloat(bm.quantity);
    const delta = newQty - oldQty;
    
    if (delta === 0) {
      return bm; // No change needed
    }
    
    // Get the material to check availability
    const [material] = await db.select().from(materials).where(eq(materials.id, bm.materialId));
    if (!material) throw new Error("Material not found");
    
    const materialStock = parseFloat(material.currentStock || "0");
    
    // If delta > 0, we need more from stock (check availability)
    if (delta > 0 && delta > materialStock) {
      throw new Error(`Insufficient stock. Available: ${materialStock} KG`);
    }
    
    // Update lot remaining quantity (if lot exists)
    if (bm.lotId) {
      const [lot] = await db.select().from(lots).where(eq(lots.id, bm.lotId));
      if (lot) {
        const newLotRemaining = (parseFloat(lot.remainingQuantity || "0") - delta).toFixed(2);
        await db.update(lots).set({ remainingQuantity: newLotRemaining }).where(eq(lots.id, bm.lotId));
      }
    }
    
    // Update material current stock
    const newStock = (materialStock - delta).toFixed(2);
    await db.update(materials).set({ currentStock: newStock }).where(eq(materials.id, bm.materialId));
    
    // Update batch material record
    const [updated] = await db.update(batchMaterials)
      .set({ quantity: newQuantity })
      .where(eq(batchMaterials.id, id))
      .returning();
    
    // Create stock movement for the delta
    await this.createStockMovement({
      movementType: "adjustment",
      materialId: bm.materialId,
      lotId: bm.lotId,
      batchId: bm.batchId,
      quantity: (-delta).toFixed(2), // negative delta means more consumed, positive means returned
      reference: `Batch input adjusted: ${oldQty} -> ${newQty} KG`,
    });
    
    await this.createAuditLog({
      entityType: "batch_material",
      entityId: id,
      action: "update",
      changes: JSON.stringify({ oldQuantity: oldQty, newQuantity: newQty, delta }),
    });
    
    return updated;
  }

  async recordBatchInput(batchId: string, materialId: string, quantity: string, lotId?: string | null): Promise<BatchMaterial> {
    const quantityNum = parseFloat(quantity);

    // If a lot is specified, delegate to the lot-enforced path (handles stock deduction + lot status)
    if (lotId) {
      return this.recordBatchLotInput(batchId, lotId, quantity);
    }

    // Fallback: generic (non-lot) consumption path
    const [material] = await db.select().from(materials).where(eq(materials.id, materialId));
    if (!material) throw new Error("Material not found");

    const currentStock = parseFloat(material.currentStock || "0");
    if (quantityNum > currentStock) {
      throw new Error(`Insufficient stock. Available: ${currentStock} ${material.unit || "KG"}`);
    }

    const newStock = (currentStock - quantityNum).toFixed(2);
    await db.update(materials).set({ currentStock: newStock }).where(eq(materials.id, materialId));

    const [batchMaterial] = await db.insert(batchMaterials).values({
      batchId,
      materialId,
      lotId: null,
      quantity,
    }).returning();

    await this.createStockMovement({
      movementType: "production_input",
      materialId,
      lotId: null,
      batchId,
      quantity: `-${quantity}`,
      reference: "Production input (no lot)",
    });

    await this.createAuditLog({
      entityType: "batch",
      entityId: batchId,
      action: "input_recorded",
      changes: JSON.stringify({ materialId, quantity }),
    });

    return batchMaterial;
  }

  async recordBatchProductInput(batchId: string, productId: string, quantity: string, sourceLotId?: string): Promise<BatchMaterial> {
    const quantityNum = parseFloat(quantity);
    
    // Deduct from product current stock
    const [product] = await db.select().from(products).where(eq(products.id, productId));
    if (!product) throw new Error("Product not found");
    
    const currentStock = parseFloat(product.currentStock || "0");
    if (quantityNum > currentStock) {
      throw new Error(`Insufficient stock. Available: ${currentStock} ${product.unit}`);
    }
    
    const newStock = (currentStock - quantityNum).toFixed(2);
    await db.update(products).set({ currentStock: newStock }).where(eq(products.id, productId));
    
    // If a specific lot is specified, also deduct from that lot
    if (sourceLotId) {
      const [lot] = await db.select().from(lots).where(eq(lots.id, sourceLotId));
      if (lot) {
        const remainingQty = parseFloat(lot.remainingQuantity || "0");
        const newRemainingQty = Math.max(0, remainingQty - quantityNum).toFixed(2);
        await db.update(lots).set({ remainingQuantity: newRemainingQty }).where(eq(lots.id, sourceLotId));
      }
    }
    
    // Create batch material record (with productId instead of materialId)
    const [batchMaterial] = await db.insert(batchMaterials).values({
      batchId,
      materialId: null,
      productId,
      lotId: null,
      sourceLotId: sourceLotId || null,
      quantity,
    }).returning();
    
    // Create stock movement
    await this.createStockMovement({
      movementType: "production_input",
      productId,
      lotId: sourceLotId || null,
      batchId,
      quantity: `-${quantity}`, // negative = consumed
      reference: "Production input (product as ingredient)",
    });
    
    await this.createAuditLog({
      entityType: "batch",
      entityId: batchId,
      action: "product_input_recorded",
      changes: JSON.stringify({ productId, quantity, sourceLotId }),
    });
    
    return batchMaterial;
  }

  async getBatchOutputs(batchId: string): Promise<BatchOutput[]> {
    return db.select().from(batchOutputs).where(eq(batchOutputs.batchId, batchId));
  }

  async addBatchOutput(batchId: string, productId: string, quantity: string): Promise<BatchOutput> {
    const quantityNum = parseFloat(quantity);
    
    // Verify batch exists and is not completed
    const [batch] = await db.select().from(batches).where(eq(batches.id, batchId));
    if (!batch) throw new Error("Batch not found");
    if (batch.status === "completed") throw new Error("Cannot add output to completed batch");
    
    // Verify product exists
    const [product] = await db.select().from(products).where(eq(products.id, productId));
    if (!product) throw new Error("Product not found");
    
    // Create batch output record
    const [output] = await db.insert(batchOutputs).values({
      batchId,
      productId,
      quantity,
    }).returning();
    
    // Add to product stock
    const newStock = (parseFloat(product.currentStock || "0") + quantityNum).toFixed(2);
    await db.update(products).set({ currentStock: newStock }).where(eq(products.id, productId));
    
    // Create stock movement
    await this.createStockMovement({
      movementType: "production_output",
      productId,
      batchId,
      quantity,
      reference: `Production output: ${product.name}`,
    });
    
    await this.createAuditLog({
      entityType: "batch",
      entityId: batchId,
      action: "output_added",
      changes: JSON.stringify({ productId, quantity }),
    });
    
    // Re-run allocation when stock changes
    await this.runStockAllocation();
    
    return output;
  }

  async removeBatchOutput(id: string): Promise<void> {
    const [output] = await db.select().from(batchOutputs).where(eq(batchOutputs.id, id));
    if (!output) return;
    
    // Verify batch is not completed
    const [batch] = await db.select().from(batches).where(eq(batches.id, output.batchId));
    if (batch && batch.status === "completed") throw new Error("Cannot remove output from completed batch");
    
    // Deduct from product stock
    const [product] = await db.select().from(products).where(eq(products.id, output.productId));
    if (product) {
      const newStock = (parseFloat(product.currentStock || "0") - parseFloat(output.quantity)).toFixed(2);
      await db.update(products).set({ currentStock: newStock }).where(eq(products.id, output.productId));
    }
    
    // Create reversal stock movement
    await this.createStockMovement({
      movementType: "adjustment",
      productId: output.productId,
      batchId: output.batchId,
      quantity: `-${output.quantity}`,
      reference: "Production output removed - reversal",
    });
    
    await db.delete(batchOutputs).where(eq(batchOutputs.id, id));
    
    await this.createAuditLog({
      entityType: "batch",
      entityId: output.batchId,
      action: "output_removed",
      changes: JSON.stringify({ productId: output.productId, quantity: output.quantity }),
    });
    
    await this.runStockAllocation();
  }

  async finalizeBatch(batchId: string, wasteQuantity: string, millingQuantity: string, wetQuantity: string, markCompleted: boolean): Promise<Batch> {
    const [batch] = await db.select().from(batches).where(eq(batches.id, batchId));
    if (!batch) throw new Error("Batch not found");
    
    const outputs = await this.getBatchOutputs(batchId);
    const totalOutput = outputs.reduce((sum, o) => sum + parseFloat(o.quantity), 0);
    
    const updateData: Partial<InsertBatch> = {
      actualQuantity: totalOutput.toFixed(3),
      wasteQuantity,
      millingQuantity,
      wetQuantity,
    };
    
    if (markCompleted) {
      updateData.status = "completed";
      updateData.endDate = new Date();
    }
    
    const [updated] = await db.update(batches).set(updateData).where(eq(batches.id, batchId)).returning();
    
    if (markCompleted) {
      const now = new Date();
      for (const output of outputs) {
        const existingLots = await db.select().from(lots).where(
          and(eq(lots.sourceBatchId, batchId), eq(lots.productId, output.productId))
        );
        if (existingLots.length === 0) {
          const lotNumber = await generateLotNumber("FG");
          const barcodeValue = await generateBarcodeValue();
          const [finishedLot] = await db.insert(lots).values({
            lotNumber,
            lotType: "finished_good",
            status: "active",
            barcodeValue,
            productId: output.productId,
            originalQuantity: output.quantity,
            quantity: output.quantity,
            remainingQuantity: output.quantity,
            producedDate: now,
            sourceBatchId: batchId,
          }).returning();
          // Note: stock movement for product output was already created by addBatchOutput.
          // We only link the lot to the existing stock movement context here via audit.
          await this.createAuditLog({
            entityType: "lot",
            entityId: finishedLot.id,
            action: "finished_lot_created",
            changes: JSON.stringify({ lotNumber, barcodeValue, productId: output.productId, quantity: output.quantity, sourceBatchId: batchId }),
          });
        } else {
          // Update existing lot barcode/type if it was created without them (legacy)
          const existingLot = existingLots[0];
          if (!existingLot.barcodeValue) {
            const barcodeValue = await generateBarcodeValue();
            await db.update(lots).set({ lotType: "finished_good", barcodeValue, producedDate: now })
              .where(eq(lots.id, existingLot.id));
          }
        }
      }
    }
    
    await this.createAuditLog({
      entityType: "batch",
      entityId: batchId,
      action: markCompleted ? "completed" : "updated",
      changes: JSON.stringify({ totalOutput, wasteQuantity, millingQuantity, wetQuantity, markCompleted }),
    });
    
    return updated;
  }

  async recordBatchOutput(batchId: string, actualQuantity: string, wasteQuantity: string, millingQuantity: string, markCompleted: boolean): Promise<Batch> {
    // Get the batch
    const [batch] = await db.select().from(batches).where(eq(batches.id, batchId));
    if (!batch) throw new Error("Batch not found");
    
    const previousActual = parseFloat(batch.actualQuantity || "0");
    const newActual = parseFloat(actualQuantity) || 0;
    const delta = newActual - previousActual;
    
    // Update batch with output quantities
    const updateData: Partial<InsertBatch> = {
      actualQuantity,
      wasteQuantity,
      millingQuantity,
    };
    
    if (markCompleted) {
      updateData.status = "completed";
      updateData.endDate = new Date();
    }
    
    const [updated] = await db.update(batches).set(updateData).where(eq(batches.id, batchId)).returning();
    
    // Only update inventory if there's a change in actual quantity
    if (delta !== 0) {
      // Get the product to update stock
      const [product] = await db.select().from(products).where(eq(products.id, batch.productId));
      if (product) {
        // Adjust product stock by the delta
        const newStock = (parseFloat(product.currentStock || "0") + delta).toFixed(2);
        await db.update(products).set({ currentStock: newStock }).where(eq(products.id, batch.productId));
        
        // Check if finished goods lot already exists for this batch
        const [existingLot] = await db.select().from(lots).where(eq(lots.sourceBatchId, batchId));
        
        if (existingLot) {
          const newLotQty = (parseFloat(existingLot.quantity) + delta).toFixed(3);
          const newRemainingQty = (parseFloat(existingLot.remainingQuantity || "0") + delta).toFixed(3);
          await db.update(lots).set({ 
            quantity: newLotQty,
            remainingQuantity: newRemainingQty
          }).where(eq(lots.id, existingLot.id));
        } else {
          const lotNumber = await generateLotNumber("FG");
          const barcodeValue = await generateBarcodeValue();
          await db.insert(lots).values({
            lotNumber,
            lotType: "finished_good",
            status: "active",
            barcodeValue,
            productId: batch.productId,
            originalQuantity: actualQuantity,
            quantity: actualQuantity,
            remainingQuantity: actualQuantity,
            producedDate: new Date(),
            sourceBatchId: batchId,
          });
        }
        
        // Create stock movement for the delta
        await this.createStockMovement({
          movementType: "production_output",
          productId: batch.productId,
          batchId,
          quantity: delta.toFixed(2),
          reference: delta > 0 ? "Production output - finished goods" : "Production output adjustment",
        });
      }
    }
    
    await this.createAuditLog({
      entityType: "batch",
      entityId: batchId,
      action: "output_recorded",
      changes: JSON.stringify({ actualQuantity, wasteQuantity, millingQuantity, markCompleted, delta }),
    });
    
    // Re-run stock allocation when inventory changes
    if (delta !== 0) {
      await this.runStockAllocation();
    }
    
    return updated;
  }

  async getOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [created] = await db.insert(orders).values(order).returning();
    await this.createAuditLog({ entityType: "order", entityId: created.id, action: "create", changes: JSON.stringify(order) });
    await this.runStockAllocation();
    return created;
  }

  async updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined> {
    const [updated] = await db.update(orders).set(order).where(eq(orders.id, id)).returning();
    if (updated) {
      await this.createAuditLog({ entityType: "order", entityId: id, action: "update", changes: JSON.stringify(order) });
    }
    return updated;
  }

  async deleteOrder(id: string): Promise<void> {
    await db.delete(orderItems).where(eq(orderItems.orderId, id));
    await db.delete(orders).where(eq(orders.id, id));
    await this.createAuditLog({ entityType: "order", entityId: id, action: "delete", changes: JSON.stringify({ deleted: true }) });
    await this.runStockAllocation();
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const [created] = await db.insert(orderItems).values(item).returning();
    await this.runStockAllocation();
    return created;
  }

  async deleteOrderItem(id: string): Promise<void> {
    await db.delete(orderItems).where(eq(orderItems.id, id));
    await this.runStockAllocation();
  }

  async completeOrder(orderId: string): Promise<{ order: Order; movements: StockMovement[] }> {
    const order = await this.getOrder(orderId);
    if (!order) throw new Error("Order not found");
    
    const items = await this.getOrderItems(orderId);
    const createdMovements: StockMovement[] = [];
    
    for (const item of items) {
      const product = await this.getProduct(item.productId);
      if (!product) continue;
      
      const quantity = parseFloat(item.quantity);
      const newStock = parseFloat(product.currentStock) - quantity;
      
      await db.update(products)
        .set({ currentStock: newStock.toFixed(3) })
        .where(eq(products.id, item.productId));
      
      const movement = await this.createStockMovement({
        movementType: "shipment",
        productId: item.productId,
        orderId: orderId,
        quantity: `-${quantity.toFixed(3)}`,
        reference: `Order ${order.orderNumber} completed - shipped to ${order.customerName}`,
      });
      createdMovements.push(movement);
    }
    
    const [updatedOrder] = await db.update(orders)
      .set({ status: "shipped" })
      .where(eq(orders.id, orderId))
      .returning();
    
    await this.createAuditLog({
      entityType: "order",
      entityId: orderId,
      action: "complete",
      changes: JSON.stringify({ status: "shipped", itemsShipped: items.length }),
    });
    
    await this.runStockAllocation();
    
    return { order: updatedOrder, movements: createdMovements };
  }

  async getQualityChecks(batchId: string): Promise<QualityCheck[]> {
    return db.select().from(qualityChecks).where(eq(qualityChecks.batchId, batchId)).orderBy(desc(qualityChecks.checkedAt));
  }

  async createQualityCheck(check: InsertQualityCheck): Promise<QualityCheck> {
    const [created] = await db.insert(qualityChecks).values(check).returning();
    await this.createAuditLog({ entityType: "quality_check", entityId: created.id, action: "create", changes: JSON.stringify(check) });
    return created;
  }

  async getStockMovements(limit = 100): Promise<StockMovement[]> {
    return db.select().from(stockMovements).orderBy(desc(stockMovements.createdAt)).limit(limit);
  }

  async createStockMovement(movement: InsertStockMovement): Promise<StockMovement> {
    const [created] = await db.insert(stockMovements).values(movement).returning();
    return created;
  }

  async getAuditLogs(entityType?: string, entityId?: string): Promise<AuditLog[]> {
    let query = db.select().from(auditLogs);
    if (entityType && entityId) {
      return query.where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId))).orderBy(desc(auditLogs.createdAt));
    } else if (entityType) {
      return query.where(eq(auditLogs.entityType, entityType)).orderBy(desc(auditLogs.createdAt));
    }
    return query.orderBy(desc(auditLogs.createdAt)).limit(100);
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs).values(log).returning();
    return created;
  }

  async getTraceabilityForward(lotId: string): Promise<any> {
    const lot = await this.getLot(lotId);
    if (!lot) return null;

    const usedInBatches = await db.select({
      batchMaterial: batchMaterials,
      batch: batches,
      product: products,
    })
    .from(batchMaterials)
    .innerJoin(batches, eq(batchMaterials.batchId, batches.id))
    .innerJoin(products, eq(batches.productId, products.id))
    .where(eq(batchMaterials.lotId, lotId));

    const outputLots = await db.select().from(lots).where(
      sql`${lots.sourceBatchId} IN (SELECT ${batchMaterials.batchId} FROM ${batchMaterials} WHERE ${batchMaterials.lotId} = ${lotId})`
    );

    return {
      lot,
      usedInBatches: usedInBatches.map(r => ({
        batch: r.batch,
        product: r.product,
        quantityUsed: r.batchMaterial.quantity,
      })),
      outputLots,
    };
  }

  async getTraceabilityBackward(batchId: string): Promise<any> {
    const batch = await this.getBatch(batchId);
    if (!batch) return null;

    const product = await this.getProduct(batch.productId);
    const recipe = batch.recipeId ? await this.getRecipe(batch.recipeId) : null;

    const materialsUsed = await db.select({
      batchMaterial: batchMaterials,
      lot: lots,
      material: materials,
    })
    .from(batchMaterials)
    .innerJoin(lots, eq(batchMaterials.lotId, lots.id))
    .innerJoin(materials, eq(batchMaterials.materialId, materials.id))
    .where(eq(batchMaterials.batchId, batchId));

    return {
      batch,
      product,
      recipe,
      materialsUsed: materialsUsed.map(r => ({
        material: r.material,
        lot: r.lot,
        quantityUsed: r.batchMaterial.quantity,
      })),
    };
  }

  async runStockAllocation(): Promise<void> {
    // Use a transaction to ensure consistency
    await db.transaction(async (tx) => {
      // Get all pending/in_production orders
      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
      const activeOrders = await tx.select().from(orders)
        .where(sql`${orders.status} IN ('pending', 'in_production')`);
      
      // Sort by priority first, then due date (all in memory after fetch)
      const sortedOrders = [...activeOrders].sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

      // Get all products and their current stock
      const allProducts = await tx.select().from(products);
      const productStock: Record<string, number> = {};
      for (const p of allProducts) {
        productStock[p.id] = parseFloat(p.currentStock);
      }

      // Reset all reservations first (within transaction)
      await tx.update(orderItems).set({ reservedQuantity: "0" });

      // Allocate stock to orders in sorted priority order
      for (const order of sortedOrders) {
        const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        
        for (const item of items) {
          const availableStock = productStock[item.productId] || 0;
          const requested = parseFloat(item.quantity);
          const allocated = Math.min(availableStock, requested);
          
          if (allocated > 0) {
            await tx.update(orderItems)
              .set({ reservedQuantity: allocated.toFixed(3) })
              .where(eq(orderItems.id, item.id));
            
            productStock[item.productId] = availableStock - allocated;
          }
        }
      }

      await tx.insert(auditLogs).values({
        entityType: "system",
        entityId: "allocation",
        action: "run_allocation",
        changes: JSON.stringify({ ordersProcessed: sortedOrders.length }),
      });
    });
  }

  async getOrdersWithAllocation(): Promise<(Order & { allocationStatus: string; items: (OrderItem & { productName: string })[] })[]> {
    // Run allocation first to ensure data is current
    await this.runStockAllocation();

    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
    const result: (Order & { allocationStatus: string; items: (OrderItem & { productName: string })[] })[] = [];

    for (const order of allOrders) {
      const items = await db.select({
        orderItem: orderItems,
        product: products,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, order.id));

      const itemsWithProduct = items.map(i => ({
        ...i.orderItem,
        productName: i.product.name,
      }));

      // Calculate allocation status - shipped/cancelled orders get their own status
      let allocationStatus = 'awaiting_stock';
      if (order.status === 'shipped') {
        allocationStatus = 'shipped';
      } else if (order.status === 'cancelled') {
        allocationStatus = 'cancelled';
      } else if (itemsWithProduct.length > 0) {
        const fullyAllocated = itemsWithProduct.every(
          i => parseFloat(i.reservedQuantity) >= parseFloat(i.quantity)
        );
        const partiallyAllocated = itemsWithProduct.some(
          i => parseFloat(i.reservedQuantity) > 0
        );

        if (fullyAllocated) {
          allocationStatus = 'ready_to_ship';
        } else if (partiallyAllocated) {
          allocationStatus = 'partially_allocated';
        }
      }

      result.push({
        ...order,
        allocationStatus,
        items: itemsWithProduct,
      });
    }

    return result;
  }
}

export const storage = new DatabaseStorage();

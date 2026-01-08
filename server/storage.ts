import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import { db } from "./db";
import {
  users, products, materials, lots, recipes, recipeItems,
  batches, batchMaterials, orders, orderItems, qualityChecks,
  stockMovements, auditLogs, customers,
  type User, type InsertUser,
  type Customer, type InsertCustomer,
  type Product, type InsertProduct,
  type Material, type InsertMaterial,
  type Lot, type InsertLot,
  type Recipe, type InsertRecipe,
  type RecipeItem, type InsertRecipeItem,
  type Batch, type InsertBatch,
  type BatchMaterial, type InsertBatchMaterial,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
  type QualityCheck, type InsertQualityCheck,
  type StockMovement, type InsertStockMovement,
  type AuditLog, type InsertAuditLog,
} from "@shared/schema";

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

  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
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
  createLot(lot: InsertLot): Promise<Lot>;
  updateLot(id: string, lot: Partial<InsertLot>): Promise<Lot | undefined>;
  deleteLot(id: string): Promise<void>;

  getRecipes(): Promise<Recipe[]>;
  getRecipe(id: string): Promise<Recipe | undefined>;
  getRecipesByProduct(productId: string): Promise<Recipe[]>;
  createRecipe(recipe: InsertRecipe): Promise<Recipe>;
  getRecipeItems(recipeId: string): Promise<RecipeItem[]>;
  createRecipeItem(item: InsertRecipeItem): Promise<RecipeItem>;

  getBatches(): Promise<Batch[]>;
  getBatch(id: string): Promise<Batch | undefined>;
  createBatch(batch: InsertBatch): Promise<Batch>;
  updateBatch(id: string, batch: Partial<InsertBatch>): Promise<Batch | undefined>;
  deleteBatch(id: string): Promise<void>;
  getBatchMaterials(batchId: string): Promise<BatchMaterial[]>;
  addBatchMaterial(material: InsertBatchMaterial): Promise<BatchMaterial>;
  removeBatchMaterial(id: string): Promise<void>;
  recordBatchInput(batchId: string, materialId: string, lotId: string, quantity: string): Promise<BatchMaterial>;
  recordBatchOutput(batchId: string, actualQuantity: string, wasteQuantity: string, millingQuantity: string, markCompleted: boolean): Promise<Batch>;

  getOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined>;
  deleteOrder(id: string): Promise<void>;
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  deleteOrderItem(id: string): Promise<void>;

  getQualityChecks(batchId: string): Promise<QualityCheck[]>;
  createQualityCheck(check: InsertQualityCheck): Promise<QualityCheck>;

  getStockMovements(limit?: number): Promise<StockMovement[]>;
  createStockMovement(movement: InsertStockMovement): Promise<StockMovement>;

  getAuditLogs(entityType?: string, entityId?: string): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  getTraceabilityForward(lotId: string): Promise<any>;
  getTraceabilityBackward(batchId: string): Promise<any>;
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

  async getProducts(): Promise<Product[]> {
    return db.select().from(products).where(eq(products.active, true)).orderBy(products.name);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
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
    await db.delete(batchMaterials).where(eq(batchMaterials.batchId, id));
    await db.delete(qualityChecks).where(eq(qualityChecks.batchId, id));
    await db.delete(batches).where(eq(batches.id, id));
    await this.createAuditLog({ entityType: "batch", entityId: id, action: "delete", changes: JSON.stringify({ deleted: true }) });
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
      // Restore the quantity back to the lot
      const [lot] = await db.select().from(lots).where(eq(lots.id, bm.lotId));
      if (lot) {
        const restoredQuantity = (parseFloat(lot.remainingQuantity || "0") + parseFloat(bm.quantity)).toFixed(2);
        await db.update(lots).set({ remainingQuantity: restoredQuantity }).where(eq(lots.id, bm.lotId));
        
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
          reason: "Batch input removed - reversal",
        });
      }
      
      await db.delete(batchMaterials).where(eq(batchMaterials.id, id));
      await this.createAuditLog({ entityType: "batch_material", entityId: id, action: "delete", changes: JSON.stringify({ deleted: true }) });
    }
  }

  async recordBatchInput(batchId: string, materialId: string, lotId: string, quantity: string): Promise<BatchMaterial> {
    const quantityNum = parseFloat(quantity);
    
    // Get the lot and check available quantity
    const [lot] = await db.select().from(lots).where(eq(lots.id, lotId));
    if (!lot) throw new Error("Lot not found");
    
    const remainingQty = parseFloat(lot.remainingQuantity || "0");
    if (quantityNum > remainingQty) {
      throw new Error(`Insufficient lot quantity. Available: ${remainingQty} KG`);
    }
    
    // Deduct from lot remaining quantity
    const newRemaining = (remainingQty - quantityNum).toFixed(2);
    await db.update(lots).set({ remainingQuantity: newRemaining }).where(eq(lots.id, lotId));
    
    // Deduct from material current stock
    const [material] = await db.select().from(materials).where(eq(materials.id, materialId));
    if (material) {
      const newStock = (parseFloat(material.currentStock || "0") - quantityNum).toFixed(2);
      await db.update(materials).set({ currentStock: newStock }).where(eq(materials.id, materialId));
    }
    
    // Create batch material record
    const [batchMaterial] = await db.insert(batchMaterials).values({
      batchId,
      materialId,
      lotId,
      quantity,
    }).returning();
    
    // Create stock movement
    await this.createStockMovement({
      movementType: "production_input",
      materialId,
      lotId,
      batchId,
      quantity: `-${quantity}`, // negative = consumed
      reason: "Production input",
    });
    
    await this.createAuditLog({
      entityType: "batch",
      entityId: batchId,
      action: "input_recorded",
      changes: JSON.stringify({ materialId, lotId, quantity }),
    });
    
    return batchMaterial;
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
      updateData.endDate = new Date().toISOString();
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
          // Update existing lot quantity
          const newLotQty = (parseFloat(existingLot.quantity) + delta).toFixed(2);
          const newRemainingQty = (parseFloat(existingLot.remainingQuantity || "0") + delta).toFixed(2);
          await db.update(lots).set({ 
            quantity: newLotQty,
            remainingQuantity: newRemainingQty
          }).where(eq(lots.id, existingLot.id));
        } else {
          // Create new finished goods lot
          const lotNumber = `LOT-${updated.batchNumber.replace("BATCH-", "")}`;
          await db.insert(lots).values({
            lotNumber,
            productId: batch.productId,
            quantity: actualQuantity,
            remainingQuantity: actualQuantity,
            sourceBatchId: batchId,
            receivedDate: new Date(),
          });
        }
        
        // Create stock movement for the delta
        await this.createStockMovement({
          movementType: "production_output",
          productId: batch.productId,
          batchId,
          quantity: delta.toFixed(2),
          reason: delta > 0 ? "Production output - finished goods" : "Production output adjustment",
        });
      }
    }
    
    await this.createAuditLog({
      entityType: "batch",
      entityId: batchId,
      action: "output_recorded",
      changes: JSON.stringify({ actualQuantity, wasteQuantity, millingQuantity, markCompleted, delta }),
    });
    
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
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const [created] = await db.insert(orderItems).values(item).returning();
    return created;
  }

  async deleteOrderItem(id: string): Promise<void> {
    await db.delete(orderItems).where(eq(orderItems.id, id));
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
}

export const storage = new DatabaseStorage();

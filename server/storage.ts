import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import { db } from "./db";
import {
  users, products, materials, lots, recipes, recipeItems,
  batches, batchMaterials, orders, orderItems, qualityChecks,
  stockMovements, auditLogs,
  type User, type InsertUser,
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

  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;

  getMaterials(): Promise<Material[]>;
  getMaterial(id: string): Promise<Material | undefined>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterial(id: string, material: Partial<InsertMaterial>): Promise<Material | undefined>;

  getLots(): Promise<Lot[]>;
  getLot(id: string): Promise<Lot | undefined>;
  getLotsByMaterial(materialId: string): Promise<Lot[]>;
  getLotsByProduct(productId: string): Promise<Lot[]>;
  createLot(lot: InsertLot): Promise<Lot>;
  updateLot(id: string, lot: Partial<InsertLot>): Promise<Lot | undefined>;

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
  getBatchMaterials(batchId: string): Promise<BatchMaterial[]>;
  addBatchMaterial(material: InsertBatchMaterial): Promise<BatchMaterial>;

  getOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined>;
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;

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

  async getBatchMaterials(batchId: string): Promise<BatchMaterial[]> {
    return db.select().from(batchMaterials).where(eq(batchMaterials.batchId, batchId));
  }

  async addBatchMaterial(material: InsertBatchMaterial): Promise<BatchMaterial> {
    const [created] = await db.insert(batchMaterials).values(material).returning();
    await this.createAuditLog({ entityType: "batch_material", entityId: created.id, action: "create", changes: JSON.stringify(material) });
    return created;
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

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const [created] = await db.insert(orderItems).values(item).returning();
    return created;
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
    const recipe = await this.getRecipe(batch.recipeId);

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

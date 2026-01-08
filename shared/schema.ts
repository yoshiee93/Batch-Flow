import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["admin", "manager", "operator", "viewer"]);
export const batchStatusEnum = pgEnum("batch_status", ["planned", "in_progress", "quality_check", "completed", "released", "quarantined"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "in_production", "ready", "shipped", "cancelled"]);
export const orderPriorityEnum = pgEnum("order_priority", ["low", "normal", "high", "urgent"]);
export const movementTypeEnum = pgEnum("movement_type", ["receipt", "production_input", "production_output", "adjustment", "shipment"]);
export const qualityResultEnum = pgEnum("quality_result", ["pass", "fail", "pending"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: userRoleEnum("role").notNull().default("operator"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sku: varchar("sku", { length: 50 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  unit: varchar("unit", { length: 10 }).notNull().default("KG"),
  minStock: decimal("min_stock", { precision: 12, scale: 3 }).notNull().default("0"),
  currentStock: decimal("current_stock", { precision: 12, scale: 3 }).notNull().default("0"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const materials = pgTable("materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sku: varchar("sku", { length: 50 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  unit: varchar("unit", { length: 10 }).notNull().default("KG"),
  minStock: decimal("min_stock", { precision: 12, scale: 3 }).notNull().default("0"),
  currentStock: decimal("current_stock", { precision: 12, scale: 3 }).notNull().default("0"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const lots = pgTable("lots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lotNumber: varchar("lot_number", { length: 50 }).notNull().unique(),
  materialId: varchar("material_id").references(() => materials.id),
  productId: varchar("product_id").references(() => products.id),
  supplierLot: varchar("supplier_lot", { length: 100 }),
  supplierName: text("supplier_name"),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  remainingQuantity: decimal("remaining_quantity", { precision: 12, scale: 3 }).notNull(),
  expiryDate: timestamp("expiry_date"),
  receivedDate: timestamp("received_date").notNull().defaultNow(),
  sourceBatchId: varchar("source_batch_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const recipes = pgTable("recipes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id),
  version: integer("version").notNull().default(1),
  name: text("name").notNull(),
  description: text("description"),
  instructions: text("instructions"),
  outputQuantity: decimal("output_quantity", { precision: 12, scale: 3 }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const recipeItems = pgTable("recipe_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipeId: varchar("recipe_id").notNull().references(() => recipes.id),
  materialId: varchar("material_id").notNull().references(() => materials.id),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  notes: text("notes"),
});

export const batches = pgTable("batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchNumber: varchar("batch_number", { length: 50 }).notNull().unique(),
  productId: varchar("product_id").notNull().references(() => products.id),
  recipeId: varchar("recipe_id").references(() => recipes.id),
  status: batchStatusEnum("status").notNull().default("in_progress"),
  plannedQuantity: decimal("planned_quantity", { precision: 12, scale: 3 }).notNull(),
  actualQuantity: decimal("actual_quantity", { precision: 12, scale: 3 }),
  wasteQuantity: decimal("waste_quantity", { precision: 12, scale: 3 }),
  millingQuantity: decimal("milling_quantity", { precision: 12, scale: 3 }),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const batchMaterials = pgTable("batch_materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: varchar("batch_id").notNull().references(() => batches.id),
  lotId: varchar("lot_id").notNull().references(() => lots.id),
  materialId: varchar("material_id").notNull().references(() => materials.id),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  addedAt: timestamp("added_at").notNull().defaultNow(),
  addedBy: varchar("added_by").references(() => users.id),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  customerId: varchar("customer_id").references(() => customers.id),
  customerName: text("customer_name").notNull(),
  status: orderStatusEnum("status").notNull().default("pending"),
  priority: orderPriorityEnum("priority").notNull().default("normal"),
  dueDate: timestamp("due_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  reservedQuantity: decimal("reserved_quantity", { precision: 12, scale: 3 }).notNull().default("0"),
});

export const qualityChecks = pgTable("quality_checks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: varchar("batch_id").notNull().references(() => batches.id),
  checkType: varchar("check_type", { length: 100 }).notNull(),
  result: qualityResultEnum("result").notNull().default("pending"),
  value: text("value"),
  notes: text("notes"),
  checkedBy: varchar("checked_by").references(() => users.id),
  checkedAt: timestamp("checked_at").notNull().defaultNow(),
});

export const stockMovements = pgTable("stock_movements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  movementType: movementTypeEnum("movement_type").notNull(),
  materialId: varchar("material_id").references(() => materials.id),
  productId: varchar("product_id").references(() => products.id),
  lotId: varchar("lot_id").references(() => lots.id),
  batchId: varchar("batch_id").references(() => batches.id),
  orderId: varchar("order_id").references(() => orders.id),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  reference: text("reference"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id").notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  changes: text("changes"),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  batches: many(batches),
  stockMovements: many(stockMovements),
  auditLogs: many(auditLogs),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
}));

export const productsRelations = relations(products, ({ many }) => ({
  lots: many(lots),
  recipes: many(recipes),
  batches: many(batches),
  orderItems: many(orderItems),
  stockMovements: many(stockMovements),
}));

export const materialsRelations = relations(materials, ({ many }) => ({
  lots: many(lots),
  recipeItems: many(recipeItems),
  batchMaterials: many(batchMaterials),
  stockMovements: many(stockMovements),
}));

export const lotsRelations = relations(lots, ({ one, many }) => ({
  material: one(materials, { fields: [lots.materialId], references: [materials.id] }),
  product: one(products, { fields: [lots.productId], references: [products.id] }),
  batchMaterials: many(batchMaterials),
  stockMovements: many(stockMovements),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  product: one(products, { fields: [recipes.productId], references: [products.id] }),
  items: many(recipeItems),
  batches: many(batches),
}));

export const recipeItemsRelations = relations(recipeItems, ({ one }) => ({
  recipe: one(recipes, { fields: [recipeItems.recipeId], references: [recipes.id] }),
  material: one(materials, { fields: [recipeItems.materialId], references: [materials.id] }),
}));

export const batchesRelations = relations(batches, ({ one, many }) => ({
  product: one(products, { fields: [batches.productId], references: [products.id] }),
  recipe: one(recipes, { fields: [batches.recipeId], references: [recipes.id] }),
  assignee: one(users, { fields: [batches.assignedTo], references: [users.id] }),
  materials: many(batchMaterials),
  qualityChecks: many(qualityChecks),
  stockMovements: many(stockMovements),
}));

export const batchMaterialsRelations = relations(batchMaterials, ({ one }) => ({
  batch: one(batches, { fields: [batchMaterials.batchId], references: [batches.id] }),
  lot: one(lots, { fields: [batchMaterials.lotId], references: [lots.id] }),
  material: one(materials, { fields: [batchMaterials.materialId], references: [materials.id] }),
  addedByUser: one(users, { fields: [batchMaterials.addedBy], references: [users.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  items: many(orderItems),
  stockMovements: many(stockMovements),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const qualityChecksRelations = relations(qualityChecks, ({ one }) => ({
  batch: one(batches, { fields: [qualityChecks.batchId], references: [batches.id] }),
  checker: one(users, { fields: [qualityChecks.checkedBy], references: [users.id] }),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  material: one(materials, { fields: [stockMovements.materialId], references: [materials.id] }),
  product: one(products, { fields: [stockMovements.productId], references: [products.id] }),
  lot: one(lots, { fields: [stockMovements.lotId], references: [lots.id] }),
  batch: one(batches, { fields: [stockMovements.batchId], references: [batches.id] }),
  order: one(orders, { fields: [stockMovements.orderId], references: [orders.id] }),
  createdByUser: one(users, { fields: [stockMovements.createdBy], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertMaterialSchema = createInsertSchema(materials).omit({ id: true, createdAt: true });
export const insertLotSchema = createInsertSchema(lots).omit({ id: true, createdAt: true });
export const insertRecipeSchema = createInsertSchema(recipes).omit({ id: true, createdAt: true });
export const insertRecipeItemSchema = createInsertSchema(recipeItems).omit({ id: true });
export const insertBatchSchema = createInsertSchema(batches).omit({ id: true, createdAt: true });
export const insertBatchMaterialSchema = createInsertSchema(batchMaterials).omit({ id: true, addedAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true }).extend({
  dueDate: z.union([z.string(), z.date()]).transform((val) => typeof val === 'string' ? new Date(val) : val),
});
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertQualityCheckSchema = createInsertSchema(qualityChecks).omit({ id: true, checkedAt: true });
export const insertStockMovementSchema = createInsertSchema(stockMovements).omit({ id: true, createdAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type Material = typeof materials.$inferSelect;
export type InsertLot = z.infer<typeof insertLotSchema>;
export type Lot = typeof lots.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipeItem = z.infer<typeof insertRecipeItemSchema>;
export type RecipeItem = typeof recipeItems.$inferSelect;
export type InsertBatch = z.infer<typeof insertBatchSchema>;
export type Batch = typeof batches.$inferSelect;
export type InsertBatchMaterial = z.infer<typeof insertBatchMaterialSchema>;
export type BatchMaterial = typeof batchMaterials.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertQualityCheck = z.infer<typeof insertQualityCheckSchema>;
export type QualityCheck = typeof qualityChecks.$inferSelect;
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;
export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, pgEnum, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["admin", "production", "inventory", "readonly"]);
export const labelTypeEnum = pgEnum("label_type_enum", ["raw_intake", "finished_output", "batch"]);

export type LabelFieldKey =
  | "productName"
  | "lotNumber"
  | "batchCode"
  | "quantity"
  | "unit"
  | "quantityWithUnit"
  | "productionDate"
  | "expiryDate"
  | "receivedDate"
  | "supplierLot"
  | "source"
  | "barcodeValue"
  | "customerName";

export type LabelTextAlign = "left" | "center" | "right";
export type LabelRotation = 0 | 90 | 180 | 270;

interface LabelElementBase {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: LabelRotation;
}

export interface LabelTextElement extends LabelElementBase {
  type: "text";
  text: string;
  fontSize?: number;
  bold?: boolean;
  align?: LabelTextAlign;
}

export interface LabelFieldElement extends LabelElementBase {
  type: "field";
  fieldKey: LabelFieldKey;
  prefix?: string;
  fontSize?: number;
  bold?: boolean;
  align?: LabelTextAlign;
}

export interface LabelBarcodeElement extends LabelElementBase {
  type: "barcode";
  source: "barcodeValue" | "lotNumber" | "batchCode";
  showText?: boolean;
}

export interface LabelQrElement extends LabelElementBase {
  type: "qr";
  source: "barcodeValue" | "lotNumber" | "batchCode";
}

export interface LabelLineElement extends LabelElementBase {
  type: "line";
  stroke?: number;
}

export type LabelBorderStyle = "solid" | "dashed" | "dotted";

export interface LabelBoxElement extends LabelElementBase {
  type: "box";
  stroke?: number;
  borderStyle?: LabelBorderStyle;
  borderColor?: string;
}

export type LabelImageObjectFit = "contain" | "cover" | "fill";

/**
 * Image element. The image is stored inline as a data URL on the element
 * itself — no separate asset library is needed for v1. Uploads are handled
 * client-side: the builder reads a chosen file with FileReader and writes
 * a data URL into `dataUrl`. Print/preview render this directly via <img>.
 * Size cap is enforced in the builder (~1 MB).
 */
export interface LabelImageElement extends LabelElementBase {
  type: "image";
  dataUrl: string;
  alt?: string;
  objectFit?: LabelImageObjectFit;
}

export type LabelElement =
  | LabelTextElement
  | LabelFieldElement
  | LabelBarcodeElement
  | LabelQrElement
  | LabelLineElement
  | LabelBoxElement
  | LabelImageElement;

export interface LabelLayout {
  version: number;
  width?: number;
  height?: number;
  unit?: "mm" | "in" | "px";
  elements?: LabelElement[];
}

export interface LabelTemplateSettings {
  showProductionDate?: boolean;
  showMadeInAustralia?: boolean;
  showExpiryDate?: boolean;
  showBatchCode?: boolean;
  showQuantity?: boolean;
  showSupplierLot?: boolean;
  showSource?: boolean;
  showBarcodeText?: boolean;
  showReceivedDate?: boolean;
  layout?: LabelLayout;
}

export const batchStatusEnum = pgEnum("batch_status", ["planned", "in_progress", "quality_check", "completed", "released", "quarantined"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "in_production", "ready", "shipped", "cancelled"]);
export const orderPriorityEnum = pgEnum("order_priority", ["low", "normal", "high", "urgent"]);
export const movementTypeEnum = pgEnum("movement_type", ["receipt", "production_input", "production_output", "adjustment", "shipment"]);
export const qualityResultEnum = pgEnum("quality_result", ["pass", "fail", "pending"]);
export const lotTypeEnum = pgEnum("lot_type", ["raw_material", "intermediate", "finished_good"]);
export const lotStatusEnum = pgEnum("lot_status", ["active", "quarantined", "released", "consumed", "expired"]);
export const lotTestingStatusEnum = pgEnum("lot_testing_status", ["not_required", "pending", "passed", "failed"]);
export const sourceTypeEnum = pgEnum("source_type", ["supplier", "farmer", "internal_batch"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: userRoleEnum("role").notNull().default("readonly"),
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
  defaultLabelTemplateId: varchar("default_label_template_id"),
  requiresTesting: boolean("requires_testing").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const labelTemplates = pgTable("label_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  labelType: labelTypeEnum("label_type").notNull(),
  customerId: varchar("customer_id").references(() => customers.id),
  isDefault: boolean("is_default").notNull().default(false),
  settings: jsonb("settings").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  excludeFromYield: boolean("exclude_from_yield").notNull().default(false),
  showInTabs: boolean("show_in_tabs").notNull().default(true),
  showInInventory: boolean("show_in_inventory").notNull().default(true),
  showInReceiveStock: boolean("show_in_receive_stock").notNull().default(true),
  showInProductionBatch: boolean("show_in_production_batch").notNull().default(true),
  showInProductionInputs: boolean("show_in_production_inputs").notNull().default(true),
  showInProductionOutputs: boolean("show_in_production_outputs").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  processCode: varchar("process_code", { length: 10 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sku: varchar("sku", { length: 50 }).notNull().default(""),
  name: text("name").notNull(),
  description: text("description"),
  unit: varchar("unit", { length: 10 }).notNull().default("KG"),
  minStock: decimal("min_stock", { precision: 12, scale: 3 }).notNull().default("0"),
  currentStock: decimal("current_stock", { precision: 12, scale: 3 }).notNull().default("0"),
  categoryId: varchar("category_id").references(() => categories.id),
  fruitCode: varchar("fruit_code", { length: 10 }),
  isReceivable: boolean("is_receivable").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const materials = pgTable("materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sku: varchar("sku", { length: 50 }).notNull().default(""),
  name: text("name").notNull(),
  description: text("description"),
  unit: varchar("unit", { length: 10 }).notNull().default("KG"),
  minStock: decimal("min_stock", { precision: 12, scale: 3 }).notNull().default("0"),
  currentStock: decimal("current_stock", { precision: 12, scale: 3 }).notNull().default("0"),
  categoryId: varchar("category_id").references(() => categories.id),
  isReceivable: boolean("is_receivable").notNull().default(true),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const lots = pgTable("lots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lotNumber: varchar("lot_number", { length: 50 }).notNull().unique(),
  lotType: lotTypeEnum("lot_type").notNull().default("raw_material"),
  status: lotStatusEnum("status").notNull().default("active"),
  barcodeValue: varchar("barcode_value", { length: 100 }).unique(),
  materialId: varchar("material_id").references(() => materials.id),
  productId: varchar("product_id").references(() => products.id),
  supplierLot: varchar("supplier_lot", { length: 100 }),
  supplierName: text("supplier_name"),
  sourceName: text("source_name"),
  sourceType: sourceTypeEnum("source_type"),
  originalQuantity: decimal("original_quantity", { precision: 12, scale: 3 }),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  remainingQuantity: decimal("remaining_quantity", { precision: 12, scale: 3 }).notNull(),
  expiryDate: timestamp("expiry_date"),
  receivedDate: timestamp("received_date").notNull().defaultNow(),
  producedDate: timestamp("produced_date"),
  sourceBatchId: varchar("source_batch_id"),
  customerId: varchar("customer_id").references(() => customers.id),
  barcodePrintedAt: timestamp("barcode_printed_at"),
  notes: text("notes"),
  productTemperature: decimal("product_temperature", { precision: 5, scale: 2 }),
  visualInspection: varchar("visual_inspection", { length: 20 }),
  receivedById: varchar("received_by_id").references(() => users.id),
  freight: text("freight"),
  testingStatus: lotTestingStatusEnum("testing_status").notNull().default("not_required"),
  testingNotes: text("testing_notes"),
  testingCertificate: text("testing_certificate"),
  testedAt: timestamp("tested_at"),
  testedById: varchar("tested_by_id").references(() => users.id),
  photos: jsonb("photos").$type<LotPhoto[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type LotPhoto = {
  dataUrl: string;
  name?: string;
  size?: number;
};

export const VISUAL_INSPECTION_VALUES = ["pass", "fail", "conditional"] as const;
export type VisualInspection = typeof VISUAL_INSPECTION_VALUES[number];

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
  wetQuantity: decimal("wet_quantity", { precision: 12, scale: 3 }),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  notes: text("notes"),
  barcodeValue: varchar("barcode_value", { length: 100 }).unique(),
  barcodePrintedAt: timestamp("barcode_printed_at"),
  batchCode: varchar("batch_code", { length: 20 }).unique(),
  cleaningTime: decimal("cleaning_time", { precision: 10, scale: 2 }),
  numberOfStaff: integer("number_of_staff"),
  finishTime: timestamp("finish_time"),
  productAssessment: jsonb("product_assessment").$type<{ result: "pass" | "conditional" | "fail"; notes?: string }>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const batchMaterials = pgTable("batch_materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: varchar("batch_id").notNull().references(() => batches.id),
  lotId: varchar("lot_id").references(() => lots.id),
  materialId: varchar("material_id").references(() => materials.id),
  productId: varchar("product_id").references(() => products.id),
  sourceLotId: varchar("source_lot_id").references(() => lots.id),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  addedAt: timestamp("added_at").notNull().defaultNow(),
  addedBy: varchar("added_by").references(() => users.id),
});

export const batchOutputs = pgTable("batch_outputs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: varchar("batch_id").notNull().references(() => batches.id),
  productId: varchar("product_id").notNull().references(() => products.id),
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
  poNumber: varchar("po_number", { length: 100 }),
  customBatchNumber: varchar("custom_batch_number", { length: 50 }),
  freight: text("freight"),
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
}, (t) => ({
  createdAtIdx: index("audit_logs_created_at_idx").on(t.createdAt.desc()),
  entityIdx: index("audit_logs_entity_idx").on(t.entityType, t.entityId),
}));

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
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertMaterialSchema = createInsertSchema(materials).omit({ id: true, createdAt: true });
export const lotPhotoSchema = z.object({
  dataUrl: z.string(),
  name: z.string().optional(),
  size: z.number().optional(),
});
export const insertLotSchema = createInsertSchema(lots).omit({ id: true, createdAt: true }).extend({
  photos: z.array(lotPhotoSchema).optional(),
});
export const insertRecipeSchema = createInsertSchema(recipes).omit({ id: true, createdAt: true });
export const insertRecipeItemSchema = createInsertSchema(recipeItems).omit({ id: true });
export const insertBatchSchema = createInsertSchema(batches).omit({ id: true, createdAt: true }).extend({
  startDate: z.union([z.string(), z.date(), z.null()]).transform((val) => val === null ? null : typeof val === 'string' ? new Date(val) : val).optional(),
  endDate: z.union([z.string(), z.date(), z.null()]).transform((val) => val === null ? null : typeof val === 'string' ? new Date(val) : val).optional(),
  finishTime: z.union([z.string(), z.date(), z.null()]).transform((val) => val === null ? null : typeof val === 'string' ? new Date(val) : val).optional(),
  productAssessment: z.object({
    result: z.enum(["pass", "conditional", "fail"]),
    notes: z.string().optional(),
  }).nullable().optional(),
});
export const insertBatchMaterialSchema = createInsertSchema(batchMaterials).omit({ id: true, addedAt: true });
export const insertBatchOutputSchema = createInsertSchema(batchOutputs).omit({ id: true, addedAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true }).extend({
  dueDate: z.union([z.string(), z.date()]).transform((val) => typeof val === 'string' ? new Date(val) : val),
});
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertQualityCheckSchema = createInsertSchema(qualityChecks).omit({ id: true, checkedAt: true });
export const insertStockMovementSchema = createInsertSchema(stockMovements).omit({ id: true, createdAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertLabelTemplateSchema = createInsertSchema(labelTemplates, {
  settings: z.record(z.unknown()).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const printHistory = pgTable("print_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  printedAt: timestamp("printed_at").notNull().defaultNow(),
  printedByUserId: varchar("printed_by_user_id").references(() => users.id),
  labelKind: text("label_kind").notNull(),
  templateId: varchar("template_id"),
  templateName: text("template_name"),
  entityType: text("entity_type"),
  entityId: varchar("entity_id"),
  displayName: text("display_name").notNull(),
  secondaryName: text("secondary_name"),
  snapshot: jsonb("snapshot").notNull(),
});

export const insertPrintHistorySchema = createInsertSchema(printHistory, {
  snapshot: z.record(z.unknown()),
}).omit({ id: true, printedAt: true });
export type InsertPrintHistory = z.infer<typeof insertPrintHistorySchema>;
export type PrintHistory = typeof printHistory.$inferSelect;
export type PrintLabelKind = "raw_intake" | "finished_output" | "output_lot" | "batch" | "custom";

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;
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
export type InsertBatchOutput = z.infer<typeof insertBatchOutputSchema>;
export type BatchOutput = typeof batchOutputs.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertQualityCheck = z.infer<typeof insertQualityCheckSchema>;
export type QualityCheck = typeof qualityChecks.$inferSelect;
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;
export type LotType = "raw_material" | "intermediate" | "finished_good";
export type LotStatus = "active" | "quarantined" | "released" | "consumed" | "expired";
export type SourceType = "supplier" | "farmer" | "internal_batch";
export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertLabelTemplate = z.infer<typeof insertLabelTemplateSchema>;
export type LabelTemplate = typeof labelTemplates.$inferSelect;
export type LabelTemplateType = "raw_intake" | "finished_output" | "batch";

export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  kind: varchar("kind", { length: 64 }).notNull(),
  name: text("name").notNull(),
  customerId: varchar("customer_id").references(() => customers.id),
  isDefault: boolean("is_default").notNull().default(false),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  kindIdx: index("templates_kind_idx").on(t.kind),
  kindCustomerIdx: index("templates_kind_customer_idx").on(t.kind, t.customerId),
}));

export const insertTemplateSchema = createInsertSchema(templates, {
  payload: z.unknown().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;

export const processCodeDefinitions = pgTable("process_code_definitions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: varchar("code", { length: 1 }).notNull().unique(),
  meaning: varchar("meaning", { length: 200 }).notNull(),
});

export const insertProcessCodeDefinitionSchema = z.object({
  code: z.string().min(1).max(1),
  meaning: z.string().min(1).max(200),
});
export type InsertProcessCodeDefinition = z.infer<typeof insertProcessCodeDefinitionSchema>;
export type ProcessCodeDefinition = typeof processCodeDefinitions.$inferSelect;

export const forecastStatusEnum = pgEnum("forecast_status", ["open", "converted", "archived"]);

export const forecastOrders = pgTable("forecast_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  expectedDate: timestamp("expected_date").notNull(),
  notes: text("notes"),
  status: forecastStatusEnum("status").notNull().default("open"),
  convertedOrderId: varchar("converted_order_id").references(() => orders.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const forecastOrdersRelations = relations(forecastOrders, ({ one }) => ({
  customer: one(customers, { fields: [forecastOrders.customerId], references: [customers.id] }),
  product: one(products, { fields: [forecastOrders.productId], references: [products.id] }),
  convertedOrder: one(orders, { fields: [forecastOrders.convertedOrderId], references: [orders.id] }),
}));

export const insertForecastOrderSchema = createInsertSchema(forecastOrders).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  expectedDate: z.union([z.string(), z.date()]).transform((val) => typeof val === 'string' ? new Date(val) : val),
});

export type InsertForecastOrder = z.infer<typeof insertForecastOrderSchema>;
export type ForecastOrder = typeof forecastOrders.$inferSelect;
export type ForecastStatus = "open" | "converted" | "archived";

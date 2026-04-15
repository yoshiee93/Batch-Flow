/**
 * storage.ts — interface contract (interface-only, no runtime implementation)
 *
 * The full implementation has been extracted into per-domain services and
 * repositories under server/domains/. This file retains the IStorage interface
 * as a compile-time contract reference only. There is no runtime DatabaseStorage
 * instance exported here — all API routes use domain services directly.
 *
 * Domain structure:
 *   server/domains/catalog/    — categories, products, materials, recipes
 *   server/domains/inventory/  — lots, stock movements, audit logs, receive-stock
 *   server/domains/production/ — batches, batch inputs/outputs, finalization
 *   server/domains/traceability/ — forward/backward lot traceability
 *   server/domains/quality/    — quality checks
 *   server/domains/customers/  — customers, orders, allocation
 *   server/domains/dashboard/  — dashboard stats
 *
 * All API routes use domain services directly via server/routes.ts.
 */

import type {
  User, InsertUser,
  Customer, InsertCustomer,
  Category, InsertCategory,
  Product, InsertProduct,
  Material, InsertMaterial,
  Lot, InsertLot,
  Recipe, InsertRecipe,
  RecipeItem, InsertRecipeItem,
  Batch, InsertBatch,
  BatchMaterial, InsertBatchMaterial,
  BatchOutput,
  Order, InsertOrder,
  OrderItem, InsertOrderItem,
  QualityCheck, InsertQualityCheck,
  StockMovement, InsertStockMovement,
  AuditLog, InsertAuditLog,
} from "@shared/schema";

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

  getStockMovements(limit?: number, batchId?: string): Promise<StockMovement[]>;
  createStockMovement(movement: InsertStockMovement): Promise<StockMovement>;

  getAuditLogs(entityType?: string, entityId?: string): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  getTraceabilityForward(lotId: string): Promise<any>;
  getTraceabilityBackward(batchId: string): Promise<any>;

  runStockAllocation(): Promise<void>;
  getOrdersWithAllocation(): Promise<(Order & { allocationStatus: string; items: (OrderItem & { productName: string })[] })[]>;
}

import { db } from "./db";
import {
  users, products, materials, lots, recipes, recipeItems,
  batches, batchMaterials, orders, orderItems
} from "@shared/schema";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  await db.execute(sql`TRUNCATE users, products, materials, lots, recipes, recipe_items, batches, batch_materials, orders, order_items, quality_checks, stock_movements, audit_logs CASCADE`);

  const [adminUser] = await db.insert(users).values([
    { username: "admin", password: "admin123", fullName: "John Doe", role: "admin" },
    { username: "manager", password: "manager123", fullName: "Jane Smith", role: "manager" },
    { username: "operator", password: "operator123", fullName: "Bob Wilson", role: "operator" },
  ]).returning();

  const productData = await db.insert(products).values([
    { sku: "FG-001", name: "Industrial Cleaner X500", unit: "KG", minStock: "1000", currentStock: "2500" },
    { sku: "FG-002", name: "Heavy Duty Degreaser", unit: "KG", minStock: "500", currentStock: "120" },
    { sku: "FG-003", name: "Surface Sanitizer Pro", unit: "KG", minStock: "800", currentStock: "950" },
    { sku: "FG-004", name: "Multi-Purpose Solvent", unit: "KG", minStock: "600", currentStock: "1200" },
  ]).returning();

  const materialData = await db.insert(materials).values([
    { sku: "RM-001", name: "Isopropyl Alcohol 99%", unit: "KG", minStock: "500", currentStock: "1200" },
    { sku: "RM-002", name: "Sodium Hydroxide", unit: "KG", minStock: "300", currentStock: "250" },
    { sku: "RM-003", name: "Surfactant Blend A", unit: "KG", minStock: "200", currentStock: "450" },
    { sku: "RM-004", name: "Citric Acid", unit: "KG", minStock: "100", currentStock: "180" },
    { sku: "RM-005", name: "Fragrance Oil (Lemon)", unit: "KG", minStock: "50", currentStock: "75" },
    { sku: "RM-006", name: "Distilled Water", unit: "KG", minStock: "2000", currentStock: "5000" },
    { sku: "PM-001", name: "5L HDPE Container", unit: "PC", minStock: "500", currentStock: "1200" },
    { sku: "PM-002", name: "Trigger Sprayer", unit: "PC", minStock: "1000", currentStock: "800" },
  ]).returning();

  const now = new Date();
  const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
  const subDays = (d: Date, days: number) => new Date(d.getTime() - days * 24 * 60 * 60 * 1000);

  const lotData = await db.insert(lots).values([
    { lotNumber: "LOT-2025-001", materialId: materialData[0].id, supplierLot: "SUP-A-2025-001", supplierName: "ChemCorp Inc", quantity: "500", remainingQuantity: "350", expiryDate: addDays(now, 365), receivedDate: subDays(now, 30) },
    { lotNumber: "LOT-2025-002", materialId: materialData[1].id, supplierLot: "SUP-B-2025-042", supplierName: "Industrial Chem Co", quantity: "300", remainingQuantity: "250", expiryDate: addDays(now, 180), receivedDate: subDays(now, 15) },
    { lotNumber: "LOT-2025-003", materialId: materialData[2].id, supplierLot: "SUP-C-2025-108", supplierName: "SurfaTech Ltd", quantity: "200", remainingQuantity: "150", expiryDate: addDays(now, 90), receivedDate: subDays(now, 7) },
    { lotNumber: "LOT-2025-004", materialId: materialData[0].id, supplierLot: "SUP-A-2025-002", supplierName: "ChemCorp Inc", quantity: "700", remainingQuantity: "700", expiryDate: addDays(now, 400), receivedDate: subDays(now, 2) },
  ]).returning();

  const recipeData = await db.insert(recipes).values([
    { productId: productData[0].id, version: 1, name: "Industrial Cleaner X500 v1", description: "Standard formula for industrial cleaning", instructions: "Mix alcohol and water. Add surfactant under agitation. Add fragrance last.", outputQuantity: "1000" },
    { productId: productData[1].id, version: 1, name: "Heavy Duty Degreaser v1", description: "High-strength degreaser formula", instructions: "Combine sodium hydroxide solution with surfactants. Mix thoroughly.", outputQuantity: "500" },
    { productId: productData[2].id, version: 1, name: "Surface Sanitizer Pro v1", description: "Alcohol-based sanitizer", instructions: "Mix isopropyl alcohol with distilled water. Add fragrance.", outputQuantity: "800" },
  ]).returning();

  await db.insert(recipeItems).values([
    { recipeId: recipeData[0].id, materialId: materialData[0].id, quantity: "300" },
    { recipeId: recipeData[0].id, materialId: materialData[5].id, quantity: "650" },
    { recipeId: recipeData[0].id, materialId: materialData[2].id, quantity: "40" },
    { recipeId: recipeData[0].id, materialId: materialData[4].id, quantity: "10" },
    { recipeId: recipeData[1].id, materialId: materialData[1].id, quantity: "150" },
    { recipeId: recipeData[1].id, materialId: materialData[2].id, quantity: "100" },
    { recipeId: recipeData[1].id, materialId: materialData[5].id, quantity: "250" },
    { recipeId: recipeData[2].id, materialId: materialData[0].id, quantity: "600" },
    { recipeId: recipeData[2].id, materialId: materialData[5].id, quantity: "180" },
    { recipeId: recipeData[2].id, materialId: materialData[4].id, quantity: "20" },
  ]);

  const batchData = await db.insert(batches).values([
    { batchNumber: "BATCH-2025-001", productId: productData[0].id, recipeId: recipeData[0].id, status: "released", plannedQuantity: "1000", actualQuantity: "1000", startDate: subDays(now, 5), endDate: subDays(now, 4), assignedTo: adminUser.id },
    { batchNumber: "BATCH-2025-002", productId: productData[0].id, recipeId: recipeData[0].id, status: "quality_check", plannedQuantity: "1500", actualQuantity: "1480", startDate: subDays(now, 2), assignedTo: adminUser.id },
    { batchNumber: "BATCH-2025-003", productId: productData[1].id, recipeId: recipeData[1].id, status: "in_progress", plannedQuantity: "500", startDate: now, assignedTo: adminUser.id },
    { batchNumber: "BATCH-2025-004", productId: productData[2].id, recipeId: recipeData[2].id, status: "planned", plannedQuantity: "2000", startDate: addDays(now, 1) },
  ]).returning();

  await db.insert(batchMaterials).values([
    { batchId: batchData[0].id, lotId: lotData[0].id, materialId: materialData[0].id, quantity: "300", addedBy: adminUser.id },
    { batchId: batchData[1].id, lotId: lotData[0].id, materialId: materialData[0].id, quantity: "450", addedBy: adminUser.id },
    { batchId: batchData[2].id, lotId: lotData[1].id, materialId: materialData[1].id, quantity: "150", addedBy: adminUser.id },
  ]);

  const orderData = await db.insert(orders).values([
    { orderNumber: "ORD-2025-001", customerName: "Acme Manufacturing Ltd", status: "pending", priority: "high", dueDate: addDays(now, 3) },
    { orderNumber: "ORD-2025-002", customerName: "CleanTech Solutions", status: "in_production", priority: "urgent", dueDate: addDays(now, 1) },
    { orderNumber: "ORD-2025-003", customerName: "Global Distributors Inc", status: "ready", priority: "normal", dueDate: addDays(now, 7) },
    { orderNumber: "ORD-2025-004", customerName: "Metro Supplies Co", status: "pending", priority: "low", dueDate: addDays(now, 14) },
  ]).returning();

  await db.insert(orderItems).values([
    { orderId: orderData[0].id, productId: productData[0].id, quantity: "500" },
    { orderId: orderData[0].id, productId: productData[1].id, quantity: "200" },
    { orderId: orderData[1].id, productId: productData[2].id, quantity: "1000" },
    { orderId: orderData[2].id, productId: productData[0].id, quantity: "1000" },
    { orderId: orderData[3].id, productId: productData[1].id, quantity: "100" },
    { orderId: orderData[3].id, productId: productData[2].id, quantity: "500" },
  ]);

  console.log("Database seeded successfully!");
  console.log(`Created: ${productData.length} products, ${materialData.length} materials, ${lotData.length} lots, ${recipeData.length} recipes, ${batchData.length} batches, ${orderData.length} orders`);
}

seed().catch(console.error).finally(() => process.exit(0));

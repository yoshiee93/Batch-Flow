import { Product, Material, Lot, Batch, Recipe, Order } from './types';
import { addDays, subDays } from 'date-fns';

export const mockProducts: Product[] = [
  { id: 'p1', sku: 'FG-001', name: 'Industrial Cleaner X500', unit: 'KG', minStock: 1000, currentStock: 2500 },
  { id: 'p2', sku: 'FG-002', name: 'Heavy Duty Degreaser', unit: 'KG', minStock: 500, currentStock: 120 },
  { id: 'p3', sku: 'FG-003', name: 'Hand Sanitizer Gel', unit: 'KG', minStock: 2000, currentStock: 4500 },
];

export const mockMaterials: Material[] = [
  { id: 'm1', sku: 'RM-101', name: 'Isopropyl Alcohol 99%', unit: 'KG', minStock: 5000, currentStock: 8000 },
  { id: 'm2', sku: 'RM-102', name: 'Glycerin', unit: 'KG', minStock: 200, currentStock: 450 },
  { id: 'm3', sku: 'RM-103', name: 'Fragrance Lemon', unit: 'KG', minStock: 50, currentStock: 42 },
  { id: 'm4', sku: 'RM-104', name: 'Distilled Water', unit: 'KG', minStock: 10000, currentStock: 12000 },
];

export const mockLots: Lot[] = [
  { id: 'l1', itemId: 'm1', itemType: 'material', lotNumber: 'SUP-A-2023-001', supplierLot: 'BATCH-882', quantity: 5000, expiryDate: addDays(new Date(), 365).toISOString(), status: 'active' },
  { id: 'l2', itemId: 'm1', itemType: 'material', lotNumber: 'SUP-A-2023-002', supplierLot: 'BATCH-889', quantity: 3000, expiryDate: addDays(new Date(), 400).toISOString(), status: 'active' },
  { id: 'l3', itemId: 'm2', itemType: 'material', lotNumber: 'SUP-B-992', quantity: 450, expiryDate: addDays(new Date(), 180).toISOString(), status: 'active' },
  { id: 'l4', itemId: 'p1', itemType: 'product', lotNumber: 'PROD-2024-001', quantity: 1000, expiryDate: addDays(new Date(), 730).toISOString(), status: 'released' },
  { id: 'l5', itemId: 'p1', itemType: 'product', lotNumber: 'PROD-2024-002', quantity: 1500, expiryDate: addDays(new Date(), 730).toISOString(), status: 'quarantined' },
];

export const mockRecipes: Recipe[] = [
  { 
    id: 'r1', productId: 'p1', version: '1.0', 
    items: [
      { materialId: 'm1', quantity: 0.7 },
      { materialId: 'm4', quantity: 0.25 },
      { materialId: 'm3', quantity: 0.05 },
    ],
    instructions: "Mix alcohol and water. Add fragrance slowly under agitation."
  }
];

export const mockBatches: Batch[] = [
  { 
    id: 'b1', batchNumber: 'BATCH-2025-001', productId: 'p1', recipeId: 'r1', 
    status: 'released', plannedQuantity: 1000, actualQuantity: 1000, 
    startDate: subDays(new Date(), 5).toISOString(), endDate: subDays(new Date(), 4).toISOString() 
  },
  { 
    id: 'b2', batchNumber: 'BATCH-2025-002', productId: 'p1', recipeId: 'r1', 
    status: 'quality_check', plannedQuantity: 1500, actualQuantity: 1480, 
    startDate: subDays(new Date(), 2).toISOString() 
  },
  { 
    id: 'b3', batchNumber: 'BATCH-2025-003', productId: 'p2', recipeId: 'r1', 
    status: 'in_progress', plannedQuantity: 500, 
    startDate: new Date().toISOString() 
  },
  { 
    id: 'b4', batchNumber: 'BATCH-2025-004', productId: 'p3', recipeId: 'r1', 
    status: 'planned', plannedQuantity: 2000, 
    startDate: addDays(new Date(), 1).toISOString() 
  },
];

export const mockOrders: Order[] = [
  {
    id: 'o1',
    orderNumber: 'ORD-2025-001',
    customerName: 'Acme Manufacturing Ltd',
    status: 'pending',
    priority: 'high',
    items: [
      { productId: 'p1', quantity: 500 },
      { productId: 'p2', quantity: 200 },
    ],
    dueDate: addDays(new Date(), 3).toISOString(),
    createdAt: subDays(new Date(), 2).toISOString(),
  },
  {
    id: 'o2',
    orderNumber: 'ORD-2025-002',
    customerName: 'CleanTech Solutions',
    status: 'in_production',
    priority: 'urgent',
    items: [
      { productId: 'p3', quantity: 1000 },
    ],
    dueDate: addDays(new Date(), 1).toISOString(),
    createdAt: subDays(new Date(), 5).toISOString(),
  },
  {
    id: 'o3',
    orderNumber: 'ORD-2025-003',
    customerName: 'Global Distributors Inc',
    status: 'ready',
    priority: 'normal',
    items: [
      { productId: 'p1', quantity: 1000 },
    ],
    dueDate: addDays(new Date(), 7).toISOString(),
    createdAt: subDays(new Date(), 10).toISOString(),
  },
  {
    id: 'o4',
    orderNumber: 'ORD-2025-004',
    customerName: 'Metro Supplies Co',
    status: 'pending',
    priority: 'low',
    items: [
      { productId: 'p2', quantity: 100 },
      { productId: 'p3', quantity: 500 },
    ],
    dueDate: addDays(new Date(), 14).toISOString(),
    createdAt: subDays(new Date(), 1).toISOString(),
  },
];

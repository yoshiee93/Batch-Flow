export interface Product {
  id: string;
  sku: string;
  name: string;
  unit: string;
  minStock: number;
  currentStock: number;
}

export interface Material {
  id: string;
  sku: string;
  name: string;
  unit: string;
  minStock: number;
  currentStock: number;
}

export interface Lot {
  id: string;
  itemId: string; // Product or Material ID
  itemType: 'material' | 'product';
  lotNumber: string;
  supplierLot?: string;
  quantity: number;
  expiryDate: string;
  status: 'active' | 'quarantined' | 'depleted' | 'expired' | 'released';
  location?: string;
}

export interface RecipeItem {
  materialId: string;
  quantity: number;
}

export interface Recipe {
  id: string;
  productId: string;
  version: string;
  items: RecipeItem[];
  instructions: string;
}

export interface Batch {
  id: string;
  batchNumber: string;
  productId: string;
  recipeId: string;
  status: 'planned' | 'in_progress' | 'quality_check' | 'completed' | 'released' | 'quarantined';
  plannedQuantity: number;
  actualQuantity?: number;
  startDate: string;
  endDate?: string;
  assignedTo?: string;
}

export interface BatchAction {
  id: string;
  batchId: string;
  type: 'status_change' | 'material_addition' | 'note' | 'quality_check';
  description: string;
  timestamp: string;
  user: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  status: 'pending' | 'in_production' | 'ready' | 'shipped' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  items: OrderItem[];
  dueDate: string;
  createdAt: string;
  notes?: string;
}

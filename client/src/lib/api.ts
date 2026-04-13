import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = "/api";

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }
  if (res.status === 204) {
    return {} as T;
  }
  return res.json();
}

export interface Category {
  id: string;
  name: string;
  excludeFromYield: boolean;
  showInTabs: boolean;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  minStock: string;
  currentStock: string;
  categoryId: string | null;
  active: boolean;
  createdAt: string;
}

export interface Material {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  minStock: string;
  currentStock: string;
  categoryId: string | null;
  active: boolean;
  createdAt: string;
}

export interface Lot {
  id: string;
  lotNumber: string;
  lotType: string | null;
  status: string | null;
  barcodeValue: string | null;
  materialId: string | null;
  productId: string | null;
  supplierLot: string | null;
  supplierName: string | null;
  sourceName: string | null;
  sourceType: string | null;
  originalQuantity: string | null;
  quantity: string;
  remainingQuantity: string;
  expiryDate: string | null;
  receivedDate: string;
  producedDate: string | null;
  sourceBatchId: string | null;
  barcodePrintedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface LotWithDetails extends Lot {
  materialName?: string;
  materialUnit?: string;
  productName?: string;
  productUnit?: string;
}

export interface Recipe {
  id: string;
  productId: string;
  version: number;
  name: string;
  description: string | null;
  instructions: string | null;
  outputQuantity: string;
  active: boolean;
  createdAt: string;
}

export interface RecipeItem {
  id: string;
  recipeId: string;
  materialId: string;
  quantity: string;
  notes: string | null;
  materialName?: string;
  materialUnit?: string;
}

export interface Batch {
  id: string;
  batchNumber: string;
  productId: string;
  recipeId: string | null;
  status: "planned" | "in_progress" | "quality_check" | "completed" | "released" | "quarantined";
  plannedQuantity: string;
  actualQuantity: string | null;
  wasteQuantity: string | null;
  millingQuantity: string | null;
  wetQuantity: string | null;
  startDate: string | null;
  endDate: string | null;
  assignedTo: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string | null;
  customerName: string;
  status: "pending" | "in_production" | "ready" | "shipped" | "cancelled";
  priority: "low" | "normal" | "high" | "urgent";
  dueDate: string;
  notes: string | null;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: string;
  reservedQuantity: string;
}

export interface OrderItemWithProduct extends OrderItem {
  productName: string;
}

export interface OrderWithAllocation extends Order {
  allocationStatus: 'ready_to_ship' | 'partially_allocated' | 'awaiting_stock';
  items: OrderItemWithProduct[];
}

export interface DashboardStats {
  activeBatches: number;
  pendingOrders: number;
  lowStockAlerts: number;
  totalProducts: number;
}

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => fetchApi("/categories"),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Category, "id" | "createdAt">) =>
      fetchApi<Category>("/categories", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Category> & { id: string }) =>
      fetchApi<Category>(`/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: () => fetchApi("/products"),
  });
}

export function useProductsByCategory(categoryId: string | null) {
  return useQuery<Product[]>({
    queryKey: ["products", "category", categoryId],
    queryFn: () => fetchApi(`/products/by-category/${categoryId}`),
    enabled: !!categoryId,
  });
}

export function useMaterials() {
  return useQuery<Material[]>({
    queryKey: ["materials"],
    queryFn: () => fetchApi("/materials"),
  });
}

export function useLots() {
  return useQuery<Lot[]>({
    queryKey: ["lots"],
    queryFn: () => fetchApi("/lots"),
  });
}

export function useRecipes() {
  return useQuery<Recipe[]>({
    queryKey: ["recipes"],
    queryFn: () => fetchApi("/recipes"),
  });
}

export function useRecipeItems(recipeId: string) {
  return useQuery<RecipeItem[]>({
    queryKey: ["recipeItems", recipeId],
    queryFn: () => fetchApi(`/recipes/${recipeId}/items`),
    enabled: !!recipeId,
  });
}

export function useBatches() {
  return useQuery<Batch[]>({
    queryKey: ["batches"],
    queryFn: () => fetchApi("/batches"),
  });
}

export function useBatch(batchId: string) {
  return useQuery<Batch>({
    queryKey: ["batch", batchId],
    queryFn: () => fetchApi(`/batches/${batchId}`),
    enabled: !!batchId,
  });
}

export function useOrders() {
  return useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: () => fetchApi("/orders"),
  });
}

export function useOrdersWithAllocation() {
  return useQuery<OrderWithAllocation[]>({
    queryKey: ["ordersWithAllocation"],
    queryFn: () => fetchApi("/orders/with-allocation"),
  });
}

export function useRunAllocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fetchApi("/allocation/run", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordersWithAllocation"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orderItems"] });
    },
  });
}

export function useOrderItems(orderId: string) {
  return useQuery<OrderItem[]>({
    queryKey: ["orderItems", orderId],
    queryFn: () => fetchApi(`/orders/${orderId}/items`),
    enabled: !!orderId,
  });
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["dashboardStats"],
    queryFn: () => fetchApi("/dashboard/stats"),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Product>) => fetchApi<Product>("/products", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inputItems"] });
      queryClient.invalidateQueries({ queryKey: ["outputItems"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Product>) =>
      fetchApi<Product>(`/products/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inputItems"] });
      queryClient.invalidateQueries({ queryKey: ["outputItems"] });
    },
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Material>) => fetchApi<Material>("/materials", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["materials"] }),
  });
}

export function useCreateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Batch>) => fetchApi<Batch>("/batches", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useUpdateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Batch>) =>
      fetchApi<Batch>(`/batches/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useDeleteBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/batches/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export interface BatchMaterial {
  id: string;
  batchId: string;
  materialId: string | null;
  productId: string | null;
  lotId: string | null;
  quantity: string;
}

export function useBatchMaterials(batchId: string) {
  return useQuery<BatchMaterial[]>({
    queryKey: ["batchMaterials", batchId],
    queryFn: () => fetchApi(`/batches/${batchId}/materials`),
    enabled: !!batchId,
  });
}

export function useRecordBatchInput() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, materialId, productId, quantity, lotId, sourceLotId }: {
      batchId: string; materialId?: string; productId?: string; quantity: string; lotId?: string; sourceLotId?: string;
    }) =>
      fetchApi<BatchMaterial>(`/batches/${batchId}/input`, { method: "POST", body: JSON.stringify({ materialId, productId, quantity, lotId, sourceLotId }) }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["batchMaterials", variables.batchId] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useReceiveStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      materialId: string;
      quantity: string;
      supplierName?: string;
      sourceName?: string;
      supplierLot?: string;
      sourceType?: string;
      receivedDate?: string;
      expiryDate?: string;
      notes?: string;
    }) => fetchApi<{ lot: LotWithDetails; movement: Record<string, unknown> }>("/receive-stock", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function fetchLotByBarcode(value: string): Promise<LotWithDetails> {
  return fetchApi<LotWithDetails>(`/lots/barcode/${encodeURIComponent(value)}`);
}

export function useMarkBarcodePrinted() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lotId: string) => fetchApi<Lot>(`/lots/${lotId}/barcode-printed`, { method: "PATCH" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lots"] }),
  });
}

export function useRemoveBatchMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/batch-materials/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["batchMaterials"] });
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useUpdateBatchMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: string }) =>
      fetchApi<BatchMaterial>(`/batch-materials/${id}`, { method: "PATCH", body: JSON.stringify({ quantity }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["batchMaterials"] });
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useRecordBatchOutput() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, actualQuantity, wasteQuantity, millingQuantity, markCompleted }: { 
      batchId: string; 
      actualQuantity: string; 
      wasteQuantity: string; 
      millingQuantity: string;
      markCompleted: boolean;
    }) =>
      fetchApi<Batch>(`/batches/${batchId}/output`, { 
        method: "POST", 
        body: JSON.stringify({ actualQuantity, wasteQuantity, millingQuantity, markCompleted }) 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export interface BatchOutput {
  id: string;
  batchId: string;
  productId: string | null;
  quantity: string;
  actualQuantity: string | null;
  lotId: string | null;
  notes: string | null;
  addedAt: string;
}

export function useBatchOutputs(batchId: string) {
  return useQuery<BatchOutput[]>({
    queryKey: ["batchOutputs", batchId],
    queryFn: () => fetchApi(`/batches/${batchId}/outputs`),
    enabled: !!batchId,
  });
}

export function useAddBatchOutput() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, productId, quantity }: { batchId: string; productId: string; quantity: string }) =>
      fetchApi<BatchOutput>(`/batches/${batchId}/outputs`, { 
        method: "POST", 
        body: JSON.stringify({ productId, quantity }) 
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["batchOutputs", variables.batchId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["outputItems"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useRemoveBatchOutput() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/batch-outputs/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["batchOutputs"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["outputItems"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useFinalizeBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, wasteQuantity, millingQuantity, wetQuantity, markCompleted }: { 
      batchId: string; 
      wasteQuantity: string; 
      millingQuantity: string;
      wetQuantity: string;
      markCompleted: boolean;
    }) =>
      fetchApi<Batch>(`/batches/${batchId}/finalize`, { 
        method: "POST", 
        body: JSON.stringify({ wasteQuantity, millingQuantity, wetQuantity, markCompleted }) 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Order>) => fetchApi<Order>("/orders", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Order>) =>
      fetchApi<Order>(`/orders/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useCompleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      fetchApi<{ order: Order; movements: any[] }>(`/orders/${orderId}/complete`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithAllocation"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useTraceabilityForward(lotId: string) {
  return useQuery<Record<string, unknown>>({
    queryKey: ["traceability", "forward", lotId],
    queryFn: () => fetchApi<Record<string, unknown>>(`/traceability/forward/${lotId}`),
    enabled: !!lotId,
  });
}

export function useTraceabilityBackward(batchId: string) {
  return useQuery<Record<string, unknown>>({
    queryKey: ["traceability", "backward", batchId],
    queryFn: () => fetchApi<Record<string, unknown>>(`/traceability/backward/${batchId}`),
    enabled: !!batchId,
  });
}

export function useCustomers() {
  return useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: () => fetchApi("/customers"),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Customer>) => fetchApi<Customer>("/customers", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Customer>) =>
      fetchApi<Customer>(`/customers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/customers/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inputItems"] });
      queryClient.invalidateQueries({ queryKey: ["outputItems"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Material>) =>
      fetchApi<Material>(`/materials/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["materials"] }),
  });
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/materials/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useUpdateLot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Lot>) =>
      fetchApi<Lot>(`/lots/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lots"] }),
  });
}

export function useDeleteLot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/lots/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lots"] }),
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/orders/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useCreateOrderItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, ...data }: { orderId: string; productId: string; quantity: string }) =>
      fetchApi<OrderItem>(`/orders/${orderId}/items`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orderItems"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useDeleteOrderItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/order-items/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orderItems"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

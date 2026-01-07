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
  return res.json();
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  minStock: string;
  currentStock: string;
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
  active: boolean;
  createdAt: string;
}

export interface Lot {
  id: string;
  lotNumber: string;
  materialId: string | null;
  productId: string | null;
  supplierLot: string | null;
  supplierName: string | null;
  quantity: string;
  remainingQuantity: string;
  expiryDate: string | null;
  receivedDate: string;
  sourceBatchId: string | null;
  notes: string | null;
  createdAt: string;
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
}

export interface Batch {
  id: string;
  batchNumber: string;
  productId: string;
  recipeId: string;
  status: "planned" | "in_progress" | "quality_check" | "completed" | "released" | "quarantined";
  plannedQuantity: string;
  actualQuantity: string | null;
  startDate: string | null;
  endDate: string | null;
  assignedTo: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
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

export interface DashboardStats {
  activeBatches: number;
  pendingOrders: number;
  lowStockAlerts: number;
  totalProducts: number;
}

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: () => fetchApi("/products"),
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

export function useOrders() {
  return useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: () => fetchApi("/orders"),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Product>) =>
      fetchApi<Product>(`/products/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
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

export function useTraceabilityForward(lotId: string) {
  return useQuery({
    queryKey: ["traceability", "forward", lotId],
    queryFn: () => fetchApi(`/traceability/forward/${lotId}`),
    enabled: !!lotId,
  });
}

export function useTraceabilityBackward(batchId: string) {
  return useQuery({
    queryKey: ["traceability", "backward", batchId],
    queryFn: () => fetchApi(`/traceability/backward/${batchId}`),
    enabled: !!batchId,
  });
}

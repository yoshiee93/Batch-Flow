import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetchApi";

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
  defaultLabelTemplateId: string | null;
  requiresTesting: boolean;
  createdAt: string;
}

export interface OrderTestingBlocker {
  lotId: string;
  lotNumber: string;
  productId: string;
  productName: string;
  testingStatus: string;
}

export type OrderStatus =
  | "pending"
  | "in_production"
  | "ready"
  | "packed"
  | "partially_packed"
  | "shipped"
  | "completed"
  | "cancelled";

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string | null;
  customerName: string;
  status: OrderStatus;
  priority: "low" | "normal" | "high" | "urgent";
  dueDate: string;
  notes: string | null;
  poNumber: string | null;
  customBatchNumber: string | null;
  freight: string | null;
  shippedAt: string | null;
  shippingCarrier: string | null;
  trackingReference: string | null;
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

export type AllocationStatus =
  | "awaiting_stock"
  | "partially_allocated"
  | "ready_to_ship"
  | "packed"
  | "partially_packed"
  | "shipped"
  | "cancelled";

export interface OrderWithAllocation extends Order {
  allocationStatus: AllocationStatus;
  items: OrderItemWithProduct[];
  customerRequiresTesting?: boolean;
  testingBlockers?: OrderTestingBlocker[];
}

export interface LotAvailability {
  lotId: string;
  lotNumber: string;
  remainingQuantity: number;
  expiryDate: string | null;
  producedDate: string | null;
  receivedDate: string;
  status: string;
}

export interface StockCheckItem {
  orderItemId: string;
  productId: string;
  productName: string;
  unit: string;
  required: number;
  available: number;
  shortfall: number;
  availableLots: LotAvailability[];
}

export interface OrderStockCheck {
  allAvailable: boolean;
  hasAnyAvailable: boolean;
  items: StockCheckItem[];
}

export interface OrderAllocation {
  id: string;
  orderId: string;
  orderItemId: string;
  productId: string;
  lotId: string;
  quantityAllocated: string;
  packedBy: string | null;
  packedAt: string;
  createdAt: string;
}

export function useOrderTestingBlockers(orderId: string | null) {
  return useQuery<OrderTestingBlocker[]>({
    queryKey: ["orderTestingBlockers", orderId],
    queryFn: () => fetchApi(`/orders/${orderId}/testing-blockers`),
    enabled: !!orderId,
  });
}

export function useOrderStockCheck(orderId: string | null) {
  return useQuery<OrderStockCheck>({
    queryKey: ["orderStockCheck", orderId],
    queryFn: () => fetchApi(`/orders/${orderId}/stock-check`),
    enabled: !!orderId,
  });
}

export function useOrderAllocations(orderId: string | null) {
  return useQuery<OrderAllocation[]>({
    queryKey: ["orderAllocations", orderId],
    queryFn: () => fetchApi(`/orders/${orderId}/allocations`),
    enabled: !!orderId,
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

export function useOrders(options?: { enabled?: boolean }) {
  return useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: () => fetchApi("/orders"),
    enabled: options?.enabled !== false,
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

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Order>) => fetchApi<Order>("/orders", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithAllocation"] });
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
      queryClient.invalidateQueries({ queryKey: ["ordersWithAllocation"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useCompleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      fetchApi<{ order: Order; movements: Record<string, unknown>[] }>(`/orders/${orderId}/complete`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithAllocation"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function usePackOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      allocations,
    }: {
      orderId: string;
      allocations: { orderItemId: string; lotId: string; quantityAllocated: number }[];
    }) =>
      fetchApi<Order>(`/orders/${orderId}/pack`, {
        method: "POST",
        body: JSON.stringify({ allocations }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordersWithAllocation"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orderAllocations"] });
      queryClient.invalidateQueries({ queryKey: ["orderStockCheck"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useShipOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      shippingCarrier,
      trackingReference,
      shippedAt,
    }: {
      orderId: string;
      shippingCarrier?: string;
      trackingReference?: string;
      shippedAt?: string;
    }) =>
      fetchApi<{ order: Order; movements: Record<string, unknown>[] }>(`/orders/${orderId}/ship`, {
        method: "POST",
        body: JSON.stringify({ shippingCarrier, trackingReference, shippedAt }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordersWithAllocation"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/orders/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithAllocation"] });
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
      queryClient.invalidateQueries({ queryKey: ["ordersWithAllocation"] });
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
      queryClient.invalidateQueries({ queryKey: ["ordersWithAllocation"] });
    },
  });
}

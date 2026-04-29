import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetchApi";
import type { LotType, LotStatus, SourceType } from "@shared/schema";

export type { LotType, LotStatus, SourceType };

export interface Lot {
  id: string;
  lotNumber: string;
  lotType: LotType;
  status: LotStatus;
  barcodeValue: string | null;
  materialId: string | null;
  productId: string | null;
  supplierLot: string | null;
  supplierName: string | null;
  sourceName: string | null;
  sourceType: SourceType | null;
  originalQuantity: string | null;
  quantity: string;
  remainingQuantity: string;
  expiryDate: string | null;
  receivedDate: string;
  producedDate: string | null;
  sourceBatchId: string | null;
  customerId: string | null;
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

export interface InputLot {
  batchMaterialId: string;
  lotId: string;
  lotNumber: string;
  barcodeValue: string | null;
  lotType: string;
  status: string;
  materialId: string | null;
  materialName: string | null;
  productId: string | null;
  productName: string | null;
  supplierName: string | null;
  supplierLot: string | null;
  sourceType: string | null;
  receivedDate: string | null;
  expiryDate: string | null;
  quantityConsumed: string;
  remainingQuantity: string | null;
  addedAt: string | null;
}

export interface OutputLot {
  lotId: string;
  lotNumber: string;
  barcodeValue: string | null;
  lotType: string;
  status: string;
  productId: string | null;
  productName: string | null;
  quantity: string;
  remainingQuantity: string | null;
  producedDate: string | null;
  expiryDate: string | null;
  barcodePrintedAt: string | null;
  customerId: string | null;
}

export interface StockMovement {
  id: string;
  movementType: string;
  materialId: string | null;
  productId: string | null;
  lotId: string | null;
  batchId: string | null;
  orderId: string | null;
  quantity: string;
  reference: string | null;
  createdBy: string | null;
  createdAt: string;
}

export function useLots() {
  return useQuery<Lot[]>({
    queryKey: ["lots"],
    queryFn: () => fetchApi("/lots"),
  });
}

export function useLotById(lotId: string) {
  return useQuery<Lot>({
    queryKey: ["lot", lotId],
    queryFn: () => fetchApi<Lot>(`/lots/${lotId}`),
    enabled: !!lotId,
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

export interface ReceivableItem {
  id: string;
  name: string;
  sku: string;
  unit: string;
  itemType: "material" | "product";
}

export function useReceivableItems() {
  return useQuery<ReceivableItem[]>({
    queryKey: ["receivableItems"],
    queryFn: () => fetchApi<ReceivableItem[]>("/receivable-items"),
  });
}

export function useReceiveStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      itemId: string;
      itemType: "material" | "product";
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
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["receivableItems"] });
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
    onSuccess: (_, lotId) => {
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["lot", lotId] });
      queryClient.invalidateQueries({ queryKey: ["batchOutputLots"] });
    },
  });
}

export function useStockMovements(batchId?: string) {
  return useQuery<StockMovement[]>({
    queryKey: ["stockMovements", batchId ?? "all"],
    queryFn: () => {
      const params = batchId ? `?batchId=${encodeURIComponent(batchId)}` : "";
      return fetchApi<StockMovement[]>(`/stock-movements${params}`);
    },
  });
}

export interface AuditLog {
  id: string;
  userId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  changes: string | null;
  createdAt: string;
}

export function useAuditLogs(entityType?: string, entityId?: string) {
  return useQuery<AuditLog[]>({
    queryKey: ["auditLogs", entityType ?? "", entityId ?? ""],
    queryFn: () => {
      const params = new URLSearchParams();
      if (entityType) params.set("entityType", entityType);
      if (entityId) params.set("entityId", entityId);
      return fetchApi<AuditLog[]>(`/audit-logs?${params.toString()}`);
    },
    enabled: !!entityType,
  });
}

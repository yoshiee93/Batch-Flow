import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetchApi";

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

export function useStockMovements(batchId?: string) {
  return useQuery<StockMovement[]>({
    queryKey: ["stockMovements", batchId ?? "all"],
    queryFn: () => {
      const params = batchId ? `?batchId=${encodeURIComponent(batchId)}` : "";
      return fetchApi<StockMovement[]>(`/stock-movements${params}`);
    },
  });
}

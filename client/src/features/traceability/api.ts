import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetchApi";
import type { Lot, InputLot, OutputLot } from "@/features/inventory/api";

export interface LotUsageEntry {
  batchId: string;
  batchNumber: string;
  batchStatus: string;
  productId: string;
  productName: string;
  quantityConsumed: string;
  addedAt: string | null;
}

export interface LotLineageResponse {
  lot: Lot;
  sourceBatch: Record<string, unknown> | null;
  sourceInputLots: InputLot[];
  usedInBatches: LotUsageEntry[];
  outputLots: Array<OutputLot & { fromBatchId?: string; fromBatchNumber?: string }>;
}

export interface ForwardTraceBatchUsage {
  batch: {
    id: string;
    batchNumber: string;
    batchCode: string | null;
    status: string;
    plannedQuantity: string;
    actualQuantity: string | null;
  };
  product: {
    id: string;
    name: string;
    unit: string;
  };
  quantityUsed: string;
}

export interface ForwardTraceResponse {
  lot: Lot;
  usedInBatches: ForwardTraceBatchUsage[];
  outputLots: Lot[];
}

export interface BackwardTraceMaterialUsed {
  material: {
    id: string;
    name: string;
    unit: string;
  };
  lot: Lot;
  quantityUsed: string;
}

export interface BackwardTraceResponse {
  batch: {
    id: string;
    batchNumber: string;
    batchCode: string | null;
    status: string;
    plannedQuantity: string;
    actualQuantity: string | null;
    startDate: string | null;
    endDate: string | null;
    barcodeValue: string | null;
    barcodePrintedAt: string | null;
  };
  product?: {
    id: string;
    name: string;
    unit: string;
  };
  recipe: {
    id: string;
    name: string;
    version: number;
    outputQuantity: string;
  } | null;
  materialsUsed: BackwardTraceMaterialUsed[];
}

export function useTraceabilityForward(lotId: string) {
  return useQuery<ForwardTraceResponse>({
    queryKey: ["traceability", "forward", lotId],
    queryFn: () => fetchApi<ForwardTraceResponse>(`/traceability/forward/${lotId}`),
    enabled: !!lotId,
  });
}

export function useTraceabilityBackward(batchId: string) {
  return useQuery<BackwardTraceResponse>({
    queryKey: ["traceability", "backward", batchId],
    queryFn: () => fetchApi<BackwardTraceResponse>(`/traceability/backward/${batchId}`),
    enabled: !!batchId,
  });
}

export function useLotUsage(lotId: string) {
  return useQuery<LotUsageEntry[]>({
    queryKey: ["lotUsage", lotId],
    queryFn: () => fetchApi<LotUsageEntry[]>(`/lots/${lotId}/usage`),
    enabled: !!lotId,
  });
}

export function useLotLineage(lotId: string) {
  return useQuery<LotLineageResponse>({
    queryKey: ["lotLineage", lotId],
    queryFn: () => fetchApi<LotLineageResponse>(`/lots/${lotId}/lineage`),
    enabled: !!lotId,
  });
}

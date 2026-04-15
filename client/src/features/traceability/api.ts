import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetchApi";
import type { Lot } from "@/features/inventory/api";
import type { InputLot, OutputLot } from "@/features/production/api";

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

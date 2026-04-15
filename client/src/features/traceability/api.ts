import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetchApi";

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

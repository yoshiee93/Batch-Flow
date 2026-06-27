import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetchApi";

export interface OpsLogEntry {
  id: string;
  sourceType: string;
  sourceId: string;
  noteType: string;
  content: string;
  severity: "info" | "warning" | "issue";
  status: "open" | "reviewed" | "resolved";
  createdAt: string;
  updatedAt: string;
}

export function useOpsLog(filters?: {
  noteType?: string;
  severity?: string;
  status?: string;
  q?: string;
  from?: string;
  to?: string;
  sourceId?: string;
  sourceType?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.noteType) params.set("noteType", filters.noteType);
  if (filters?.severity) params.set("severity", filters.severity);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.q) params.set("q", filters.q);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  if (filters?.sourceId) params.set("sourceId", filters.sourceId);
  if (filters?.sourceType) params.set("sourceType", filters.sourceType);
  if (filters?.limit != null) params.set("limit", String(filters.limit));
  if (filters?.offset != null) params.set("offset", String(filters.offset));
  const qs = params.toString();

  return useQuery<OpsLogEntry[]>({
    queryKey: ["opsLog", filters],
    queryFn: () => fetchApi(`/operations-log${qs ? `?${qs}` : ""}`),
  });
}

export function useUpdateOpsLogStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "open" | "reviewed" | "resolved" }) =>
      fetchApi<OpsLogEntry>(`/operations-log/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opsLog"] });
    },
  });
}

export function useUpdateOpsLogSeverity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, severity }: { id: string; severity: "info" | "warning" | "issue" }) =>
      fetchApi<OpsLogEntry>(`/operations-log/${id}/severity`, {
        method: "PATCH",
        body: JSON.stringify({ severity }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opsLog"] });
    },
  });
}

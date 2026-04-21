import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetchApi";

export interface AppUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
  active: boolean;
}

export function useUsers() {
  return useQuery<AppUser[]>({
    queryKey: ["users"],
    queryFn: () => fetchApi("/users"),
  });
}

export interface QualityCheck {
  id: string;
  batchId: string;
  checkType: string;
  result: "pass" | "fail" | "pending";
  value: string | null;
  notes: string | null;
  checkedBy: string | null;
  checkedAt: string;
}

export interface CreateQualityCheckInput {
  checkType: string;
  result: "pass" | "fail" | "pending";
  value?: string;
  notes?: string;
}

export function useQualityChecks(batchId: string) {
  return useQuery<QualityCheck[]>({
    queryKey: ["qualityChecks", batchId],
    queryFn: () => fetchApi(`/batches/${batchId}/quality-checks`),
    enabled: !!batchId,
  });
}

export function useCreateQualityCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, ...data }: { batchId: string } & CreateQualityCheckInput) =>
      fetchApi<QualityCheck>(`/batches/${batchId}/quality-checks`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["qualityChecks", variables.batchId] });
      queryClient.invalidateQueries({ queryKey: ["auditLogs", "batch", variables.batchId] });
    },
  });
}

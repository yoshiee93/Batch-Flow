import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetchApi";
import type { LabelTemplateSettings } from "@shared/schema";

export type LabelTemplateType = "raw_intake" | "finished_output" | "batch";

export interface LabelTemplate {
  id: string;
  name: string;
  labelType: LabelTemplateType;
  customerId: string | null;
  isDefault: boolean;
  settings: string;
  createdAt: string;
}

export interface LabelTemplateCreate {
  name: string;
  labelType: LabelTemplateType;
  customerId?: string | null;
  isDefault?: boolean;
  settings?: string;
}

export function parseLabelTemplateSettings(settings: string): LabelTemplateSettings {
  try {
    return JSON.parse(settings) as LabelTemplateSettings;
  } catch {
    return {};
  }
}

export function useLabelTemplates(options?: { enabled?: boolean }) {
  return useQuery<LabelTemplate[]>({
    queryKey: ["label-templates"],
    queryFn: () => fetchApi("/label-templates"),
    enabled: options?.enabled !== false,
  });
}

export function useLabelTemplate(labelType: LabelTemplateType, customerId?: string | null) {
  return useQuery<LabelTemplate | null>({
    queryKey: ["label-template", labelType, customerId ?? "none"],
    queryFn: () => {
      const params = new URLSearchParams({ labelType });
      if (customerId) params.set("customerId", customerId);
      return fetchApi(`/label-templates?${params.toString()}`);
    },
  });
}

export function useCreateLabelTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: LabelTemplateCreate) =>
      fetchApi("/label-templates", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["label-templates"] });
      queryClient.invalidateQueries({ queryKey: ["label-template"] });
    },
  });
}

export function useUpdateLabelTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<LabelTemplateCreate> & { id: string }) =>
      fetchApi(`/label-templates/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["label-templates"] });
      queryClient.invalidateQueries({ queryKey: ["label-template"] });
    },
  });
}

export function useDeleteLabelTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/label-templates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["label-templates"] });
      queryClient.invalidateQueries({ queryKey: ["label-template"] });
    },
  });
}

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
  settings: LabelTemplateSettings;
  createdAt: string;
  updatedAt: string;
}

export interface LabelTemplateCreate {
  name: string;
  labelType: LabelTemplateType;
  customerId?: string | null;
  isDefault?: boolean;
  settings?: LabelTemplateSettings;
}

export function parseLabelTemplateSettings(settings: LabelTemplateSettings | string | null | undefined): LabelTemplateSettings {
  if (!settings) return {};
  if (typeof settings === "string") {
    try { return JSON.parse(settings) as LabelTemplateSettings; } catch { return {}; }
  }
  return settings;
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

export async function fetchLabelTemplate(labelType: LabelTemplateType, customerId?: string | null): Promise<LabelTemplate | null> {
  const params = new URLSearchParams({ labelType });
  if (customerId) params.set("customerId", customerId);
  try {
    return await fetchApi(`/label-templates?${params.toString()}`);
  } catch {
    return null;
  }
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

export type PrintLabelKind = "raw_intake" | "finished_output" | "batch" | "custom";

export interface PrintHistoryRow {
  id: string;
  printedAt: string;
  printedByUserId: string | null;
  printedByUsername: string | null;
  labelKind: PrintLabelKind;
  templateId: string | null;
  templateName: string | null;
  entityType: string | null;
  entityId: string | null;
  displayName: string;
  secondaryName: string | null;
  snapshot: Record<string, unknown>;
}

export interface RecordPrintInput {
  labelKind: PrintLabelKind;
  templateId?: string | null;
  templateName?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  displayName: string;
  secondaryName?: string | null;
  snapshot: Record<string, unknown>;
}

export function useRecordPrint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RecordPrintInput) =>
      fetchApi("/print-history", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["print-history"] });
    },
  });
}

export interface PrintHistoryFilters {
  from?: string;
  to?: string;
  labelKind?: PrintLabelKind | "";
  q?: string;
  limit?: number;
}

export function usePrintHistory(filters: PrintHistoryFilters = {}, options?: { enabled?: boolean }) {
  return useQuery<PrintHistoryRow[]>({
    queryKey: ["print-history", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      if (filters.labelKind) params.set("labelKind", filters.labelKind);
      if (filters.q) params.set("q", filters.q);
      if (filters.limit) params.set("limit", String(filters.limit));
      const qs = params.toString();
      return fetchApi(`/print-history${qs ? `?${qs}` : ""}`);
    },
    enabled: options?.enabled !== false,
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

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetchApi";

export interface Template {
  id: string;
  kind: string;
  name: string;
  customerId: string | null;
  isDefault: boolean;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateCreate {
  kind: string;
  name: string;
  customerId?: string | null;
  isDefault?: boolean;
  payload: Record<string, unknown>;
}

export type TemplateUpdate = Partial<TemplateCreate>;

export function useTemplate(id: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery<Template>({
    queryKey: ["template", id],
    queryFn: () => fetchApi(`/templates/${id}`),
    enabled: !!id && options?.enabled !== false,
  });
}

export function useTemplates(kind?: string, options?: { enabled?: boolean }) {
  return useQuery<Template[]>({
    queryKey: ["templates", kind ?? "all"],
    queryFn: () => {
      const qs = kind ? `?kind=${encodeURIComponent(kind)}` : "";
      return fetchApi(`/templates${qs}`);
    },
    enabled: options?.enabled !== false,
  });
}

export function useDefaultTemplate(kind: string, customerId?: string | null, options?: { enabled?: boolean }) {
  return useQuery<Template | null>({
    queryKey: ["template-default", kind, customerId ?? "none"],
    queryFn: () => {
      const params = new URLSearchParams({ kind });
      if (customerId) params.set("customerId", customerId);
      return fetchApi(`/templates/default?${params.toString()}`);
    },
    enabled: options?.enabled !== false,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TemplateCreate) =>
      fetchApi<Template>("/templates", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      qc.invalidateQueries({ queryKey: ["template-default"] });
    },
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: TemplateUpdate & { id: string }) =>
      fetchApi<Template>(`/templates/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      qc.invalidateQueries({ queryKey: ["template-default"] });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/templates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      qc.invalidateQueries({ queryKey: ["template-default"] });
    },
  });
}

import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetchApi";

export interface AuditLogRow {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes: string | null;
  userId: string | null;
  createdAt: string;
  userName: string | null;
  userRole: string | null;
}

export interface AuditLogListResult {
  items: AuditLogRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuditLogFilters {
  entityType?: string;
  entityId?: string;
  action?: string;
  userId?: string;
  from?: string;
  to?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogFacets {
  entityTypes: string[];
  actions: string[];
  users: { id: string; name: string; role: string }[];
}

function buildQs(filters: AuditLogFilters): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === null || v === "") continue;
    p.set(k, String(v));
  }
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}

export function useAuditLogList(filters: AuditLogFilters) {
  return useQuery<AuditLogListResult>({
    queryKey: ["auditLogList", filters],
    queryFn: () => fetchApi<AuditLogListResult>(`/admin/audit-logs${buildQs(filters)}`),
  });
}

export function useAuditLogFacets() {
  return useQuery<AuditLogFacets>({
    queryKey: ["auditLogFacets"],
    queryFn: () => fetchApi<AuditLogFacets>("/admin/audit-logs/facets"),
  });
}

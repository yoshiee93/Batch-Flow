import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetchApi";

export interface OverviewStats {
  productionRuns: number;
  batchesWithExtensions: number;
  dryingExtensions: number;
  openIssues: number;
  unreviewedEntries: number;
  avgDryingTime: number | null;
  warningCount: number;
  issueCount: number;
}

export interface RecentEntry {
  id: string;
  batch_id: string | null;
  source_id: string;
  batch_number: string | null;
  product_name: string | null;
  machine: string | null;
  note_type: string;
  content: string | null;
  severity: string;
  status: string;
  created_at: string;
}

export interface OverviewData {
  stats: OverviewStats;
  recentExtensions: RecentEntry[];
  recentIssues: RecentEntry[];
  recentAssessments: RecentEntry[];
  recentComments: RecentEntry[];
}

export interface ProductStat {
  product_id: string;
  product_name: string;
  run_count: number;
  avg_drying_time: string | null;
  extension_count: number;
  most_recent_run: string | null;
  warning_count: number;
  issue_count: number;
}

export interface MachineStat {
  machine: string;
  run_count: number;
  avg_drying_time: string | null;
  extension_count: number;
  most_recent_run: string | null;
  warning_count: number;
  issue_count: number;
}

export interface DetailBatch {
  id: string;
  batch_number: string;
  drying_time_hours: string | null;
  drying_machine: string | null;
  drying_extension_required: boolean;
  drying_extension_time_hours: string | null;
  created_at: string;
  status: string;
  product_name?: string;
}

export interface EntityDetail {
  recentLogs: RecentEntry[];
  recentBatches: DetailBatch[];
}

export interface AnalyticsData {
  avgDryingTimeByProduct: { product_name: string; avg_drying_time: string | null; run_count: number }[];
  avgDryingTimeByMachine: { machine: string; avg_drying_time: string | null; run_count: number }[];
  extensionsByProduct: { product_name: string; extension_count: number; run_count: number }[];
  extensionsByMachine: { machine: string; extension_count: number; run_count: number }[];
  severityByProduct: { product_name: string; warning_count: number; issue_count: number; info_count: number }[];
  severityByMachine: { machine: string; warning_count: number; issue_count: number; info_count: number }[];
  noteTypeBreakdown: { note_type: string; entry_count: number }[];
  statusDistribution: { status: string; entry_count: number }[];
}

function buildQs(params: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) p.set(k, v);
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function useOverview(opts?: { from?: string; to?: string }) {
  const qs = buildQs({ from: opts?.from, to: opts?.to });
  return useQuery<OverviewData>({
    queryKey: ["opsCentreOverview", opts],
    queryFn: () => fetchApi(`/operations-centre/overview${qs}`),
  });
}

export function useProductStats() {
  return useQuery<ProductStat[]>({
    queryKey: ["opsCentreProducts"],
    queryFn: () => fetchApi("/operations-centre/products"),
  });
}

export function useProductDetail(productId: string | null) {
  return useQuery<EntityDetail>({
    queryKey: ["opsCentreProductDetail", productId],
    queryFn: () => fetchApi(`/operations-centre/products/${productId}`),
    enabled: !!productId,
  });
}

export function useMachineStats() {
  return useQuery<MachineStat[]>({
    queryKey: ["opsCentreMachines"],
    queryFn: () => fetchApi("/operations-centre/machines"),
  });
}

export function useMachineDetail(machine: string | null) {
  return useQuery<EntityDetail>({
    queryKey: ["opsCentreMachineDetail", machine],
    queryFn: () => fetchApi(`/operations-centre/machines/${encodeURIComponent(machine!)}`),
    enabled: !!machine,
  });
}

export function useAnalytics(opts?: { from?: string; to?: string }) {
  const qs = buildQs({ from: opts?.from, to: opts?.to });
  return useQuery<AnalyticsData>({
    queryKey: ["opsCentreAnalytics", opts],
    queryFn: () => fetchApi(`/operations-centre/analytics${qs}`),
  });
}

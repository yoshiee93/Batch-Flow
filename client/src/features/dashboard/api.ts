import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetchApi";

export interface DashboardStats {
  activeBatches: number;
  pendingOrders: number;
  lowStockAlerts: number;
  totalProducts: number;
  batchesCreatedToday: number;
  labelsPrintedToday: number;
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["dashboardStats"],
    queryFn: () => fetchApi("/dashboard/stats"),
  });
}

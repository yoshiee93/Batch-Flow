import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetchApi";

export type ReportRange = "calendar" | "financial" | "last12";

export interface ProductionYtdReport {
  range: ReportRange;
  label: string;
  from: string;
  to: string;
  totals: { output: number; batches: number; waste: number; averageYield: number };
  byProduct: { productId: string; name: string; unit: string; output: number }[];
  byCategory: { categoryId: string | null; name: string; output: number }[];
}

export function useProductionYtd(range: ReportRange) {
  return useQuery<ProductionYtdReport>({
    queryKey: ["productionYtd", range],
    queryFn: () => fetchApi(`/reports/production/ytd?range=${range}`),
  });
}

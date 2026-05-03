import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetchApi";

export interface ForecastOrder {
  id: string;
  customerId: string;
  productId: string;
  quantity: string;
  expectedDate: string;
  notes: string | null;
  status: "open" | "converted" | "archived";
  convertedOrderId: string | null;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  productName: string;
  productUnit: string;
}

export interface ForecastSummaryProduct {
  productId: string;
  productName: string;
  unit: string;
  demand: number;
  currentStock: number;
  reserved: number;
  shortfall: number;
}

export interface ForecastSummary {
  months: 3 | 6 | 12;
  from: string;
  to: string;
  products: ForecastSummaryProduct[];
}

export type ForecastRange = 3 | 6 | 12;

export function useForecasts(range: ForecastRange) {
  return useQuery<ForecastOrder[]>({
    queryKey: ["forecasts", range],
    queryFn: () => fetchApi(`/forecast?months=${range}`),
  });
}

export function useForecastSummary(range: ForecastRange) {
  return useQuery<ForecastSummary>({
    queryKey: ["forecastSummary", range],
    queryFn: () => fetchApi(`/forecast/summary?months=${range}`),
  });
}

export function useCreateForecast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { customerId: string; productId: string; quantity: string; expectedDate: string; notes?: string | null; status?: "open" | "converted" | "archived" }) =>
      fetchApi<ForecastOrder>("/forecast", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forecasts"] });
      qc.invalidateQueries({ queryKey: ["forecastSummary"] });
    },
  });
}

export function useUpdateForecast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<{ customerId: string; productId: string; quantity: string; expectedDate: string; notes: string | null; status: "open" | "converted" | "archived" }>) =>
      fetchApi<ForecastOrder>(`/forecast/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forecasts"] });
      qc.invalidateQueries({ queryKey: ["forecastSummary"] });
    },
  });
}

export function useDeleteForecast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/forecast/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forecasts"] });
      qc.invalidateQueries({ queryKey: ["forecastSummary"] });
    },
  });
}

export interface ForecastHistoryMonth {
  month: string;
  forecastQty: number;
  orderQty: number;
  producedQty: number;
}

export interface ForecastHistory {
  productId: string | null;
  productName: string | null;
  unit: string | null;
  from: string;
  to: string;
  months: ForecastHistoryMonth[];
}

export function useForecastHistory(productId: string | undefined, monthsBack: number) {
  return useQuery<ForecastHistory>({
    queryKey: ["forecastHistory", productId ?? "all", monthsBack],
    queryFn: () => fetchApi(`/forecast/history?monthsBack=${monthsBack}${productId ? `&productId=${productId}` : ""}`),
  });
}

export function useConvertForecast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; orderNumber: string; dueDate: string; priority?: "low" | "normal" | "high" | "urgent"; poNumber?: string | null; notes?: string | null }) =>
      fetchApi<{ forecast: ForecastOrder; order: { id: string; orderNumber: string } }>(`/forecast/${id}/convert`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forecasts"] });
      qc.invalidateQueries({ queryKey: ["forecastSummary"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["ordersWithAllocation"] });
    },
  });
}

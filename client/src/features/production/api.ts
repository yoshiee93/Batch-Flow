import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetchApi";
import type { InputLot, OutputLot } from "@/features/inventory/api";
export type { InputLot, OutputLot } from "@/features/inventory/api";

export interface Batch {
  id: string;
  batchNumber: string;
  productId: string;
  recipeId: string | null;
  status: "planned" | "in_progress" | "quality_check" | "completed" | "released" | "quarantined";
  plannedQuantity: string;
  actualQuantity: string | null;
  wasteQuantity: string | null;
  millingQuantity: string | null;
  wetQuantity: string | null;
  cleaningTime: string | null;
  numberOfStaff: number | null;
  finishTime: string | null;
  productAssessment: { result: "pass" | "conditional" | "fail"; notes?: string } | null;
  startDate: string | null;
  endDate: string | null;
  assignedTo: string | null;
  notes: string | null;
  barcodeValue: string | null;
  barcodePrintedAt: string | null;
  batchCode: string | null;
  createdAt: string;
}

export interface BatchMaterial {
  id: string;
  batchId: string;
  materialId: string | null;
  productId: string | null;
  lotId: string | null;
  sourceLotId: string | null;
  quantity: string;
  addedAt: string;
  addedBy: string | null;
}

export interface BatchOutput {
  id: string;
  batchId: string;
  productId: string;
  quantity: string;
  addedAt: string;
  addedBy: string | null;
}

export interface FinalizeResult {
  batch: Batch;
  outputLots: OutputLot[];
}

export function useBatches() {
  return useQuery<Batch[]>({
    queryKey: ["batches"],
    queryFn: () => fetchApi("/batches"),
  });
}

export function useBatch(batchId: string) {
  return useQuery<Batch>({
    queryKey: ["batch", batchId],
    queryFn: () => fetchApi(`/batches/${batchId}`),
    enabled: !!batchId,
  });
}

export function fetchBatchByBarcode(value: string): Promise<Batch> {
  return fetchApi<Batch>(`/batches/barcode/${encodeURIComponent(value)}`);
}

export function useMarkBatchBarcodePrinted() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => fetchApi<Batch>(`/batches/${batchId}/barcode-printed`, { method: "PATCH" }),
    onSuccess: (_, batchId) => {
      queryClient.invalidateQueries({ queryKey: ["batch", batchId] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
    },
  });
}

export function useCreateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Batch>) => fetchApi<Batch>("/batches", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useUpdateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Batch>) =>
      fetchApi<Batch>(`/batches/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["batch", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useDeleteBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/batches/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useBatchMaterials(batchId: string) {
  return useQuery<BatchMaterial[]>({
    queryKey: ["batchMaterials", batchId],
    queryFn: () => fetchApi(`/batches/${batchId}/materials`),
    enabled: !!batchId,
  });
}

export function useRecordBatchInput() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, materialId, productId, quantity, lotId, sourceLotId }: {
      batchId: string; materialId?: string; productId?: string; quantity: string; lotId?: string; sourceLotId?: string;
    }) =>
      fetchApi<BatchMaterial>(`/batches/${batchId}/input`, { method: "POST", body: JSON.stringify({ materialId, productId, quantity, lotId, sourceLotId }) }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["batchMaterials", variables.batchId] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useRemoveBatchMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/batch-materials/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["batchMaterials"] });
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useUpdateBatchMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: string }) =>
      fetchApi<BatchMaterial>(`/batch-materials/${id}`, { method: "PATCH", body: JSON.stringify({ quantity }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["batchMaterials"] });
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useBatchOutputs(batchId: string) {
  return useQuery<BatchOutput[]>({
    queryKey: ["batchOutputs", batchId],
    queryFn: () => fetchApi(`/batches/${batchId}/outputs`),
    enabled: !!batchId,
  });
}

export function useAddBatchOutput() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, productId, quantity }: { batchId: string; productId: string; quantity: string }) =>
      fetchApi<BatchOutput>(`/batches/${batchId}/outputs`, {
        method: "POST",
        body: JSON.stringify({ productId, quantity })
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["batchOutputs", variables.batchId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["outputItems"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useRemoveBatchOutput() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/batch-outputs/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["batchOutputs"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["outputItems"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useFinalizeBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, wasteQuantity, millingQuantity, wetQuantity, cleaningTime, numberOfStaff, finishTime, productAssessment, markCompleted }: {
      batchId: string;
      wasteQuantity: string;
      millingQuantity: string;
      wetQuantity: string;
      cleaningTime?: string;
      numberOfStaff?: number;
      finishTime?: string | null;
      productAssessment?: { result: "pass" | "conditional" | "fail"; notes?: string } | null;
      markCompleted: boolean;
    }) =>
      fetchApi<FinalizeResult>(`/batches/${batchId}/finalize`, {
        method: "POST",
        body: JSON.stringify({ wasteQuantity, millingQuantity, wetQuantity, cleaningTime, numberOfStaff, finishTime, productAssessment, markCompleted })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["batchOutputLots"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useUpdateBatchOutput() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: string }) =>
      fetchApi<BatchOutput>(`/batch-outputs/${id}`, { method: "PATCH", body: JSON.stringify({ quantity }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["batchOutputs"] });
      queryClient.invalidateQueries({ queryKey: ["batchOutputLots"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useBatchInputLots(batchId: string) {
  return useQuery<InputLot[]>({
    queryKey: ["batchInputLots", batchId],
    queryFn: () => fetchApi<InputLot[]>(`/batches/${batchId}/input-lots`),
    enabled: !!batchId,
  });
}

export function useBatchOutputLots(batchId: string, options?: { enabled?: boolean }) {
  return useQuery<OutputLot[]>({
    queryKey: ["batchOutputLots", batchId],
    queryFn: () => fetchApi<OutputLot[]>(`/batches/${batchId}/output-lots`),
    enabled: !!batchId && (options?.enabled ?? true),
  });
}

export interface TimelineEvent {
  at: string;
  kind: "created" | "started" | "input" | "qc" | "output" | "output_lot" | "status" | "print" | "finalize" | "completed" | "movement" | "allocation" | "audit";
  title: string;
  detail?: string;
  userId?: string | null;
  userName?: string | null;
  link?: { href: string; label: string };
  meta?: Record<string, unknown>;
}

export function useBatchTimeline(batchId: string) {
  return useQuery<TimelineEvent[]>({
    queryKey: ["batchTimeline", batchId],
    queryFn: () => fetchApi<TimelineEvent[]>(`/batches/${batchId}/timeline`),
    enabled: !!batchId,
  });
}

export function useRegenerateOutputLots() {
  const queryClient = useQueryClient();
  return useMutation<OutputLot[], Error, string>({
    mutationFn: (batchId: string) =>
      fetchApi<OutputLot[]>(`/batches/${batchId}/regenerate-lots`, { method: "POST" }),
    onSuccess: (_data, batchId) => {
      queryClient.invalidateQueries({ queryKey: ["batchOutputLots", batchId] });
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
    },
  });
}

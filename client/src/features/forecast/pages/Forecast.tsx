import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2, Pencil, Trash2, ArrowRightLeft, AlertTriangle, ExternalLink, MoreHorizontal, CheckCircle2, XCircle, ChevronsUpDown, Check } from "lucide-react";
import { format, isSameDay, parseISO, subYears, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { CalendarDayButton } from "@/components/ui/calendar";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useCustomers } from "@/features/customers/api";
import { useProducts } from "@/features/catalog/api";
import {
  useForecasts, useForecastSummary, useForecastOrderLines, useCreateForecast, useUpdateForecast, useDeleteForecast, useConvertForecast, useForecastHistory, useForecastHistoryRange,
  type ForecastOrder, type ForecastOrderLine, type ForecastRange, type ForecastStatus, type ConfidenceLevel,
} from "@/features/forecast/api";
import { ApiValidationError } from "@/lib/fetchApi";
import { cn } from "@/lib/utils";

const FORECAST_STATUSES: ForecastStatus[] = ["Draft", "Likely", "Confirmed Forecast", "Converted", "Cancelled"];
const ACTIVE_STATUSES: ForecastStatus[] = ["Draft", "Likely", "Confirmed Forecast"];
const CONFIDENCE_LEVELS: ConfidenceLevel[] = ["Low", "Medium", "High"];

type FormState = {
  customerId: string;
  productId: string;
  quantity: string;
  expectedDate: string;
  notes: string;
  confidenceLevel: string;
  status: ForecastStatus;
};

const emptyForm: FormState = {
  customerId: "",
  productId: "",
  quantity: "",
  expectedDate: "",
  notes: "",
  confidenceLevel: "",
  status: "Draft",
};

function statusBadge(s: ForecastStatus) {
  switch (s) {
    case "Converted":
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200" data-testid={`badge-status-converted`}>Converted</Badge>;
    case "Cancelled":
      return <Badge variant="outline" className="text-muted-foreground" data-testid={`badge-status-cancelled`}>Cancelled</Badge>;
    case "Confirmed Forecast":
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200" data-testid={`badge-status-confirmed`}>Confirmed</Badge>;
    case "Likely":
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200" data-testid={`badge-status-likely`}>Likely</Badge>;
    default:
      return <Badge variant="secondary" data-testid={`badge-status-draft`}>Draft</Badge>;
  }
}

function confidenceBadge(c: string | null) {
  if (!c) return null;
  const colors: Record<string, string> = {
    Low: "bg-red-50 text-red-700 border-red-200",
    Medium: "bg-amber-50 text-amber-700 border-amber-200",
    High: "bg-green-50 text-green-700 border-green-200",
  };
  return <Badge variant="outline" className={colors[c] ?? ""}>{c}</Badge>;
}

export default function Forecast() {
  const [view, setView] = useState<"list" | "shortage" | "calendar" | "history">("list");
  const [range, setRange] = useState<ForecastRange>(3);
  const [calendarDay, setCalendarDay] = useState<Date | undefined>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(startOfMonth(new Date()));
  const [calendarRange, setCalendarRange] = useState<"month" | "3months">("month");
  const [compareMode, setCompareMode] = useState(false);
  const [compareProductId, setCompareProductId] = useState<string>("");
  const [historyProductId, setHistoryProductId] = useState<string>("");
  const [historyMonths, setHistoryMonths] = useState<number>(6);
  const [compareProductOpen, setCompareProductOpen] = useState(false);
  const [historyProductOpen, setHistoryProductOpen] = useState(false);
  const [formProductOpen, setFormProductOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ForecastOrder | null>(null);
  const [convertTarget, setConvertTarget] = useState<ForecastOrder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ForecastOrder | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [convertForm, setConvertForm] = useState({ orderNumber: "", dueDate: "" });
  const { toast } = useToast();

  const { data: forecasts = [], isLoading } = useForecasts(range);
  const { data: orderLines = [], isLoading: isLoadingOrders } = useForecastOrderLines(range);
  const { data: summary } = useForecastSummary(range);
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts();

  const createMut = useCreateForecast();
  const updateMut = useUpdateForecast();
  const deleteMut = useDeleteForecast();
  const convertMut = useConvertForecast();

  const { data: history } = useForecastHistory(historyProductId || undefined, historyMonths);

  const calendarVisibleEnd = useMemo(() =>
    calendarRange === "3months" ? endOfMonth(addMonths(calendarMonth, 2)) : endOfMonth(calendarMonth),
    [calendarMonth, calendarRange]
  );
  const calendarVisibleStart = useMemo(() => startOfMonth(calendarMonth), [calendarMonth]);

  const compareFrom = useMemo(() => subYears(calendarVisibleStart, 1).toISOString(), [calendarVisibleStart]);
  const compareTo = useMemo(() => subYears(calendarVisibleEnd, 1).toISOString(), [calendarVisibleEnd]);
  const { data: compareHistory } = useForecastHistoryRange({
    productId: compareProductId || undefined,
    from: compareFrom,
    to: compareTo,
    enabled: compareMode && !!compareProductId,
  });

  const lastYearWeeks = useMemo(() => {
    const m = new Map<string, number>();
    if (!compareHistory) return m;
    for (const w of compareHistory.weeks) m.set(w.weekStart, w.orderQty);
    return m;
  }, [compareHistory]);

  const weekStartKey = (d: Date): string => {
    const u = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dow = u.getUTCDay() || 7;
    u.setUTCDate(u.getUTCDate() - (dow - 1));
    return u.toISOString().slice(0, 10);
  };

  const forecastByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of forecasts) {
      if (compareMode && compareProductId && f.productId !== compareProductId) continue;
      const k = f.expectedDate.slice(0, 10);
      m.set(k, (m.get(k) ?? 0) + parseFloat(f.quantity));
    }
    return m;
  }, [forecasts, compareMode, compareProductId]);

  const forecastDates = useMemo(() => forecasts.map(f => parseISO(f.expectedDate)), [forecasts]);
  const dayForecasts = useMemo(() => {
    if (!calendarDay) return [];
    return forecasts.filter(f => isSameDay(parseISO(f.expectedDate), calendarDay));
  }, [calendarDay, forecasts]);

  const historyMax = useMemo(() => {
    if (!history) return 1;
    let m = 0;
    for (const r of history.months) m = Math.max(m, r.forecastQty, r.orderQty, r.producedQty);
    return m || 1;
  }, [history]);

  type ListRow = { kind: "forecast"; data: ForecastOrder } | { kind: "order"; data: ForecastOrderLine };

  const grouped = useMemo(() => {
    const map = new Map<string, ListRow[]>();
    for (const f of forecasts) {
      const key = format(new Date(f.expectedDate), "MMM yyyy");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ kind: "forecast", data: f });
    }
    for (const o of orderLines) {
      const key = format(new Date(o.dueDate), "MMM yyyy");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ kind: "order", data: o });
    }
    const entries = Array.from(map.entries());
    for (const [, arr] of entries) {
      arr.sort((a, b) => {
        const da = a.kind === "forecast" ? new Date(a.data.expectedDate) : new Date(a.data.dueDate);
        const db_ = b.kind === "forecast" ? new Date(b.data.expectedDate) : new Date(b.data.dueDate);
        return da.getTime() - db_.getTime();
      });
    }
    entries.sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());
    return entries;
  }, [forecasts, orderLines]);

  const openCreate = () => { setForm(emptyForm); setCreateOpen(true); };

  const openEdit = (f: ForecastOrder) => {
    setEditTarget(f);
    setForm({
      customerId: f.customerId,
      productId: f.productId,
      quantity: f.quantity,
      expectedDate: f.expectedDate.slice(0, 10),
      notes: f.notes ?? "",
      confidenceLevel: f.confidenceLevel ?? "",
      status: f.status,
    });
  };

  const validate = (f: FormState): string | null => {
    if (!f.customerId) return "Customer is required";
    if (!f.productId) return "Product is required";
    if (!f.quantity || isNaN(parseFloat(f.quantity)) || parseFloat(f.quantity) <= 0) return "Quantity must be greater than zero";
    if (!f.expectedDate) return "Expected date is required";
    return null;
  };

  const submitCreate = async () => {
    const err = validate(form);
    if (err) { toast({ title: "Missing fields", description: err, variant: "destructive" }); return; }
    try {
      await createMut.mutateAsync({
        customerId: form.customerId,
        productId: form.productId,
        quantity: form.quantity,
        expectedDate: new Date(form.expectedDate).toISOString(),
        notes: form.notes || null,
        confidenceLevel: form.confidenceLevel || null,
        status: form.status,
      });
      toast({ title: "Forecast created" });
      setCreateOpen(false);
      setForm(emptyForm);
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to create forecast", variant: "destructive" });
    }
  };

  const submitEdit = async () => {
    if (!editTarget) return;
    const err = validate(form);
    if (err) { toast({ title: "Missing fields", description: err, variant: "destructive" }); return; }
    try {
      await updateMut.mutateAsync({
        id: editTarget.id,
        customerId: form.customerId,
        productId: form.productId,
        quantity: form.quantity,
        expectedDate: new Date(form.expectedDate).toISOString(),
        notes: form.notes || null,
        confidenceLevel: form.confidenceLevel || null,
        status: form.status,
      });
      toast({ title: "Forecast updated" });
      setEditTarget(null);
      setForm(emptyForm);
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to update", variant: "destructive" });
    }
  };

  const openConvert = (f: ForecastOrder) => {
    setConvertTarget(f);
    setConvertForm({
      orderNumber: `FC-${format(new Date(), "yyMMdd")}-${f.id.slice(0, 4).toUpperCase()}`,
      dueDate: f.expectedDate.slice(0, 10),
    });
  };

  const submitConvert = async () => {
    if (!convertTarget) return;
    if (!convertForm.orderNumber.trim()) { toast({ title: "Order number required", variant: "destructive" }); return; }
    if (!convertForm.dueDate) { toast({ title: "Due date required", variant: "destructive" }); return; }
    try {
      const result = await convertMut.mutateAsync({
        id: convertTarget.id,
        orderNumber: convertForm.orderNumber.trim(),
        dueDate: new Date(convertForm.dueDate).toISOString(),
      });
      toast({ title: "Converted to order", description: `Order ${result.order.orderNumber} created.` });
      setConvertTarget(null);
    } catch (e) {
      const msg = e instanceof ApiValidationError ? Object.values(e.fields).join(", ") : e instanceof Error ? e.message : "Failed to convert";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const submitDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
      toast({ title: "Forecast deleted" });
      setDeleteTarget(null);
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to delete", variant: "destructive" });
    }
  };

  const isConvertable = (f: ForecastOrder) => f.status !== "Converted" && f.status !== "Cancelled";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-mono" data-testid="text-page-title">Forecast</h1>
          <p className="text-sm text-muted-foreground">Plan ahead with potential orders. Convert to a real order when confirmed.</p>
        </div>
        <Button onClick={openCreate} data-testid="button-create-forecast">
          <Plus className="h-4 w-4 mr-2" />
          New Forecast
        </Button>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
        <TabsList>
          <TabsTrigger value="list" data-testid="tab-view-list">List</TabsTrigger>
          <TabsTrigger value="shortage" data-testid="tab-view-shortage">Shortage / Risk</TabsTrigger>
          <TabsTrigger value="calendar" data-testid="tab-view-calendar">Calendar</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-view-history">History</TabsTrigger>
        </TabsList>

        {/* LIST TAB */}
        <TabsContent value="list" className="space-y-6 mt-4">
          <Tabs value={String(range)} onValueChange={(v) => setRange(Number(v) as ForecastRange)}>
            <TabsList>
              <TabsTrigger value="3" data-testid="tab-range-3">3 months</TabsTrigger>
              <TabsTrigger value="6" data-testid="tab-range-6">6 months</TabsTrigger>
              <TabsTrigger value="12" data-testid="tab-range-12">12 months</TabsTrigger>
            </TabsList>
          </Tabs>

          {(isLoading || isLoadingOrders) ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : grouped.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground" data-testid="text-empty">
              No forecasts or unfilled orders in this range. Click <strong>New Forecast</strong> to add one.
            </Card>
          ) : (
            grouped.map(([month, items]) => (
              <Card key={month} className="p-4">
                <h3 className="font-semibold mb-3" data-testid={`heading-month-${month}`}>{month}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Stock Risk</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(row => {
                      if (row.kind === "order") {
                        const o = row.data;
                        return (
                          <TableRow key={`order-${o.id}`} data-testid={`row-order-${o.id}`} className="bg-muted/10">
                            <TableCell>{format(new Date(o.dueDate), "d MMM yyyy")}</TableCell>
                            <TableCell>{o.customerName}</TableCell>
                            <TableCell>{o.productName}</TableCell>
                            <TableCell className="text-right font-mono">{parseFloat(o.quantity).toFixed(2)} {o.productUnit}</TableCell>
                            <TableCell><span className="text-muted-foreground text-xs">—</span></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-sky-700 border-sky-300 bg-sky-50" data-testid={`badge-order-${o.id}`}>Order</Badge>
                                <Link href="/orders" data-testid={`link-order-${o.id}`}>
                                  <span className="inline-flex items-center text-xs text-primary hover:underline">
                                    <ExternalLink className="h-3 w-3 mr-0.5" />
                                    {o.orderNumber}
                                  </span>
                                </Link>
                              </div>
                            </TableCell>
                            <TableCell><span className="text-muted-foreground text-xs">—</span></TableCell>
                            <TableCell />
                          </TableRow>
                        );
                      }
                      const f = row.data;
                      const summaryRow = summary?.products.find(p => p.productId === f.productId);
                      const isExpanded = expandedId === f.id;
                      return (
                        <>
                          <TableRow key={f.id} data-testid={`row-forecast-${f.id}`} className="cursor-pointer hover:bg-muted/30" onClick={() => setExpandedId(isExpanded ? null : f.id)}>
                            <TableCell>{format(new Date(f.expectedDate), "d MMM yyyy")}</TableCell>
                            <TableCell>{f.customerName}</TableCell>
                            <TableCell>{f.productName}</TableCell>
                            <TableCell className="text-right font-mono">{parseFloat(f.quantity).toFixed(2)} {f.productUnit}</TableCell>
                            <TableCell>{confidenceBadge(f.confidenceLevel)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {statusBadge(f.status)}
                                {f.status === "Converted" && f.convertedOrderId && (
                                  <Link href="/orders" data-testid={`link-converted-order-${f.id}`}>
                                    <span className="inline-flex items-center text-xs text-primary hover:underline">
                                      <ExternalLink className="h-3 w-3 mr-0.5" />
                                      order
                                    </span>
                                  </Link>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {summaryRow && ACTIVE_STATUSES.includes(f.status) ? (
                                summaryRow.shortfall > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-destructive text-xs font-medium" data-testid={`text-risk-${f.id}`}>
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    Shortage
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 text-xs" data-testid={`text-risk-ok-${f.id}`}>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    OK
                                  </span>
                                )
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost" data-testid={`button-actions-${f.id}`} onClick={(e) => e.stopPropagation()}>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(f); }} data-testid={`button-edit-${f.id}`}>
                                    <Pencil className="h-4 w-4 mr-2" /> Edit
                                  </DropdownMenuItem>
                                  {isConvertable(f) && (
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openConvert(f); }} data-testid={`button-convert-${f.id}`}>
                                      <ArrowRightLeft className="h-4 w-4 mr-2" /> Convert to Order
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(f); }}
                                    data-testid={`button-delete-${f.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow key={`${f.id}-detail`} data-testid={`row-detail-${f.id}`}>
                              <TableCell colSpan={8} className="bg-muted/20 px-6 py-3">
                                <StockEstimatePanel forecast={f} summaryRow={summaryRow} />
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            ))
          )}
        </TabsContent>

        {/* SHORTAGE / RISK TAB */}
        <TabsContent value="shortage" className="mt-4 space-y-4">
          <Tabs value={String(range)} onValueChange={(v) => setRange(Number(v) as ForecastRange)}>
            <TabsList>
              <TabsTrigger value="3" data-testid="tab-shortage-range-3">3 months</TabsTrigger>
              <TabsTrigger value="6" data-testid="tab-shortage-range-6">6 months</TabsTrigger>
              <TabsTrigger value="12" data-testid="tab-shortage-range-12">12 months</TabsTrigger>
            </TabsList>
          </Tabs>

          <Card className="p-4">
            <h2 className="font-semibold mb-1">Shortage &amp; Risk View</h2>
            <p className="text-sm text-muted-foreground mb-4">Per-product breakdown of total demand vs. available stock — includes active forecasts (Draft, Likely, Confirmed) and all unfilled orders (pending, in production, ready).</p>

            {!summary || summary.products.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-shortage-empty">No active forecasts or unfilled orders in this range.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Forecast Demand</TableHead>
                    <TableHead className="text-right">Unfilled Orders</TableHead>
                    <TableHead className="text-right">Total Required</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Shortage</TableHead>
                    <TableHead>Earliest Required</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.products.map(p => {
                    const totalRequired = p.forecastDemand + p.orderedQty;
                    return (
                      <TableRow key={p.productId} data-testid={`row-shortage-${p.productId}`}>
                        <TableCell className="font-medium">{p.productName}</TableCell>
                        <TableCell className="text-right font-mono" data-testid={`text-forecast-demand-${p.productId}`}>
                          {p.forecastDemand.toFixed(2)} {p.unit}
                        </TableCell>
                        <TableCell className="text-right font-mono" data-testid={`text-ordered-qty-${p.productId}`}>
                          {p.orderedQty > 0 ? (
                            <span className="text-sky-700">{p.orderedQty.toFixed(2)} {p.unit}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono" data-testid={`text-required-${p.productId}`}>
                          {totalRequired.toFixed(2)} {p.unit}
                        </TableCell>
                        <TableCell className="text-right font-mono" data-testid={`text-stock-${p.productId}`}>
                          {p.currentStock.toFixed(2)} {p.unit}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-shortage-${p.productId}`}>
                          {p.shortfall > 0 ? (
                            <span className="inline-flex items-center gap-1 text-destructive font-medium font-mono">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {p.shortfall.toFixed(2)} {p.unit}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-mono">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              0
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground" data-testid={`text-earliest-${p.productId}`}>
                          {p.earliestDate ? format(new Date(p.earliestDate), "d MMM yyyy") : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* CALENDAR TAB */}
        <TabsContent value="calendar" className="mt-4 space-y-4">
          <Card className="p-3">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">View</Label>
                <Tabs value={calendarRange} onValueChange={(v) => setCalendarRange(v as "month" | "3months")}>
                  <TabsList>
                    <TabsTrigger value="month" data-testid="tab-cal-range-month">Month</TabsTrigger>
                    <TabsTrigger value="3months" data-testid="tab-cal-range-3months">3 months</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="compare-toggle" checked={compareMode} onCheckedChange={setCompareMode} data-testid="switch-compare-history" />
                <Label htmlFor="compare-toggle" className="text-sm">Compare to history</Label>
              </div>
              {compareMode && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Product</Label>
                  <Popover open={compareProductOpen} onOpenChange={setCompareProductOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={compareProductOpen}
                        className="w-[220px] justify-between font-normal" data-testid="select-compare-product">
                        <span className="truncate">
                          {compareProductId ? products.find(p => p.id === compareProductId)?.name ?? "Pick product" : "— Pick a product —"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[220px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search products..." />
                        <CommandList>
                          <CommandEmpty>No product found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem value="none" onSelect={() => { setCompareProductId(""); setCompareProductOpen(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", !compareProductId ? "opacity-100" : "opacity-0")} />
                              — Pick a product —
                            </CommandItem>
                            {products.map(p => (
                              <CommandItem key={p.id} value={p.name} onSelect={() => { setCompareProductId(p.id); setCompareProductOpen(false); }}>
                                <Check className={cn("mr-2 h-4 w-4", compareProductId === p.id ? "opacity-100" : "opacity-0")} />
                                {p.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
              <p className="text-xs text-muted-foreground ml-auto">Each day cell shows the forecast and last-year same-week real orders.</p>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-4 overflow-x-auto">
              <CalendarPicker
                mode="single"
                selected={calendarDay}
                onSelect={setCalendarDay}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                numberOfMonths={calendarRange === "3months" ? 3 : 1}
                modifiers={{ hasForecast: forecastDates }}
                modifiersClassNames={{ hasForecast: "bg-primary/15 font-semibold text-primary" }}
                className="[--cell-size:3.25rem]"
                components={{
                  DayButton: (btnProps) => {
                    const date = btnProps.day.date;
                    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                    const fQty = forecastByDay.get(dayKey) ?? 0;
                    const lyKey = weekStartKey(subYears(date, 1));
                    const lyQty = compareMode && compareProductId ? (lastYearWeeks.get(lyKey) ?? 0) : 0;
                    const showOverlay = (fQty > 0) || (compareMode && compareProductId && lyQty > 0);
                    return (
                      <CalendarDayButton {...btnProps}>
                        <span className="text-xs leading-none">{date.getDate()}</span>
                        {showOverlay && (
                          <span className="text-[9px] leading-tight text-muted-foreground" data-testid={`overlay-day-${dayKey}`}>
                            {fQty > 0 && <span className="block text-primary">F:{fQty.toFixed(0)}</span>}
                            {compareMode && compareProductId && lyQty > 0 && <span className="block">LY:{lyQty.toFixed(0)}</span>}
                          </span>
                        )}
                      </CalendarDayButton>
                    );
                  },
                }}
                data-testid="calendar-forecast"
              />
              <p className="text-xs text-muted-foreground mt-2">F = forecast on this day. {compareMode && compareProductId ? "LY = orders for the same week last year." : "Toggle Compare to history to overlay last year's orders."}</p>
            </Card>
            <Card className="p-4">
              <h3 className="font-semibold mb-3" data-testid="heading-calendar-day">
                {calendarDay ? format(calendarDay, "EEEE, d MMM yyyy") : "Pick a day"}
              </h3>
              {dayForecasts.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="text-day-empty">No forecasts on this day.</p>
              ) : (
                <div className="space-y-3">
                  {dayForecasts.map(f => (
                    <div key={f.id} className="border rounded-md p-3" data-testid={`card-day-forecast-${f.id}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-medium">{f.productName}</div>
                          <div className="text-sm text-muted-foreground">{f.customerName}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-semibold">{parseFloat(f.quantity).toFixed(2)} {f.productUnit}</div>
                          <div className="mt-1 flex gap-1 justify-end">{statusBadge(f.status)}{confidenceBadge(f.confidenceLevel)}</div>
                        </div>
                      </div>
                      {f.notes && <div className="text-xs text-muted-foreground mt-2">{f.notes}</div>}
                      <ForecastHistoryPanel customerId={f.customerId} productId={f.productId} unit={f.productUnit} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <Card className="p-4">
            <div className="flex flex-wrap items-end gap-3 mb-4">
              <div className="min-w-[220px]">
                <Label>Product</Label>
                <Popover open={historyProductOpen} onOpenChange={setHistoryProductOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={historyProductOpen}
                      className="w-full justify-between font-normal" data-testid="select-history-product">
                      <span className="truncate">
                        {historyProductId ? products.find(p => p.id === historyProductId)?.name ?? "All products" : "All products"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[260px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search products..." />
                      <CommandList>
                        <CommandEmpty>No product found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem value="all" onSelect={() => { setHistoryProductId(""); setHistoryProductOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", !historyProductId ? "opacity-100" : "opacity-0")} />
                            All products
                          </CommandItem>
                          {products.map(p => (
                            <CommandItem key={p.id} value={p.name} onSelect={() => { setHistoryProductId(p.id); setHistoryProductOpen(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", historyProductId === p.id ? "opacity-100" : "opacity-0")} />
                              {p.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Months back</Label>
                <Select value={String(historyMonths)} onValueChange={(v) => setHistoryMonths(Number(v))}>
                  <SelectTrigger data-testid="select-history-months"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 months</SelectItem>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="12">12 months</SelectItem>
                    <SelectItem value="24">24 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!history ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : history.months.length === 0 ? (
              <p className="text-sm text-muted-foreground">No history in this range.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Forecast</TableHead>
                    <TableHead>Ordered</TableHead>
                    <TableHead>Produced</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.months.map(m => {
                    const unit = history.unit ?? "";
                    const Bar = ({ qty, color, testId }: { qty: number; color: string; testId: string }) => (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded h-3 overflow-hidden">
                          <div className={`h-full ${color}`} style={{ width: `${(qty / historyMax) * 100}%` }} />
                        </div>
                        <span className="text-xs font-mono w-24 text-right" data-testid={testId}>{qty.toFixed(2)} {unit}</span>
                      </div>
                    );
                    return (
                      <TableRow key={m.month} data-testid={`row-history-${m.month}`}>
                        <TableCell className="font-medium">{m.month}</TableCell>
                        <TableCell><Bar qty={m.forecastQty} color="bg-blue-500" testId={`text-history-forecast-${m.month}`} /></TableCell>
                        <TableCell><Bar qty={m.orderQty} color="bg-amber-500" testId={`text-history-orders-${m.month}`} /></TableCell>
                        <TableCell><Bar qty={m.producedQty} color="bg-emerald-500" testId={`text-history-produced-${m.month}`} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            <div className="flex gap-4 text-xs text-muted-foreground mt-3">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded" /> Forecast</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-500 rounded" /> Ordered</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 rounded" /> Produced</span>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={createOpen || !!editTarget} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditTarget(null); setForm(emptyForm); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit forecast" : "New forecast"}</DialogTitle>
            <DialogDescription>Plan a potential order for a customer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Customer</Label>
              <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                <SelectTrigger data-testid="select-forecast-customer"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Product</Label>
              <Popover open={formProductOpen} onOpenChange={setFormProductOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={formProductOpen}
                    className="w-full justify-between font-normal" data-testid="select-forecast-product">
                    <span className={cn("truncate", !form.productId && "text-muted-foreground")}>
                      {form.productId ? products.find(p => p.id === form.productId)?.name ?? "Select product" : "Select product"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search products..." />
                    <CommandList>
                      <CommandEmpty>No product found.</CommandEmpty>
                      <CommandGroup>
                        {products.map(p => (
                          <CommandItem key={p.id} value={p.name} onSelect={() => { setForm({ ...form, productId: p.id }); setFormProductOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", form.productId === p.id ? "opacity-100" : "opacity-0")} />
                            {p.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantity</Label>
                <Input type="number" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} data-testid="input-forecast-quantity" />
              </div>
              <div>
                <Label>Expected date</Label>
                <Input type="date" value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} data-testid="input-forecast-date" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Confidence</Label>
                <Select value={form.confidenceLevel || "none"} onValueChange={(v) => setForm({ ...form, confidenceLevel: v === "none" ? "" : v })}>
                  <SelectTrigger data-testid="select-forecast-confidence"><SelectValue placeholder="Select confidence" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {CONFIDENCE_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ForecastStatus })}>
                  <SelectTrigger data-testid="select-forecast-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FORECAST_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="input-forecast-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditTarget(null); setForm(emptyForm); }}>Cancel</Button>
            <Button onClick={editTarget ? submitEdit : submitCreate} disabled={createMut.isPending || updateMut.isPending} data-testid="button-save-forecast">
              {(createMut.isPending || updateMut.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editTarget ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONVERT DIALOG */}
      <Dialog open={!!convertTarget} onOpenChange={(o) => { if (!o) setConvertTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to order</DialogTitle>
            <DialogDescription>
              Creates a real order for {convertTarget?.customerName} with {convertTarget && parseFloat(convertTarget.quantity).toFixed(2)} {convertTarget?.productUnit} of {convertTarget?.productName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Order number</Label>
              <Input value={convertForm.orderNumber} onChange={(e) => setConvertForm({ ...convertForm, orderNumber: e.target.value })} data-testid="input-convert-order-number" />
            </div>
            <div>
              <Label>Due date</Label>
              <Input type="date" value={convertForm.dueDate} onChange={(e) => setConvertForm({ ...convertForm, dueDate: e.target.value })} data-testid="input-convert-due-date" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertTarget(null)}>Cancel</Button>
            <Button onClick={submitConvert} disabled={convertMut.isPending} data-testid="button-confirm-convert">
              {convertMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Delete forecast?"
        description="This permanently removes the forecast entry."
        onConfirm={submitDelete}
      />
    </div>
  );
}

function StockEstimatePanel({
  forecast,
  summaryRow,
}: {
  forecast: ForecastOrder;
  summaryRow?: { forecastDemand: number; orderedQty: number; currentStock: number; shortfall: number; unit: string; earliestDate?: string | null } | null;
}) {
  if (!summaryRow) {
    return (
      <div className="text-sm text-muted-foreground" data-testid={`panel-stock-estimate-${forecast.id}`}>
        Stock estimate not available for this product.
      </div>
    );
  }

  const totalRequired = summaryRow.forecastDemand + summaryRow.orderedQty;
  const projectedShortage = Math.max(0, totalRequired - summaryRow.currentStock);

  return (
    <div className="text-sm" data-testid={`panel-stock-estimate-${forecast.id}`}>
      <div className="font-semibold mb-2 text-xs uppercase tracking-wide text-muted-foreground">Stock Estimate for {forecast.productName}</div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Forecast demand</div>
          <div className="font-mono font-semibold" data-testid={`text-estimate-demand-${forecast.id}`}>{summaryRow.forecastDemand.toFixed(2)} {summaryRow.unit}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Unfilled orders</div>
          <div className="font-mono font-semibold" data-testid={`text-estimate-committed-${forecast.id}`}>{summaryRow.orderedQty.toFixed(2)} {summaryRow.unit}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Current stock</div>
          <div className="font-mono font-semibold" data-testid={`text-estimate-stock-${forecast.id}`}>{summaryRow.currentStock.toFixed(2)} {summaryRow.unit}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Projected shortage</div>
          <div className={`font-mono font-semibold ${projectedShortage > 0 ? "text-destructive" : "text-emerald-600"}`} data-testid={`text-estimate-shortage-${forecast.id}`}>
            {projectedShortage > 0 ? `−${projectedShortage.toFixed(2)} ${forecast.productUnit}` : "None"}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Required by</div>
          <div className="font-semibold" data-testid={`text-estimate-date-${forecast.id}`}>
            {format(new Date(forecast.expectedDate), "d MMM yyyy")}
          </div>
        </div>
      </div>
    </div>
  );
}

function ForecastHistoryPanel({ customerId, productId, unit }: { customerId: string; productId: string; unit: string }) {
  const { data, isLoading } = useForecastHistory(productId, 12, customerId);
  if (isLoading) {
    return <div className="mt-2 text-xs text-muted-foreground" data-testid={`text-history-loading-${customerId}-${productId}`}>Loading history…</div>;
  }
  if (!data) return null;
  const totalOrders = data.months.reduce((s, m) => s + m.orderQty, 0);
  const totalProduced = data.months.reduce((s, m) => s + m.producedQty, 0);
  const recent = data.months.slice(-3);
  return (
    <div className="mt-3 border-t pt-2 text-xs space-y-1" data-testid={`panel-history-${customerId}-${productId}`}>
      <div className="font-semibold">Past 12 months</div>
      <div className="flex gap-4 text-muted-foreground">
        <span data-testid={`text-history-customer-orders-${customerId}-${productId}`}>Customer orders: <span className="font-mono text-foreground">{totalOrders.toFixed(2)} {unit}</span></span>
        <span data-testid={`text-history-product-produced-${customerId}-${productId}`}>Produced: <span className="font-mono text-foreground">{totalProduced.toFixed(2)} {unit}</span></span>
      </div>
      {recent.length > 0 && (
        <div className="text-muted-foreground">
          Recent: {recent.map(m => `${m.month}: ${m.orderQty.toFixed(0)}o/${m.producedQty.toFixed(0)}p`).join(" · ")}
        </div>
      )}
    </div>
  );
}

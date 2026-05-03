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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Plus, Loader2, Pencil, Trash2, ArrowRightLeft, AlertTriangle, ExternalLink } from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useCustomers } from "@/features/customers/api";
import { useProducts } from "@/features/catalog/api";
import {
  useForecasts, useForecastSummary, useCreateForecast, useUpdateForecast, useDeleteForecast, useConvertForecast, useForecastHistory,
  type ForecastOrder, type ForecastRange,
} from "@/features/forecast/api";
import { ApiValidationError } from "@/lib/fetchApi";

type FormState = {
  customerId: string;
  productId: string;
  quantity: string;
  expectedDate: string;
  notes: string;
};

const emptyForm: FormState = { customerId: "", productId: "", quantity: "", expectedDate: "", notes: "" };

export default function Forecast() {
  const [view, setView] = useState<"list" | "calendar" | "history">("list");
  const [range, setRange] = useState<ForecastRange>(3);
  const [calendarDay, setCalendarDay] = useState<Date | undefined>(new Date());
  const [historyProductId, setHistoryProductId] = useState<string>("");
  const [historyMonths, setHistoryMonths] = useState<number>(6);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ForecastOrder | null>(null);
  const [convertTarget, setConvertTarget] = useState<ForecastOrder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ForecastOrder | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [convertForm, setConvertForm] = useState({ orderNumber: "", dueDate: "" });
  const { toast } = useToast();

  const { data: forecasts = [], isLoading } = useForecasts(range);
  const { data: summary } = useForecastSummary(range);
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts();

  const createMut = useCreateForecast();
  const updateMut = useUpdateForecast();
  const deleteMut = useDeleteForecast();
  const convertMut = useConvertForecast();

  const { data: history } = useForecastHistory(historyProductId || undefined, historyMonths);

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

  const grouped = useMemo(() => {
    const map = new Map<string, ForecastOrder[]>();
    for (const f of forecasts) {
      const key = format(new Date(f.expectedDate), "MMM yyyy");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    }
    const entries = Array.from(map.entries());
    for (const [, arr] of entries) {
      arr.sort((a: ForecastOrder, b: ForecastOrder) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime());
    }
    return entries;
  }, [forecasts]);

  const openCreate = () => { setForm(emptyForm); setCreateOpen(true); };

  const openEdit = (f: ForecastOrder) => {
    setEditTarget(f);
    setForm({
      customerId: f.customerId,
      productId: f.productId,
      quantity: f.quantity,
      expectedDate: f.expectedDate.slice(0, 10),
      notes: f.notes ?? "",
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

  const statusBadge = (s: ForecastOrder["status"]) => {
    if (s === "converted") return <Badge variant="secondary" data-testid={`badge-forecast-status-converted`}>Converted</Badge>;
    if (s === "archived") return <Badge variant="outline">Archived</Badge>;
    return <Badge>Open</Badge>;
  };

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

      <Tabs value={view} onValueChange={(v) => setView(v as "list" | "calendar" | "history")}>
        <TabsList>
          <TabsTrigger value="list" data-testid="tab-view-list">List</TabsTrigger>
          <TabsTrigger value="calendar" data-testid="tab-view-calendar">Calendar</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-view-history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6 mt-4">
          <Tabs value={String(range)} onValueChange={(v) => setRange(Number(v) as ForecastRange)}>
            <TabsList>
              <TabsTrigger value="3" data-testid="tab-range-3">3 months</TabsTrigger>
              <TabsTrigger value="6" data-testid="tab-range-6">6 months</TabsTrigger>
              <TabsTrigger value="12" data-testid="tab-range-12">12 months</TabsTrigger>
            </TabsList>
          </Tabs>

          <Card className="p-4">
        <h2 className="font-semibold mb-3">Stock required</h2>
        {summary && summary.products.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open forecasts in this range.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Forecast demand</TableHead>
                <TableHead className="text-right">Current stock</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Shortfall</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary?.products.map(p => (
                <TableRow key={p.productId} data-testid={`row-summary-${p.productId}`}>
                  <TableCell className="font-medium">{p.productName}</TableCell>
                  <TableCell className="text-right" data-testid={`text-demand-${p.productId}`}>{p.demand.toFixed(2)} {p.unit}</TableCell>
                  <TableCell className="text-right">{p.currentStock.toFixed(2)} {p.unit}</TableCell>
                  <TableCell className="text-right">{p.reserved.toFixed(2)} {p.unit}</TableCell>
                  <TableCell className="text-right">
                    {p.shortfall > 0 ? (
                      <span className="inline-flex items-center gap-1 text-destructive font-medium" data-testid={`text-shortfall-${p.productId}`}>
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {p.shortfall.toFixed(2)} {p.unit}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : grouped.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground" data-testid="text-empty">
          No forecasts in this range. Click <strong>New Forecast</strong> to add one.
        </Card>
      ) : (
        grouped.map(([month, items]) => (
          <Card key={month} className="p-4">
            <h3 className="font-semibold mb-3" data-testid={`heading-month-${month}`}>{month}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Expected</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(f => (
                  <TableRow key={f.id} data-testid={`row-forecast-${f.id}`}>
                    <TableCell>{format(new Date(f.expectedDate), "d MMM yyyy")}</TableCell>
                    <TableCell>{f.customerName}</TableCell>
                    <TableCell>{f.productName}</TableCell>
                    <TableCell className="text-right">{parseFloat(f.quantity).toFixed(2)} {f.productUnit}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {statusBadge(f.status)}
                        {f.status === "converted" && f.convertedOrderId && (
                          <Link href="/orders" data-testid={`link-converted-order-${f.id}`}>
                            <span className="inline-flex items-center text-xs text-primary hover:underline">
                              <ExternalLink className="h-3 w-3 mr-0.5" />
                              order
                            </span>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{f.notes ?? ""}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {f.status === "open" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openConvert(f)} data-testid={`button-convert-${f.id}`}>
                            <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Convert
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(f)} data-testid={`button-edit-${f.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(f)} data-testid={`button-delete-${f.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ))
      )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-4">
              <CalendarPicker
                mode="single"
                selected={calendarDay}
                onSelect={setCalendarDay}
                modifiers={{ hasForecast: forecastDates }}
                modifiersClassNames={{ hasForecast: "bg-primary/15 font-semibold text-primary" }}
                data-testid="calendar-forecast"
              />
              <p className="text-xs text-muted-foreground mt-2">Days with forecasts are highlighted. Pick the months range above to widen the view.</p>
            </Card>
            <Card className="p-4">
              <h3 className="font-semibold mb-3" data-testid="heading-calendar-day">
                {calendarDay ? format(calendarDay, "EEEE, d MMM yyyy") : "Pick a day"}
              </h3>
              {dayForecasts.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="text-day-empty">No forecasts on this day.</p>
              ) : (
                <div className="space-y-2">
                  {dayForecasts.map(f => (
                    <div key={f.id} className="border rounded-md p-3" data-testid={`card-day-forecast-${f.id}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-medium">{f.productName}</div>
                          <div className="text-sm text-muted-foreground">{f.customerName}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-semibold">{parseFloat(f.quantity).toFixed(2)} {f.productUnit}</div>
                          <div className="mt-1">{statusBadge(f.status)}</div>
                        </div>
                      </div>
                      {f.notes && <div className="text-xs text-muted-foreground mt-2">{f.notes}</div>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          <Card className="p-4">
            <div className="flex flex-wrap items-end gap-3 mb-4">
              <div className="min-w-[220px]">
                <Label>Product</Label>
                <Select value={historyProductId || "all"} onValueChange={(v) => setHistoryProductId(v === "all" ? "" : v)}>
                  <SelectTrigger data-testid="select-history-product"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All products</SelectItem>
                    {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Months back</Label>
                <Select value={String(historyMonths)} onValueChange={(v) => setHistoryMonths(Number(v))}>
                  <SelectTrigger data-testid="select-history-months"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="6">6</SelectItem>
                    <SelectItem value="12">12</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!history ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
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
              <Select value={form.productId} onValueChange={(v) => setForm({ ...form, productId: v })}>
                <SelectTrigger data-testid="select-forecast-product"><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
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

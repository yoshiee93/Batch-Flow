import { useState } from "react";
import { format, subDays, startOfMonth } from "date-fns";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Activity, AlertCircle, AlertTriangle, BarChart3, ChevronDown, ChevronRight,
  ClipboardCheck, Clock, Cpu, Info, Loader2, Package, Repeat2,
} from "lucide-react";
import {
  useOverview, useProductStats, useProductDetail, useMachineStats,
  useMachineDetail, useAnalytics,
  type RecentEntry, type ProductStat, type MachineStat,
} from "@/features/operations-centre/api";
import OperationsLog from "@/features/operations-log/pages/OperationsLog";

type Preset = "7d" | "30d" | "month" | "custom";

const NOTE_TYPE_LABELS: Record<string, string> = {
  drying_note: "Drying Note",
  drying_extension: "Drying Extension",
  product_assessment: "Product Assessment",
  final_comment: "Final Comment",
};

const SEVERITY_BADGE: Record<string, string> = {
  info: "bg-blue-100 text-blue-800",
  warning: "bg-amber-100 text-amber-800",
  issue: "bg-red-100 text-red-800",
};

const STATUS_BADGE: Record<string, string> = {
  open: "bg-gray-100 text-gray-700",
  reviewed: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
};

function fmtDate(d: string) {
  try { return format(new Date(d), "dd MMM yyyy, HH:mm"); } catch { return d; }
}
function fmtDateShort(d: string) {
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; }
}

function computeRange(preset: Preset, customFrom: string, customTo: string) {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  if (preset === "7d") return { from: format(subDays(today, 7), "yyyy-MM-dd"), to: todayStr };
  if (preset === "30d") return { from: format(subDays(today, 30), "yyyy-MM-dd"), to: todayStr };
  if (preset === "month") return { from: format(startOfMonth(today), "yyyy-MM-dd"), to: todayStr };
  return { from: customFrom, to: customTo };
}

function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color?: "red" | "amber" | "green";
}) {
  const valueClass =
    color === "red" ? "text-red-600" : color === "amber" ? "text-amber-600" : color === "green" ? "text-green-600" : "";
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <Icon className="h-5 w-5 text-muted-foreground opacity-60 shrink-0 mt-0.5" />
        </div>
      </CardContent>
    </Card>
  );
}

function EntryRow({ entry }: { entry: RecentEntry }) {
  const batchHref = `/batches/${entry.batch_id ?? entry.source_id}`;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <span className="text-xs font-medium">{NOTE_TYPE_LABELS[entry.note_type] ?? entry.note_type}</span>
          <Badge className={`text-xs px-1.5 py-0 ${SEVERITY_BADGE[entry.severity] ?? ""}`}>{entry.severity}</Badge>
          <Badge className={`text-xs px-1.5 py-0 ${STATUS_BADGE[entry.status] ?? ""}`}>{entry.status}</Badge>
          <span className="text-xs text-muted-foreground ml-auto">{fmtDate(entry.created_at)}</span>
        </div>
        {entry.content && <p className="text-sm text-foreground truncate">{entry.content}</p>}
        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground flex-wrap">
          {entry.batch_number && (
            <Link href={batchHref}>
              <span className="underline hover:text-foreground cursor-pointer font-mono">
                {entry.batch_number}
              </span>
            </Link>
          )}
          {entry.product_name && <span>· {entry.product_name}</span>}
          {entry.machine && <span>· ❄ {entry.machine}</span>}
        </div>
      </div>
    </div>
  );
}

function RecentSection({
  title, entries, icon: Icon, emptyMsg,
}: {
  title: string;
  entries: RecentEntry[];
  icon: React.ElementType;
  emptyMsg: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3 text-center">{emptyMsg}</p>
        ) : (
          entries.map((e) => <EntryRow key={e.id} entry={e} />)
        )}
      </CardContent>
    </Card>
  );
}

function OverviewTab({ from, to, preset, onPresetChange, customFrom, customTo, onCustomFrom, onCustomTo }: {
  from: string; to: string; preset: Preset;
  onPresetChange: (p: Preset) => void;
  customFrom: string; customTo: string;
  onCustomFrom: (v: string) => void;
  onCustomTo: (v: string) => void;
}) {
  const { data, isLoading } = useOverview(from && to ? { from, to } : undefined);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground mr-1">Period:</span>
            {(["7d", "30d", "month", "custom"] as Preset[]).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={preset === p ? "default" : "outline"}
                onClick={() => onPresetChange(p)}
                data-testid={`button-preset-${p}`}
              >
                {p === "7d" ? "Last 7 days" : p === "30d" ? "Last 30 days" : p === "month" ? "This month" : "Custom"}
              </Button>
            ))}
            {preset === "custom" && (
              <>
                <Input
                  type="date"
                  className="w-40 h-8 text-sm"
                  value={customFrom}
                  onChange={(e) => onCustomFrom(e.target.value)}
                  data-testid="input-overview-from"
                />
                <span className="text-muted-foreground text-sm">to</span>
                <Input
                  type="date"
                  className="w-40 h-8 text-sm"
                  value={customTo}
                  onChange={(e) => onCustomTo(e.target.value)}
                  data-testid="input-overview-to"
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {!stats ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Activity className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
            <p className="text-muted-foreground text-sm">No operations data for this period.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard icon={Activity} label="Production Runs" value={stats.productionRuns} />
            <StatCard icon={Repeat2} label="Batches with Notes" value={stats.batchesWithNotes} />
            <StatCard icon={Clock} label="Drying Extensions" value={stats.dryingExtensions} />
            <StatCard icon={AlertCircle} label="Open Issues" value={stats.openIssues} color="red" />
            <StatCard icon={Info} label="Unreviewed Entries" value={stats.unreviewedEntries} color="amber" />
            <StatCard
              icon={Clock}
              label="Avg Drying Time"
              value={stats.avgDryingTime != null ? `${stats.avgDryingTime}h` : "—"}
            />
            <StatCard icon={AlertTriangle} label="Warnings" value={stats.warningCount} color="amber" />
            <StatCard icon={AlertCircle} label="Total Issues" value={stats.issueCount} color="red" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RecentSection
              title="Recent Drying Extensions"
              entries={data?.recentExtensions ?? []}
              icon={Clock}
              emptyMsg="No drying extensions in this period."
            />
            <RecentSection
              title="Recent Issues & Warnings"
              entries={data?.recentIssues ?? []}
              icon={AlertTriangle}
              emptyMsg="No issues or warnings in this period."
            />
            <RecentSection
              title="Recent Product Assessments"
              entries={data?.recentAssessments ?? []}
              icon={Package}
              emptyMsg="No product assessments in this period."
            />
            <RecentSection
              title="Recent Final Comments"
              entries={data?.recentComments ?? []}
              icon={ClipboardCheck}
              emptyMsg="No final comments in this period."
            />
          </div>
        </>
      )}
    </div>
  );
}

function ProductDetailPanel({ productId }: { productId: string }) {
  const { data, isLoading } = useProductDetail(productId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recent Log Entries</p>
        {(data?.recentLogs ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No log entries found.</p>
        ) : (
          data!.recentLogs.map((e) => <EntryRow key={e.id} entry={e} />)
        )}
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recent Batches</p>
        {(data?.recentBatches ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No batches found.</p>
        ) : (
          <div className="space-y-1">
            {data!.recentBatches.map((b) => (
              <div key={b.id} className="flex items-center gap-2 py-1 border-b last:border-0">
                <Link href={`/batches/${b.id}`}>
                  <span className="font-mono text-sm underline hover:text-foreground cursor-pointer" data-testid={`link-product-batch-${b.id}`}>
                    {b.batch_number}
                  </span>
                </Link>
                {b.drying_time_hours && <span className="text-xs text-muted-foreground">· {b.drying_time_hours}h</span>}
                {b.drying_extension_required && <Badge className="text-xs px-1.5 py-0 bg-amber-100 text-amber-800">Extended</Badge>}
                <span className="text-xs text-muted-foreground ml-auto">{fmtDateShort(b.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductsTab() {
  const { data: products = [], isLoading } = useProductStats();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="font-semibold text-lg mb-1">No product data yet</h3>
          <p className="text-muted-foreground text-sm">
            Product stats appear here once batches with drying data have been finalized.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="hidden md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-2 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b">
        <span>Product</span>
        <span className="text-right">Runs</span>
        <span className="text-right">Avg Time</span>
        <span className="text-right">Extensions</span>
        <span className="text-right">Warnings</span>
        <span className="text-right">Issues</span>
        <span className="text-right">Last Run</span>
        <span />
      </div>
      {products.map((p: ProductStat) => {
        const isOpen = expanded === p.product_id;
        return (
          <Card key={p.product_id} data-testid={`card-product-${p.product_id}`}>
            <CardContent className="pt-0 pb-0">
              <button
                className="w-full grid grid-cols-[2fr_auto] md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-2 px-0 py-3 text-sm items-center text-left"
                onClick={() => setExpanded(isOpen ? null : p.product_id)}
                data-testid={`button-expand-product-${p.product_id}`}
              >
                <span className="font-medium">{p.product_name}</span>
                <span className="text-right hidden md:block">{p.run_count}</span>
                <span className="text-right hidden md:block text-muted-foreground">
                  {p.avg_drying_time ? `${parseFloat(p.avg_drying_time).toFixed(1)}h` : "—"}
                </span>
                <span className="text-right hidden md:block">{p.extension_count}</span>
                <span className={`text-right hidden md:block ${p.warning_count > 0 ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                  {p.warning_count}
                </span>
                <span className={`text-right hidden md:block ${p.issue_count > 0 ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                  {p.issue_count}
                </span>
                <span className="text-right hidden md:block text-muted-foreground text-xs">
                  {p.most_recent_run ? fmtDateShort(p.most_recent_run) : "—"}
                </span>
                <div className="flex items-center justify-end">
                  {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>
              <div className="flex md:hidden flex-wrap gap-x-4 gap-y-0.5 pb-2 text-xs text-muted-foreground">
                <span>{p.run_count} runs</span>
                <span>{p.avg_drying_time ? `${parseFloat(p.avg_drying_time).toFixed(1)}h avg` : ""}</span>
                {p.warning_count > 0 && <span className="text-amber-600">{p.warning_count} warnings</span>}
                {p.issue_count > 0 && <span className="text-red-600">{p.issue_count} issues</span>}
              </div>
              {isOpen && (
                <div className="border-t pt-3 pb-4">
                  <ProductDetailPanel productId={p.product_id} />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function MachineDetailPanel({ machine }: { machine: string }) {
  const { data, isLoading } = useMachineDetail(machine);

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recent Log Entries</p>
        {(data?.recentLogs ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No log entries found.</p>
        ) : (
          data!.recentLogs.map((e) => <EntryRow key={e.id} entry={e} />)
        )}
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recent Batches</p>
        {(data?.recentBatches ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No batches found.</p>
        ) : (
          <div className="space-y-1">
            {data!.recentBatches.map((b) => (
              <div key={b.id} className="flex items-center gap-2 py-1 border-b last:border-0">
                <Link href={`/batches/${b.id}`}>
                  <span className="font-mono text-sm underline hover:text-foreground cursor-pointer" data-testid={`link-machine-batch-${b.id}`}>
                    {b.batch_number}
                  </span>
                </Link>
                {b.product_name && <span className="text-xs text-muted-foreground">{b.product_name}</span>}
                {b.drying_time_hours && <span className="text-xs text-muted-foreground">· {b.drying_time_hours}h</span>}
                {b.drying_extension_required && <Badge className="text-xs px-1.5 py-0 bg-amber-100 text-amber-800">Extended</Badge>}
                <span className="text-xs text-muted-foreground ml-auto">{fmtDateShort(b.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MachinesTab() {
  const { data: machines = [], isLoading } = useMachineStats();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (machines.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Cpu className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="font-semibold text-lg mb-1">No machine data yet</h3>
          <p className="text-muted-foreground text-sm">
            Machine stats appear here once batches with a drying machine assigned are finalized.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="hidden md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-2 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b">
        <span>Machine</span>
        <span className="text-right">Runs</span>
        <span className="text-right">Avg Time</span>
        <span className="text-right">Extensions</span>
        <span className="text-right">Warnings</span>
        <span className="text-right">Issues</span>
        <span className="text-right">Last Run</span>
        <span />
      </div>
      {machines.map((m: MachineStat) => {
        const isOpen = expanded === m.machine;
        return (
          <Card key={m.machine} data-testid={`card-machine-${m.machine}`}>
            <CardContent className="pt-0 pb-0">
              <button
                className="w-full grid grid-cols-[2fr_auto] md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-2 px-0 py-3 text-sm items-center text-left"
                onClick={() => setExpanded(isOpen ? null : m.machine)}
                data-testid={`button-expand-machine-${m.machine}`}
              >
                <span className="font-medium flex items-center gap-2">
                  <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                  {m.machine}
                </span>
                <span className="text-right hidden md:block">{m.run_count}</span>
                <span className="text-right hidden md:block text-muted-foreground">
                  {m.avg_drying_time ? `${parseFloat(m.avg_drying_time).toFixed(1)}h` : "—"}
                </span>
                <span className="text-right hidden md:block">{m.extension_count}</span>
                <span className={`text-right hidden md:block ${m.warning_count > 0 ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                  {m.warning_count}
                </span>
                <span className={`text-right hidden md:block ${m.issue_count > 0 ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                  {m.issue_count}
                </span>
                <span className="text-right hidden md:block text-muted-foreground text-xs">
                  {m.most_recent_run ? fmtDateShort(m.most_recent_run) : "—"}
                </span>
                <div className="flex items-center justify-end">
                  {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>
              <div className="flex md:hidden flex-wrap gap-x-4 gap-y-0.5 pb-2 text-xs text-muted-foreground">
                <span>{m.run_count} runs</span>
                <span>{m.avg_drying_time ? `${parseFloat(m.avg_drying_time).toFixed(1)}h avg` : ""}</span>
                {m.warning_count > 0 && <span className="text-amber-600">{m.warning_count} warnings</span>}
                {m.issue_count > 0 && <span className="text-red-600">{m.issue_count} issues</span>}
              </div>
              {isOpen && (
                <div className="border-t pt-3 pb-4">
                  <MachineDetailPanel machine={m.machine} />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function AnalyticsTable({
  title, columns, rows, emptyMsg,
}: {
  title: string;
  columns: string[];
  rows: Record<string, unknown>[];
  emptyMsg: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2 text-center">{emptyMsg}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {columns.map((c) => (
                    <th key={c} className="text-left py-1.5 pr-4 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="py-1.5 pr-4 whitespace-nowrap">
                        {v == null ? "—" : String(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AnalyticsTab({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useAnalytics(from && to ? { from, to } : undefined);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const noteTypeLabels: Record<string, string> = NOTE_TYPE_LABELS;

  const avgByProductRows = (data?.avgDryingTimeByProduct ?? []).map((r) => ({
    Product: r.product_name,
    "Avg Drying Time": r.avg_drying_time ? `${parseFloat(r.avg_drying_time).toFixed(2)}h` : "—",
    Runs: r.run_count,
  }));

  const avgByMachineRows = (data?.avgDryingTimeByMachine ?? []).map((r) => ({
    Machine: r.machine,
    "Avg Drying Time": r.avg_drying_time ? `${parseFloat(r.avg_drying_time).toFixed(2)}h` : "—",
    Runs: r.run_count,
  }));

  const extsByProductRows = (data?.extensionsByProduct ?? []).map((r) => ({
    Product: r.product_name,
    Extensions: r.extension_count,
    Runs: r.run_count,
    "Extension Rate": r.run_count > 0 ? `${Math.round((r.extension_count / r.run_count) * 100)}%` : "—",
  }));

  const extsByMachineRows = (data?.extensionsByMachine ?? []).map((r) => ({
    Machine: r.machine,
    Extensions: r.extension_count,
    Runs: r.run_count,
    "Extension Rate": r.run_count > 0 ? `${Math.round((r.extension_count / r.run_count) * 100)}%` : "—",
  }));

  const sevByProductRows = (data?.severityByProduct ?? []).map((r) => ({
    Product: r.product_name,
    Warnings: r.warning_count,
    Issues: r.issue_count,
    Info: r.info_count,
  }));

  const sevByMachineRows = (data?.severityByMachine ?? []).map((r) => ({
    Machine: r.machine,
    Warnings: r.warning_count,
    Issues: r.issue_count,
    Info: r.info_count,
  }));

  const noteTypeRows = (data?.noteTypeBreakdown ?? []).map((r) => ({
    "Note Type": noteTypeLabels[r.note_type] ?? r.note_type,
    Count: r.entry_count,
  }));

  const statusRows = (data?.statusDistribution ?? []).map((r) => ({
    Status: r.status.charAt(0).toUpperCase() + r.status.slice(1),
    Count: r.entry_count,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnalyticsTable
          title="Avg Drying Time by Product"
          columns={["Product", "Avg Drying Time", "Runs"]}
          rows={avgByProductRows}
          emptyMsg="No drying data for this period."
        />
        <AnalyticsTable
          title="Avg Drying Time by Machine"
          columns={["Machine", "Avg Drying Time", "Runs"]}
          rows={avgByMachineRows}
          emptyMsg="No machine drying data for this period."
        />
        <AnalyticsTable
          title="Extensions by Product"
          columns={["Product", "Extensions", "Runs", "Extension Rate"]}
          rows={extsByProductRows}
          emptyMsg="No extension data for this period."
        />
        <AnalyticsTable
          title="Extensions by Machine"
          columns={["Machine", "Extensions", "Runs", "Extension Rate"]}
          rows={extsByMachineRows}
          emptyMsg="No machine extension data for this period."
        />
        <AnalyticsTable
          title="Warnings & Issues by Product"
          columns={["Product", "Warnings", "Issues", "Info"]}
          rows={sevByProductRows}
          emptyMsg="No severity data for this period."
        />
        <AnalyticsTable
          title="Warnings & Issues by Machine"
          columns={["Machine", "Warnings", "Issues", "Info"]}
          rows={sevByMachineRows}
          emptyMsg="No machine severity data for this period."
        />
        <AnalyticsTable
          title="Note Type Breakdown"
          columns={["Note Type", "Count"]}
          rows={noteTypeRows}
          emptyMsg="No entries for this period."
        />
        <AnalyticsTable
          title="Status Distribution"
          columns={["Status", "Count"]}
          rows={statusRows}
          emptyMsg="No entries for this period."
        />
      </div>

      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <BarChart3 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium mb-1">AI Summaries</p>
              <p className="text-sm text-muted-foreground">
                AI summaries can be added later once enough operations data is collected.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OperationsCentre() {
  const [activeTab, setActiveTab] = useState("overview");
  const [preset, setPreset] = useState<Preset>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const { from, to } = computeRange(preset, customFrom, customTo);
  const apiFrom = from || undefined;
  const apiTo = to || undefined;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6" />
          Operations Centre
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Supervisor hub for drying operations — trends, machine stats, and batch intelligence.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto" data-testid="tabs-operations-centre">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="log" data-testid="tab-log">Operations Log</TabsTrigger>
          <TabsTrigger value="products" data-testid="tab-products">Products</TabsTrigger>
          <TabsTrigger value="machines" data-testid="tab-machines">Machines</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab
            from={apiFrom ?? ""}
            to={apiTo ?? ""}
            preset={preset}
            onPresetChange={setPreset}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFrom={setCustomFrom}
            onCustomTo={setCustomTo}
          />
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          <OperationsLog />
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          <ProductsTab />
        </TabsContent>

        <TabsContent value="machines" className="mt-4">
          <MachinesTab />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <AnalyticsTab from={apiFrom ?? ""} to={apiTo ?? ""} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

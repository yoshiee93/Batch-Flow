import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Activity, ChevronLeft, ChevronRight, Loader2, AlertCircle, X } from "lucide-react";
import { useAuditLogList, useAuditLogFacets, type AuditLogRow, type AuditLogFilters } from "@/features/security/api";

const PAGE_SIZE = 20;
const ALL = "__all__";

interface UrlState {
  q: string;
  entityType: string;
  action: string;
  userId: string;
  from: string;
  to: string;
  page: number;
}

function readUrlState(): UrlState {
  if (typeof window === "undefined") {
    return { q: "", entityType: "", action: "", userId: "", from: "", to: "", page: 1 };
  }
  const p = new URLSearchParams(window.location.search);
  return {
    q: p.get("q") ?? "",
    entityType: p.get("entityType") ?? "",
    action: p.get("action") ?? "",
    userId: p.get("userId") ?? "",
    from: p.get("from") ?? "",
    to: p.get("to") ?? "",
    page: Math.max(1, parseInt(p.get("page") ?? "1", 10) || 1),
  };
}

function prettifyChanges(raw: string | null): string {
  if (!raw) return "(no details)";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function formatDateTime(iso: string): string {
  try {
    return format(new Date(iso), "yyyy-MM-dd HH:mm:ss");
  } catch {
    return iso;
  }
}

export default function ActivityLogPanel() {
  const [, navigate] = useLocation();

  const [state, setState] = useState<UrlState>(() => readUrlState());
  const [qDraft, setQDraft] = useState(state.q);
  const [selected, setSelected] = useState<AuditLogRow | null>(null);

  // Sync state to URL (preserve other params like tab/section)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const setOrDelete = (k: string, v: string | number | undefined) => {
      if (v === undefined || v === "" || v === 0) params.delete(k);
      else params.set(k, String(v));
    };
    setOrDelete("q", state.q);
    setOrDelete("entityType", state.entityType);
    setOrDelete("action", state.action);
    setOrDelete("userId", state.userId);
    setOrDelete("from", state.from);
    setOrDelete("to", state.to);
    setOrDelete("page", state.page > 1 ? state.page : 0);
    const qs = params.toString();
    navigate(`/settings${qs ? `?${qs}` : ""}`, { replace: true });
  }, [state, navigate]);

  // Debounce search input → state
  useEffect(() => {
    const t = setTimeout(() => {
      setState(s => (s.q === qDraft ? s : { ...s, q: qDraft, page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [qDraft]);

  const filters: AuditLogFilters = useMemo(() => {
    const f: AuditLogFilters = { limit: PAGE_SIZE, offset: (state.page - 1) * PAGE_SIZE };
    if (state.q) f.q = state.q;
    if (state.entityType) f.entityType = state.entityType;
    if (state.action) f.action = state.action;
    if (state.userId) f.userId = state.userId;
    if (state.from) {
      const d = new Date(state.from);
      if (!isNaN(d.getTime())) f.from = d.toISOString();
    }
    if (state.to) {
      const d = new Date(state.to);
      if (!isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        f.to = d.toISOString();
      }
    }
    return f;
  }, [state]);

  const { data, isLoading, isError } = useAuditLogList(filters);
  const { data: facets } = useAuditLogFacets();

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const items = data?.items ?? [];

  const update = <K extends keyof UrlState>(key: K, value: UrlState[K]) => {
    setState(s => ({ ...s, [key]: value, page: key === "page" ? (value as number) : 1 }));
  };

  const clearAll = () => {
    setQDraft("");
    setState({ q: "", entityType: "", action: "", userId: "", from: "", to: "", page: 1 });
  };

  const hasFilters = !!(state.q || state.entityType || state.action || state.userId || state.from || state.to);

  return (
    <Card data-testid="card-activity-log">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Log
        </CardTitle>
        <CardDescription>
          Immutable audit trail of every create, update, and delete action across the system. Use filters to narrow by entity, action, user, or date range.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <div className="xl:col-span-2">
            <Label htmlFor="audit-q" className="text-xs">Search</Label>
            <Input
              id="audit-q"
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              placeholder="Entity ID, action, or change content..."
              data-testid="input-audit-search"
            />
          </div>
          <div>
            <Label className="text-xs">Entity Type</Label>
            <Select
              value={state.entityType || ALL}
              onValueChange={(v) => update("entityType", v === ALL ? "" : v)}
            >
              <SelectTrigger data-testid="select-audit-entity-type">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                {(facets?.entityTypes ?? []).map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Action</Label>
            <Select
              value={state.action || ALL}
              onValueChange={(v) => update("action", v === ALL ? "" : v)}
            >
              <SelectTrigger data-testid="select-audit-action">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                {(facets?.actions ?? []).map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">User</Label>
            <Select
              value={state.userId || ALL}
              onValueChange={(v) => update("userId", v === ALL ? "" : v)}
            >
              <SelectTrigger data-testid="select-audit-user">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                {(facets?.users ?? []).map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="audit-from" className="text-xs">From</Label>
            <Input
              id="audit-from"
              type="date"
              value={state.from}
              onChange={(e) => update("from", e.target.value)}
              data-testid="input-audit-from"
            />
          </div>
          <div>
            <Label htmlFor="audit-to" className="text-xs">To</Label>
            <Input
              id="audit-to"
              type="date"
              value={state.to}
              onChange={(e) => update("to", e.target.value)}
              data-testid="input-audit-to"
            />
          </div>
        </div>

        {hasFilters && (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={clearAll} data-testid="button-audit-clear">
              <X className="h-3.5 w-3.5 mr-1" /> Clear filters
            </Button>
          </div>
        )}

        {/* Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[160px]">When</TableHead>
                <TableHead className="min-w-[140px]">User</TableHead>
                <TableHead className="min-w-[120px]">Entity</TableHead>
                <TableHead className="min-w-[120px]">Action</TableHead>
                <TableHead className="min-w-[200px]">Entity ID</TableHead>
                <TableHead className="min-w-[100px] text-right">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="h-5 w-5 animate-spin inline-block text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-destructive">
                    <AlertCircle className="h-5 w-5 inline-block mr-2" />
                    Failed to load activity log
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No activity matching the current filters
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-accent/40"
                    onClick={() => setSelected(row)}
                    data-testid={`row-audit-${row.id}`}
                  >
                    <TableCell className="font-mono text-xs whitespace-nowrap">{formatDateTime(row.createdAt)}</TableCell>
                    <TableCell className="text-sm">
                      {row.userName ? (
                        <div className="flex flex-col">
                          <span>{row.userName}</span>
                          {row.userRole && <span className="text-xs text-muted-foreground">{row.userRole}</span>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">system</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.entityType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.action}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs truncate max-w-[200px]" title={row.entityId}>
                      {row.entityId}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setSelected(row); }}
                        data-testid={`button-audit-detail-${row.id}`}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
          <div className="text-muted-foreground" data-testid="text-audit-summary">
            {total === 0
              ? "No results"
              : `Showing ${(state.page - 1) * PAGE_SIZE + 1}–${Math.min(state.page * PAGE_SIZE, total)} of ${total}`}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={state.page <= 1}
              onClick={() => setState(s => ({ ...s, page: Math.max(1, s.page - 1) }))}
              data-testid="button-audit-prev"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Prev
            </Button>
            <span className="text-muted-foreground" data-testid="text-audit-page">
              Page {state.page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={state.page >= totalPages}
              onClick={() => setState(s => ({ ...s, page: Math.min(totalPages, s.page + 1) }))}
              data-testid="button-audit-next"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
          <SheetHeader>
            <SheetTitle>Activity Detail</SheetTitle>
            <SheetDescription>
              {selected ? `${selected.entityType} • ${selected.action}` : ""}
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <ScrollArea className="flex-1 -mx-6 px-6 mt-4">
              <div className="space-y-4 pb-6">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">When</div>
                    <div className="font-mono text-xs" data-testid="text-detail-when">{formatDateTime(selected.createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">User</div>
                    <div data-testid="text-detail-user">{selected.userName ?? <span className="italic text-muted-foreground">system</span>}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Entity Type</div>
                    <div data-testid="text-detail-entity-type">{selected.entityType}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Action</div>
                    <div data-testid="text-detail-action">{selected.action}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-muted-foreground">Entity ID</div>
                    <div className="font-mono text-xs break-all" data-testid="text-detail-entity-id">{selected.entityId}</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-1">Changes</div>
                  <pre
                    className="bg-muted/50 rounded-md p-3 text-xs overflow-x-auto whitespace-pre-wrap break-words font-mono"
                    data-testid="text-detail-changes"
                  >
                    {prettifyChanges(selected.changes)}
                  </pre>
                </div>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
}

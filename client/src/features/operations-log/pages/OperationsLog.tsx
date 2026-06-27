import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ClipboardCheck, AlertTriangle, Info, AlertCircle, Search, Download } from "lucide-react";
import { useOpsLog, useUpdateOpsLogStatus, useUpdateOpsLogSeverity, type OpsLogEntry } from "@/features/operations-log/api";
import { usePermissions } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const SEVERITY_CONFIG = {
  info: { label: "Info", icon: Info, className: "bg-blue-100 text-blue-800" },
  warning: { label: "Warning", icon: AlertTriangle, className: "bg-amber-100 text-amber-800" },
  issue: { label: "Issue", icon: AlertCircle, className: "bg-red-100 text-red-800" },
};

const STATUS_CONFIG = {
  open: { label: "Open", className: "bg-gray-100 text-gray-700" },
  reviewed: { label: "Reviewed", className: "bg-blue-100 text-blue-700" },
  resolved: { label: "Resolved", className: "bg-green-100 text-green-700" },
};

const NOTE_TYPE_LABELS: Record<string, string> = {
  drying_note: "Drying Note",
  drying_extension: "Drying Extension",
  product_assessment: "Product Assessment",
  final_comment: "Final Comment",
};

function fmtDate(d: string) {
  try { return format(new Date(d), "dd MMM yyyy, HH:mm"); } catch { return d; }
}

export default function OperationsLog() {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission("operations_log.edit");
  const canExport = hasPermission("operations_log.export");
  const { toast } = useToast();

  const [q, setQ] = useState("");
  const [noteType, setNoteType] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");

  const { data: entries = [], isLoading } = useOpsLog({
    q: q || undefined,
    noteType: noteType !== "all" ? noteType : undefined,
    severity: severity !== "all" ? severity : undefined,
    status: status !== "all" ? status : undefined,
  });

  const updateStatus = useUpdateOpsLogStatus();
  const updateSeverity = useUpdateOpsLogSeverity();

  function handleStatusChange(entry: OpsLogEntry, newStatus: "open" | "reviewed" | "resolved") {
    updateStatus.mutate(
      { id: entry.id, status: newStatus },
      {
        onError: (e) => toast({ title: "Error", description: (e as Error).message, variant: "destructive" }),
      }
    );
  }

  function handleSeverityChange(entry: OpsLogEntry, newSeverity: "info" | "warning" | "issue") {
    updateSeverity.mutate(
      { id: entry.id, severity: newSeverity },
      {
        onError: (e) => toast({ title: "Error", description: (e as Error).message, variant: "destructive" }),
      }
    );
  }

  function handleExport() {
    if (!canExport) return;
    const rows = [
      ["Date", "Source", "Type", "Content", "Severity", "Status"],
      ...entries.map((e) => [
        fmtDate(e.createdAt),
        `${e.sourceType}/${e.sourceId}`,
        NOTE_TYPE_LABELS[e.noteType] ?? e.noteType,
        e.content,
        e.severity,
        e.status,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ops-log-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6" />
            Operations Log
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Auto-generated notes from batch finalization. Drying extensions, assessments, and comments.
          </p>
        </div>
        {canExport && (
          <Button variant="outline" onClick={handleExport} data-testid="button-export-ops-log">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search content, batch ID…"
                className="pl-9"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                data-testid="input-ops-log-search"
              />
            </div>
            <Select value={noteType} onValueChange={setNoteType}>
              <SelectTrigger className="w-44" data-testid="select-ops-log-note-type">
                <SelectValue placeholder="Note type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="drying_note">Drying Note</SelectItem>
                <SelectItem value="drying_extension">Drying Extension</SelectItem>
                <SelectItem value="product_assessment">Product Assessment</SelectItem>
                <SelectItem value="final_comment">Final Comment</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="w-36" data-testid="select-ops-log-severity">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="issue">Issue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36" data-testid="select-ops-log-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-1">No log entries</h3>
            <p className="text-muted-foreground text-sm">
              Entries are created automatically when batches are finalized with drying or assessment data.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const sevConfig = SEVERITY_CONFIG[entry.severity];
            const stConfig = STATUS_CONFIG[entry.status];
            const SevIcon = sevConfig.icon;
            return (
              <Card key={entry.id} data-testid={`card-ops-log-${entry.id}`}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start gap-3 flex-wrap">
                    <SevIcon className={`h-4 w-4 mt-0.5 shrink-0 ${entry.severity === "info" ? "text-blue-600" : entry.severity === "warning" ? "text-amber-600" : "text-red-600"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium text-sm">
                          {NOTE_TYPE_LABELS[entry.noteType] ?? entry.noteType}
                        </span>
                        <Badge className={`text-xs px-1.5 py-0 ${sevConfig.className}`} data-testid={`badge-severity-${entry.id}`}>
                          {sevConfig.label}
                        </Badge>
                        <Badge className={`text-xs px-1.5 py-0 ${stConfig.className}`} data-testid={`badge-status-${entry.id}`}>
                          {stConfig.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-auto">{fmtDate(entry.createdAt)}</span>
                      </div>
                      <p className="text-sm text-foreground">{entry.content}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                        <span>
                          Source:{" "}
                          <Link href={`/batches/${entry.sourceId}`}>
                            <span className="underline hover:text-foreground cursor-pointer font-mono" data-testid={`link-source-${entry.id}`}>
                              {entry.sourceType}/{entry.sourceId.slice(0, 8)}…
                            </span>
                          </Link>
                        </span>
                        {entry.updatedAt !== entry.createdAt && (
                          <span>· Updated {fmtDate(entry.updatedAt)}</span>
                        )}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <Select
                          value={entry.severity}
                          onValueChange={(v) => handleSeverityChange(entry, v as "info" | "warning" | "issue")}
                        >
                          <SelectTrigger className="h-7 text-xs w-28" data-testid={`select-severity-${entry.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="info">Info</SelectItem>
                            <SelectItem value="warning">Warning</SelectItem>
                            <SelectItem value="issue">Issue</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={entry.status}
                          onValueChange={(v) => handleStatusChange(entry, v as "open" | "reviewed" | "resolved")}
                        >
                          <SelectTrigger className="h-7 text-xs w-28" data-testid={`select-status-${entry.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="reviewed">Reviewed</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

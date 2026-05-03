import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, Loader2, Printer, AlertCircle } from "lucide-react";
import {
  usePrintHistory, useRecordPrint,
  type PrintHistoryFilters, type PrintHistoryRow, type PrintLabelKind,
} from "@/features/labels/api";
import { useToast } from "@/hooks/use-toast";
import { reprintFromHistory } from "@/lib/printAndRecord";

const KIND_LABELS: Record<PrintLabelKind, string> = {
  raw_intake: "Raw Intake",
  finished_output: "Finished Output",
  batch: "Batch",
  custom: "Custom",
};

const KIND_BADGE: Record<PrintLabelKind, string> = {
  raw_intake: "bg-blue-100 text-blue-700",
  finished_output: "bg-green-100 text-green-700",
  batch: "bg-amber-100 text-amber-700",
  custom: "bg-purple-100 text-purple-700",
};

export default function PrintHistoryPanel() {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [kind, setKind] = useState<PrintLabelKind | "all">("all");
  const [q, setQ] = useState<string>("");
  const { toast } = useToast();
  const recordPrint = useRecordPrint();

  const filters: PrintHistoryFilters = {
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(to + "T23:59:59").toISOString() : undefined,
    labelKind: kind === "all" ? "" : kind,
    q: q.trim() || undefined,
    limit: 50,
  };

  const { data: rows = [], isLoading, isError } = usePrintHistory(filters);

  async function handleReprint(row: PrintHistoryRow) {
    try {
      await reprintFromHistory({
        snapshot: row.snapshot,
        labelKind: row.labelKind,
        displayName: row.displayName,
        secondaryName: row.secondaryName,
        entityType: row.entityType,
        entityId: row.entityId,
        toast,
        recordPrint: (data) => recordPrint.mutate(data),
      });
    } catch {
      toast({ title: "Print failed", description: "Could not reprint the label.", variant: "destructive" });
    }
  }

  return (
    <Card data-testid="card-print-history">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Print History
        </CardTitle>
        <CardDescription>
          Recent label prints. Click "Print Again" to re-print using the snapshot from the original print.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label htmlFor="ph-from" className="text-xs">From</Label>
            <Input id="ph-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} data-testid="input-history-from" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ph-to" className="text-xs">To</Label>
            <Input id="ph-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} data-testid="input-history-to" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ph-kind" className="text-xs">Label Kind</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as PrintLabelKind | "all")}>
              <SelectTrigger id="ph-kind" data-testid="select-history-kind"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All kinds</SelectItem>
                <SelectItem value="raw_intake">Raw Intake</SelectItem>
                <SelectItem value="finished_output">Finished Output</SelectItem>
                <SelectItem value="batch">Batch</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ph-q" className="text-xs">Search</Label>
            <Input
              id="ph-q"
              placeholder="Item / lot / template…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              data-testid="input-history-search"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p>Failed to load print history</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>WHEN</TableHead>
                  <TableHead>WHO</TableHead>
                  <TableHead>KIND</TableHead>
                  <TableHead>ITEM</TableHead>
                  <TableHead>TEMPLATE</TableHead>
                  <TableHead className="w-[120px] text-right">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No prints recorded yet for these filters.
                    </TableCell>
                  </TableRow>
                ) : rows.map((row) => (
                  <TableRow key={row.id} data-testid={`row-print-history-${row.id}`}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {format(new Date(row.printedAt), "dd MMM yyyy, h:mm a")}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.printedByUsername ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${KIND_BADGE[row.labelKind]}`}>
                        {KIND_LABELS[row.labelKind]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-medium text-sm truncate" data-testid={`text-history-display-${row.id}`}>{row.displayName}</div>
                        {row.secondaryName && (
                          <div className="text-xs text-muted-foreground font-mono truncate">{row.secondaryName}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.templateName ?? <span className="italic">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 px-2"
                        onClick={() => handleReprint(row)}
                        data-testid={`button-history-reprint-${row.id}`}
                      >
                        <Printer className="h-3 w-3 mr-1" />
                        Print Again
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

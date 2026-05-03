import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Boxes, Factory, Trash2, Percent } from "lucide-react";
import { format } from "date-fns";
import { useProductionYtd, type ReportRange } from "@/features/reports/api";
import { Card as ErrorCard } from "@/components/ui/card";

export default function ProductionYtd() {
  const [range, setRange] = useState<ReportRange>("calendar");
  const { data, isLoading, isError, error } = useProductionYtd(range);

  const productMax = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, ...data.byProduct.map(p => p.output));
  }, [data]);

  const categoryMax = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, ...data.byCategory.map(c => c.output));
  }, [data]);

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-mono" data-testid="text-page-title">Production Report</h1>
        <p className="text-sm text-muted-foreground">
          Year-to-date production totals.
          {data && <> {" "}<span className="text-foreground font-medium">{data.label}</span> · {format(new Date(data.from), "d MMM yyyy")} – {format(new Date(data.to), "d MMM yyyy")}</>}
        </p>
      </div>

      <Tabs value={range} onValueChange={(v) => setRange(v as ReportRange)}>
        <TabsList>
          <TabsTrigger value="calendar" data-testid="tab-range-calendar">Calendar YTD</TabsTrigger>
          <TabsTrigger value="financial" data-testid="tab-range-financial">Financial YTD</TabsTrigger>
          <TabsTrigger value="last12" data-testid="tab-range-last12">Last 12 months</TabsTrigger>
        </TabsList>
      </Tabs>

      {isError ? (
        <ErrorCard className="p-6 text-center" data-testid="text-error">
          <p className="text-sm text-destructive font-medium">Failed to load report</p>
          <p className="text-xs text-muted-foreground mt-1">{error instanceof Error ? error.message : "Please try again."}</p>
        </ErrorCard>
      ) : isLoading || !data ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Tile icon={<Boxes className="h-5 w-5" />} label="Total output" value={fmt(data.totals.output)} testId="tile-output" />
            <Tile icon={<Factory className="h-5 w-5" />} label="Total batches" value={fmt(data.totals.batches)} testId="tile-batches" />
            <Tile icon={<Trash2 className="h-5 w-5" />} label="Total waste" value={fmt(data.totals.waste)} testId="tile-waste" />
            <Tile icon={<Percent className="h-5 w-5" />} label="Average yield" value={`${fmt(data.totals.averageYield * 100)}%`} testId="tile-yield" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-4">
              <h2 className="font-semibold mb-3">Output by product (top 10)</h2>
              {data.byProduct.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="text-no-products">No completed batches in this range.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Output</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byProduct.map(p => (
                      <TableRow key={p.productId} data-testid={`row-product-${p.productId}`}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded h-3 overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${(p.output / productMax) * 100}%` }} />
                            </div>
                            <span className="text-xs font-mono w-32 text-right" data-testid={`text-product-output-${p.productId}`}>{fmt(p.output)} {p.unit}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>

            <Card className="p-4">
              <h2 className="font-semibold mb-3">Output by category</h2>
              {data.byCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="text-no-categories">No completed batches in this range.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Output</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byCategory.map(c => (
                      <TableRow key={c.categoryId ?? "_none"} data-testid={`row-category-${c.categoryId ?? "none"}`}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded h-3 overflow-hidden">
                              <div className="h-full bg-blue-500" style={{ width: `${(c.output / categoryMax) * 100}%` }} />
                            </div>
                            <span className="text-xs font-mono w-32 text-right">{fmt(c.output)}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Tile({ icon, label, value, testId }: { icon: React.ReactNode; label: string; value: string; testId: string }) {
  return (
    <Card className="p-4 flex items-center gap-3" data-testid={testId}>
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-mono text-xl font-semibold" data-testid={`${testId}-value`}>{value}</div>
      </div>
    </Card>
  );
}

import { useParams, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, Package, Factory, Box, ChevronRight, Loader2,
  ClipboardList, Calendar, AlertCircle, CheckCircle, Scale,
  TrendingDown, ArrowRightLeft, ExternalLink
} from 'lucide-react';
import {
  useBatch, useProducts, useBatchInputLots, useBatchOutputLots, useStockMovements, useRecipes,
  type InputLot, type OutputLot, type StockMovement
} from '@/lib/api';
import { format } from 'date-fns';

const batchStatusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const lotStatusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  quarantine: 'bg-yellow-100 text-yellow-700',
  consumed: 'bg-gray-100 text-gray-600',
  expired: 'bg-red-100 text-red-700',
};

const movementLabels: Record<string, string> = {
  receipt: 'Received',
  production_input: 'Consumed (Input)',
  production_output: 'Produced (Output)',
  adjustment: 'Adjusted',
  shipment: 'Shipped',
};

const outflowTypes = new Set(['production_input', 'adjustment', 'shipment']);

function fmtQty(q: string | null | undefined, unit = 'KG') {
  if (!q) return '—';
  return `${parseFloat(q).toFixed(2)} ${unit}`;
}

function fmtDate(d: string | null | undefined, fmt = 'dd MMM yyyy') {
  if (!d) return '—';
  try { return format(new Date(d), fmt); } catch { return d; }
}

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: batch, isLoading: batchLoading, isError } = useBatch(id!);
  const { data: products = [] } = useProducts();
  const { data: recipes = [] } = useRecipes();
  const { data: inputLots = [], isLoading: inputsLoading } = useBatchInputLots(id!);
  const { data: outputLots = [], isLoading: outputsLoading } = useBatchOutputLots(id!);
  const { data: movements = [], isLoading: movementsLoading } = useStockMovements(id!);

  if (batchLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !batch) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Batch not found</h2>
        <p className="text-muted-foreground">The batch you're looking for doesn't exist or couldn't be loaded.</p>
        <Link href="/production">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back to Production</Button>
        </Link>
      </div>
    );
  }

  const product = products.find(p => p.id === batch.productId);
  const recipe = batch.recipeId ? recipes.find(r => r.id === batch.recipeId) : null;
  const statusClass = batchStatusColors[batch.status] || 'bg-gray-100 text-gray-800';
  const statusLabel = batch.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

  const totalInputKg = inputLots.reduce((sum, m) => sum + parseFloat(m.quantityConsumed || '0'), 0);
  const totalOutputKg = outputLots.reduce((sum, o) => sum + parseFloat(o.quantity || '0'), 0);
  const yieldPct = totalInputKg > 0 ? ((totalOutputKg / totalInputKg) * 100).toFixed(1) : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/production">
          <Button variant="ghost" size="sm" data-testid="button-back-production">
            <ArrowLeft className="h-4 w-4 mr-1" /> Production
          </Button>
        </Link>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono font-bold text-lg" data-testid="text-batch-number">{batch.batchNumber}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Factory className="h-5 w-5" />
                  {batch.batchNumber}
                </CardTitle>
                <CardDescription className="mt-1">
                  {product?.name || 'Unknown Product'}
                  {product?.sku && <span className="ml-2 text-xs font-mono">({product.sku})</span>}
                </CardDescription>
              </div>
              <Badge className={statusClass} data-testid="badge-batch-status">{statusLabel}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
              <div>
                <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Start Date</div>
                <div data-testid="text-start-date">{fmtDate(batch.startDate)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">End Date</div>
                <div data-testid="text-end-date">{fmtDate(batch.endDate)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Assigned To</div>
                <div>{batch.assignedTo || '—'}</div>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Recipe</div>
                <div>
                  {recipe
                    ? <>{recipe.name} <span className="text-xs text-muted-foreground font-mono">(v{recipe.version})</span></>
                    : <span className="text-muted-foreground">—</span>
                  }
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Planned Qty</div>
                <div className="font-mono">{fmtQty(batch.plannedQuantity)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Actual Output</div>
                <div className="font-mono" data-testid="text-actual-qty">{fmtQty(batch.actualQuantity)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Waste</div>
                <div className="font-mono">{fmtQty(batch.wasteQuantity)}</div>
              </div>
              {batch.wetQuantity && parseFloat(batch.wetQuantity) > 0 && (
                <div>
                  <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Wet Qty</div>
                  <div className="font-mono">{fmtQty(batch.wetQuantity)}</div>
                </div>
              )}
              {batch.millingQuantity && parseFloat(batch.millingQuantity) > 0 && (
                <div>
                  <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Milling Qty</div>
                  <div className="font-mono">{fmtQty(batch.millingQuantity)}</div>
                </div>
              )}
            </div>
            {batch.notes && (
              <>
                <Separator className="my-4" />
                <div>
                  <div className="text-muted-foreground text-xs uppercase font-medium mb-1">Notes</div>
                  <p className="text-sm">{batch.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Box className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Total Input</span>
                <span className="ml-auto font-mono font-medium">{totalInputKg.toFixed(2)} KG</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Total Output</span>
                <span className="ml-auto font-mono font-medium">{totalOutputKg.toFixed(2)} KG</span>
              </div>
              {yieldPct && (
                <div className="flex items-center gap-2 text-sm">
                  <Scale className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Yield</span>
                  <span className="ml-auto font-mono font-medium text-green-600">{yieldPct}%</span>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Link href={`/traceability?batch=${batch.batchNumber}`}>
              <Button variant="outline" className="w-full" data-testid="button-view-traceability">
                <ClipboardList className="mr-2 h-4 w-4" />
                View Full Trace
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Box className="h-4 w-4" />
            Input Lots Consumed
            <Badge variant="secondary" className="ml-1">{inputLots.length}</Badge>
          </CardTitle>
          <CardDescription>Raw material lots used in this production batch, tracked for compliance.</CardDescription>
        </CardHeader>
        <CardContent>
          {inputsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : inputLots.length === 0 ? (
            <div className="text-center text-muted-foreground py-6 text-sm">
              No material inputs recorded for this batch.
            </div>
          ) : (
            <div className="space-y-2">
              {inputLots.map((il: InputLot) => {
                const itemName = il.materialName || il.productName || 'Unknown';
                return (
                  <div key={il.batchMaterialId} className="flex items-start justify-between p-3 border rounded-lg bg-muted/30 gap-2" data-testid={`row-input-${il.batchMaterialId}`}>
                    <div className="space-y-1 min-w-0">
                      <div className="font-medium text-sm">{itemName}</div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        <Link href={`/lots/${il.lotId}`}>
                          <span className="font-mono bg-background border px-1.5 py-0.5 rounded hover:bg-accent cursor-pointer inline-flex items-center gap-1" data-testid={`link-lot-${il.lotId}`}>
                            {il.lotNumber}
                            <ExternalLink className="h-2.5 w-2.5" />
                          </span>
                        </Link>
                        {il.barcodeValue && <span className="font-mono">{il.barcodeValue}</span>}
                        {il.supplierLot && <span>Supplier Lot: {il.supplierLot}</span>}
                        {il.supplierName && <span>· {il.supplierName}</span>}
                        {il.expiryDate && <span>· Exp: {fmtDate(il.expiryDate, 'dd/MM/yy')}</span>}
                        {il.addedAt && <span>· Added: {fmtDate(il.addedAt, 'dd MMM yy')}</span>}
                      </div>
                      <Badge className={`text-xs px-1.5 py-0 ${lotStatusColors[il.status] || 'bg-gray-100 text-gray-600'}`}>
                        {il.status}
                      </Badge>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-medium text-sm">{fmtQty(il.quantityConsumed)}</div>
                      {il.remainingQuantity && (
                        <div className="text-xs text-muted-foreground font-mono">{fmtQty(il.remainingQuantity)} left</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle className="h-4 w-4" />
            Output Lots Produced
            <Badge variant="secondary" className="ml-1">{outputLots.length}</Badge>
          </CardTitle>
          <CardDescription>Finished goods and lots produced by this batch.</CardDescription>
        </CardHeader>
        <CardContent>
          {outputsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : outputLots.length === 0 ? (
            <div className="text-center text-muted-foreground py-6 text-sm">
              No output lots recorded yet.
            </div>
          ) : (
            <div className="space-y-2">
              {outputLots.map((ol: OutputLot) => (
                <div key={ol.lotId} className="flex items-start justify-between p-3 border rounded-lg bg-muted/30 gap-2" data-testid={`row-output-${ol.lotId}`}>
                  <div className="space-y-1 min-w-0">
                    <div className="font-medium text-sm">{ol.productName || 'Output'}</div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <Link href={`/lots/${ol.lotId}`}>
                        <span className="font-mono bg-background border px-1.5 py-0.5 rounded hover:bg-accent cursor-pointer inline-flex items-center gap-1" data-testid={`link-outlot-${ol.lotId}`}>
                          {ol.lotNumber}
                          <ExternalLink className="h-2.5 w-2.5" />
                        </span>
                      </Link>
                      {ol.barcodeValue && <span className="font-mono">{ol.barcodeValue}</span>}
                      {ol.producedDate && <span>Produced: {fmtDate(ol.producedDate, 'dd/MM/yy')}</span>}
                      {ol.expiryDate && <span>· Exp: {fmtDate(ol.expiryDate, 'dd/MM/yy')}</span>}
                      {ol.barcodePrintedAt && <span className="text-green-600">· Label printed</span>}
                    </div>
                    <Badge className={`text-xs px-1.5 py-0 ${lotStatusColors[ol.status] || 'bg-gray-100 text-gray-600'}`}>
                      {ol.status}
                    </Badge>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-medium text-sm">{fmtQty(ol.quantity)}</div>
                    {ol.remainingQuantity && (
                      <div className="text-xs text-muted-foreground font-mono">{fmtQty(ol.remainingQuantity)} left</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowRightLeft className="h-4 w-4" />
            Stock Movements
            <Badge variant="secondary" className="ml-1">{movements.length}</Badge>
          </CardTitle>
          <CardDescription>All inventory movements recorded against this batch.</CardDescription>
        </CardHeader>
        <CardContent>
          {movementsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : movements.length === 0 ? (
            <div className="text-center text-muted-foreground py-6 text-sm">
              No stock movements linked to this batch.
            </div>
          ) : (
            <div className="space-y-2">
              {movements.map((mv: StockMovement) => {
                const isOut = outflowTypes.has(mv.movementType);
                const absQty = Math.abs(parseFloat(mv.quantity)).toFixed(2);
                return (
                  <div key={mv.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 text-sm" data-testid={`row-movement-${mv.id}`}>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <TrendingDown className={`h-3.5 w-3.5 ${isOut ? 'text-red-500' : 'text-green-500 rotate-180'}`} />
                        <span className="font-medium">{movementLabels[mv.movementType] ?? mv.movementType.replace('_', ' ')}</span>
                      </div>
                      {mv.reference && (
                        <div className="text-xs text-muted-foreground">{mv.reference}</div>
                      )}
                      <div className="text-xs text-muted-foreground">{fmtDate(mv.createdAt, 'dd MMM yyyy, h:mm a')}</div>
                    </div>
                    <div className={`font-mono font-medium ${isOut ? 'text-red-600' : 'text-green-600'}`}>
                      {isOut ? '-' : '+'}{absQty}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Created {batch.createdAt ? fmtDate(batch.createdAt, 'dd MMM yyyy, h:mm a') : '—'}
          </div>
          <Link href={`/traceability?batch=${batch.batchNumber}`}>
            <Button size="sm" variant="outline" data-testid="button-trace-bottom">
              <ClipboardList className="mr-2 h-3 w-3" />
              Trace Lineage
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

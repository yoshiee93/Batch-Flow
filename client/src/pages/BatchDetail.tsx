import { useParams, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, Package, Factory, Box, ChevronRight, Loader2,
  ClipboardList, Calendar, AlertCircle, CheckCircle, Scale
} from 'lucide-react';
import {
  useBatch, useProducts, useMaterials, useBatchMaterials, useBatchOutputs, useLots,
  type Lot, type BatchMaterial, type BatchOutput
} from '@/lib/api';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: batch, isLoading: batchLoading, isError } = useBatch(id!);
  const { data: products = [] } = useProducts();
  const { data: materials = [] } = useMaterials();
  const { data: batchMaterials = [] } = useBatchMaterials(id!);
  const { data: batchOutputs = [] } = useBatchOutputs(id!);
  const { data: lots = [] } = useLots();

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
  const statusClass = statusColors[batch.status] || 'bg-gray-100 text-gray-800';
  const statusLabel = batch.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

  const totalInputKg = batchMaterials.reduce((sum: number, m: BatchMaterial) => sum + parseFloat(m.quantity || '0'), 0);
  const totalOutputKg = batchOutputs.reduce((sum: number, o: BatchOutput) => sum + parseFloat(o.actualQuantity || '0'), 0);
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
                <div data-testid="text-start-date">
                  {batch.startDate ? format(new Date(batch.startDate), 'dd MMM yyyy') : '—'}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">End Date</div>
                <div data-testid="text-end-date">
                  {batch.endDate ? format(new Date(batch.endDate), 'dd MMM yyyy') : '—'}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Assigned To</div>
                <div>{batch.assignedTo || '—'}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Planned Qty</div>
                <div className="font-mono">{parseFloat(batch.plannedQuantity || '0').toFixed(2)} KG</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Actual Output</div>
                <div className="font-mono" data-testid="text-actual-qty">
                  {batch.actualQuantity ? `${parseFloat(batch.actualQuantity).toFixed(2)} KG` : '—'}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Waste</div>
                <div className="font-mono">
                  {batch.wasteQuantity ? `${parseFloat(batch.wasteQuantity).toFixed(2)} KG` : '—'}
                </div>
              </div>
              {batch.wetQuantity && parseFloat(batch.wetQuantity) > 0 && (
                <div>
                  <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Wet Qty</div>
                  <div className="font-mono">{parseFloat(batch.wetQuantity).toFixed(2)} KG</div>
                </div>
              )}
              {batch.millingQuantity && parseFloat(batch.millingQuantity) > 0 && (
                <div>
                  <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Milling Qty</div>
                  <div className="font-mono">{parseFloat(batch.millingQuantity).toFixed(2)} KG</div>
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
            <Badge variant="secondary" className="ml-1">{batchMaterials.length}</Badge>
          </CardTitle>
          <CardDescription>Raw material lots used in this production batch, tracked for compliance.</CardDescription>
        </CardHeader>
        <CardContent>
          {batchMaterials.length === 0 ? (
            <div className="text-center text-muted-foreground py-6 text-sm">
              No material inputs recorded for this batch.
            </div>
          ) : (
            <div className="space-y-2">
              {batchMaterials.map((bm: BatchMaterial) => {
                const material = bm.materialId ? materials.find(m => m.id === bm.materialId) : null;
                const product = bm.productId ? products.find(p => p.id === bm.productId) : null;
                const lot: Lot | undefined = bm.lotId ? lots.find(l => l.id === bm.lotId) : undefined;
                const name = material?.name || product?.name || 'Unknown';
                const unit = material?.unit || product?.unit || 'KG';
                return (
                  <div key={bm.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30" data-testid={`row-input-${bm.id}`}>
                    <div className="space-y-0.5">
                      <div className="font-medium text-sm">{name}</div>
                      {lot && (
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="font-mono bg-background border px-1.5 py-0.5 rounded">{lot.lotNumber}</span>
                          {lot.supplierLot && <span>Supplier: {lot.supplierLot}</span>}
                          {lot.supplierName && <span>· {lot.supplierName}</span>}
                          {lot.expiryDate && <span>· Exp: {format(new Date(lot.expiryDate), 'dd/MM/yy')}</span>}
                        </div>
                      )}
                      {!lot && bm.lotId && (
                        <div className="text-xs text-muted-foreground font-mono">Lot ID: {bm.lotId}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-medium text-sm">{parseFloat(bm.quantity || '0').toFixed(2)} {unit}</div>
                      {lot?.barcodeValue && (
                        <div className="text-xs text-muted-foreground font-mono">{lot.barcodeValue}</div>
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
            Output Products
            <Badge variant="secondary" className="ml-1">{batchOutputs.length}</Badge>
          </CardTitle>
          <CardDescription>Finished goods and lots produced by this batch.</CardDescription>
        </CardHeader>
        <CardContent>
          {batchOutputs.length === 0 ? (
            <div className="text-center text-muted-foreground py-6 text-sm">
              No outputs recorded yet.
            </div>
          ) : (
            <div className="space-y-2">
              {batchOutputs.map((output: BatchOutput) => {
                const outputProduct = output.productId ? products.find(p => p.id === output.productId) : null;
                const outputLot = output.lotId ? lots.find(l => l.id === output.lotId) : null;
                return (
                  <div key={output.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30" data-testid={`row-output-${output.id}`}>
                    <div className="space-y-0.5">
                      <div className="font-medium text-sm">{outputProduct?.name || 'Output'}</div>
                      {outputLot && (
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="font-mono bg-background border px-1.5 py-0.5 rounded">{outputLot.lotNumber}</span>
                          {outputLot.barcodeValue && <span className="font-mono text-xs">{outputLot.barcodeValue}</span>}
                        </div>
                      )}
                      {output.notes && (
                        <div className="text-xs text-muted-foreground">{output.notes}</div>
                      )}
                    </div>
                    <div className="font-mono font-medium text-sm">
                      {parseFloat(output.actualQuantity || '0').toFixed(2)} {outputProduct?.unit || 'KG'}
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
            Created {batch.createdAt ? format(new Date(batch.createdAt), 'dd MMM yyyy, h:mm a') : '—'}
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

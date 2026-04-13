import { useParams, Link } from 'wouter';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, ChevronRight, Loader2, AlertCircle, Package, Factory,
  Tag, Truck, ArrowRight, ArrowUpRight, ClipboardList, Calendar,
  Hash, Barcode, ExternalLink
} from 'lucide-react';
import {
  useLotById, useLotUsage, useLotLineage, useMaterials, useProducts, useBatch,
  type LotUsageEntry, type OutputLot
} from '@/lib/api';
import { format } from 'date-fns';

const lotStatusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  quarantine: 'bg-yellow-100 text-yellow-700',
  consumed: 'bg-gray-100 text-gray-600',
  expired: 'bg-red-100 text-red-700',
};

const lotTypeLabels: Record<string, string> = {
  raw_material: 'Raw Material',
  intermediate: 'Intermediate',
  finished_good: 'Finished Good',
};

const batchStatusColors: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-700',
  pending: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  quality_check: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  released: 'bg-emerald-100 text-emerald-700',
  quarantined: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-700',
};

function fmtDate(d: string | null | undefined, fmt = 'dd MMM yyyy') {
  if (!d) return '—';
  try { return format(new Date(d), fmt); } catch { return String(d); }
}

function fmtQty(q: string | null | undefined, unit = 'KG') {
  if (!q) return '—';
  return `${parseFloat(q).toFixed(2)} ${unit}`;
}

function SourceBatchCard({ batchId }: { batchId: string }) {
  const { data: batch, isLoading } = useBatch(batchId);
  if (isLoading) return <div className="text-sm text-muted-foreground">Loading batch…</div>;
  if (!batch) return <div className="text-sm text-muted-foreground">Batch not found</div>;
  return (
    <Link href={`/batches/${batchId}`}>
      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer" data-testid={`link-source-batch-${batchId}`}>
        <div className="flex items-center gap-2">
          <Factory className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-mono font-medium text-sm">{batch.batchNumber}</div>
            <div className="text-xs text-muted-foreground">
              {batch.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())} · Started {fmtDate(batch.startDate)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <ExternalLink className="h-3 w-3" />
        </div>
      </div>
    </Link>
  );
}

export default function LotDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: lot, isLoading: lotLoading, isError } = useLotById(id!);
  const { data: materials = [] } = useMaterials();
  const { data: products = [] } = useProducts();
  const { data: usage = [], isLoading: usageLoading } = useLotUsage(id!);
  const { data: lineage, isLoading: lineageLoading } = useLotLineage(id!);

  if (lotLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !lot) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Lot not found</h2>
        <p className="text-muted-foreground">The lot you're looking for doesn't exist or couldn't be loaded.</p>
        <Link href="/inventory">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back to Inventory</Button>
        </Link>
      </div>
    );
  }

  const material = lot.materialId ? materials.find(m => m.id === lot.materialId) : null;
  const product = lot.productId ? products.find(p => p.id === lot.productId) : null;
  const itemName = material?.name || product?.name || 'Unknown';
  const unit = material?.unit || product?.unit || 'KG';

  const outputLots: OutputLot[] = lineage?.outputLots ?? [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/inventory">
          <Button variant="ghost" size="sm" data-testid="button-back-inventory">
            <ArrowLeft className="h-4 w-4 mr-1" /> Inventory
          </Button>
        </Link>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono font-bold text-lg" data-testid="text-lot-number">{lot.lotNumber}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Package className="h-5 w-5" />
                  {lot.lotNumber}
                </CardTitle>
                <CardDescription className="mt-1">{itemName}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className={(lot.status ? lotStatusColors[lot.status] : null) ?? 'bg-gray-100 text-gray-700'} data-testid="badge-lot-status">
                  {lot.status ?? '—'}
                </Badge>
                <Badge variant="outline" data-testid="badge-lot-type">
                  {lot.lotType ? (lotTypeLabels[lot.lotType] ?? lot.lotType) : '—'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
              <div>
                <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Quantity</div>
                <div className="font-mono">{fmtQty(lot.quantity, unit)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Remaining</div>
                <div className="font-mono">{fmtQty(lot.remainingQuantity, unit)}</div>
              </div>
              {lot.originalQuantity && (
                <div>
                  <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Original Qty</div>
                  <div className="font-mono">{fmtQty(lot.originalQuantity, unit)}</div>
                </div>
              )}
              <div>
                <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Received</div>
                <div>{fmtDate(lot.receivedDate)}</div>
              </div>
              {lot.producedDate && (
                <div>
                  <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Produced</div>
                  <div>{fmtDate(lot.producedDate)}</div>
                </div>
              )}
              {lot.expiryDate && (
                <div>
                  <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Expiry</div>
                  <div>{fmtDate(lot.expiryDate)}</div>
                </div>
              )}
              {lot.supplierName && (
                <div>
                  <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Supplier</div>
                  <div>{lot.supplierName}</div>
                </div>
              )}
              {lot.supplierLot && (
                <div>
                  <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Supplier Lot</div>
                  <div className="font-mono">{lot.supplierLot}</div>
                </div>
              )}
              {lot.sourceName && (
                <div>
                  <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Source</div>
                  <div>{lot.sourceName}</div>
                </div>
              )}
            </div>
            {lot.barcodeValue && (
              <>
                <Separator className="my-4" />
                <div className="flex items-center gap-3">
                  <Barcode className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Barcode</div>
                    <div className="font-mono text-sm" data-testid="text-barcode">{lot.barcodeValue}</div>
                  </div>
                  {lot.barcodePrintedAt && (
                    <div className="ml-auto text-xs text-green-600">
                      Label printed {fmtDate(lot.barcodePrintedAt)}
                    </div>
                  )}
                </div>
              </>
            )}
            {lot.notes && (
              <>
                <Separator className="my-4" />
                <div>
                  <div className="text-muted-foreground text-xs uppercase font-medium mb-1">Notes</div>
                  <p className="text-sm">{lot.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Type</span>
                <span className="ml-auto font-medium">{lot.lotType ? (lotTypeLabels[lot.lotType] ?? lot.lotType) : '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Used in</span>
                <span className="ml-auto font-medium">{usage.length} batch{usage.length !== 1 ? 'es' : ''}</span>
              </div>
              {lot.sourceType && (
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Source</span>
                  <span className="ml-auto font-medium capitalize">{lot.sourceType}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Link href={`/traceability?lot=${lot.lotNumber}`}>
            <Button variant="outline" className="w-full" data-testid="button-view-traceability">
              <ClipboardList className="mr-2 h-4 w-4" />
              Full Trace
            </Button>
          </Link>
        </div>
      </div>

      {lot.sourceBatchId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowLeft className="h-4 w-4" />
              Came From (Source Batch)
            </CardTitle>
            <CardDescription>This lot was produced by the following batch.</CardDescription>
          </CardHeader>
          <CardContent>
            <SourceBatchCard batchId={lot.sourceBatchId} />
          </CardContent>
        </Card>
      )}

      {!lot.sourceBatchId && (lot.supplierName || lot.supplierLot || lot.sourceName) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4" />
              Came From (External Receipt)
            </CardTitle>
            <CardDescription>This lot was received from an external supplier or source.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
              {lot.supplierName && (
                <div>
                  <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Supplier</div>
                  <div>{lot.supplierName}</div>
                </div>
              )}
              {lot.supplierLot && (
                <div>
                  <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Supplier Lot</div>
                  <div className="font-mono">{lot.supplierLot}</div>
                </div>
              )}
              {lot.sourceName && (
                <div>
                  <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Source Name</div>
                  <div>{lot.sourceName}</div>
                </div>
              )}
              {lot.receivedDate && (
                <div>
                  <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Received Date</div>
                  <div>{fmtDate(lot.receivedDate)}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowRight className="h-4 w-4" />
            Used In Batches
            <Badge variant="secondary" className="ml-1">{usage.length}</Badge>
          </CardTitle>
          <CardDescription>Production batches that consumed this lot.</CardDescription>
        </CardHeader>
        <CardContent>
          {usageLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : usage.length === 0 ? (
            <div className="text-center text-muted-foreground py-6 text-sm">
              This lot has not been consumed in any batch yet.
            </div>
          ) : (
            <div className="space-y-2">
              {usage.map((entry: LotUsageEntry) => (
                <Link href={`/batches/${entry.batchId}`} key={entry.batchId}>
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer" data-testid={`link-used-batch-${entry.batchId}`}>
                    <div className="flex items-center gap-3">
                      <Factory className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <div className="font-mono font-medium text-sm">{entry.batchNumber}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>{entry.productName}</span>
                          {entry.addedAt && <span>· {fmtDate(entry.addedAt)}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={batchStatusColors[entry.batchStatus] ?? 'bg-gray-100 text-gray-700'} data-testid={`badge-batch-status-${entry.batchId}`}>
                        {entry.batchStatus.replace('_', ' ')}
                      </Badge>
                      <div className="font-mono text-sm font-medium">{fmtQty(entry.quantityConsumed)}</div>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {(lineage || lineageLoading) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowUpRight className="h-4 w-4" />
              Contributed To (Output Lots)
              <Badge variant="secondary" className="ml-1">{outputLots.length}</Badge>
            </CardTitle>
            <CardDescription>Finished-good lots that were produced using this lot as input.</CardDescription>
          </CardHeader>
          <CardContent>
            {lineageLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : outputLots.length === 0 ? (
              <div className="text-center text-muted-foreground py-6 text-sm">
                No downstream output lots found for this lot.
              </div>
            ) : (
              <div className="space-y-2">
                {outputLots.map((ol) => (
                  <Link href={`/lots/${ol.lotId}`} key={ol.lotId}>
                    <div className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer gap-2" data-testid={`row-output-lot-${ol.lotId}`}>
                      <div className="space-y-1 min-w-0">
                        <div className="font-medium text-sm">{ol.productName || 'Output Lot'}</div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="font-mono bg-background border px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                            {ol.lotNumber}
                            <ExternalLink className="h-2.5 w-2.5" />
                          </span>
                          {ol.barcodeValue && <span className="font-mono">{ol.barcodeValue}</span>}
                        </div>
                        <Badge className={`text-xs px-1.5 py-0 ${lotStatusColors[ol.status] || 'bg-gray-100 text-gray-600'}`}>
                          {ol.status}
                        </Badge>
                      </div>
                      <div className="font-mono font-medium text-sm shrink-0">{fmtQty(ol.quantity)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="py-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Created {fmtDate(lot.createdAt, 'dd MMM yyyy, h:mm a')}
          </div>
          <Link href={`/traceability?lot=${lot.lotNumber}`}>
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

import { useState, useEffect, useRef } from 'react';
import { useSearch, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Search, ArrowRight, ArrowLeft, Box, Factory, Loader2, AlertCircle,
  Barcode, Printer, Package, ChevronRight
} from 'lucide-react';
import {
  useLots, useBatches, useBatch, useMaterials, useProducts,
  useTraceabilityForward, useTraceabilityBackward,
  fetchLotByBarcode, fetchBatchByBarcode,
  useBatchOutputLots, useMarkBatchBarcodePrinted, useMarkBarcodePrinted,
} from '@/lib/api';
import type { ForwardTraceResponse, BackwardTraceResponse } from '@/features/traceability/api';
import type { OutputLot } from '@/features/inventory/api';
import { printBarcodeLabel } from '@/lib/barcodePrint';
import { useLabelTemplate, parseLabelTemplateSettings } from '@/features/labels/api';

type Candidate =
  | { type: 'lot'; id: string; label: string; sublabel?: string }
  | { type: 'batch'; id: string; label: string; sublabel?: string };

export default function Traceability() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialQuery = params.get('batch') || params.get('lot') || '';

  const [query, setQuery] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState('');
  const [searchId, setSearchId] = useState<{ type: 'lot' | 'batch'; id: string } | null>(null);
  const [barcodeError, setBarcodeError] = useState('');
  const [isBarcodeLookup, setIsBarcodeLookup] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: lots = [] } = useLots();
  const { data: batches = [] } = useBatches();
  const { data: materials = [] } = useMaterials();
  const { data: products = [] } = useProducts();

  const { data: forwardTrace, isLoading: forwardLoading, isError: forwardError } = useTraceabilityForward(
    searchId?.type === 'lot' ? searchId.id : ''
  );

  const { data: backwardTrace, isLoading: backwardLoading, isError: backwardError } = useTraceabilityBackward(
    searchId?.type === 'batch' ? searchId.id : ''
  );

  // Auto-focus input on mount for scanner workflows
  useEffect(() => {
    if (!initialQuery) {
      inputRef.current?.focus();
    }
  }, []);

  const resolveQuery = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setBarcodeError('');
    setActiveQuery(trimmed);
    setCandidates([]);
    setSearchId(null);

    const lower = trimmed.toLowerCase();

    const matchingLots = lots.filter(l =>
      l.lotNumber.toLowerCase().includes(lower) ||
      (l.supplierLot?.toLowerCase().includes(lower))
    );
    const matchingBatches = batches.filter(b => b.batchNumber.toLowerCase().includes(lower));

    const allCandidates: Candidate[] = [
      ...matchingLots.map(l => ({
        type: 'lot' as const,
        id: l.id,
        label: l.lotNumber,
        sublabel: l.supplierLot ? `Supplier lot: ${l.supplierLot}` : undefined,
      })),
      ...matchingBatches.map(b => ({
        type: 'batch' as const,
        id: b.id,
        label: b.batchNumber,
        sublabel: `Batch · ${b.status.replace('_', ' ')}`,
      })),
    ];

    if (allCandidates.length === 1) {
      setSearchId({ type: allCandidates[0].type, id: allCandidates[0].id });
      return;
    }

    if (allCandidates.length > 1) {
      setCandidates(allCandidates);
      return;
    }

    setIsBarcodeLookup(true);
    try {
      const foundLot = await fetchLotByBarcode(trimmed);
      setSearchId({ type: 'lot', id: foundLot.id });
    } catch {
      try {
        const foundBatch = await fetchBatchByBarcode(trimmed);
        setSearchId({ type: 'batch', id: foundBatch.id });
      } catch {
        setSearchId(null);
        setBarcodeError(trimmed);
      }
    } finally {
      setIsBarcodeLookup(false);
    }
  };

  const selectCandidate = (c: Candidate) => {
    setCandidates([]);
    setSearchId({ type: c.type, id: c.id });
  };

  useEffect(() => {
    if (initialQuery && lots.length > 0) {
      resolveQuery(initialQuery);
    }
  }, [initialQuery, lots.length, batches.length]);

  const handleTrace = () => resolveQuery(query);

  const isLoading = forwardLoading || backwardLoading || isBarcodeLookup;
  const hasError = forwardError || backwardError;

  return (
    <div className="space-y-6">
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <div>
          <h1 className="text-3xl font-bold font-mono" data-testid="text-traceability-title">Track & Trace</h1>
          <p className="text-muted-foreground mt-1">Search by lot number, barcode, supplier lot, or batch number to trace stock movement.</p>
        </div>

        <div className="flex gap-2 max-w-lg mx-auto">
          <div className="relative flex-1">
            <Barcode className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Scan or type: lot number, barcode, supplier lot, or batch…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="font-mono pl-9"
              data-testid="input-trace-query"
              onKeyDown={(e) => e.key === 'Enter' && handleTrace()}
              autoComplete="off"
            />
          </div>
          <Button onClick={handleTrace} disabled={isLoading} data-testid="button-trace">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search size={16} className="mr-2" />}
            Trace
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>Supports: lot numbers · barcode values · supplier lot IDs · batch numbers</p>
          {(lots[0] || batches[0]) && (
            <div className="flex justify-center gap-3 flex-wrap">
              {lots[0] && (
                <button
                  className="underline hover:no-underline"
                  onClick={() => { setQuery(lots[0].lotNumber); resolveQuery(lots[0].lotNumber); }}
                >
                  {lots[0].lotNumber}
                </button>
              )}
              {batches[0] && (
                <button
                  className="underline hover:no-underline"
                  onClick={() => { setQuery(batches[0].batchNumber); resolveQuery(batches[0].batchNumber); }}
                >
                  {batches[0].batchNumber}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {hasError && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to load trace data</h2>
          <p className="text-muted-foreground mb-4">There was an error retrieving the trace. Please try again.</p>
          <Button onClick={() => { setSearchId(null); setActiveQuery(''); setBarcodeError(''); setCandidates([]); }}>Clear and Try Again</Button>
        </div>
      )}

      {candidates.length > 1 && !isLoading && !hasError && (
        <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Multiple matches found</CardTitle>
              <CardDescription>
                Your search <span className="font-mono font-medium">"{activeQuery}"</span> matches {candidates.length} records.
                Select one to view its trace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {candidates.map((c) => (
                  <button
                    key={`${c.type}-${c.id}`}
                    className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-accent text-left transition-colors"
                    data-testid={`candidate-${c.type}-${c.id}`}
                    onClick={() => selectCandidate(c)}
                  >
                    <div className="flex items-center gap-3">
                      {c.type === 'lot' ? <Box className="h-4 w-4 text-muted-foreground shrink-0" /> : <Factory className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <div>
                        <div className="font-mono font-medium text-sm">{c.label}</div>
                        {c.sublabel && <div className="text-xs text-muted-foreground">{c.sublabel}</div>}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {c.type === 'lot' ? 'Lot' : 'Batch'}
                    </Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {forwardTrace && searchId?.type === 'lot' && !hasError && candidates.length === 0 && (
        <ForwardTraceView trace={forwardTrace} materials={materials} products={products} />
      )}

      {backwardTrace && searchId?.type === 'batch' && !hasError && candidates.length === 0 && (
        <BackwardTraceView trace={backwardTrace} batchId={searchId.id} />
      )}

      {!isLoading && !hasError && searchId === null && barcodeError && candidates.length === 0 && (
        <div className="text-center py-12 space-y-3">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="font-medium">No results found for <span className="font-mono">"{barcodeError}"</span></p>
          <p className="text-sm text-muted-foreground">
            Try a lot number (RM-YYMMDD-0001), a barcode value (BC1234), a supplier lot reference, or a batch number.
          </p>
          <Button variant="outline" size="sm" onClick={() => { setBarcodeError(''); setQuery(''); inputRef.current?.focus(); }}>
            Clear and search again
          </Button>
        </div>
      )}
    </div>
  );
}

const lotTypeLabels: Record<string, string> = {
  raw_material: 'Raw Material',
  intermediate: 'Intermediate',
  finished_good: 'Finished Good',
};

const lotStatusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  quarantine: 'bg-yellow-100 text-yellow-700',
  consumed: 'bg-gray-100 text-gray-600',
  expired: 'bg-red-100 text-red-700',
};

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return String(d); }
}

function ForwardTraceView({ trace, materials, products }: {
  trace: ForwardTraceResponse;
  materials: Array<{ id: string; name: string }>;
  products: Array<{ id: string; name: string }>;
}) {
  const { lot, usedInBatches, outputLots } = trace;
  const lotType = lot.lotType ?? '';
  const sourceDesc = lot.supplierName || lot.sourceName || (lot.sourceBatchId ? 'Internally produced' : 'External receipt');
  const material = lot.materialId ? materials.find(m => m.id === lot.materialId) : null;
  const product = lot.productId ? products.find(p => p.id === lot.productId) : null;
  const itemName = material?.name || product?.name || lot.lotNumber;
  const markLotPrinted = useMarkBarcodePrinted();
  const isProducedLot = lotType === 'finished_good' || lotType === 'intermediate';
  const { data: sourceBatchData } = useBatch(isProducedLot && lot.sourceBatchId ? lot.sourceBatchId : '');
  const { data: rawIntakeTemplate } = useLabelTemplate('raw_intake', lot.customerId);
  const { data: finishedOutputTemplate } = useLabelTemplate('finished_output', lot.customerId);

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">

      {/* Lot header card */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Box className="h-5 w-5" />
                Lot: {lot.lotNumber}
              </CardTitle>
              <div className="flex gap-2 flex-wrap mt-2">
                {lot.barcodeValue && <Badge variant="outline" className="font-mono text-xs">{lot.barcodeValue}</Badge>}
                {lotType && <Badge variant="secondary" className="text-xs">{lotTypeLabels[lotType] ?? lotType}</Badge>}
                <Badge variant={lot.status === 'active' ? 'default' : 'secondary'} className="text-xs">{lot.status}</Badge>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {lot.barcodeValue && (
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-print-label-trace"
                  onClick={() => {
                    if (lotType === 'finished_good' || lotType === 'intermediate') {
                      printBarcodeLabel({
                        template: "finished_output",
                        lotNumber: lot.lotNumber,
                        barcodeValue: lot.barcodeValue,
                        productName: itemName,
                        quantity: lot.quantity,
                        unit: 'KG',
                        producedDate: lot.producedDate || lot.receivedDate,
                        expiryDate: lot.expiryDate,
                        sourceBatch: sourceBatchData ? (sourceBatchData.batchCode || sourceBatchData.batchNumber) : undefined,
                        templateSettings: finishedOutputTemplate ? parseLabelTemplateSettings(finishedOutputTemplate.settings) : undefined,
                      });
                    } else {
                      printBarcodeLabel({
                        template: "raw_intake",
                        lotNumber: lot.lotNumber,
                        barcodeValue: lot.barcodeValue,
                        itemName,
                        quantity: lot.quantity,
                        unit: 'KG',
                        sourceLabel: lot.supplierName || lot.sourceName || undefined,
                        receivedDate: lot.receivedDate,
                        expiryDate: lot.expiryDate,
                        supplierLot: lot.supplierLot,
                        templateSettings: rawIntakeTemplate ? parseLabelTemplateSettings(rawIntakeTemplate.settings) : undefined,
                      });
                    }
                    markLotPrinted.mutate(lot.id);
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  {lot.barcodePrintedAt ? 'Reprint Label' : 'Print Label'}
                </Button>
              )}
              <Link href={`/lots/${lot.id}`}>
                <Button variant="outline" size="sm">View Lot Detail</Button>
              </Link>
            </div>
          </div>
        </CardHeader>

        {/* Lot metadata summary */}
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm py-3 border rounded-lg px-4 bg-muted/30">
            <div>
              <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Item</div>
              <div>{itemName}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Received / Produced</div>
              <div>{fmtDate(lot.receivedDate || lot.producedDate)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Quantity</div>
              <div className="font-mono">{parseFloat(lot.quantity).toFixed(2)} KG</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Remaining</div>
              <div className="font-mono">{parseFloat(lot.remainingQuantity).toFixed(2)} KG</div>
            </div>
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
            {lot.expiryDate && (
              <div>
                <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Expiry</div>
                <div>{fmtDate(lot.expiryDate)}</div>
              </div>
            )}
            <div>
              <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Source</div>
              <div>{sourceDesc}</div>
            </div>
            {lot.notes && (
              <div className="col-span-2 sm:col-span-4">
                <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Notes</div>
                <div className="text-sm">{lot.notes}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Source (came from) */}
      {lot.sourceBatchId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase text-muted-foreground flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Came From
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/batches/${lot.sourceBatchId}`}>
              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <div className="flex items-center gap-2">
                  <Factory className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono font-medium text-sm">Source Batch</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          </CardContent>
        </Card>
      )}

      {!lot.sourceBatchId && (lot.supplierName || lot.supplierLot || lot.sourceName) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase text-muted-foreground flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Came From (External Receipt)
            </CardTitle>
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Used in batches */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase text-muted-foreground flex items-center gap-2">
            <ArrowRight className="h-4 w-4" /> Used In
            <Badge variant="secondary" className="ml-1">{usedInBatches.length}</Badge>
          </CardTitle>
          <CardDescription>Production batches that consumed this lot.</CardDescription>
        </CardHeader>
        <CardContent>
          {usedInBatches.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              This lot has not been used in any production batches yet.
            </div>
          ) : (
            <div className="space-y-2">
              {usedInBatches.map((usage, i) => (
                <div key={i} className="flex justify-between items-center p-3 border rounded-lg bg-card" data-testid={`trace-batch-${usage.batch.id}`}>
                  <div className="flex flex-col gap-0.5">
                    <Link href={`/batches/${usage.batch.id}`} className="font-mono font-bold text-sm hover:underline text-primary">
                      {usage.batch.batchNumber}
                    </Link>
                    <span className="text-xs text-muted-foreground">{usage.product.name}</span>
                    <Badge variant="secondary" className="text-xs w-fit">
                      {usage.batch.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <span className="font-mono text-sm shrink-0">{parseFloat(usage.quantityUsed).toFixed(2)} KG used</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Output lots */}
      {outputLots.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" /> Produced Output Lots
              <Badge variant="secondary" className="ml-1">{outputLots.length}</Badge>
            </CardTitle>
            <CardDescription>Finished-good lots produced by batches that used this lot.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {outputLots.map((outputLot, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-card gap-2" data-testid={`trace-output-lot-${outputLot.id}`}>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <Link href={`/lots/${outputLot.id}`} className="font-mono font-bold text-sm hover:underline text-primary">
                      {outputLot.lotNumber}
                    </Link>
                    {outputLot.barcodeValue && (
                      <span className="text-xs text-muted-foreground font-mono">{outputLot.barcodeValue}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-sm">{parseFloat(outputLot.quantity).toFixed(2)} KG</span>
                    {outputLot.barcodeValue && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 px-2"
                        data-testid={`button-print-outlot-${outputLot.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          const outProduct = outputLot.productId ? products.find(p => p.id === outputLot.productId) : null;
                          const srcBatchUsage = outputLot.sourceBatchId ? usedInBatches.find(u => u.batch.id === outputLot.sourceBatchId) : null;
                          printBarcodeLabel({
                            template: "finished_output",
                            lotNumber: outputLot.lotNumber,
                            barcodeValue: outputLot.barcodeValue,
                            productName: outProduct?.name || outputLot.lotNumber,
                            quantity: outputLot.quantity,
                            unit: 'KG',
                            producedDate: outputLot.producedDate,
                            sourceBatch: srcBatchUsage ? (srcBatchUsage.batch.batchCode || srcBatchUsage.batch.batchNumber) : undefined,
                            expiryDate: outputLot.expiryDate,
                            templateSettings: finishedOutputTemplate ? parseLabelTemplateSettings(finishedOutputTemplate.settings) : undefined,
                          });
                          markLotPrinted.mutate(outputLot.id);
                        }}
                      >
                        <Printer className="h-3 w-3 mr-1" />
                        {outputLot.barcodePrintedAt ? 'Reprint' : 'Print'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BackwardTraceView({ trace, batchId }: { trace: BackwardTraceResponse; batchId: string }) {
  const { batch, product, recipe, materialsUsed } = trace;
  const { data: outputLots = [], isLoading: outputsLoading } = useBatchOutputLots(batchId);
  const markBatchPrinted = useMarkBatchBarcodePrinted();
  const markLotPrinted = useMarkBarcodePrinted();
  const batchCustomerId = outputLots[0]?.customerId ?? null;
  const { data: batchTemplate } = useLabelTemplate('batch', batchCustomerId);
  const { data: finishedOutputTemplate } = useLabelTemplate('finished_output', batchCustomerId);

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">

      {/* Batch header */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5" />
                Batch: {batch.batchNumber}
              </CardTitle>
              <div className="flex gap-2 flex-wrap mt-2">
                {product && <Badge variant="outline" className="text-xs">{product.name}</Badge>}
                <Badge variant="secondary" className="text-xs capitalize">
                  {batch.status.replace(/_/g, ' ')}
                </Badge>
                <span className="text-xs text-muted-foreground self-center">
                  Planned: {parseFloat(batch.plannedQuantity).toFixed(0)} KG
                </span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {batch.barcodeValue && (
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-print-batch-trace"
                  onClick={() => {
                    printBarcodeLabel({
                      template: "batch",
                      batchCode: batch.batchCode || batch.batchNumber,
                      barcodeValue: batch.barcodeValue,
                      productName: product?.name || 'Batch',
                      quantity: batch.plannedQuantity,
                      unit: 'KG',
                      productionDate: batch.startDate,
                      status: batch.status,
                      templateSettings: batchTemplate ? parseLabelTemplateSettings(batchTemplate.settings) : undefined,
                    });
                    markBatchPrinted.mutate(batch.id);
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  {batch.barcodePrintedAt ? 'Reprint Label' : 'Print Label'}
                </Button>
              )}
              <Link href={`/batches/${batch.id}`}>
                <Button variant="outline" size="sm">View Batch Detail</Button>
              </Link>
            </div>
          </div>
        </CardHeader>

        {/* Batch barcode display */}
        {batch.barcodeValue && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-3 py-2 border rounded-lg px-4 bg-muted/30 text-sm">
              <Barcode className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Batch Barcode</div>
                <div className="font-mono">{batch.barcodeValue}</div>
              </div>
              {batch.barcodePrintedAt && (
                <span className="ml-auto text-xs text-green-600">
                  Printed {fmtDate(batch.barcodePrintedAt)}
                </span>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Recipe */}
      {recipe && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase text-muted-foreground flex items-center gap-2">
              <Box className="h-4 w-4" /> Recipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3 border rounded-lg bg-muted/30">
              <div className="font-mono font-bold">{recipe.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Version {recipe.version} · Output: {parseFloat(recipe.outputQuantity).toFixed(0)} KG
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inputs section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase text-muted-foreground flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Inputs
            <Badge variant="secondary" className="ml-1">{materialsUsed.length}</Badge>
          </CardTitle>
          <CardDescription>Material lots consumed in this batch.</CardDescription>
        </CardHeader>
        <CardContent>
          {materialsUsed.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No material lots have been recorded for this batch yet.
            </div>
          ) : (
            <div className="space-y-2">
              {materialsUsed.map((item, i) => (
                <div key={i} className="flex justify-between items-start p-3 border rounded-lg bg-card gap-2" data-testid={`trace-material-${item.lot.id}`}>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-medium text-sm">{item.material.name}</span>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <Link href={`/lots/${item.lot.id}`}>
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded hover:bg-accent cursor-pointer">
                          {item.lot.lotNumber}
                        </span>
                      </Link>
                      {item.lot.supplierLot && (
                        <span className="text-xs text-muted-foreground">Supplier: {item.lot.supplierLot}</span>
                      )}
                      {item.lot.barcodeValue && (
                        <Badge variant="outline" className="text-xs font-mono">{item.lot.barcodeValue}</Badge>
                      )}
                    </div>
                  </div>
                  <span className="font-mono text-sm shrink-0">{parseFloat(item.quantityUsed).toFixed(2)} KG</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outputs section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase text-muted-foreground flex items-center gap-2">
            <ArrowRight className="h-4 w-4" /> Outputs
            <Badge variant="secondary" className="ml-1">{outputLots.length}</Badge>
          </CardTitle>
          <CardDescription>Lots produced by this batch.</CardDescription>
        </CardHeader>
        <CardContent>
          {outputsLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : outputLots.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No output lots recorded for this batch yet.
            </div>
          ) : (
            <div className="space-y-2">
              {outputLots.map((ol: OutputLot) => (
                <div key={ol.lotId} className="flex items-start justify-between p-3 border rounded-lg bg-card gap-2" data-testid={`trace-output-${ol.lotId}`}>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="font-medium text-sm">{ol.productName || 'Output Lot'}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <Link href={`/lots/${ol.lotId}`}>
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded hover:bg-accent cursor-pointer">
                          {ol.lotNumber}
                        </span>
                      </Link>
                      {ol.barcodeValue && (
                        <Badge variant="outline" className="text-xs font-mono">{ol.barcodeValue}</Badge>
                      )}
                      <Badge className={`text-xs px-1.5 py-0 ${lotStatusColors[ol.status] || 'bg-gray-100 text-gray-600'}`}>
                        {ol.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-sm">{parseFloat(ol.quantity).toFixed(2)} KG</span>
                    {ol.barcodeValue && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 px-2"
                        data-testid={`button-reprint-output-${ol.lotId}`}
                        onClick={() => {
                          printBarcodeLabel({
                            template: "finished_output",
                            lotNumber: ol.lotNumber,
                            barcodeValue: ol.barcodeValue,
                            productName: ol.productName || 'Output',
                            quantity: ol.quantity,
                            unit: 'KG',
                            producedDate: batch.endDate,
                            sourceBatch: batch.batchCode || batch.batchNumber,
                            expiryDate: ol.expiryDate,
                            templateSettings: finishedOutputTemplate ? parseLabelTemplateSettings(finishedOutputTemplate.settings) : undefined,
                          });
                          markLotPrinted.mutate(ol.lotId);
                        }}
                      >
                        <Printer className="h-3 w-3 mr-1" />
                        {ol.barcodePrintedAt ? 'Reprint' : 'Print'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />
      <div className="text-center">
        <Link href={`/batches/${batch.id}`}>
          <Button variant="outline" size="sm" data-testid="button-open-batch-detail">
            Open Full Batch Detail
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

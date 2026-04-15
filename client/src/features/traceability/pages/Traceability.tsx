import { useState, useEffect } from 'react';
import { useSearch, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowRight, ArrowLeft, Box, Factory, Loader2, AlertCircle, Barcode, Printer } from 'lucide-react';
import { useLots, useBatches, useMaterials, useProducts, useTraceabilityForward, useTraceabilityBackward, fetchLotByBarcode, fetchBatchByBarcode } from '@/lib/api';
import type { ForwardTraceResponse, BackwardTraceResponse } from '@/features/traceability/api';
import { printBarcodeLabel } from '@/lib/barcodePrint';

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
        <h1 className="text-3xl font-bold font-mono" data-testid="text-traceability-title">Lot Traceability</h1>
        <p className="text-muted-foreground">Enter a Lot Number, Barcode, Supplier Batch ID, or Batch Number to trace its lineage.</p>

        <div className="flex gap-2 max-w-lg mx-auto">
          <div className="relative flex-1">
            <Barcode className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="e.g. RM-260413-0001, BC1234 or BATCH-20260115..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="font-mono pl-9"
              data-testid="input-trace-query"
              onKeyDown={(e) => e.key === 'Enter' && handleTrace()}
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
          <h2 className="text-xl font-semibold mb-2">Failed to load traceability data</h2>
          <p className="text-muted-foreground mb-4">There was an error retrieving the trace data. Please try again.</p>
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
        <BackwardTraceView trace={backwardTrace} />
      )}

      {!isLoading && !hasError && searchId === null && barcodeError && candidates.length === 0 && (
        <div className="text-center py-8 space-y-2">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No lot or batch found matching <span className="font-mono font-medium">"{barcodeError}"</span></p>
          <p className="text-xs text-muted-foreground">Try a lot number (RM-YYMMDD-0001), barcode value (BC1234), or batch number.</p>
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

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Box className="h-5 w-5" />
                Lot: {lot.lotNumber}
              </CardTitle>
              <CardDescription className="font-mono flex gap-3 flex-wrap mt-1">
                {lot.barcodeValue && <Badge variant="outline" className="font-mono text-xs">{lot.barcodeValue}</Badge>}
                {lotType && <Badge variant="secondary" className="text-xs">{lotTypeLabels[lotType] ?? lotType}</Badge>}
                <Badge variant={lot.status === 'active' ? 'default' : 'secondary'} className="text-xs">{lot.status}</Badge>
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              {lot.barcodeValue && (
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-print-label-trace"
                  onClick={() => printBarcodeLabel({
                    lotNumber: lot.lotNumber,
                    barcodeValue: lot.barcodeValue,
                    itemName,
                    quantity: lot.quantity,
                    unit: 'KG',
                    sourceLabel: lot.supplierName || lot.sourceName || undefined,
                    receivedDate: lot.receivedDate,
                    expiryDate: lot.expiryDate,
                    supplierLot: lot.supplierLot,
                  })}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Label
                </Button>
              )}
              <Link href={`/lots/${lot.id}`}>
                <Button variant="outline" size="sm">View Lot Detail</Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm py-2 border rounded-lg px-4 bg-muted/30">
            <div>
              <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Item</div>
              <div>{itemName}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Quantity</div>
              <div className="font-mono">{parseFloat(lot.quantity).toFixed(2)} KG</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Remaining</div>
              <div className="font-mono">{parseFloat(lot.remainingQuantity).toFixed(2)} KG</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Source</div>
              <div>{sourceDesc}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Used in</div>
              <div>{usedInBatches.length} batch{usedInBatches.length !== 1 ? 'es' : ''}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Contributed to</div>
              <div>{outputLots.length} output lot{outputLots.length !== 1 ? 's' : ''}</div>
            </div>
            {lot.supplierLot && (
              <div>
                <div className="text-muted-foreground text-xs uppercase font-medium mb-0.5">Supplier Lot</div>
                <div className="font-mono">{lot.supplierLot}</div>
              </div>
            )}
          </div>
        </CardContent>
        <CardContent>
          <div className="relative border-l-2 border-dashed border-border ml-6 pl-8 py-2 space-y-8">

            {usedInBatches.length > 0 && (
              <div className="relative">
                <div className="absolute -left-[41px] top-1 bg-background p-1 border rounded-full">
                  <ArrowRight size={16} />
                </div>
                <h4 className="font-bold text-sm uppercase text-muted-foreground mb-2">Used In Production Batches</h4>
                <div className="grid gap-2">
                  {usedInBatches.map((usage, i) => (
                    <div key={i} className="flex justify-between items-center p-3 border rounded bg-card" data-testid={`trace-batch-${usage.batch.id}`}>
                      <div className="flex flex-col">
                        <Link href={`/batches/${usage.batch.id}`} className="font-mono font-bold text-sm hover:underline text-primary">
                          {usage.batch.batchNumber}
                        </Link>
                        <span className="text-xs text-muted-foreground">{usage.product.name}</span>
                        <span className="text-xs text-muted-foreground">Status: {usage.batch.status.replace('_', ' ')}</span>
                      </div>
                      <span className="font-mono text-sm">{parseFloat(usage.quantityUsed).toFixed(2)} KG used</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {usedInBatches.length === 0 && (
              <div className="text-muted-foreground text-sm">
                This lot has not been used in any production batches yet.
              </div>
            )}

            {outputLots.length > 0 && (
              <div className="relative">
                <div className="absolute -left-[41px] top-1 bg-background p-1 border rounded-full">
                  <Factory size={16} />
                </div>
                <h4 className="font-bold text-sm uppercase text-muted-foreground mb-2">Produced Output Lots</h4>
                <div className="grid gap-2">
                  {outputLots.map((outputLot, i) => (
                    <Link key={i} href={`/lots/${outputLot.id}`}>
                      <div className="flex justify-between items-center p-3 border rounded bg-card hover:bg-accent cursor-pointer">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-sm">{outputLot.lotNumber}</span>
                          {outputLot.barcodeValue && (
                            <span className="text-xs text-muted-foreground font-mono">{outputLot.barcodeValue}</span>
                          )}
                        </div>
                        <span className="font-mono text-sm">{parseFloat(outputLot.quantity).toFixed(2)} KG</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BackwardTraceView({ trace }: { trace: BackwardTraceResponse }) {
  const { batch, product, recipe, materialsUsed } = trace;

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5" />
                Batch: {batch.batchNumber}
              </CardTitle>
              <CardDescription className="font-mono flex gap-3 flex-wrap mt-1">
                {product && <span>Product: {product.name}</span>}
                <span>Status: {batch.status.replace('_', ' ')}</span>
                <span>Planned: {parseFloat(batch.plannedQuantity).toFixed(0)} KG</span>
              </CardDescription>
            </div>
            <Link href={`/batches/${batch.id}`}>
              <Button variant="outline" size="sm">View Batch Detail</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative border-l-2 border-dashed border-border ml-6 pl-8 py-2 space-y-8">

            {recipe && (
              <div className="relative">
                <div className="absolute -left-[41px] top-1 bg-background p-1 border rounded-full">
                  <Box size={16} />
                </div>
                <h4 className="font-bold text-sm uppercase text-muted-foreground mb-2">Recipe Used</h4>
                <Card className="p-3 bg-muted/30">
                  <div className="font-mono font-bold">{recipe.name}</div>
                  <div className="text-xs text-muted-foreground">Version {recipe.version} | Output: {parseFloat(recipe.outputQuantity).toFixed(0)} KG</div>
                </Card>
              </div>
            )}

            {materialsUsed.length > 0 && (
              <div className="relative">
                <div className="absolute -left-[41px] top-1 bg-background p-1 border rounded-full">
                  <ArrowLeft size={16} />
                </div>
                <h4 className="font-bold text-sm uppercase text-muted-foreground mb-2">Input Material Lots</h4>
                <div className="grid gap-2">
                  {materialsUsed.map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-3 border rounded bg-card" data-testid={`trace-material-${item.lot.id}`}>
                      <div className="flex flex-col">
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
                      <span className="font-mono text-sm">{parseFloat(item.quantityUsed).toFixed(2)} KG</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {materialsUsed.length === 0 && (
              <div className="text-muted-foreground text-sm">
                No material lots have been recorded for this batch yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

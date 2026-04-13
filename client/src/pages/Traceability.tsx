import { useState, useEffect } from 'react';
import { useSearch, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowRight, ArrowLeft, Box, Factory, Loader2, AlertCircle, Barcode } from 'lucide-react';
import { useLots, useBatches, useTraceabilityForward, useTraceabilityBackward, fetchLotByBarcode } from '@/lib/api';

export default function Traceability() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialQuery = params.get('batch') || params.get('lot') || '';

  const [query, setQuery] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState('');
  const [searchId, setSearchId] = useState<{ type: 'lot' | 'batch'; id: string } | null>(null);
  const [barcodeError, setBarcodeError] = useState('');
  const [isBarcodeLookup, setIsBarcodeLookup] = useState(false);

  const { data: lots = [] } = useLots();
  const { data: batches = [] } = useBatches();

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

    const lot = lots.find(l =>
      l.lotNumber.toLowerCase() === trimmed.toLowerCase() ||
      l.supplierLot?.toLowerCase() === trimmed.toLowerCase()
    );
    if (lot) { setSearchId({ type: 'lot', id: lot.id }); return; }

    const batch = batches.find(b => b.batchNumber.toLowerCase() === trimmed.toLowerCase());
    if (batch) { setSearchId({ type: 'batch', id: batch.id }); return; }

    setIsBarcodeLookup(true);
    try {
      const foundLot = await fetchLotByBarcode(trimmed);
      setSearchId({ type: 'lot', id: foundLot.id });
    } catch {
      setSearchId(null);
      setBarcodeError(trimmed);
    } finally {
      setIsBarcodeLookup(false);
    }
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
          <Button onClick={() => { setSearchId(null); setActiveQuery(''); setBarcodeError(''); }}>Clear and Try Again</Button>
        </div>
      )}

      {forwardTrace && searchId?.type === 'lot' && !hasError && (
        <ForwardTraceView trace={forwardTrace} />
      )}

      {backwardTrace && searchId?.type === 'batch' && !hasError && (
        <BackwardTraceView trace={backwardTrace} />
      )}

      {!isLoading && !hasError && searchId === null && barcodeError && (
        <div className="text-center py-8 space-y-2">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No lot or batch found matching <span className="font-mono font-medium">"{barcodeError}"</span></p>
          <p className="text-xs text-muted-foreground">Try a lot number (RM-YYMMDD-0001), barcode value (BC1234), or batch number.</p>
        </div>
      )}
    </div>
  );
}

function ForwardTraceView({ trace }: { trace: Record<string, unknown> }) {
  const lot = trace.lot as Record<string, unknown> | undefined;
  if (!lot) return null;

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Box className="h-5 w-5" />
            Material Lot: {lot.lotNumber as string}
          </CardTitle>
          <CardDescription className="font-mono flex gap-3 flex-wrap">
            <span>Qty: {parseFloat(lot.quantity as string).toFixed(2)} KG</span>
            <span>Remaining: {parseFloat(lot.remainingQuantity as string).toFixed(2)} KG</span>
            {(lot.supplierLot as string) && <span>Supplier Lot: {lot.supplierLot as string}</span>}
            {(lot.barcodeValue as string) && <Badge variant="outline" className="font-mono text-xs">{lot.barcodeValue as string}</Badge>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative border-l-2 border-dashed border-border ml-6 pl-8 py-2 space-y-8">

            {Array.isArray(trace.usedInBatches) && trace.usedInBatches.length > 0 && (
              <div className="relative">
                <div className="absolute -left-[41px] top-1 bg-background p-1 border rounded-full">
                  <ArrowRight size={16} />
                </div>
                <h4 className="font-bold text-sm uppercase text-muted-foreground mb-2">Used In Production Batches</h4>
                <div className="grid gap-2">
                  {(trace.usedInBatches as Array<Record<string, unknown>>).map((usage, i) => {
                    const batch = usage.batch as Record<string, unknown>;
                    const product = usage.product as Record<string, unknown>;
                    return (
                      <div key={i} className="flex justify-between items-center p-3 border rounded bg-card" data-testid={`trace-batch-${batch.id}`}>
                        <div className="flex flex-col">
                          <Link href={`/batches/${batch.id}`} className="font-mono font-bold text-sm hover:underline text-primary">
                            {batch.batchNumber as string}
                          </Link>
                          <span className="text-xs text-muted-foreground">{product.name as string}</span>
                          <span className="text-xs text-muted-foreground">Status: {(batch.status as string).replace('_', ' ')}</span>
                        </div>
                        <span className="font-mono text-sm">{parseFloat(usage.quantityUsed as string).toFixed(2)} KG used</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {Array.isArray(trace.usedInBatches) && trace.usedInBatches.length === 0 && (
              <div className="text-muted-foreground text-sm">
                This lot has not been used in any production batches yet.
              </div>
            )}

            {Array.isArray(trace.outputLots) && trace.outputLots.length > 0 && (
              <div className="relative">
                <div className="absolute -left-[41px] top-1 bg-background p-1 border rounded-full">
                  <Factory size={16} />
                </div>
                <h4 className="font-bold text-sm uppercase text-muted-foreground mb-2">Produced Output Lots</h4>
                <div className="grid gap-2">
                  {(trace.outputLots as Array<Record<string, unknown>>).map((outputLot, i) => (
                    <div key={i} className="flex justify-between items-center p-3 border rounded bg-card">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-sm">{outputLot.lotNumber as string}</span>
                        {(outputLot.barcodeValue as string) && (
                          <span className="text-xs text-muted-foreground font-mono">{outputLot.barcodeValue as string}</span>
                        )}
                      </div>
                      <span className="font-mono text-sm">{parseFloat(outputLot.quantity as string).toFixed(2)} KG</span>
                    </div>
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

function BackwardTraceView({ trace }: { trace: Record<string, unknown> }) {
  const batch = trace.batch as Record<string, unknown> | undefined;
  if (!batch) return null;
  const product = trace.product as Record<string, unknown> | undefined;
  const recipe = trace.recipe as Record<string, unknown> | undefined;

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5" />
                Batch: {batch.batchNumber as string}
              </CardTitle>
              <CardDescription className="font-mono flex gap-3 flex-wrap mt-1">
                {product && <span>Product: {product.name as string}</span>}
                <span>Status: {(batch.status as string).replace('_', ' ')}</span>
                <span>Planned: {parseFloat(batch.plannedQuantity as string).toFixed(0)} KG</span>
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
                  <div className="font-mono font-bold">{recipe.name as string}</div>
                  <div className="text-xs text-muted-foreground">Version {recipe.version as number} | Output: {parseFloat(recipe.outputQuantity as string).toFixed(0)} KG</div>
                </Card>
              </div>
            )}

            {Array.isArray(trace.materialsUsed) && trace.materialsUsed.length > 0 && (
              <div className="relative">
                <div className="absolute -left-[41px] top-1 bg-background p-1 border rounded-full">
                  <ArrowLeft size={16} />
                </div>
                <h4 className="font-bold text-sm uppercase text-muted-foreground mb-2">Input Material Lots</h4>
                <div className="grid gap-2">
                  {(trace.materialsUsed as Array<Record<string, unknown>>).map((item, i) => {
                    const lot = item.lot as Record<string, unknown>;
                    const material = item.material as Record<string, unknown> | undefined;
                    return (
                      <div key={i} className="flex justify-between items-center p-3 border rounded bg-card" data-testid={`trace-material-${lot.id}`}>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{material ? (material.name as string) : 'Material'}</span>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            <button
                              className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded hover:bg-muted/80"
                              onClick={() => {
                                window.location.href = `/traceability?lot=${lot.lotNumber}`;
                              }}
                            >
                              {lot.lotNumber as string}
                            </button>
                            {(lot.supplierLot as string) && (
                              <span className="text-xs text-muted-foreground">Supplier: {lot.supplierLot as string}</span>
                            )}
                            {(lot.barcodeValue as string) && (
                              <Badge variant="outline" className="text-xs font-mono">{lot.barcodeValue as string}</Badge>
                            )}
                          </div>
                        </div>
                        <span className="font-mono text-sm">{parseFloat(item.quantityUsed as string).toFixed(2)} KG</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {Array.isArray(trace.materialsUsed) && trace.materialsUsed.length === 0 && (
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

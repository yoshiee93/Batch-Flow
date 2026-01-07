import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ArrowRight, ArrowLeft, Box, Factory, Loader2 } from 'lucide-react';
import { useLots, useBatches, useTraceabilityForward, useTraceabilityBackward } from '@/lib/api';

export default function Traceability() {
  const [query, setQuery] = useState('');
  const [searchId, setSearchId] = useState<{ type: 'lot' | 'batch'; id: string } | null>(null);
  
  const { data: lots = [] } = useLots();
  const { data: batches = [] } = useBatches();
  
  const { data: forwardTrace, isLoading: forwardLoading } = useTraceabilityForward(
    searchId?.type === 'lot' ? searchId.id : ''
  );
  
  const { data: backwardTrace, isLoading: backwardLoading } = useTraceabilityBackward(
    searchId?.type === 'batch' ? searchId.id : ''
  );

  const handleTrace = () => {
    const lot = lots.find(l => l.lotNumber.toLowerCase() === query.toLowerCase() || l.supplierLot?.toLowerCase() === query.toLowerCase());
    if (lot) {
      setSearchId({ type: 'lot', id: lot.id });
      return;
    }

    const batch = batches.find(b => b.batchNumber.toLowerCase() === query.toLowerCase());
    if (batch) {
      setSearchId({ type: 'batch', id: batch.id });
      return;
    }

    setSearchId(null);
  };

  const isLoading = forwardLoading || backwardLoading;

  return (
    <div className="space-y-6">
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <h1 className="text-3xl font-bold font-mono" data-testid="text-traceability-title">Lot Traceability</h1>
        <p className="text-muted-foreground">Enter a Lot Number, Supplier Batch ID, or Batch Number to trace its lineage.</p>
        
        <div className="flex gap-2 max-w-lg mx-auto">
           <Input 
             placeholder="e.g. LOT-2025-001 or BATCH-2025-001" 
             value={query}
             onChange={(e) => setQuery(e.target.value)}
             className="font-mono text-center"
             data-testid="input-trace-query"
             onKeyDown={(e) => e.key === 'Enter' && handleTrace()}
           />
           <Button onClick={handleTrace} data-testid="button-trace">
             <Search size={16} className="mr-2" /> Trace
           </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          Try: {lots[0]?.lotNumber || 'LOT-2025-001'} or {batches[0]?.batchNumber || 'BATCH-2025-001'}
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {forwardTrace && searchId?.type === 'lot' && (
        <ForwardTraceView trace={forwardTrace} />
      )}

      {backwardTrace && searchId?.type === 'batch' && (
        <BackwardTraceView trace={backwardTrace} />
      )}

      {searchId === null && query && (
        <div className="text-center text-muted-foreground py-8">
          No lot or batch found matching "{query}"
        </div>
      )}
    </div>
  );
}

function ForwardTraceView({ trace }: { trace: any }) {
  if (!trace.lot) return null;

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Box className="h-5 w-5" />
            Material Lot: {trace.lot.lotNumber}
          </CardTitle>
          <CardDescription className="font-mono">
            Qty: {parseFloat(trace.lot.quantity).toFixed(0)} KG | Remaining: {parseFloat(trace.lot.remainingQuantity).toFixed(0)} KG
            {trace.lot.supplierLot && ` | Supplier Lot: ${trace.lot.supplierLot}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative border-l-2 border-dashed border-border ml-6 pl-8 py-2 space-y-8">
            
            {trace.usedInBatches && trace.usedInBatches.length > 0 && (
              <div className="relative">
                <div className="absolute -left-[41px] top-1 bg-background p-1 border rounded-full">
                  <ArrowRight size={16} />
                </div>
                <h4 className="font-bold text-sm uppercase text-muted-foreground mb-2">Used In Production Batches</h4>
                <div className="grid gap-2">
                  {trace.usedInBatches.map((usage: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-3 border rounded bg-card" data-testid={`trace-batch-${usage.batch.id}`}>
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-sm">{usage.batch.batchNumber}</span>
                        <span className="text-xs text-muted-foreground">{usage.product.name}</span>
                        <span className="text-xs text-muted-foreground">Status: {usage.batch.status.replace('_', ' ')}</span>
                      </div>
                      <span className="font-mono text-sm">{parseFloat(usage.quantityUsed).toFixed(0)} KG used</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {trace.usedInBatches && trace.usedInBatches.length === 0 && (
              <div className="text-muted-foreground text-sm">
                This lot has not been used in any production batches yet.
              </div>
            )}

            {trace.outputLots && trace.outputLots.length > 0 && (
              <div className="relative">
                <div className="absolute -left-[41px] top-1 bg-background p-1 border rounded-full">
                  <Factory size={16} />
                </div>
                <h4 className="font-bold text-sm uppercase text-muted-foreground mb-2">Produced Output Lots</h4>
                <div className="grid gap-2">
                  {trace.outputLots.map((lot: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-3 border rounded bg-card">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-sm">{lot.lotNumber}</span>
                      </div>
                      <span className="font-mono text-sm">{parseFloat(lot.quantity).toFixed(0)} KG</span>
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

function BackwardTraceView({ trace }: { trace: any }) {
  if (!trace.batch) return null;

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Batch: {trace.batch.batchNumber}
          </CardTitle>
          <CardDescription className="font-mono">
            Product: {trace.product?.name} | Status: {trace.batch.status.replace('_', ' ')} | Planned: {parseFloat(trace.batch.plannedQuantity).toFixed(0)} KG
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative border-l-2 border-dashed border-border ml-6 pl-8 py-2 space-y-8">
            
            {trace.recipe && (
              <div className="relative">
                <div className="absolute -left-[41px] top-1 bg-background p-1 border rounded-full">
                  <Box size={16} />
                </div>
                <h4 className="font-bold text-sm uppercase text-muted-foreground mb-2">Recipe Used</h4>
                <Card className="p-3 bg-muted/30">
                  <div className="font-mono font-bold">{trace.recipe.name}</div>
                  <div className="text-xs text-muted-foreground">Version {trace.recipe.version} | Output: {parseFloat(trace.recipe.outputQuantity).toFixed(0)} KG</div>
                </Card>
              </div>
            )}

            {trace.materialsUsed && trace.materialsUsed.length > 0 && (
              <div className="relative">
                <div className="absolute -left-[41px] top-1 bg-background p-1 border rounded-full">
                  <ArrowLeft size={16} />
                </div>
                <h4 className="font-bold text-sm uppercase text-muted-foreground mb-2">Input Material Lots</h4>
                <div className="grid gap-2">
                  {trace.materialsUsed.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-3 border rounded bg-card" data-testid={`trace-material-${item.lot.id}`}>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{item.material.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">{item.lot.lotNumber}</span>
                        {item.lot.supplierLot && (
                          <span className="text-xs text-muted-foreground">Supplier: {item.lot.supplierLot}</span>
                        )}
                      </div>
                      <span className="font-mono text-sm">{parseFloat(item.quantityUsed).toFixed(0)} KG</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {trace.materialsUsed && trace.materialsUsed.length === 0 && (
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

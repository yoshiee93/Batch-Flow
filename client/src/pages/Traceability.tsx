import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ArrowRight, ArrowLeft, GitCommit, Box, Factory } from 'lucide-react';
import { mockLots, mockMaterials, mockProducts, mockBatches } from '@/lib/mockData';

export default function Traceability() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleTrace = () => {
    // Simple mock logic: Find a lot, then find its batch, then find ingredients
    const lot = mockLots.find(l => l.lotNumber === query || l.supplierLot === query);
    if (!lot) {
      setResult(null);
      return;
    }

    // Mock up a history
    // If it's a product lot (FG), it came from a Batch, which used Material Lots.
    // If it's a material lot (RM), it was used in Batches, which produced FG Lots.
    
    // For demo, we'll just show static mocked relationships if the user types "PROD-2024-001"
    const isProduct = lot.itemType === 'product';
    const item = isProduct 
      ? mockProducts.find(p => p.id === lot.itemId)
      : mockMaterials.find(m => m.id === lot.itemId);

    setResult({
      lot,
      item,
      // Fake relationships
      batch: isProduct ? mockBatches[0] : null, 
      ingredients: isProduct ? [
        { lot: 'SUP-A-2023-001', name: 'Isopropyl Alcohol', qty: '700 L' },
        { lot: 'SUP-B-992', name: 'Glycerin', qty: '20 L' }
      ] : [],
      usage: !isProduct ? [
        { batch: 'BATCH-2025-001', product: 'Industrial Cleaner X500' },
        { batch: 'BATCH-2025-003', product: 'Hand Sanitizer Gel' }
      ] : []
    });
  };

  return (
    <div className="space-y-6">
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <h1 className="text-3xl font-bold font-mono">Lot Traceability</h1>
        <p className="text-muted-foreground">Enter a Lot Number or Supplier Batch ID to trace its lineage.</p>
        
        <div className="flex gap-2 max-w-lg mx-auto">
           <Input 
             placeholder="e.g. PROD-2024-001 or SUP-A-2023-001" 
             value={query}
             onChange={(e) => setQuery(e.target.value)}
             className="font-mono text-center"
           />
           <Button onClick={handleTrace}>
             <Search size={16} className="mr-2" /> Trace
           </Button>
        </div>
      </div>

      {result && (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Box className="h-5 w-5" />
                {result.item?.name}
              </CardTitle>
              <CardDescription className="font-mono">
                 Lot: {result.lot.lotNumber} | Qty: {result.lot.quantity} | Status: {result.lot.status}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative border-l-2 border-dashed border-border ml-6 pl-8 py-2 space-y-8">
                
                {result.lot.itemType === 'product' && (
                  <>
                    <div className="relative">
                      <div className="absolute -left-[41px] top-1 bg-background p-1 border rounded-full">
                         <Factory size={16} />
                      </div>
                      <h4 className="font-bold text-sm uppercase text-muted-foreground mb-2">Produced In Batch</h4>
                      <Card className="p-3 bg-muted/30">
                         <div className="font-mono font-bold">{result.batch?.batchNumber}</div>
                         <div className="text-xs text-muted-foreground">Released on {result.batch?.endDate?.split('T')[0]}</div>
                      </Card>
                    </div>

                    <div className="relative">
                      <div className="absolute -left-[41px] top-1 bg-background p-1 border rounded-full">
                         <ArrowLeft size={16} />
                      </div>
                      <h4 className="font-bold text-sm uppercase text-muted-foreground mb-2">Ingredients Used</h4>
                      <div className="grid gap-2">
                        {result.ingredients.map((ing: any, i: number) => (
                          <div key={i} className="flex justify-between items-center p-2 border rounded bg-card">
                             <div className="flex flex-col">
                               <span className="font-medium text-sm">{ing.name}</span>
                               <span className="font-mono text-xs text-muted-foreground">{ing.lot}</span>
                             </div>
                             <span className="font-mono text-sm">{ing.qty}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {result.lot.itemType === 'material' && (
                  <>
                     <div className="relative">
                      <div className="absolute -left-[41px] top-1 bg-background p-1 border rounded-full">
                         <ArrowRight size={16} />
                      </div>
                      <h4 className="font-bold text-sm uppercase text-muted-foreground mb-2">Used In Batches</h4>
                      <div className="grid gap-2">
                        {result.usage.map((use: any, i: number) => (
                          <div key={i} className="flex justify-between items-center p-2 border rounded bg-card">
                             <div className="flex flex-col">
                               <span className="font-mono font-bold text-sm">{use.batch}</span>
                               <span className="text-xs text-muted-foreground">{use.product}</span>
                             </div>
                             <GitCommit size={16} className="text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

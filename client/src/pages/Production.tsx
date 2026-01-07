import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Play, CheckSquare, AlertCircle, Loader2, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBatches, useProducts, useUpdateBatch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function Production() {
  const { data: batches = [], isLoading, isError } = useBatches();
  const { data: products = [] } = useProducts();
  const updateBatch = useUpdateBatch();
  const { toast } = useToast();

  const handleStatusChange = async (batchId: string, newStatus: string) => {
    try {
      await updateBatch.mutateAsync({ id: batchId, status: newStatus as any });
      toast({ title: "Batch updated", description: `Status changed to ${newStatus.replace('_', ' ')}` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update batch", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load batches</h2>
        <p className="text-muted-foreground mb-4">There was an error loading the production data. Please try refreshing the page.</p>
        <Button onClick={() => window.location.reload()}>Refresh Page</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono" data-testid="text-production-title">Production Control</h1>
          <p className="text-muted-foreground mt-1">Manage batches and execution.</p>
        </div>
        <Button size="lg" className="font-mono" data-testid="button-create-batch">
          <Plus size={16} className="mr-2" /> Create New Batch
        </Button>
      </div>

      <div className="grid gap-6">
        {batches.map((batch) => {
          const product = products.find(p => p.id === batch.productId);
          const planned = parseFloat(batch.plannedQuantity);
          const actual = batch.actualQuantity ? parseFloat(batch.actualQuantity) : 0;
          const percent = planned > 0 ? (actual / planned) * 100 : 0;
          
          return (
            <Card key={batch.id} className="overflow-hidden border-l-4 border-l-primary/20 hover:border-l-primary transition-all" data-testid={`card-batch-${batch.id}`}>
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-mono text-xl font-bold">{batch.batchNumber}</h3>
                      <StatusBadge status={batch.status} />
                    </div>
                    <p className="text-lg font-medium mt-1">{product?.name || 'Unknown Product'}</p>
                    <p className="text-sm text-muted-foreground font-mono">{product?.sku}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {batch.status === 'planned' && (
                       <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleStatusChange(batch.id, 'in_progress')} data-testid={`button-release-${batch.id}`}>
                         <Play size={16} className="mr-2" /> Release
                       </Button>
                    )}
                    {batch.status === 'in_progress' && (
                       <Button size="sm" variant="secondary" onClick={() => handleStatusChange(batch.id, 'quality_check')} data-testid={`button-qc-${batch.id}`}>
                         <CheckSquare size={16} className="mr-2" /> Send to QC
                       </Button>
                    )}
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-batch-actions-${batch.id}`}>
                          <MoreHorizontal size={18} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View Recipe</DropdownMenuItem>
                        <DropdownMenuItem>Record Output</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(batch.id, 'completed')}>Mark Completed</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(batch.id, 'released')}>Release to Inventory</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleStatusChange(batch.id, 'quarantined')}>Quarantine Batch</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6 py-4">
                   <div className="space-y-2">
                     <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Progress</span>
                     <div className="flex items-center gap-2">
                        <Progress value={percent} className="h-3" />
                        <span className="text-xs font-mono font-medium min-w-[3rem]">{Math.round(percent)}%</span>
                     </div>
                     <p className="text-xs text-muted-foreground">
                       {actual.toFixed(0)} of {planned.toFixed(0)} {product?.unit || 'KG'} produced
                     </p>
                   </div>

                   <div className="space-y-1">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Schedule</span>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Started:</span>
                        <span className="font-mono">{batch.startDate ? format(new Date(batch.startDate), 'MMM d, HH:mm') : '-'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Completed:</span>
                        <span className="font-mono">{batch.endDate ? format(new Date(batch.endDate), 'MMM d, HH:mm') : '-'}</span>
                      </div>
                   </div>

                   <div className="space-y-1">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Quality</span>
                      {batch.status === 'quality_check' ? (
                        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-2 py-1 rounded w-fit">
                          <AlertCircle size={14} />
                          <span className="text-xs font-medium">Pending QC Approval</span>
                        </div>
                      ) : batch.status === 'quarantined' ? (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-2 py-1 rounded w-fit">
                          <AlertCircle size={14} />
                          <span className="text-xs font-medium">Quarantined</span>
                        </div>
                      ) : (
                         <div className="flex items-center gap-2 text-muted-foreground">
                            <CheckSquare size={14} />
                            <span className="text-xs">No issues reported</span>
                         </div>
                      )}
                   </div>
                </div>
              </div>
            </Card>
          );
        })}
        {batches.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No batches found. Create a new batch to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    planned: "bg-slate-100 text-slate-700 border-slate-200",
    in_progress: "bg-blue-100 text-blue-700 border-blue-200 animate-pulse",
    quality_check: "bg-amber-100 text-amber-700 border-amber-200",
    completed: "bg-green-100 text-green-700 border-green-200",
    released: "bg-green-100 text-green-700 border-green-200",
    quarantined: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <Badge variant="outline" className={`font-mono uppercase text-[10px] ${styles[status]}`}>
      {status.replace('_', ' ')}
    </Badge>
  );
}

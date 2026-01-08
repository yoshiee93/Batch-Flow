import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Play, CheckSquare, AlertCircle, Loader2, MoreHorizontal, Pencil, Trash2, Scale } from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBatches, useProducts, useRecipes, useUpdateBatch, useCreateBatch, useDeleteBatch, type Batch, type Product } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function Production() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRecordOutputOpen, setIsRecordOutputOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  
  const [newBatch, setNewBatch] = useState({
    batchNumber: '',
    productId: '',
    recipeId: '',
    plannedQuantity: '',
    startDate: '',
  });
  
  const [editForm, setEditForm] = useState({
    plannedQuantity: '',
    notes: '',
  });
  
  const [recordOutputForm, setRecordOutputForm] = useState({
    actualQuantity: '',
  });

  const { data: batches = [], isLoading, isError } = useBatches();
  const { data: products = [] } = useProducts();
  const { data: recipes = [] } = useRecipes();
  const updateBatch = useUpdateBatch();
  const createBatch = useCreateBatch();
  const deleteBatch = useDeleteBatch();
  const { toast } = useToast();

  const handleStatusChange = async (batchId: string, newStatus: string) => {
    try {
      await updateBatch.mutateAsync({ id: batchId, status: newStatus as any });
      toast({ title: "Batch updated", description: `Status changed to ${newStatus.replace('_', ' ')}` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update batch", variant: "destructive" });
    }
  };

  const handleCreateBatch = async () => {
    if (!newBatch.batchNumber || !newBatch.productId || !newBatch.plannedQuantity) {
      toast({ title: "Missing fields", description: "Please fill in batch number, product, and planned quantity", variant: "destructive" });
      return;
    }
    try {
      await createBatch.mutateAsync({
        batchNumber: newBatch.batchNumber,
        productId: newBatch.productId,
        recipeId: newBatch.recipeId || undefined,
        plannedQuantity: newBatch.plannedQuantity,
        status: 'planned',
        startDate: newBatch.startDate ? new Date(newBatch.startDate).toISOString() : undefined,
      });
      toast({ title: "Batch created", description: `Batch ${newBatch.batchNumber} created successfully` });
      setIsCreateDialogOpen(false);
      setNewBatch({ batchNumber: '', productId: '', recipeId: '', plannedQuantity: '', startDate: '' });
    } catch (error) {
      toast({ title: "Error", description: "Failed to create batch", variant: "destructive" });
    }
  };

  const handleEditClick = (batch: Batch) => {
    setSelectedBatch(batch);
    setEditForm({
      plannedQuantity: batch.plannedQuantity,
      notes: batch.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateBatch = async () => {
    if (!selectedBatch) return;
    try {
      await updateBatch.mutateAsync({
        id: selectedBatch.id,
        plannedQuantity: editForm.plannedQuantity,
        notes: editForm.notes || undefined,
      });
      toast({ title: "Batch updated", description: `Batch ${selectedBatch.batchNumber} updated successfully` });
      setIsEditDialogOpen(false);
      setSelectedBatch(null);
    } catch (error) {
      toast({ title: "Error", description: "Failed to update batch", variant: "destructive" });
    }
  };

  const handleRecordOutputClick = (batch: Batch) => {
    setSelectedBatch(batch);
    setRecordOutputForm({
      actualQuantity: batch.actualQuantity || '',
    });
    setIsRecordOutputOpen(true);
  };

  const handleRecordOutput = async () => {
    if (!selectedBatch || !recordOutputForm.actualQuantity) {
      toast({ title: "Missing fields", description: "Please enter the actual quantity produced", variant: "destructive" });
      return;
    }
    try {
      await updateBatch.mutateAsync({
        id: selectedBatch.id,
        actualQuantity: recordOutputForm.actualQuantity,
      });
      toast({ title: "Output recorded", description: `Recorded ${recordOutputForm.actualQuantity} KG produced` });
      setIsRecordOutputOpen(false);
      setSelectedBatch(null);
    } catch (error) {
      toast({ title: "Error", description: "Failed to record output", variant: "destructive" });
    }
  };

  const handleDeleteClick = (batch: Batch) => {
    setSelectedBatch(batch);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteBatch = async () => {
    if (!selectedBatch) return;
    try {
      await deleteBatch.mutateAsync(selectedBatch.id);
      toast({ title: "Batch deleted", description: `Batch ${selectedBatch.batchNumber} has been removed` });
      setIsDeleteDialogOpen(false);
      setSelectedBatch(null);
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete batch", variant: "destructive" });
    }
  };

  const generateBatchNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `BATCH-${year}${month}${day}-${random}`;
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
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="font-mono" data-testid="button-create-batch">
              <Plus size={16} className="mr-2" /> Create New Batch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Batch</DialogTitle>
              <DialogDescription>Start a new production batch</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="batchNumber">Batch Number *</Label>
                <div className="flex gap-2">
                  <Input
                    id="batchNumber"
                    placeholder="e.g. BATCH-20260108-001"
                    value={newBatch.batchNumber}
                    onChange={(e) => setNewBatch({ ...newBatch, batchNumber: e.target.value })}
                    data-testid="input-batch-number"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setNewBatch({ ...newBatch, batchNumber: generateBatchNumber() })}
                    data-testid="button-generate-batch-number"
                  >
                    Generate
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="product">Product *</Label>
                <Select value={newBatch.productId} onValueChange={(v) => setNewBatch({ ...newBatch, productId: v })}>
                  <SelectTrigger data-testid="select-product">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.sku} - {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipe">Recipe (Optional)</Label>
                <Select value={newBatch.recipeId} onValueChange={(v) => setNewBatch({ ...newBatch, recipeId: v })}>
                  <SelectTrigger data-testid="select-recipe">
                    <SelectValue placeholder="Select a recipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {recipes.map(recipe => (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        {recipe.name} (v{recipe.version})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plannedQuantity">Planned Quantity (KG) *</Label>
                  <Input
                    id="plannedQuantity"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 500"
                    value={newBatch.plannedQuantity}
                    onChange={(e) => setNewBatch({ ...newBatch, plannedQuantity: e.target.value })}
                    data-testid="input-planned-quantity"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={newBatch.startDate}
                    onChange={(e) => setNewBatch({ ...newBatch, startDate: e.target.value })}
                    data-testid="input-start-date"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateBatch} disabled={createBatch.isPending} data-testid="button-submit-batch">
                {createBatch.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Batch
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {batches.map((batch) => (
          <BatchCard 
            key={batch.id} 
            batch={batch} 
            products={products}
            onStatusChange={handleStatusChange}
            onEditClick={handleEditClick}
            onRecordOutputClick={handleRecordOutputClick}
            onDeleteClick={handleDeleteClick}
          />
        ))}
        {batches.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No batches found. Create a new batch to get started.</p>
          </div>
        )}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Batch {selectedBatch?.batchNumber}</DialogTitle>
            <DialogDescription>Update batch details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-plannedQuantity">Planned Quantity (KG)</Label>
              <Input
                id="edit-plannedQuantity"
                type="number"
                step="0.01"
                value={editForm.plannedQuantity}
                onChange={(e) => setEditForm({ ...editForm, plannedQuantity: e.target.value })}
                data-testid="input-edit-planned-quantity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Input
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Add notes about this batch..."
                data-testid="input-edit-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateBatch} disabled={updateBatch.isPending} data-testid="button-save-batch">
              {updateBatch.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRecordOutputOpen} onOpenChange={setIsRecordOutputOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Output for {selectedBatch?.batchNumber}</DialogTitle>
            <DialogDescription>Enter the actual quantity produced</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="actualQuantity">Actual Quantity Produced (KG)</Label>
              <Input
                id="actualQuantity"
                type="number"
                step="0.01"
                value={recordOutputForm.actualQuantity}
                onChange={(e) => setRecordOutputForm({ ...recordOutputForm, actualQuantity: e.target.value })}
                placeholder={`Planned: ${selectedBatch?.plannedQuantity} KG`}
                data-testid="input-actual-quantity"
              />
            </div>
            {selectedBatch && (
              <div className="text-sm text-muted-foreground">
                Planned quantity: <span className="font-mono font-medium">{selectedBatch.plannedQuantity} KG</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecordOutputOpen(false)}>Cancel</Button>
            <Button onClick={handleRecordOutput} disabled={updateBatch.isPending} data-testid="button-record-output">
              {updateBatch.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Output
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Batch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete batch {selectedBatch?.batchNumber}? This will also remove all associated materials and quality checks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBatch} data-testid="button-confirm-delete-batch">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BatchCard({ 
  batch, 
  products, 
  onStatusChange, 
  onEditClick, 
  onRecordOutputClick,
  onDeleteClick 
}: { 
  batch: Batch; 
  products: Product[];
  onStatusChange: (id: string, status: string) => void;
  onEditClick: (batch: Batch) => void;
  onRecordOutputClick: (batch: Batch) => void;
  onDeleteClick: (batch: Batch) => void;
}) {
  const product = products.find(p => p.id === batch.productId);
  const planned = parseFloat(batch.plannedQuantity);
  const actual = batch.actualQuantity ? parseFloat(batch.actualQuantity) : 0;
  const percent = planned > 0 ? (actual / planned) * 100 : 0;
  
  return (
    <Card className="overflow-hidden border-l-4 border-l-primary/20 hover:border-l-primary transition-all" data-testid={`card-batch-${batch.id}`}>
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
               <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => onStatusChange(batch.id, 'in_progress')} data-testid={`button-release-${batch.id}`}>
                 <Play size={16} className="mr-2" /> Release
               </Button>
            )}
            {batch.status === 'in_progress' && (
               <Button size="sm" variant="secondary" onClick={() => onStatusChange(batch.id, 'quality_check')} data-testid={`button-qc-${batch.id}`}>
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
                <DropdownMenuItem onClick={() => onEditClick(batch)} data-testid={`button-edit-batch-${batch.id}`}>
                  <Pencil size={14} className="mr-2" /> Edit Batch
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onRecordOutputClick(batch)} data-testid={`button-record-${batch.id}`}>
                  <Scale size={14} className="mr-2" /> Record Output
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onStatusChange(batch.id, 'completed')}>
                  <CheckSquare size={14} className="mr-2" /> Mark Completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(batch.id, 'released')}>
                  Release to Inventory
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-amber-600" onClick={() => onStatusChange(batch.id, 'quarantined')}>
                  <AlertCircle size={14} className="mr-2" /> Quarantine Batch
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => onDeleteClick(batch)} data-testid={`button-delete-batch-${batch.id}`}>
                  <Trash2 size={14} className="mr-2" /> Delete Batch
                </DropdownMenuItem>
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

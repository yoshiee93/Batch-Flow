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
import { Plus, CheckCircle, AlertCircle, Loader2, MoreHorizontal, Pencil, Trash2, Scale } from 'lucide-react';
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
  });
  
  const [editForm, setEditForm] = useState({
    plannedQuantity: '',
    notes: '',
  });
  
  const [recordOutputForm, setRecordOutputForm] = useState({
    actualQuantity: '',
    wasteQuantity: '',
    millingQuantity: '',
  });

  const { data: batches = [], isLoading, isError } = useBatches();
  const { data: products = [] } = useProducts();
  const { data: recipes = [] } = useRecipes();
  const updateBatch = useUpdateBatch();
  const createBatch = useCreateBatch();
  const deleteBatch = useDeleteBatch();
  const { toast } = useToast();

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
        status: 'in_progress',
      });
      toast({ title: "Batch created", description: `Batch ${newBatch.batchNumber} created successfully` });
      setIsCreateDialogOpen(false);
      setNewBatch({ batchNumber: '', productId: '', recipeId: '', plannedQuantity: '' });
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
      wasteQuantity: batch.wasteQuantity || '',
      millingQuantity: batch.millingQuantity || '',
    });
    setIsRecordOutputOpen(true);
  };

  const handleRecordOutput = async () => {
    if (!selectedBatch) return;
    try {
      await updateBatch.mutateAsync({
        id: selectedBatch.id,
        actualQuantity: recordOutputForm.actualQuantity || undefined,
        wasteQuantity: recordOutputForm.wasteQuantity || undefined,
        millingQuantity: recordOutputForm.millingQuantity || undefined,
      });
      toast({ title: "Output recorded", description: "Production output has been recorded" });
      setIsRecordOutputOpen(false);
      setSelectedBatch(null);
    } catch (error) {
      toast({ title: "Error", description: "Failed to record output", variant: "destructive" });
    }
  };

  const handleMarkComplete = async (batch: Batch) => {
    try {
      await updateBatch.mutateAsync({
        id: batch.id,
        status: 'completed',
        endDate: new Date().toISOString(),
      });
      toast({ title: "Batch completed", description: `Batch ${batch.batchNumber} marked as completed` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to complete batch", variant: "destructive" });
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
          <p className="text-muted-foreground mt-1">Manage batches and record output.</p>
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
            onEditClick={handleEditClick}
            onRecordOutputClick={handleRecordOutputClick}
            onMarkComplete={handleMarkComplete}
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
            <DialogDescription>Enter the quantities produced</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedBatch && (
              <div className="text-sm text-muted-foreground mb-4 p-3 bg-muted rounded-md">
                Planned quantity: <span className="font-mono font-medium">{selectedBatch.plannedQuantity} KG</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="actualQuantity">Product Output (KG)</Label>
              <Input
                id="actualQuantity"
                type="number"
                step="0.01"
                value={recordOutputForm.actualQuantity}
                onChange={(e) => setRecordOutputForm({ ...recordOutputForm, actualQuantity: e.target.value })}
                placeholder="Finished product quantity"
                data-testid="input-actual-quantity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wasteQuantity">Waste (KG)</Label>
              <Input
                id="wasteQuantity"
                type="number"
                step="0.01"
                value={recordOutputForm.wasteQuantity}
                onChange={(e) => setRecordOutputForm({ ...recordOutputForm, wasteQuantity: e.target.value })}
                placeholder="Waste quantity"
                data-testid="input-waste-quantity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="millingQuantity">Milling (KG)</Label>
              <Input
                id="millingQuantity"
                type="number"
                step="0.01"
                value={recordOutputForm.millingQuantity}
                onChange={(e) => setRecordOutputForm({ ...recordOutputForm, millingQuantity: e.target.value })}
                placeholder="Milling quantity"
                data-testid="input-milling-quantity"
              />
            </div>
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
              Are you sure you want to delete batch {selectedBatch?.batchNumber}? This action cannot be undone.
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
  onEditClick, 
  onRecordOutputClick,
  onMarkComplete,
  onDeleteClick 
}: { 
  batch: Batch; 
  products: Product[];
  onEditClick: (batch: Batch) => void;
  onRecordOutputClick: (batch: Batch) => void;
  onMarkComplete: (batch: Batch) => void;
  onDeleteClick: (batch: Batch) => void;
}) {
  const product = products.find(p => p.id === batch.productId);
  const planned = parseFloat(batch.plannedQuantity);
  const actual = batch.actualQuantity ? parseFloat(batch.actualQuantity) : 0;
  const waste = batch.wasteQuantity ? parseFloat(batch.wasteQuantity) : 0;
  const milling = batch.millingQuantity ? parseFloat(batch.millingQuantity) : 0;
  const totalOutput = actual + waste + milling;
  const percent = planned > 0 ? (totalOutput / planned) * 100 : 0;
  const isCompleted = batch.status === 'completed';
  
  return (
    <Card className={`overflow-hidden border-l-4 transition-all ${isCompleted ? 'border-l-green-500 bg-green-50/30' : 'border-l-blue-500'}`} data-testid={`card-batch-${batch.id}`}>
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-mono text-xl font-bold">{batch.batchNumber}</h3>
              <Badge variant="outline" className={`font-mono uppercase text-[10px] ${isCompleted ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                {isCompleted ? 'Completed' : 'In Progress'}
              </Badge>
            </div>
            <p className="text-lg font-medium mt-1">{product?.name || 'Unknown Product'}</p>
            <p className="text-sm text-muted-foreground font-mono">{product?.sku}</p>
          </div>
          
          <div className="flex items-center gap-2">
            {!isCompleted && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onMarkComplete(batch)} data-testid={`button-complete-${batch.id}`}>
                <CheckCircle size={16} className="mr-2" /> Mark Complete
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
                <DropdownMenuItem className="text-destructive" onClick={() => onDeleteClick(batch)} data-testid={`button-delete-batch-${batch.id}`}>
                  <Trash2 size={14} className="mr-2" /> Delete Batch
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 py-4">
          <div className="space-y-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Progress</span>
            <div className="flex items-center gap-2">
              <Progress value={Math.min(percent, 100)} className="h-3" />
              <span className="text-xs font-mono font-medium min-w-[3rem]">{Math.round(percent)}%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {totalOutput.toFixed(1)} of {planned.toFixed(1)} KG accounted for
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Output Breakdown</span>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-2 bg-muted rounded">
                <div className="text-lg font-mono font-bold text-green-600">{actual.toFixed(1)}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Product</div>
              </div>
              <div className="text-center p-2 bg-muted rounded">
                <div className="text-lg font-mono font-bold text-red-600">{waste.toFixed(1)}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Waste</div>
              </div>
              <div className="text-center p-2 bg-muted rounded">
                <div className="text-lg font-mono font-bold text-amber-600">{milling.toFixed(1)}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Milling</div>
              </div>
            </div>
          </div>
        </div>

        {batch.notes && (
          <div className="mt-4 pt-4 border-t">
            <span className="text-xs text-muted-foreground">Notes: </span>
            <span className="text-sm">{batch.notes}</span>
          </div>
        )}

        <div className="mt-4 pt-4 border-t flex items-center gap-4 text-xs text-muted-foreground">
          <span>Created: {format(new Date(batch.createdAt), 'MMM d, yyyy HH:mm')}</span>
          {batch.endDate && <span>Completed: {format(new Date(batch.endDate), 'MMM d, yyyy HH:mm')}</span>}
        </div>
      </div>
    </Card>
  );
}

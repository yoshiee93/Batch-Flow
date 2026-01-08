import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CheckCircle, AlertCircle, Loader2, MoreHorizontal, Pencil, Trash2, Scale, Package, X } from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  useBatches, useProducts, useRecipes, useMaterials, useLots, 
  useUpdateBatch, useCreateBatch, useDeleteBatch,
  useBatchMaterials, useRecordBatchInput, useRemoveBatchMaterial, useUpdateBatchMaterial, useRecordBatchOutput,
  type Batch, type Product, type Material, type Lot, type BatchMaterial
} from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function Production() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRecordInputOpen, setIsRecordInputOpen] = useState(false);
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
    actualQuantity: '',
    wasteQuantity: '',
    millingQuantity: '',
    notes: '',
  });
  
  const [recordInputForm, setRecordInputForm] = useState({
    materialId: '',
    lotId: '',
    quantity: '',
  });
  
  const [recordOutputForm, setRecordOutputForm] = useState({
    actualQuantity: '',
    wasteQuantity: '',
    millingQuantity: '',
    markCompleted: false,
  });

  const { data: batches = [], isLoading, isError } = useBatches();
  const { data: products = [] } = useProducts();
  const { data: recipes = [] } = useRecipes();
  const { data: materials = [] } = useMaterials();
  const { data: lots = [] } = useLots();
  const updateBatch = useUpdateBatch();
  const createBatch = useCreateBatch();
  const deleteBatch = useDeleteBatch();
  const recordBatchInput = useRecordBatchInput();
  const recordBatchOutput = useRecordBatchOutput();
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
      actualQuantity: batch.actualQuantity || '',
      wasteQuantity: batch.wasteQuantity || '',
      millingQuantity: batch.millingQuantity || '',
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
        actualQuantity: editForm.actualQuantity || undefined,
        wasteQuantity: editForm.wasteQuantity || undefined,
        millingQuantity: editForm.millingQuantity || undefined,
        notes: editForm.notes || undefined,
      });
      toast({ title: "Batch updated", description: `Batch ${selectedBatch.batchNumber} updated successfully` });
      setIsEditDialogOpen(false);
      setSelectedBatch(null);
    } catch (error) {
      toast({ title: "Error", description: "Failed to update batch", variant: "destructive" });
    }
  };

  const handleRecordInputClick = (batch: Batch) => {
    setSelectedBatch(batch);
    setRecordInputForm({ materialId: '', lotId: '', quantity: '' });
    setIsRecordInputOpen(true);
  };

  const handleRecordInput = async () => {
    if (!selectedBatch) return;
    if (!recordInputForm.materialId || !recordInputForm.lotId || !recordInputForm.quantity) {
      toast({ title: "Missing fields", description: "Please select material, lot, and enter quantity", variant: "destructive" });
      return;
    }
    try {
      await recordBatchInput.mutateAsync({
        batchId: selectedBatch.id,
        materialId: recordInputForm.materialId,
        lotId: recordInputForm.lotId,
        quantity: recordInputForm.quantity,
      });
      toast({ title: "Input recorded", description: "Material has been added to batch and deducted from inventory" });
      setRecordInputForm({ materialId: '', lotId: '', quantity: '' });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to record input", variant: "destructive" });
    }
  };

  const handleRecordOutputClick = (batch: Batch) => {
    setSelectedBatch(batch);
    setRecordOutputForm({
      actualQuantity: batch.actualQuantity || '',
      wasteQuantity: batch.wasteQuantity || '',
      millingQuantity: batch.millingQuantity || '',
      markCompleted: false,
    });
    setIsRecordOutputOpen(true);
  };

  const handleRecordOutput = async () => {
    if (!selectedBatch) return;
    try {
      await recordBatchOutput.mutateAsync({
        batchId: selectedBatch.id,
        actualQuantity: recordOutputForm.actualQuantity || "0",
        wasteQuantity: recordOutputForm.wasteQuantity || "0",
        millingQuantity: recordOutputForm.millingQuantity || "0",
        markCompleted: recordOutputForm.markCompleted,
      });
      toast({ 
        title: "Output recorded", 
        description: recordOutputForm.markCompleted 
          ? "Production output recorded and batch marked complete. Finished goods added to inventory." 
          : "Production output has been recorded. Finished goods added to inventory."
      });
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

  const availableLots = lots.filter(lot => 
    lot.materialId === recordInputForm.materialId && 
    parseFloat(lot.remainingQuantity || "0") > 0
  );

  const selectedLot = lots.find(l => l.id === recordInputForm.lotId);

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
          <p className="text-muted-foreground mt-1">Manage batches, record inputs and outputs.</p>
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
            materials={materials}
            lots={lots}
            onEditClick={handleEditClick}
            onRecordInputClick={handleRecordInputClick}
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Batch {selectedBatch?.batchNumber}</DialogTitle>
            <DialogDescription>Update batch details and manage material inputs</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
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

            <div className="space-y-3">
              <Label className="text-sm font-medium">Output Breakdown (KG)</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-actualQuantity" className="text-xs text-muted-foreground">Product Output</Label>
                  <Input
                    id="edit-actualQuantity"
                    type="number"
                    step="0.01"
                    value={editForm.actualQuantity}
                    onChange={(e) => setEditForm({ ...editForm, actualQuantity: e.target.value })}
                    placeholder="0"
                    className="font-mono"
                    data-testid="input-edit-actual-quantity"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-wasteQuantity" className="text-xs text-muted-foreground">Waste</Label>
                  <Input
                    id="edit-wasteQuantity"
                    type="number"
                    step="0.01"
                    value={editForm.wasteQuantity}
                    onChange={(e) => setEditForm({ ...editForm, wasteQuantity: e.target.value })}
                    placeholder="0"
                    className="font-mono"
                    data-testid="input-edit-waste-quantity"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-millingQuantity" className="text-xs text-muted-foreground">Milling</Label>
                  <Input
                    id="edit-millingQuantity"
                    type="number"
                    step="0.01"
                    value={editForm.millingQuantity}
                    onChange={(e) => setEditForm({ ...editForm, millingQuantity: e.target.value })}
                    placeholder="0"
                    className="font-mono"
                    data-testid="input-edit-milling-quantity"
                  />
                </div>
              </div>
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
            
            {selectedBatch && (
              <BatchMaterialsEditor 
                batchId={selectedBatch.id} 
                materials={materials} 
                lots={lots}
                isCompleted={selectedBatch.status === 'completed'}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Close</Button>
            <Button onClick={handleUpdateBatch} disabled={updateBatch.isPending} data-testid="button-save-batch">
              {updateBatch.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Batch Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRecordInputOpen} onOpenChange={setIsRecordInputOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Input for {selectedBatch?.batchNumber}</DialogTitle>
            <DialogDescription>Add materials used in production. This will deduct from inventory.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="input-material">Material *</Label>
              <Select 
                value={recordInputForm.materialId} 
                onValueChange={(v) => setRecordInputForm({ ...recordInputForm, materialId: v, lotId: '' })}
              >
                <SelectTrigger data-testid="select-input-material">
                  <SelectValue placeholder="Select a material" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map(material => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.sku} - {material.name} ({material.currentStock} KG in stock)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {recordInputForm.materialId && (
              <div className="space-y-2">
                <Label htmlFor="input-lot">Lot *</Label>
                <Select 
                  value={recordInputForm.lotId} 
                  onValueChange={(v) => setRecordInputForm({ ...recordInputForm, lotId: v })}
                >
                  <SelectTrigger data-testid="select-input-lot">
                    <SelectValue placeholder="Select a lot" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLots.length === 0 ? (
                      <SelectItem value="none" disabled>No available lots for this material</SelectItem>
                    ) : (
                      availableLots.map(lot => (
                        <SelectItem key={lot.id} value={lot.id}>
                          {lot.lotNumber} - {lot.remainingQuantity} KG remaining
                          {lot.expiryDate && ` (Exp: ${format(new Date(lot.expiryDate), 'MMM d, yyyy')})`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedLot && (
                  <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                    Available: <span className="font-mono font-medium">{selectedLot.remainingQuantity} KG</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="input-quantity">Quantity (KG) *</Label>
              <Input
                id="input-quantity"
                type="number"
                step="0.01"
                value={recordInputForm.quantity}
                onChange={(e) => setRecordInputForm({ ...recordInputForm, quantity: e.target.value })}
                placeholder="Enter quantity to use"
                data-testid="input-material-quantity"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecordInputOpen(false)}>Close</Button>
            <Button onClick={handleRecordInput} disabled={recordBatchInput.isPending} data-testid="button-add-input">
              {recordBatchInput.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add to Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRecordOutputOpen} onOpenChange={setIsRecordOutputOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Output for {selectedBatch?.batchNumber}</DialogTitle>
            <DialogDescription>Enter production output. Product output will be added to inventory.</DialogDescription>
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
              <p className="text-xs text-muted-foreground">This will be added to product inventory</p>
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
            <div className="flex items-center space-x-2 pt-2 border-t">
              <Checkbox
                id="markCompleted"
                checked={recordOutputForm.markCompleted}
                onCheckedChange={(checked) => setRecordOutputForm({ ...recordOutputForm, markCompleted: !!checked })}
                data-testid="checkbox-mark-completed"
              />
              <Label htmlFor="markCompleted" className="text-sm font-normal cursor-pointer">
                Mark batch as completed
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecordOutputOpen(false)}>Cancel</Button>
            <Button onClick={handleRecordOutput} disabled={recordBatchOutput.isPending} data-testid="button-record-output">
              {recordBatchOutput.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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

function BatchMaterialsEditor({ 
  batchId, 
  materials, 
  lots,
  isCompleted 
}: { 
  batchId: string; 
  materials: Material[];
  lots: Lot[];
  isCompleted: boolean;
}) {
  const [editingMaterial, setEditingMaterial] = useState<BatchMaterial | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  
  const { data: batchMaterials = [], isLoading } = useBatchMaterials(batchId);
  const removeBatchMaterial = useRemoveBatchMaterial();
  const updateBatchMaterial = useUpdateBatchMaterial();
  const { toast } = useToast();
  
  const handleRemoveMaterial = async (materialId: string) => {
    try {
      await removeBatchMaterial.mutateAsync(materialId);
      toast({ title: "Material removed", description: "Material returned to inventory" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove material", variant: "destructive" });
    }
  };
  
  const handleEditMaterialClick = (bm: BatchMaterial) => {
    setEditingMaterial(bm);
    setEditQuantity(bm.quantity);
  };
  
  const handleUpdateMaterial = async () => {
    if (!editingMaterial) return;
    try {
      await updateBatchMaterial.mutateAsync({ id: editingMaterial.id, quantity: editQuantity });
      toast({ title: "Material updated", description: "Quantity has been updated and inventory adjusted" });
      setEditingMaterial(null);
      setEditQuantity('');
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update material", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Material Inputs</Label>
        <span className="text-xs text-muted-foreground">{batchMaterials.length} material(s)</span>
      </div>
      
      {batchMaterials.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
          <Package className="mx-auto h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">No materials recorded yet</p>
          <p className="text-xs mt-1">Use "Record Input" to add materials to this batch</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {batchMaterials.map((bm) => {
            const material = materials.find(m => m.id === bm.materialId);
            const lot = lots.find(l => l.id === bm.lotId);
            const isEditing = editingMaterial?.id === bm.id;
            
            return (
              <div 
                key={bm.id} 
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border" 
                data-testid={`edit-batch-material-${bm.id}`}
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{material?.name || 'Unknown Material'}</div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-mono">{material?.sku}</span>
                    <span className="mx-2">•</span>
                    <span>Lot: {lot?.lotNumber || 'Unknown'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(e.target.value)}
                        className="w-24 h-8 text-sm font-mono"
                        data-testid={`input-edit-material-qty-${bm.id}`}
                      />
                      <span className="text-xs text-muted-foreground">KG</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
                        onClick={handleUpdateMaterial}
                        disabled={updateBatchMaterial.isPending}
                        data-testid={`button-save-material-qty-${bm.id}`}
                      >
                        <CheckCircle size={14} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => { setEditingMaterial(null); setEditQuantity(''); }}
                        data-testid={`button-cancel-edit-qty-${bm.id}`}
                      >
                        <X size={14} />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="font-mono text-sm font-medium">{bm.quantity} KG</span>
                      {!isCompleted && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleEditMaterialClick(bm)}
                            data-testid={`button-edit-material-qty-${bm.id}`}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveMaterial(bm.id)}
                            disabled={removeBatchMaterial.isPending}
                            data-testid={`button-remove-material-${bm.id}`}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BatchCard({ 
  batch, 
  products, 
  materials,
  lots,
  onEditClick, 
  onRecordInputClick,
  onRecordOutputClick,
  onMarkComplete,
  onDeleteClick 
}: { 
  batch: Batch; 
  products: Product[];
  materials: Material[];
  lots: Lot[];
  onEditClick: (batch: Batch) => void;
  onRecordInputClick: (batch: Batch) => void;
  onRecordOutputClick: (batch: Batch) => void;
  onMarkComplete: (batch: Batch) => void;
  onDeleteClick: (batch: Batch) => void;
}) {
  const product = products.find(p => p.id === batch.productId);
  const planned = parseFloat(batch.plannedQuantity);
  const actual = batch.actualQuantity ? parseFloat(batch.actualQuantity) : 0;
  const waste = batch.wasteQuantity ? parseFloat(batch.wasteQuantity) : 0;
  const milling = batch.millingQuantity ? parseFloat(batch.millingQuantity) : 0;
  const isCompleted = batch.status === 'completed';
  
  const [editingMaterial, setEditingMaterial] = useState<BatchMaterial | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  
  const { data: batchMaterials = [] } = useBatchMaterials(batch.id);
  const removeBatchMaterial = useRemoveBatchMaterial();
  const updateBatchMaterial = useUpdateBatchMaterial();
  const { toast } = useToast();
  
  const handleRemoveMaterial = async (materialId: string) => {
    try {
      await removeBatchMaterial.mutateAsync(materialId);
      toast({ title: "Material removed", description: "Material returned to inventory" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove material", variant: "destructive" });
    }
  };
  
  const handleEditMaterialClick = (bm: BatchMaterial) => {
    setEditingMaterial(bm);
    setEditQuantity(bm.quantity);
  };
  
  const handleUpdateMaterial = async () => {
    if (!editingMaterial) return;
    try {
      await updateBatchMaterial.mutateAsync({ id: editingMaterial.id, quantity: editQuantity });
      toast({ title: "Material updated", description: "Quantity has been updated and inventory adjusted" });
      setEditingMaterial(null);
      setEditQuantity('');
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update material", variant: "destructive" });
    }
  };
  
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
              <>
                <Button size="sm" variant="outline" onClick={() => onRecordInputClick(batch)} data-testid={`button-input-${batch.id}`}>
                  <Package size={16} className="mr-2" /> Record Input
                </Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onMarkComplete(batch)} data-testid={`button-complete-${batch.id}`}>
                  <CheckCircle size={16} className="mr-2" /> Mark Complete
                </Button>
              </>
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
                <DropdownMenuItem onClick={() => onRecordInputClick(batch)} data-testid={`menu-record-input-${batch.id}`}>
                  <Package size={14} className="mr-2" /> Record Input
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

        <div className="py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Output</span>
              <span className="text-xs text-muted-foreground">Planned: {planned.toFixed(1)} KG</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted rounded">
                <div className="text-xl font-mono font-bold text-green-600">{actual.toFixed(1)}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Product (KG)</div>
              </div>
              <div className="text-center p-3 bg-muted rounded">
                <div className="text-xl font-mono font-bold text-red-600">{waste.toFixed(1)}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Waste (KG)</div>
              </div>
              <div className="text-center p-3 bg-muted rounded">
                <div className="text-xl font-mono font-bold text-amber-600">{milling.toFixed(1)}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Milling (KG)</div>
              </div>
            </div>
          </div>
        </div>

        {batchMaterials.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Materials Used</span>
            <div className="mt-2 space-y-2">
              {batchMaterials.map((bm) => {
                const material = materials.find(m => m.id === bm.materialId);
                const lot = lots.find(l => l.id === bm.lotId);
                const isEditing = editingMaterial?.id === bm.id;
                return (
                  <div key={bm.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm" data-testid={`batch-material-${bm.id}`}>
                    <div>
                      <span className="font-medium">{material?.name || 'Unknown'}</span>
                      <span className="text-muted-foreground ml-2">Lot: {lot?.lotNumber || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(e.target.value)}
                            className="w-24 h-7 text-sm font-mono"
                            data-testid={`input-edit-material-${bm.id}`}
                          />
                          <span className="text-xs text-muted-foreground">KG</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-green-600 hover:text-green-700"
                            onClick={handleUpdateMaterial}
                            disabled={updateBatchMaterial.isPending}
                            data-testid={`button-save-material-${bm.id}`}
                          >
                            <CheckCircle size={14} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => { setEditingMaterial(null); setEditQuantity(''); }}
                            data-testid={`button-cancel-edit-${bm.id}`}
                          >
                            <X size={14} />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="font-mono">{bm.quantity} KG</span>
                          {!isCompleted && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={() => handleEditMaterialClick(bm)}
                                data-testid={`button-edit-material-${bm.id}`}
                              >
                                <Pencil size={14} />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => handleRemoveMaterial(bm.id)}
                                disabled={removeBatchMaterial.isPending}
                                data-testid={`button-remove-material-${bm.id}`}
                              >
                                <X size={14} />
                              </Button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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

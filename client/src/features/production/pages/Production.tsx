import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, CheckCircle, AlertCircle, Loader2, MoreHorizontal, Pencil, Trash2, Scale, Package, X, ArrowDownCircle, ChevronDown, ChevronRight, ChevronsUpDown, Check, ExternalLink, Printer } from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';
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
  useBatches, useProducts, useRecipes, useMaterials, useLots, useCategories,
  useUpdateBatch, useCreateBatch, useDeleteBatch,
  useBatchMaterials, useRecordBatchInput, useRemoveBatchMaterial, useUpdateBatchMaterial, useRecordBatchOutput,
  useBatchOutputs, useBatchOutputLots, useAddBatchOutput, useRemoveBatchOutput, useFinalizeBatch, useMarkBarcodePrinted,
  fetchLotByBarcode,
  type Batch, type Product, type Material, type Lot, type BatchMaterial, type BatchOutput, type Category, type LotWithDetails, type FinalizeResult, type OutputLot
} from '@/lib/api';
import { printBarcodeLabel } from '@/lib/barcodePrint';
import { useToast } from '@/hooks/use-toast';
import { buildBatchCode } from '@shared/batchCodeConfig';
import { useRole } from '@/contexts/AuthContext';

export default function Production() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('action') === 'create';
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'create') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRecordInputOpen, setIsRecordInputOpen] = useState(false);
  const [isRecordOutputOpen, setIsRecordOutputOpen] = useState(false);
  const [isAddOutputOpen, setIsAddOutputOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  
  const [newBatch, setNewBatch] = useState({
    batchNumber: '',
    productId: '',
    recipeId: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
  });
  
  const [editForm, setEditForm] = useState({
    actualQuantity: '',
    wasteQuantity: '',
    millingQuantity: '',
    notes: '',
  });
  
  const [recordInputForm, setRecordInputForm] = useState({
    inputType: 'material' as 'material' | 'product',
    materialId: '',
    productId: '',
    quantity: '',
    lotId: '',
  });
  const [materialSearchOpen, setMaterialSearchOpen] = useState(false);
  const [inputProductSearchOpen, setInputProductSearchOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedLot, setScannedLot] = useState<LotWithDetails | null>(null);
  const [barcodeError, setBarcodeError] = useState('');
  const [isLookingUpBarcode, setIsLookingUpBarcode] = useState(false);
  const barcodeScanRef = useRef<HTMLInputElement>(null);
  const [createProductSearchOpen, setCreateProductSearchOpen] = useState(false);
  
  const [recordOutputForm, setRecordOutputForm] = useState({
    actualQuantity: '',
    wasteQuantity: '',
    millingQuantity: '',
    markCompleted: false,
  });

  const { canManageBatches } = useRole();

  const { data: batches = [], isLoading, isError } = useBatches();
  const { data: products = [] } = useProducts();
  const { data: recipes = [] } = useRecipes();
  const { data: materials = [] } = useMaterials();
  const { data: lots = [] } = useLots();
  const { data: categories = [] } = useCategories();
  const updateBatch = useUpdateBatch();
  const createBatch = useCreateBatch();
  const deleteBatch = useDeleteBatch();
  const recordBatchInput = useRecordBatchInput();
  const recordBatchOutput = useRecordBatchOutput();
  const { toast } = useToast();

  // Group products by category for dropdown display
  const productsByCategory = categories.map(category => ({
    category,
    products: products.filter(p => p.categoryId === category.id)
  })).filter(group => group.products.length > 0);
  
  // Add uncategorized products
  const uncategorizedProducts = products.filter(p => !p.categoryId);
  
  // Auto-fill batchNumber with SOP batch code when product + date are set and codes are available
  useEffect(() => {
    if (!newBatch.productId || !newBatch.startDate) return;
    const product = products.find(p => p.id === newBatch.productId);
    if (!product?.fruitCode) return;
    const category = categories.find(c => c.id === product.categoryId);
    if (!category?.processCode) return;
    try {
      const date = new Date(newBatch.startDate + 'T00:00:00Z');
      const code = buildBatchCode(product.fruitCode, category.processCode, date);
      setNewBatch(prev => ({ ...prev, batchNumber: code }));
    } catch {
    }
  }, [newBatch.productId, newBatch.startDate, products, categories]);

  const handleCreateBatch = async () => {
    if (!newBatch.batchNumber || !newBatch.productId) {
      toast({ title: "Missing fields", description: "Please fill in batch number and product", variant: "destructive" });
      return;
    }
    try {
      const payload: Partial<Batch> = {
        batchNumber: newBatch.batchNumber,
        productId: newBatch.productId,
        plannedQuantity: "0",
        status: 'in_progress',
        startDate: newBatch.startDate || null,
      };
      if (newBatch.recipeId) payload.recipeId = newBatch.recipeId;
      const created = await createBatch.mutateAsync(payload);
      toast({
        title: "Batch created",
        description: created.batchCode
          ? `Batch Code: ${created.batchCode}`
          : `Batch ${created.batchNumber} created successfully`,
      });
      setIsCreateDialogOpen(false);
      setNewBatch({ batchNumber: '', productId: '', recipeId: '', startDate: format(new Date(), 'yyyy-MM-dd') });
    } catch (error) {
      toast({ title: "Error", description: "Failed to create batch", variant: "destructive" });
    }
  };

  const handleEditClick = (batch: Batch) => {
    setSelectedBatch(batch);
    setEditForm({
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
    setRecordInputForm({ inputType: 'material', materialId: '', productId: '', quantity: '', lotId: '' });
    setBarcodeInput('');
    setScannedLot(null);
    setBarcodeError('');
    setIsRecordInputOpen(true);
  };

  const handleBarcodeLookup = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setIsLookingUpBarcode(true);
    setBarcodeError('');
    setScannedLot(null);
    try {
      const lot = await fetchLotByBarcode(trimmed);
      if (lot.status !== 'active') {
        const statusMessages: Record<string, string> = {
          consumed: 'This lot has been fully consumed and cannot be used.',
          quarantined: 'This lot is quarantined — it cannot be used for production.',
          expired: 'This lot has expired and cannot be used for production.',
          released: 'This lot has been released and is no longer available for production.',
        };
        setBarcodeError(statusMessages[lot.status ?? ''] || `Lot status is "${lot.status}" — only active lots can be consumed.`);
        return;
      }
      setScannedLot(lot);
      setRecordInputForm(prev => ({
        ...prev,
        materialId: lot.materialId || prev.materialId,
        lotId: lot.id,
        quantity: '',
      }));
    } catch {
      setBarcodeError('Lot not found. Try a different barcode value, lot number (e.g. RM-260413-0001), or supplier batch ID.');
    } finally {
      setIsLookingUpBarcode(false);
    }
  };

  const handleAddOutputClick = (batch: Batch) => {
    setSelectedBatch(batch);
    setIsAddOutputOpen(true);
  };

  const handleRecordInput = async () => {
    if (!selectedBatch) return;

    const { inputType, materialId, productId, quantity, lotId } = recordInputForm;

    if (!quantity) {
      toast({ title: "Missing quantity", description: "Please enter quantity", variant: "destructive" });
      return;
    }

    if (inputType === 'material') {
      if (!scannedLot && !lotId) {
        const msg = 'Scan or type a barcode/lot number to identify the input lot before submitting.';
        setBarcodeError(msg);
        toast({ title: "No lot scanned", description: msg, variant: "destructive" });
        return;
      }
      const availableQty = parseFloat(scannedLot?.remainingQuantity || '0');
      const consumeQty = parseFloat(quantity);
      if (consumeQty > availableQty) {
        const msg = `Quantity exceeds available lot stock. Only ${availableQty.toFixed(2)} available in lot ${scannedLot?.lotNumber}.`;
        setBarcodeError(msg);
        toast({ title: "Insufficient lot quantity", description: msg, variant: "destructive" });
        return;
      }
    }

    if (inputType === 'product' && !productId) {
      toast({ title: "Missing product", description: "Please select a product", variant: "destructive" });
      return;
    }

    try {
      if (inputType === 'material') {
        await recordBatchInput.mutateAsync({
          batchId: selectedBatch.id,
          materialId: scannedLot?.materialId || materialId,
          quantity,
          lotId: lotId || scannedLot?.id,
        });
        toast({ title: "Input recorded", description: `Lot ${scannedLot?.lotNumber} consumed — deducted from inventory` });
      } else {
        await recordBatchInput.mutateAsync({
          batchId: selectedBatch.id,
          productId,
          quantity,
        });
        toast({ title: "Input recorded", description: "Product has been added to batch and deducted from inventory" });
      }
      setRecordInputForm({ inputType: 'material', materialId: '', productId: '', quantity: '', lotId: '' });
      setBarcodeInput('');
      setScannedLot(null);
      setBarcodeError('');
      setTimeout(() => barcodeScanRef.current?.focus(), 50);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to record input';
      setBarcodeError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
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

  // Compute SOP batch code preview for the create dialog
  const batchCodePreview = (() => {
    if (!newBatch.productId || !newBatch.startDate) return null;
    const product = products.find(p => p.id === newBatch.productId);
    if (!product?.fruitCode) return null;
    const category = categories.find(c => c.id === product.categoryId);
    if (!category?.processCode) return null;
    try {
      const date = new Date(newBatch.startDate + 'T00:00:00Z');
      return buildBatchCode(product.fruitCode, category.processCode, date);
    } catch {
      return null;
    }
  })();

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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-mono" data-testid="text-production-title">Production Control</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage batches, record inputs and outputs.</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={canManageBatches ? setIsCreateDialogOpen : undefined}>
          {canManageBatches && (
            <DialogTrigger asChild>
              <Button size="lg" className="font-mono" data-testid="button-create-batch">
                <Plus size={16} className="mr-2" /> Create New Batch
              </Button>
            </DialogTrigger>
          )}
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Batch</DialogTitle>
              <DialogDescription>Start a new production batch</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="batchNumber">Batch Number *</Label>
                <Input
                  id="batchNumber"
                  placeholder="e.g. SW3260132 or BATCH-001"
                  value={newBatch.batchNumber}
                  onChange={(e) => setNewBatch({ ...newBatch, batchNumber: e.target.value })}
                  data-testid="input-batch-number"
                />
                {batchCodePreview ? (
                  <div className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2 text-xs">
                    <span className="text-muted-foreground">SOP Batch Code: </span>
                    <span className="font-mono font-bold text-primary" data-testid="text-batch-code-preview">{batchCodePreview}</span>
                    <span className="text-muted-foreground ml-1">(auto-filled)</span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Set a Fruit Code on the product and a Process Code on its category to auto-generate SOP codes.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="product">Product *</Label>
                <Popover open={createProductSearchOpen} onOpenChange={setCreateProductSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={createProductSearchOpen}
                      className="w-full justify-between font-normal"
                      data-testid="select-product"
                    >
                      {newBatch.productId
                        ? products.find(p => p.id === newBatch.productId)?.name || "Select product..."
                        : "Search products..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search products..." />
                      <CommandList>
                        <CommandEmpty>No product found.</CommandEmpty>
                        {productsByCategory.map(({ category, products: categoryProducts }) => (
                          <CommandGroup key={category.id} heading={category.name}>
                            {categoryProducts.map(product => (
                              <CommandItem
                                key={product.id}
                                value={`${category.name} ${product.sku} ${product.name}`}
                                onSelect={() => {
                                  setNewBatch({ ...newBatch, productId: product.id });
                                  setCreateProductSearchOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", newBatch.productId === product.id ? "opacity-100" : "opacity-0")} />
                                {product.sku ? `${product.sku} - ` : ''}{product.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        ))}
                        {uncategorizedProducts.length > 0 && (
                          <CommandGroup heading="Uncategorized">
                            {uncategorizedProducts.map(product => (
                              <CommandItem
                                key={product.id}
                                value={`Uncategorized ${product.sku} ${product.name}`}
                                onSelect={() => {
                                  setNewBatch({ ...newBatch, productId: product.id });
                                  setCreateProductSearchOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", newBatch.productId === product.id ? "opacity-100" : "opacity-0")} />
                                {product.sku ? `${product.sku} - ` : ''}{product.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
                <Label htmlFor="startDate">Batch Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={newBatch.startDate}
                  onChange={(e) => setNewBatch({ ...newBatch, startDate: e.target.value })}
                  data-testid="input-batch-date"
                />
                <p className="text-xs text-muted-foreground">Defaults to today. Change if recording a previous day's batch.</p>
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
            onAddOutputClick={handleAddOutputClick}
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
        <DialogContent className="w-full sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Batch {selectedBatch?.batchNumber}</DialogTitle>
            <DialogDescription>Update batch details and manage material inputs</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Output Breakdown (KG)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      <Dialog open={isRecordInputOpen} onOpenChange={(open) => {
        if (!open) {
          setIsRecordInputOpen(false);
          setBarcodeInput('');
          setScannedLot(null);
          setBarcodeError('');
        }
      }}>
        <DialogContent className="w-full sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Input for {selectedBatch?.batchNumber}</DialogTitle>
            <DialogDescription>Add raw materials or finished products used in production. This will deduct from inventory.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Input Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={recordInputForm.inputType === 'material' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => {
                    setRecordInputForm({ inputType: 'material', materialId: '', productId: '', quantity: '', lotId: '' });
                    setBarcodeInput('');
                    setScannedLot(null);
                    setBarcodeError('');
                  }}
                  data-testid="button-input-type-material"
                >
                  Raw Material
                </Button>
                <Button
                  type="button"
                  variant={recordInputForm.inputType === 'product' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => {
                    setRecordInputForm({ inputType: 'product', materialId: '', productId: '', quantity: '', lotId: '' });
                    setBarcodeInput('');
                    setScannedLot(null);
                    setBarcodeError('');
                  }}
                  data-testid="button-input-type-product"
                >
                  Finished Product
                </Button>
              </div>
            </div>

            {recordInputForm.inputType === 'material' ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="barcode-scan">Scan / Type Barcode or Lot Number *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="barcode-scan"
                      ref={barcodeScanRef}
                      autoFocus
                      placeholder="Scan barcode or type lot number..."
                      value={barcodeInput}
                      onChange={(e) => {
                        setBarcodeInput(e.target.value);
                        setBarcodeError('');
                        if (scannedLot) { setScannedLot(null); setRecordInputForm(f => ({ ...f, lotId: '', materialId: '' })); }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleBarcodeLookup(barcodeInput); }
                      }}
                      data-testid="input-barcode-scan"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isLookingUpBarcode || !barcodeInput.trim()}
                      onClick={() => handleBarcodeLookup(barcodeInput)}
                      data-testid="button-lookup-barcode"
                    >
                      {isLookingUpBarcode ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Look up'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Press Enter or click "Look up" after scanning. Supports barcode values and lot numbers (e.g. RM-260413-0001).</p>
                </div>

                {barcodeError && (
                  <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-barcode-error">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{barcodeError}</span>
                  </div>
                )}

                {scannedLot && (
                  <div className="bg-muted rounded-lg p-3 space-y-1.5" data-testid="card-scanned-lot">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">{scannedLot.materialName || scannedLot.productName || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground font-mono">{scannedLot.lotNumber}</div>
                      </div>
                      <Badge className={scannedLot.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                        {scannedLot.status}
                      </Badge>
                    </div>
                    <div className="text-sm grid grid-cols-2 gap-x-4 gap-y-1 pt-1 border-t">
                      <div className="text-muted-foreground">Available</div>
                      <div className="font-mono font-medium">{parseFloat(scannedLot.remainingQuantity || '0').toFixed(2)} {scannedLot.materialUnit || scannedLot.productUnit || 'KG'}</div>
                      {scannedLot.supplierName && <><div className="text-muted-foreground">Source</div><div>{scannedLot.supplierName}</div></>}
                      {scannedLot.expiryDate && <><div className="text-muted-foreground">Expires</div><div>{new Date(scannedLot.expiryDate).toLocaleDateString()}</div></>}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="input-product">Product *</Label>
                <Popover open={inputProductSearchOpen} onOpenChange={setInputProductSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={inputProductSearchOpen}
                      className="w-full justify-between font-normal"
                      data-testid="select-input-product"
                    >
                      {recordInputForm.productId
                        ? products.find(p => p.id === recordInputForm.productId)?.name || "Select product..."
                        : "Search products..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search products..." />
                      <CommandList>
                        <CommandEmpty>No product found.</CommandEmpty>
                        {categories.filter(c => !c.excludeFromYield).map(category => {
                          const categoryProducts = products.filter(p => p.categoryId === category.id && parseFloat(p.currentStock || '0') > 0);
                          if (categoryProducts.length === 0) return null;
                          return (
                            <CommandGroup key={category.id} heading={category.name}>
                              {categoryProducts.map(product => (
                                <CommandItem
                                  key={product.id}
                                  value={`${product.sku} ${product.name}`}
                                  onSelect={() => {
                                    setRecordInputForm({ ...recordInputForm, productId: product.id });
                                    setInputProductSearchOpen(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", recordInputForm.productId === product.id ? "opacity-100" : "opacity-0")} />
                                  {product.sku ? `${product.sku} - ` : ''}{product.name} ({product.currentStock} {product.unit})
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          );
                        })}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {recordInputForm.productId && (
                  <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                    Available: <span className="font-mono font-medium">{products.find(p => p.id === recordInputForm.productId)?.currentStock || '0'} {products.find(p => p.id === recordInputForm.productId)?.unit || 'KG'}</span>
                    <p className="text-xs mt-1">This product will be tracked for full chain traceability.</p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="input-quantity">
                Quantity to consume *
                {scannedLot && (
                  <span className="text-xs text-muted-foreground ml-2">(max: {parseFloat(scannedLot.remainingQuantity || '0').toFixed(2)} {scannedLot.materialUnit || 'KG'})</span>
                )}
              </Label>
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
            <Button variant="outline" onClick={() => { setIsRecordInputOpen(false); setBarcodeInput(''); setScannedLot(null); setBarcodeError(''); }}>Close</Button>
            <Button onClick={handleRecordInput} disabled={recordBatchInput.isPending} data-testid="button-add-input">
              {recordBatchInput.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add to Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRecordOutputOpen} onOpenChange={setIsRecordOutputOpen}>
        <DialogContent className="w-full sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedBatch?.status === 'completed'
                ? `Print Output Labels — ${selectedBatch?.batchNumber}`
                : `Manage Outputs for ${selectedBatch?.batchNumber}`}
            </DialogTitle>
            <DialogDescription>
              {selectedBatch?.status === 'completed'
                ? 'Print or reprint barcode labels for the finished-good lots produced in this batch.'
                : 'Add multiple product outputs from this batch. Each output will be added to product inventory.'}
            </DialogDescription>
          </DialogHeader>
          {selectedBatch && (
            <BatchOutputsEditor
              batchId={selectedBatch.id}
              isCompleted={selectedBatch.status === 'completed'}
              wasteQuantity={selectedBatch.wasteQuantity || '0'}
              millingQuantity={selectedBatch.millingQuantity || '0'}
              wetQuantity={selectedBatch.wetQuantity || '0'}
              onClose={() => setIsRecordOutputOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAddOutputOpen} onOpenChange={setIsAddOutputOpen}>
        <DialogContent className="w-full sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Output for {selectedBatch?.batchNumber}</DialogTitle>
            <DialogDescription>Record finished products from this batch. Each output will be added to inventory.</DialogDescription>
          </DialogHeader>
          {selectedBatch && (
            <BatchOutputsEditor
              batchId={selectedBatch.id}
              isCompleted={selectedBatch.status === 'completed'}
              wasteQuantity={selectedBatch.wasteQuantity || '0'}
              millingQuantity={selectedBatch.millingQuantity || '0'}
              wetQuantity={selectedBatch.wetQuantity || '0'}
              onClose={() => setIsAddOutputOpen(false)}
            />
          )}
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
  onAddOutputClick,
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
  onAddOutputClick: (batch: Batch) => void;
  onMarkComplete: (batch: Batch) => void;
  onDeleteClick: (batch: Batch) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const product = products.find(p => p.id === batch.productId);
  const isCompleted = batch.status === 'completed';
  const { canManageBatches } = useRole();
  
  const { data: batchMaterials = [] } = useBatchMaterials(batch.id);
  const { data: batchOutputs = [] } = useBatchOutputs(batch.id);
  const { data: categories = [] } = useCategories();
  
  const totalInputKg = batchMaterials.reduce((sum, bm) => sum + (parseFloat(bm.quantity) || 0), 0);
  const totalOutputKg = batchOutputs.reduce((sum, bo) => sum + (parseFloat(bo.quantity) || 0), 0);
  const nonPowderOutputKg = batchOutputs.reduce((sum, bo) => {
    const outputProduct = products.find(p => p.id === bo.productId);
    const category = outputProduct?.categoryId ? categories.find(c => c.id === outputProduct.categoryId) : null;
    // If no category or category doesn't exclude from yield, include in yield calculation
    if (category?.excludeFromYield) return sum;
    return sum + (parseFloat(bo.quantity) || 0);
  }, 0);
  const waste = batch.wasteQuantity ? parseFloat(batch.wasteQuantity) : 0;
  const milling = batch.millingQuantity ? parseFloat(batch.millingQuantity) : 0;
  const wet = batch.wetQuantity ? parseFloat(batch.wetQuantity) : 0;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={`overflow-hidden border-l-4 transition-all ${isCompleted ? 'border-l-green-500 bg-green-50/30' : 'border-l-blue-500'}`} data-testid={`card-batch-${batch.id}`}>
        <CollapsibleTrigger asChild>
          <div className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown size={18} className="text-muted-foreground" /> : <ChevronRight size={18} className="text-muted-foreground" />}
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <div>
                    <div className="font-mono font-bold text-sm">{batch.batchNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      {batch.startDate ? format(new Date(batch.startDate), 'MMM d, yyyy') : format(new Date(batch.createdAt), 'MMM d')}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-sm">{product?.name || 'Unknown'}</div>
                    <div className="text-xs text-muted-foreground font-mono">{product?.sku}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-mono">
                      <span className="text-blue-600 font-medium">{totalInputKg.toFixed(1)}</span>
                      <span className="text-muted-foreground mx-1">→</span>
                      <span className="text-green-600 font-medium">{totalOutputKg.toFixed(1)}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">Input → Output (KG)</div>
                  </div>
                  <div className="text-center">
                    <Badge variant="outline" className={`font-mono uppercase text-[10px] ${isCompleted ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                      {isCompleted ? 'Completed' : 'In Progress'}
                    </Badge>
                  </div>
                  <div className="text-right">
                    {totalInputKg > 0 ? (
                      (() => {
                        const yieldPct = (nonPowderOutputKg / totalInputKg) * 100;
                        const yieldWithWetPct = ((nonPowderOutputKg + wet) / totalInputKg) * 100;
                        const colorClass = yieldPct >= 12 ? 'text-green-600' : yieldPct >= 8 ? 'text-amber-500' : 'text-red-500';
                        return (
                          <div>
                            <div className="flex items-center justify-end gap-1">
                              <span className={`font-mono font-bold ${colorClass}`}>
                                {yieldPct.toFixed(1)}%
                              </span>
                              {wet > 0 && (
                                <span className="font-mono text-gray-400" title="Yield including wet (redry)">
                                  ({yieldWithWetPct.toFixed(1)}%)
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {wet > 0 ? 'Yield (with wet)' : 'Yield'}
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 ml-4" onClick={(e) => e.stopPropagation()}>
                {isCompleted && canManageBatches && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-green-600"
                    onClick={() => onRecordOutputClick(batch)}
                    title="Print Output Labels"
                    data-testid={`button-print-labels-${batch.id}`}
                  >
                    <Printer size={16} />
                  </Button>
                )}
                {!isCompleted && canManageBatches && (
                  <>
                    <Button size="icon" variant="ghost" onClick={() => onRecordInputClick(batch)} title="Record Input" data-testid={`button-input-${batch.id}`}>
                      <Package size={16} />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-green-600" onClick={() => onAddOutputClick(batch)} title="Add Output" data-testid={`button-add-output-${batch.id}`}>
                      <ArrowDownCircle size={16} />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-green-600" onClick={() => onMarkComplete(batch)} title="Complete" data-testid={`button-complete-${batch.id}`}>
                      <CheckCircle size={16} />
                    </Button>
                  </>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid={`button-batch-actions-${batch.id}`}>
                      <MoreHorizontal size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <Link href={`/batches/${batch.id}`}>
                      <DropdownMenuItem data-testid={`button-view-batch-${batch.id}`}>
                        <ExternalLink size={14} className="mr-2" /> View Detail
                      </DropdownMenuItem>
                    </Link>
                    {canManageBatches && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEditClick(batch)} data-testid={`button-edit-batch-${batch.id}`}>
                          <Pencil size={14} className="mr-2" /> Edit Batch
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onRecordInputClick(batch)} data-testid={`menu-record-input-${batch.id}`}>
                          <Package size={14} className="mr-2" /> Record Input
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onRecordOutputClick(batch)} data-testid={`button-record-${batch.id}`}>
                          {isCompleted
                            ? <><Printer size={14} className="mr-2" /> Print Output Labels</>
                            : <><Scale size={14} className="mr-2" /> Manage Outputs</>
                          }
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => onDeleteClick(batch)} data-testid={`button-delete-batch-${batch.id}`}>
                          <Trash2 size={14} className="mr-2" /> Delete Batch
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 border-t bg-muted/20">
            <div className="grid md:grid-cols-2 gap-6 pt-4">
              <div>
                <h4 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Package size={14} /> Inputs Used
                </h4>
                {batchMaterials.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No inputs recorded</p>
                ) : (
                  <div className="space-y-2">
                    {batchMaterials.map((bm) => {
                      const material = materials.find(m => m.id === bm.materialId);
                      return (
                        <div key={bm.id} className="flex items-center justify-between p-2 bg-background rounded border text-sm" data-testid={`batch-material-${bm.id}`}>
                          <div>
                            <span className="font-medium">{material?.name || 'Unknown'}</span>
                            <span className="text-muted-foreground text-xs ml-2">({material?.sku})</span>
                          </div>
                          <span className="font-mono text-blue-600">{parseFloat(bm.quantity).toFixed(2)} KG</span>
                        </div>
                      );
                    })}
                    <div className="flex justify-between pt-2 border-t text-sm font-medium">
                      <span>Total Input</span>
                      <span className="font-mono text-blue-600">{totalInputKg.toFixed(2)} KG</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <h4 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <ArrowDownCircle size={14} /> Outputs Created
                </h4>
                {batchOutputs.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No outputs recorded</p>
                ) : (
                  <div className="space-y-2">
                    {batchOutputs.map((bo) => {
                      const outputProduct = products.find(p => p.id === bo.productId);
                      return (
                        <div key={bo.id} className="flex items-center justify-between p-2 bg-background rounded border text-sm" data-testid={`batch-output-${bo.id}`}>
                          <div>
                            <span className="font-medium">{outputProduct?.name || 'Unknown'}</span>
                            <span className="text-muted-foreground text-xs ml-2">({outputProduct?.sku})</span>
                          </div>
                          <span className="font-mono text-green-600">{parseFloat(bo.quantity).toFixed(2)} KG</span>
                        </div>
                      );
                    })}
                    <div className="flex justify-between pt-2 border-t text-sm font-medium">
                      <span>Total Output</span>
                      <span className="font-mono text-green-600">{totalOutputKg.toFixed(2)} KG</span>
                    </div>
                  </div>
                )}
                
                {(waste > 0 || milling > 0 || wet > 0) && (
                  <div className="mt-4 pt-3 border-t space-y-1">
                    {waste > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Waste</span>
                        <span className="font-mono text-red-500">{waste.toFixed(2)} KG</span>
                      </div>
                    )}
                    {milling > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Milling</span>
                        <span className="font-mono text-amber-500">{milling.toFixed(2)} KG</span>
                      </div>
                    )}
                    {wet > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Wet (Redry)</span>
                        <span className="font-mono text-blue-500">{wet.toFixed(2)} KG</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {batch.notes && (
              <div className="mt-4 pt-3 border-t">
                <span className="text-xs text-muted-foreground">Notes: </span>
                <span className="text-sm">{batch.notes}</span>
              </div>
            )}
            
            <div className="mt-4 pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                {batch.startDate && <span>Batch Date: {format(new Date(batch.startDate), 'MMM d, yyyy')}</span>}
                {batch.endDate && <span>Completed: {format(new Date(batch.endDate), 'MMM d, yyyy HH:mm')}</span>}
              </div>
              {isCompleted && canManageBatches ? (
                <Button size="sm" variant="outline" className="text-green-600 border-green-200" onClick={() => onRecordOutputClick(batch)} data-testid={`button-print-labels-expanded-${batch.id}`}>
                  <Printer size={14} className="mr-1 sm:mr-2" /> Print Output Labels
                </Button>
              ) : !isCompleted ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => onRecordInputClick(batch)}>
                    <Package size={14} className="mr-1 sm:mr-2" /> <span className="hidden sm:inline">Add </span>Input
                  </Button>
                  <Button size="sm" variant="outline" className="text-green-600 border-green-200" onClick={() => onAddOutputClick(batch)}>
                    <ArrowDownCircle size={14} className="mr-1 sm:mr-2" /> <span className="hidden sm:inline">Add </span>Output
                  </Button>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onMarkComplete(batch)}>
                    <CheckCircle size={14} className="mr-1 sm:mr-2" /> Complete
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function BatchOutputsEditor({ 
  batchId,
  isCompleted,
  wasteQuantity: initialWaste,
  millingQuantity: initialMilling,
  wetQuantity: initialWet,
  onClose,
}: { 
  batchId: string;
  isCompleted: boolean;
  wasteQuantity: string;
  millingQuantity: string;
  wetQuantity: string;
  onClose: () => void;
}) {
  const [newOutputForm, setNewOutputForm] = useState({ productId: '', quantity: '' });
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [wasteQuantity, setWasteQuantity] = useState(initialWaste);
  const [millingQuantity, setMillingQuantity] = useState(initialMilling);
  const [wetQuantity, setWetQuantity] = useState(initialWet);
  const [markCompleted, setMarkCompleted] = useState(false);
  const [finalizeResult, setFinalizeResult] = useState<FinalizeResult | null>(null);
  const markLotPrinted = useMarkBarcodePrinted();
  
  useEffect(() => {
    setWasteQuantity(initialWaste);
    setMillingQuantity(initialMilling);
    setWetQuantity(initialWet);
    setMarkCompleted(false);
  }, [batchId, initialWaste, initialMilling, initialWet]);
  
  const { data: outputs = [], isLoading } = useBatchOutputs(batchId);
  const { data: outputLots = [], isLoading: outputLotsLoading } = useBatchOutputLots(batchId, { enabled: isCompleted });
  const { data: allProducts = [] } = useProducts();
  const { data: allCategories = [] } = useCategories();
  const addBatchOutput = useAddBatchOutput();
  const removeBatchOutput = useRemoveBatchOutput();
  const finalizeBatch = useFinalizeBatch();
  const { toast } = useToast();

  // Group products by category for dropdown display
  const productsByCategory = allCategories.map(category => ({
    category,
    products: allProducts.filter(p => p.categoryId === category.id)
  })).filter(group => group.products.length > 0);
  
  // Add uncategorized products
  const uncategorizedProducts = allProducts.filter(p => !p.categoryId);
  
  const handleAddOutput = async () => {
    if (!newOutputForm.productId || !newOutputForm.quantity) {
      toast({ title: "Missing fields", description: "Please select product and enter quantity", variant: "destructive" });
      return;
    }
    try {
      await addBatchOutput.mutateAsync({
        batchId,
        productId: newOutputForm.productId,
        quantity: newOutputForm.quantity,
      });
      toast({ title: "Output added", description: "Product output has been added to batch and inventory" });
      setNewOutputForm({ productId: '', quantity: '' });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add output", variant: "destructive" });
    }
  };
  
  const handleRemoveOutput = async (outputId: string) => {
    try {
      await removeBatchOutput.mutateAsync(outputId);
      toast({ title: "Output removed", description: "Product output removed and inventory adjusted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to remove output", variant: "destructive" });
    }
  };
  
  const handleFinalize = async () => {
    try {
      const result = await finalizeBatch.mutateAsync({
        batchId,
        wasteQuantity: wasteQuantity || "0",
        millingQuantity: millingQuantity || "0",
        wetQuantity: wetQuantity || "0",
        markCompleted,
      });
      if (markCompleted) {
        setFinalizeResult(result);
      } else {
        toast({ title: "Batch updated", description: "Batch quantities updated" });
        onClose();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to finalize batch", variant: "destructive" });
    }
  };
  
  const totalOutputQuantity = outputs.reduce((sum, o) => sum + parseFloat(o.quantity), 0);

  if (finalizeResult) {
    const completedAt = finalizeResult.batch.endDate
      ? format(new Date(finalizeResult.batch.endDate), 'dd MMM yyyy, h:mm a')
      : format(new Date(), 'dd MMM yyyy, h:mm a');
    return (
      <div className="space-y-4 py-2" data-testid="finalize-completion-summary">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle className="h-5 w-5" />
          <span className="font-semibold">Batch completed successfully</span>
        </div>
        <div className="bg-muted rounded-lg px-4 py-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Batch</span>
            <span className="font-mono font-bold" data-testid="text-finalize-batch-number">{finalizeResult.batch.batchNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Completed</span>
            <span className="font-mono" data-testid="text-finalize-completed-at">{completedAt}</span>
          </div>
        </div>
        {finalizeResult.outputLots.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            Print barcode labels for the finished-good lots produced in this batch.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No output lots were generated for this batch.</p>
        )}
        <div className="space-y-2">
          {finalizeResult.outputLots.map((ol: OutputLot) => (
            <div key={ol.lotId} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 gap-2" data-testid={`summary-output-lot-${ol.lotId}`}>
              <div className="space-y-0.5 min-w-0">
                <div className="font-medium text-sm">{ol.productName || 'Output Lot'}</div>
                <div className="text-xs text-muted-foreground font-mono">{ol.lotNumber}</div>
                {ol.barcodeValue && <div className="text-xs text-muted-foreground font-mono">{ol.barcodeValue}</div>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-sm">{parseFloat(ol.quantity).toFixed(2)} KG</span>
                {ol.barcodeValue && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 px-2"
                    data-testid={`button-print-final-lot-${ol.lotId}`}
                    onClick={() => {
                      printBarcodeLabel({
                        lotNumber: ol.lotNumber,
                        barcodeValue: ol.barcodeValue,
                        itemName: ol.productName || 'Output',
                        quantity: ol.quantity,
                        unit: 'KG',
                        expiryDate: ol.expiryDate,
                      });
                      markLotPrinted.mutate(ol.lotId);
                      setFinalizeResult(prev => prev ? {
                        ...prev,
                        outputLots: prev.outputLots.map(l =>
                          l.lotId === ol.lotId ? { ...l, barcodePrintedAt: new Date().toISOString() } : l
                        )
                      } : null);
                    }}
                  >
                    <Printer className="h-3 w-3 mr-1" />
                    {ol.barcodePrintedAt ? 'Reprint' : 'Print Label'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-2 border-t">
          <Button onClick={onClose} data-testid="button-close-finalize-summary">Done</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4 py-2">
      {!isCompleted && (
        <div className="space-y-4 pb-4 border-b">
          <h4 className="font-medium text-sm">Add Product Output</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="output-product">Product</Label>
              <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={productSearchOpen}
                    className="w-full justify-between font-normal"
                    data-testid="select-output-product"
                  >
                    {newOutputForm.productId
                      ? allProducts.find(p => p.id === newOutputForm.productId)?.name || "Select product..."
                      : "Search products..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search products..." />
                    <CommandList>
                      <CommandEmpty>No product found.</CommandEmpty>
                      {productsByCategory.map(({ category, products: categoryProducts }) => (
                        <CommandGroup key={category.id} heading={category.name}>
                          {categoryProducts.map(product => (
                            <CommandItem
                              key={product.id}
                              value={`${category.name} ${product.sku} ${product.name}`}
                              onSelect={() => {
                                setNewOutputForm({ ...newOutputForm, productId: product.id });
                                setProductSearchOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", newOutputForm.productId === product.id ? "opacity-100" : "opacity-0")} />
                              {product.sku ? `${product.sku} - ` : ''}{product.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ))}
                      {uncategorizedProducts.length > 0 && (
                        <CommandGroup heading="Uncategorized">
                          {uncategorizedProducts.map(product => (
                            <CommandItem
                              key={product.id}
                              value={`Uncategorized ${product.sku} ${product.name}`}
                              onSelect={() => {
                                setNewOutputForm({ ...newOutputForm, productId: product.id });
                                setProductSearchOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", newOutputForm.productId === product.id ? "opacity-100" : "opacity-0")} />
                              {product.sku ? `${product.sku} - ` : ''}{product.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="output-quantity">Quantity (KG)</Label>
              <div className="flex gap-2">
                <Input
                  id="output-quantity"
                  type="number"
                  step="0.01"
                  value={newOutputForm.quantity}
                  onChange={(e) => setNewOutputForm({ ...newOutputForm, quantity: e.target.value })}
                  placeholder="0.00"
                  data-testid="input-output-quantity"
                />
                <Button 
                  onClick={handleAddOutput} 
                  disabled={addBatchOutput.isPending}
                  data-testid="button-add-output"
                >
                  {addBatchOutput.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={16} />}
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {isCompleted ? (
        <div>
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
            <Printer size={14} />
            Output Lot Labels ({outputLots.length})
          </h4>
          {outputLotsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : outputLots.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No output lots found for this batch.</p>
          ) : (
            <div className="space-y-2">
              {outputLots.map((ol: OutputLot) => (
                <div
                  key={ol.lotId}
                  className="flex items-start justify-between p-3 border rounded-lg bg-muted/30 gap-2"
                  data-testid={`output-lot-row-${ol.lotId}`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-medium text-sm">{ol.productName || 'Output'}</div>
                    <div className="font-mono text-xs text-muted-foreground">{ol.lotNumber}</div>
                    {ol.barcodeValue && (
                      <div className="font-mono text-xs text-muted-foreground">{ol.barcodeValue}</div>
                    )}
                    {ol.barcodePrintedAt && (
                      <div className="text-xs text-green-600">Label printed</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-sm">{parseFloat(ol.quantity).toFixed(2)} KG</span>
                    {ol.barcodeValue && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 px-2"
                        data-testid={`button-reprint-lot-${ol.lotId}`}
                        onClick={() => {
                          printBarcodeLabel({
                            lotNumber: ol.lotNumber,
                            barcodeValue: ol.barcodeValue,
                            itemName: ol.productName || 'Output',
                            quantity: ol.quantity,
                            unit: 'KG',
                            expiryDate: ol.expiryDate,
                          });
                          markLotPrinted.mutate(ol.lotId);
                        }}
                      >
                        <Printer className="h-3 w-3 mr-1" />
                        {ol.barcodePrintedAt ? 'Reprint' : 'Print Label'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <h4 className="font-medium text-sm mb-2">Product Outputs ({outputs.length})</h4>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : outputs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No outputs recorded yet</p>
          ) : (
            <div className="space-y-2">
              {outputs.map((output) => {
                const product = allProducts.find(p => p.id === output.productId);
                return (
                  <div
                    key={output.id}
                    className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                    data-testid={`output-row-${output.id}`}
                  >
                    <div>
                      <span className="font-mono text-muted-foreground">{product?.sku}</span>
                      <span className="mx-2">-</span>
                      <span>{product?.name || 'Unknown Product'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{output.quantity} KG</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveOutput(output.id)}
                        disabled={removeBatchOutput.isPending}
                        data-testid={`button-remove-output-${output.id}`}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between items-center pt-2 font-medium text-sm">
                <span>Total Output:</span>
                <span className="font-mono">{totalOutputQuantity.toFixed(2)} KG</span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {!isCompleted && (
        <>
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-sm">Waste, Milling & Wet</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="waste">Waste (KG)</Label>
                <Input
                  id="waste"
                  type="number"
                  step="0.01"
                  value={wasteQuantity}
                  onChange={(e) => setWasteQuantity(e.target.value)}
                  placeholder="0.00"
                  data-testid="input-finalize-waste"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="milling">Milling (KG)</Label>
                <Input
                  id="milling"
                  type="number"
                  step="0.01"
                  value={millingQuantity}
                  onChange={(e) => setMillingQuantity(e.target.value)}
                  placeholder="0.00"
                  data-testid="input-finalize-milling"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wet">Wet (KG)</Label>
                <Input
                  id="wet"
                  type="number"
                  step="0.01"
                  value={wetQuantity}
                  onChange={(e) => setWetQuantity(e.target.value)}
                  placeholder="0.00"
                  data-testid="input-finalize-wet"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="markCompletedFinal"
              checked={markCompleted}
              onCheckedChange={(checked) => setMarkCompleted(!!checked)}
              data-testid="checkbox-finalize-completed"
            />
            <Label htmlFor="markCompletedFinal" className="text-sm font-normal cursor-pointer">
              Mark batch as completed (cannot add more outputs after)
            </Label>
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleFinalize} disabled={finalizeBatch.isPending} data-testid="button-finalize-batch">
              {finalizeBatch.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {markCompleted ? 'Finalize & Complete' : 'Save Changes'}
            </Button>
          </div>
        </>
      )}
      
      {isCompleted && (
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      )}
    </div>
  );
}

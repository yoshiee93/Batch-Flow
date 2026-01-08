import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, Filter, Plus, FileDown, Loader2, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useMaterials, useLots, useCreateMaterial, useUpdateMaterial, useDeleteMaterial, useUpdateLot, useDeleteLot, type Material, type Lot } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditMaterialOpen, setIsEditMaterialOpen] = useState(false);
  const [isEditLotOpen, setIsEditLotOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    unit: 'KG',
    minStock: '0',
    currentStock: '0',
  });
  const [lotFormData, setLotFormData] = useState({
    lotNumber: '',
    supplierLot: '',
    supplierName: '',
    quantity: '',
    remainingQuantity: '',
    expiryDate: '',
    notes: '',
  });

  const { data: materials = [], isLoading: materialsLoading, isError: materialsError } = useMaterials();
  const { data: lots = [], isLoading: lotsLoading, isError: lotsError } = useLots();
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const deleteMaterial = useDeleteMaterial();
  const updateLot = useUpdateLot();
  const deleteLot = useDeleteLot();
  const { toast } = useToast();

  const isLoading = materialsLoading || lotsLoading;
  const hasError = materialsError || lotsError;

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLots = lots.filter(l => 
    l.lotNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.supplierLot?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ sku: '', name: '', description: '', unit: 'KG', minStock: '0', currentStock: '0' });
  };

  const resetLotForm = () => {
    setLotFormData({ lotNumber: '', supplierLot: '', supplierName: '', quantity: '', remainingQuantity: '', expiryDate: '', notes: '' });
  };

  const handleCreateMaterial = async () => {
    if (!formData.sku || !formData.name) {
      toast({ title: "Missing fields", description: "Please fill in SKU and Name", variant: "destructive" });
      return;
    }
    try {
      await createMaterial.mutateAsync({
        sku: formData.sku,
        name: formData.name,
        description: formData.description || null,
        unit: formData.unit,
        minStock: formData.minStock,
        currentStock: formData.currentStock,
        active: true,
      });
      toast({ title: "Material created", description: `Material ${formData.name} created successfully` });
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({ title: "Error", description: "Failed to create material", variant: "destructive" });
    }
  };

  const handleEditMaterialClick = (material: Material) => {
    setSelectedMaterial(material);
    setFormData({
      sku: material.sku,
      name: material.name,
      description: material.description || '',
      unit: material.unit,
      minStock: material.minStock,
      currentStock: material.currentStock,
    });
    setIsEditMaterialOpen(true);
  };

  const handleUpdateMaterial = async () => {
    if (!selectedMaterial || !formData.name) {
      toast({ title: "Missing fields", description: "Please fill in the Name", variant: "destructive" });
      return;
    }
    try {
      await updateMaterial.mutateAsync({
        id: selectedMaterial.id,
        name: formData.name,
        description: formData.description || null,
        minStock: formData.minStock,
        currentStock: formData.currentStock,
      });
      toast({ title: "Material updated", description: `Material ${formData.name} updated successfully` });
      setIsEditMaterialOpen(false);
      setSelectedMaterial(null);
      resetForm();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update material", variant: "destructive" });
    }
  };

  const handleDeleteMaterial = async (material: Material) => {
    try {
      await deleteMaterial.mutateAsync(material.id);
      toast({ title: "Material deleted", description: `Material ${material.name} has been removed` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete material", variant: "destructive" });
    }
  };

  const handleEditLotClick = (lot: Lot) => {
    setSelectedLot(lot);
    setLotFormData({
      lotNumber: lot.lotNumber,
      supplierLot: lot.supplierLot || '',
      supplierName: lot.supplierName || '',
      quantity: lot.quantity,
      remainingQuantity: lot.remainingQuantity,
      expiryDate: lot.expiryDate ? lot.expiryDate.split('T')[0] : '',
      notes: lot.notes || '',
    });
    setIsEditLotOpen(true);
  };

  const handleUpdateLot = async () => {
    if (!selectedLot) return;
    try {
      await updateLot.mutateAsync({
        id: selectedLot.id,
        supplierLot: lotFormData.supplierLot || null,
        supplierName: lotFormData.supplierName || null,
        remainingQuantity: lotFormData.remainingQuantity,
        expiryDate: lotFormData.expiryDate ? new Date(lotFormData.expiryDate).toISOString() : null,
        notes: lotFormData.notes || null,
      });
      toast({ title: "Lot updated", description: `Lot ${selectedLot.lotNumber} updated successfully` });
      setIsEditLotOpen(false);
      setSelectedLot(null);
      resetLotForm();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update lot", variant: "destructive" });
    }
  };

  const handleDeleteLot = async (lot: Lot) => {
    try {
      await deleteLot.mutateAsync(lot.id);
      toast({ title: "Lot deleted", description: `Lot ${lot.lotNumber} has been removed` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete lot", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load inventory</h2>
        <p className="text-muted-foreground mb-4">There was an error loading the inventory data. Please try refreshing the page.</p>
        <Button onClick={() => window.location.reload()}>Refresh Page</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono" data-testid="text-inventory-title">Inventory Management</h1>
          <p className="text-muted-foreground mt-1">Manage raw materials and track lot expiry.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-export">
            <FileDown size={16} className="mr-2" /> Export
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-receive-material">
                <Plus size={16} className="mr-2" /> Add Material
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Material</DialogTitle>
                <DialogDescription>Create a new raw material</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    placeholder="e.g. RM-007"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    data-testid="input-material-sku"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Material Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Sodium Carbonate"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    data-testid="input-material-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Optional description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    data-testid="input-material-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    placeholder="KG"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    data-testid="input-material-unit"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentStock">Current Stock</Label>
                    <Input
                      id="currentStock"
                      type="number"
                      value={formData.currentStock}
                      onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                      data-testid="input-material-current-stock"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minStock">Min Stock</Label>
                    <Input
                      id="minStock"
                      type="number"
                      value={formData.minStock}
                      onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                      data-testid="input-material-min-stock"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateMaterial} disabled={createMaterial.isPending} data-testid="button-submit-material">
                  {createMaterial.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Material
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center space-x-2 bg-card p-2 rounded-md border">
        <Search className="w-4 h-4 text-muted-foreground ml-2" />
        <Input 
          placeholder="Search by SKU, Name, or Lot Number..." 
          className="border-none shadow-none focus-visible:ring-0"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="input-search-inventory"
        />
        <Button variant="ghost" size="icon" data-testid="button-filter-inventory">
          <Filter size={16} />
        </Button>
      </div>

      <Tabs defaultValue="materials">
        <TabsList>
          <TabsTrigger value="materials" data-testid="tab-materials">Raw Materials</TabsTrigger>
          <TabsTrigger value="lots" data-testid="tab-lots">Lot Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="materials" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Min Stock</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.map((material) => {
                  const current = parseFloat(material.currentStock);
                  const min = parseFloat(material.minStock);
                  const isLow = current <= min;
                  return (
                    <TableRow key={material.id} data-testid={`row-material-${material.id}`}>
                      <TableCell className="font-mono font-medium">{material.sku}</TableCell>
                      <TableCell>{material.name}</TableCell>
                      <TableCell className="text-right font-mono">
                        {current.toFixed(0)} <span className="text-xs text-muted-foreground">{material.unit}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {min.toFixed(0)} {material.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {isLow ? (
                          <Badge variant="destructive" className="uppercase text-[10px]">Low Stock</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 uppercase text-[10px]">OK</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEditMaterialClick(material)}
                            data-testid={`button-edit-material-${material.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid={`button-delete-material-${material.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Material</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {material.name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteMaterial(material)} data-testid="button-confirm-delete-material">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredMaterials.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No materials found. Click "Add Material" to add your first material.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="lots" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lot Number</TableHead>
                  <TableHead>Supplier Lot</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-right">Expiry</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLots.map((lot) => {
                  const material = materials.find(m => m.id === lot.materialId);
                  const isExpiringSoon = lot.expiryDate && new Date(lot.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                  return (
                    <TableRow key={lot.id} data-testid={`row-lot-${lot.id}`}>
                      <TableCell className="font-mono font-medium">{lot.lotNumber}</TableCell>
                      <TableCell className="font-mono text-xs">{lot.supplierLot || '-'}</TableCell>
                      <TableCell>{lot.supplierName || '-'}</TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(lot.quantity).toFixed(0)} <span className="text-xs text-muted-foreground">{material?.unit || 'KG'}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(lot.remainingQuantity).toFixed(0)} <span className="text-xs text-muted-foreground">{material?.unit || 'KG'}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {lot.expiryDate ? (
                          <span className={`font-mono text-sm ${isExpiringSoon ? 'text-amber-600 font-medium' : ''}`}>
                            {format(new Date(lot.expiryDate), 'MMM d, yyyy')}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEditLotClick(lot)}
                            data-testid={`button-edit-lot-${lot.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid={`button-delete-lot-${lot.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Lot</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete lot {lot.lotNumber}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteLot(lot)} data-testid="button-confirm-delete-lot">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredLots.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No lots found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditMaterialOpen} onOpenChange={setIsEditMaterialOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Material</DialogTitle>
            <DialogDescription>Update material details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input value={formData.sku} disabled className="bg-muted font-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Material Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-edit-material-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="input-edit-material-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-currentStock">Current Stock</Label>
                <Input
                  id="edit-currentStock"
                  type="number"
                  value={formData.currentStock}
                  onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                  data-testid="input-edit-material-current-stock"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-minStock">Min Stock</Label>
                <Input
                  id="edit-minStock"
                  type="number"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                  data-testid="input-edit-material-min-stock"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditMaterialOpen(false); setSelectedMaterial(null); resetForm(); }}>Cancel</Button>
            <Button onClick={handleUpdateMaterial} disabled={updateMaterial.isPending} data-testid="button-update-material">
              {updateMaterial.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditLotOpen} onOpenChange={setIsEditLotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lot</DialogTitle>
            <DialogDescription>Update lot details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Lot Number</Label>
              <Input value={lotFormData.lotNumber} disabled className="bg-muted font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-supplierLot">Supplier Lot</Label>
                <Input
                  id="edit-supplierLot"
                  value={lotFormData.supplierLot}
                  onChange={(e) => setLotFormData({ ...lotFormData, supplierLot: e.target.value })}
                  data-testid="input-edit-supplier-lot"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-supplierName">Supplier Name</Label>
                <Input
                  id="edit-supplierName"
                  value={lotFormData.supplierName}
                  onChange={(e) => setLotFormData({ ...lotFormData, supplierName: e.target.value })}
                  data-testid="input-edit-supplier-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-remainingQty">Remaining Quantity</Label>
              <Input
                id="edit-remainingQty"
                type="number"
                value={lotFormData.remainingQuantity}
                onChange={(e) => setLotFormData({ ...lotFormData, remainingQuantity: e.target.value })}
                data-testid="input-edit-remaining-quantity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-expiryDate">Expiry Date</Label>
              <Input
                id="edit-expiryDate"
                type="date"
                value={lotFormData.expiryDate}
                onChange={(e) => setLotFormData({ ...lotFormData, expiryDate: e.target.value })}
                data-testid="input-edit-expiry-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Input
                id="edit-notes"
                value={lotFormData.notes}
                onChange={(e) => setLotFormData({ ...lotFormData, notes: e.target.value })}
                placeholder="Optional notes..."
                data-testid="input-edit-lot-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditLotOpen(false); setSelectedLot(null); resetLotForm(); }}>Cancel</Button>
            <Button onClick={handleUpdateLot} disabled={updateLot.isPending} data-testid="button-update-lot">
              {updateLot.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
import { Search, Plus, Loader2, AlertCircle, Pencil, Trash2, Package, Box, FileText, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { 
  useMaterials, useLots, useProducts, useRecipes, useRecipeItems,
  useCreateMaterial, useUpdateMaterial, useDeleteMaterial, 
  useCreateProduct, useUpdateProduct, useDeleteProduct,
  useUpdateLot, useDeleteLot, 
  type Material, type Lot, type Product 
} from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('materials');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Material state
  const [isCreateMaterialOpen, setIsCreateMaterialOpen] = useState(false);
  const [isEditMaterialOpen, setIsEditMaterialOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [materialForm, setMaterialForm] = useState({
    sku: '', name: '', description: '', unit: 'KG', minStock: '0', currentStock: '0',
  });
  
  // Product state
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    sku: '', name: '', description: '', minStock: '0', currentStock: '0',
  });
  
  // Lot state
  const [isEditLotOpen, setIsEditLotOpen] = useState(false);
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
  const [lotForm, setLotForm] = useState({
    lotNumber: '', supplierLot: '', supplierName: '', quantity: '', remainingQuantity: '', expiryDate: '', notes: '',
  });

  const { data: materials = [], isLoading: materialsLoading, isError: materialsError } = useMaterials();
  const { data: products = [], isLoading: productsLoading, isError: productsError } = useProducts();
  const { data: lots = [], isLoading: lotsLoading, isError: lotsError } = useLots();
  const { data: recipes = [] } = useRecipes();
  
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const deleteMaterial = useDeleteMaterial();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const updateLot = useUpdateLot();
  const deleteLot = useDeleteLot();
  const { toast } = useToast();

  const isLoading = materialsLoading || productsLoading || lotsLoading;
  const hasError = materialsError || productsError || lotsError;

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLots = lots.filter(l => 
    l.lotNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.supplierLot?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Material handlers
  const resetMaterialForm = () => setMaterialForm({ sku: '', name: '', description: '', unit: 'KG', minStock: '0', currentStock: '0' });

  const handleCreateMaterial = async () => {
    if (!materialForm.sku || !materialForm.name) {
      toast({ title: "Missing fields", description: "Please fill in SKU and Name", variant: "destructive" });
      return;
    }
    try {
      await createMaterial.mutateAsync({
        sku: materialForm.sku, name: materialForm.name, description: materialForm.description || null,
        unit: materialForm.unit, minStock: materialForm.minStock, currentStock: materialForm.currentStock, active: true,
      });
      toast({ title: "Material created", description: `Material ${materialForm.name} created successfully` });
      setIsCreateMaterialOpen(false);
      resetMaterialForm();
    } catch (error) {
      toast({ title: "Error", description: "Failed to create material", variant: "destructive" });
    }
  };

  const handleEditMaterialClick = (material: Material) => {
    setSelectedMaterial(material);
    setMaterialForm({
      sku: material.sku, name: material.name, description: material.description || '',
      unit: material.unit, minStock: material.minStock, currentStock: material.currentStock,
    });
    setIsEditMaterialOpen(true);
  };

  const handleUpdateMaterial = async () => {
    if (!selectedMaterial || !materialForm.name) return;
    try {
      await updateMaterial.mutateAsync({
        id: selectedMaterial.id, name: materialForm.name, description: materialForm.description || null,
        minStock: materialForm.minStock, currentStock: materialForm.currentStock,
      });
      toast({ title: "Material updated", description: `Material ${materialForm.name} updated successfully` });
      setIsEditMaterialOpen(false);
      setSelectedMaterial(null);
      resetMaterialForm();
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

  // Product handlers
  const resetProductForm = () => setProductForm({ sku: '', name: '', description: '', minStock: '0', currentStock: '0' });

  const handleCreateProduct = async () => {
    if (!productForm.sku || !productForm.name) {
      toast({ title: "Missing fields", description: "Please fill in SKU and Name", variant: "destructive" });
      return;
    }
    try {
      await createProduct.mutateAsync({
        sku: productForm.sku, name: productForm.name, description: productForm.description || null,
        unit: 'KG', minStock: productForm.minStock, currentStock: productForm.currentStock, active: true,
      });
      toast({ title: "Product created", description: `Product ${productForm.name} created successfully` });
      setIsCreateProductOpen(false);
      resetProductForm();
    } catch (error) {
      toast({ title: "Error", description: "Failed to create product", variant: "destructive" });
    }
  };

  const handleEditProductClick = (product: Product) => {
    setSelectedProduct(product);
    setProductForm({
      sku: product.sku, name: product.name, description: product.description || '',
      minStock: product.minStock, currentStock: product.currentStock,
    });
    setIsEditProductOpen(true);
  };

  const handleUpdateProduct = async () => {
    if (!selectedProduct || !productForm.name) return;
    try {
      await updateProduct.mutateAsync({
        id: selectedProduct.id, name: productForm.name, description: productForm.description || null,
        minStock: productForm.minStock, currentStock: productForm.currentStock,
      });
      toast({ title: "Product updated", description: `Product ${productForm.name} updated successfully` });
      setIsEditProductOpen(false);
      setSelectedProduct(null);
      resetProductForm();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update product", variant: "destructive" });
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    try {
      await deleteProduct.mutateAsync(product.id);
      toast({ title: "Product deleted", description: `Product ${product.name} has been removed` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete product", variant: "destructive" });
    }
  };

  // Lot handlers
  const resetLotForm = () => setLotForm({ lotNumber: '', supplierLot: '', supplierName: '', quantity: '', remainingQuantity: '', expiryDate: '', notes: '' });

  const handleEditLotClick = (lot: Lot) => {
    setSelectedLot(lot);
    setLotForm({
      lotNumber: lot.lotNumber, supplierLot: lot.supplierLot || '', supplierName: lot.supplierName || '',
      quantity: lot.quantity, remainingQuantity: lot.remainingQuantity,
      expiryDate: lot.expiryDate ? lot.expiryDate.split('T')[0] : '', notes: lot.notes || '',
    });
    setIsEditLotOpen(true);
  };

  const handleUpdateLot = async () => {
    if (!selectedLot) return;
    try {
      await updateLot.mutateAsync({
        id: selectedLot.id, supplierLot: lotForm.supplierLot || null, supplierName: lotForm.supplierName || null,
        remainingQuantity: lotForm.remainingQuantity,
        expiryDate: lotForm.expiryDate ? new Date(lotForm.expiryDate).toISOString() : null,
        notes: lotForm.notes || null,
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

  // Get item name for lot display
  const getItemForLot = (lot: Lot) => {
    if (lot.materialId) {
      const mat = materials.find(m => m.id === lot.materialId);
      return { name: mat?.name || 'Unknown', type: 'Material' };
    }
    if (lot.productId) {
      const prod = products.find(p => p.id === lot.productId);
      return { name: prod?.name || 'Unknown', type: 'Product' };
    }
    return { name: 'Unknown', type: 'Unknown' };
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
        <p className="text-muted-foreground mb-4">There was an error loading the inventory data.</p>
        <Button onClick={() => window.location.reload()}>Refresh Page</Button>
      </div>
    );
  }

  // Calculate stats
  const totalMaterialStock = materials.reduce((sum, m) => sum + parseFloat(m.currentStock || '0'), 0);
  const totalProductStock = products.reduce((sum, p) => sum + parseFloat(p.currentStock || '0'), 0);
  const lowStockMaterials = materials.filter(m => parseFloat(m.currentStock) <= parseFloat(m.minStock)).length;
  const lowStockProducts = products.filter(p => parseFloat(p.currentStock) <= parseFloat(p.minStock)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono" data-testid="text-inventory-title">Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage raw materials, finished goods, and lot tracking.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Raw Materials</div>
          <div className="text-2xl font-bold font-mono">{totalMaterialStock.toFixed(0)} KG</div>
          <div className="text-xs text-muted-foreground">{materials.length} items</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Finished Goods</div>
          <div className="text-2xl font-bold font-mono">{totalProductStock.toFixed(0)} KG</div>
          <div className="text-xs text-muted-foreground">{products.length} items</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Low Stock Alerts</div>
          <div className="text-2xl font-bold font-mono text-amber-600">{lowStockMaterials + lowStockProducts}</div>
          <div className="text-xs text-muted-foreground">items below min</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Active Lots</div>
          <div className="text-2xl font-bold font-mono">{lots.filter(l => parseFloat(l.remainingQuantity) > 0).length}</div>
          <div className="text-xs text-muted-foreground">of {lots.length} total</div>
        </Card>
      </div>

      <div className="flex items-center space-x-2 bg-card p-2 rounded-md border max-w-md">
        <Search className="w-4 h-4 text-muted-foreground ml-2" />
        <Input 
          placeholder="Search inventory..." 
          className="border-none shadow-none focus-visible:ring-0"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="input-search-inventory"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="materials" className="flex items-center gap-2" data-testid="tab-materials">
            <Box size={16} /> Raw Materials
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2" data-testid="tab-products">
            <Package size={16} /> Finished Goods
          </TabsTrigger>
          <TabsTrigger value="lots" className="flex items-center gap-2" data-testid="tab-lots">
            <Layers size={16} /> Lots
          </TabsTrigger>
        </TabsList>

        <TabsContent value="materials" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isCreateMaterialOpen} onOpenChange={setIsCreateMaterialOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-material">
                  <Plus size={16} className="mr-2" /> New Material
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Material</DialogTitle>
                  <DialogDescription>Create a new raw material</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>SKU *</Label>
                    <Input placeholder="e.g. RM-001" value={materialForm.sku} onChange={(e) => setMaterialForm({ ...materialForm, sku: e.target.value })} data-testid="input-material-sku" />
                  </div>
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input placeholder="e.g. Chemical A" value={materialForm.name} onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })} data-testid="input-material-name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input placeholder="Optional" value={materialForm.description} onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })} data-testid="input-material-description" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Current Stock (KG)</Label>
                      <Input type="number" value={materialForm.currentStock} onChange={(e) => setMaterialForm({ ...materialForm, currentStock: e.target.value })} data-testid="input-material-current-stock" />
                    </div>
                    <div className="space-y-2">
                      <Label>Min Stock (KG)</Label>
                      <Input type="number" value={materialForm.minStock} onChange={(e) => setMaterialForm({ ...materialForm, minStock: e.target.value })} data-testid="input-material-min-stock" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateMaterialOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateMaterial} disabled={createMaterial.isPending} data-testid="button-submit-material">
                    {createMaterial.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Material
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Min Stock</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.map((material) => {
                  const isLow = parseFloat(material.currentStock) <= parseFloat(material.minStock);
                  return (
                    <TableRow key={material.id} data-testid={`row-material-${material.id}`}>
                      <TableCell className="font-mono font-medium">{material.sku}</TableCell>
                      <TableCell><div className="flex items-center gap-2"><Box className="h-4 w-4 text-muted-foreground" />{material.name}</div></TableCell>
                      <TableCell className="text-right font-mono">{parseFloat(material.currentStock).toFixed(0)} KG</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">{parseFloat(material.minStock).toFixed(0)} KG</TableCell>
                      <TableCell className="text-center">
                        {isLow ? <Badge variant="destructive">Low Stock</Badge> : <Badge variant="outline" className="text-green-600 border-green-200">OK</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditMaterialClick(material)} data-testid={`button-edit-material-${material.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-delete-material-${material.id}`}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Material</AlertDialogTitle>
                                <AlertDialogDescription>Are you sure you want to delete {material.name}?</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteMaterial(material)}>Delete</AlertDialogAction>
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
                      No materials found. Click "New Material" to add one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isCreateProductOpen} onOpenChange={setIsCreateProductOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-product">
                  <Plus size={16} className="mr-2" /> New Product
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Product</DialogTitle>
                  <DialogDescription>Create a new finished good</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>SKU *</Label>
                    <Input placeholder="e.g. FG-001" value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} data-testid="input-product-sku" />
                  </div>
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input placeholder="e.g. Industrial Solvent" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} data-testid="input-product-name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input placeholder="Optional" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} data-testid="input-product-description" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Current Stock (KG)</Label>
                      <Input type="number" value={productForm.currentStock} onChange={(e) => setProductForm({ ...productForm, currentStock: e.target.value })} data-testid="input-product-current-stock" />
                    </div>
                    <div className="space-y-2">
                      <Label>Min Stock (KG)</Label>
                      <Input type="number" value={productForm.minStock} onChange={(e) => setProductForm({ ...productForm, minStock: e.target.value })} data-testid="input-product-min-stock" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateProductOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateProduct} disabled={createProduct.isPending} data-testid="button-submit-product">
                    {createProduct.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Product
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-center">Recipe</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const recipe = recipes.find(r => r.productId === product.id);
                  const isLow = parseFloat(product.currentStock) <= parseFloat(product.minStock);
                  return (
                    <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
                      <TableCell className="font-mono font-medium">{product.sku}</TableCell>
                      <TableCell><div className="flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" />{product.name}</div></TableCell>
                      <TableCell className="text-right font-mono">{parseFloat(product.currentStock).toFixed(0)} KG</TableCell>
                      <TableCell className="text-center">
                        {recipe ? (
                          <RecipeDialog recipe={recipe} product={product} materials={materials} />
                        ) : (
                          <span className="text-muted-foreground text-xs italic">No Recipe</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isLow ? <Badge variant="destructive">Low Stock</Badge> : <Badge variant="outline" className="text-green-600 border-green-200">OK</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditProductClick(product)} data-testid={`button-edit-product-${product.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-delete-product-${product.id}`}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Product</AlertDialogTitle>
                                <AlertDialogDescription>Are you sure you want to delete {product.name}?</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteProduct(product)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No products found. Click "New Product" to add one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="lots" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lot Number</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLots.map((lot) => {
                  const item = getItemForLot(lot);
                  const remaining = parseFloat(lot.remainingQuantity);
                  const isExpired = lot.expiryDate && new Date(lot.expiryDate) < new Date();
                  return (
                    <TableRow key={lot.id} data-testid={`row-lot-${lot.id}`}>
                      <TableCell className="font-mono font-medium">{lot.lotNumber}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={item.type === 'Material' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}>
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{parseFloat(lot.quantity).toFixed(0)} KG</TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={remaining === 0 ? 'text-muted-foreground' : ''}>{remaining.toFixed(0)} KG</span>
                      </TableCell>
                      <TableCell>
                        {lot.expiryDate ? (
                          <span className={isExpired ? 'text-destructive' : ''}>
                            {format(new Date(lot.expiryDate), 'MMM d, yyyy')}
                            {isExpired && <Badge variant="destructive" className="ml-2 text-[10px]">Expired</Badge>}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditLotClick(lot)} data-testid={`button-edit-lot-${lot.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-delete-lot-${lot.id}`}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Lot</AlertDialogTitle>
                                <AlertDialogDescription>Are you sure you want to delete lot {lot.lotNumber}?</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteLot(lot)}>Delete</AlertDialogAction>
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

      {/* Edit Material Dialog */}
      <Dialog open={isEditMaterialOpen} onOpenChange={setIsEditMaterialOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Material</DialogTitle>
            <DialogDescription>Update material details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input value={materialForm.sku} disabled className="bg-muted font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={materialForm.name} onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })} data-testid="input-edit-material-name" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={materialForm.description} onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })} data-testid="input-edit-material-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Stock (KG)</Label>
                <Input type="number" value={materialForm.currentStock} onChange={(e) => setMaterialForm({ ...materialForm, currentStock: e.target.value })} data-testid="input-edit-material-current-stock" />
              </div>
              <div className="space-y-2">
                <Label>Min Stock (KG)</Label>
                <Input type="number" value={materialForm.minStock} onChange={(e) => setMaterialForm({ ...materialForm, minStock: e.target.value })} data-testid="input-edit-material-min-stock" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditMaterialOpen(false); setSelectedMaterial(null); resetMaterialForm(); }}>Cancel</Button>
            <Button onClick={handleUpdateMaterial} disabled={updateMaterial.isPending} data-testid="button-update-material">
              {updateMaterial.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditProductOpen} onOpenChange={setIsEditProductOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update product details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input value={productForm.sku} disabled className="bg-muted font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} data-testid="input-edit-product-name" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} data-testid="input-edit-product-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Stock (KG)</Label>
                <Input type="number" value={productForm.currentStock} onChange={(e) => setProductForm({ ...productForm, currentStock: e.target.value })} data-testid="input-edit-product-current-stock" />
              </div>
              <div className="space-y-2">
                <Label>Min Stock (KG)</Label>
                <Input type="number" value={productForm.minStock} onChange={(e) => setProductForm({ ...productForm, minStock: e.target.value })} data-testid="input-edit-product-min-stock" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditProductOpen(false); setSelectedProduct(null); resetProductForm(); }}>Cancel</Button>
            <Button onClick={handleUpdateProduct} disabled={updateProduct.isPending} data-testid="button-update-product">
              {updateProduct.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Lot Dialog */}
      <Dialog open={isEditLotOpen} onOpenChange={setIsEditLotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lot</DialogTitle>
            <DialogDescription>Update lot details for {selectedLot?.lotNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Supplier Lot</Label>
                <Input value={lotForm.supplierLot} onChange={(e) => setLotForm({ ...lotForm, supplierLot: e.target.value })} data-testid="input-edit-lot-supplier-lot" />
              </div>
              <div className="space-y-2">
                <Label>Supplier Name</Label>
                <Input value={lotForm.supplierName} onChange={(e) => setLotForm({ ...lotForm, supplierName: e.target.value })} data-testid="input-edit-lot-supplier-name" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Remaining Quantity (KG)</Label>
              <Input type="number" value={lotForm.remainingQuantity} onChange={(e) => setLotForm({ ...lotForm, remainingQuantity: e.target.value })} data-testid="input-edit-lot-remaining" />
            </div>
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input type="date" value={lotForm.expiryDate} onChange={(e) => setLotForm({ ...lotForm, expiryDate: e.target.value })} data-testid="input-edit-lot-expiry" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={lotForm.notes} onChange={(e) => setLotForm({ ...lotForm, notes: e.target.value })} data-testid="input-edit-lot-notes" />
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

function RecipeDialog({ recipe, product, materials }: { recipe: any; product: any; materials: any[] }) {
  const { data: items = [] } = useRecipeItems(recipe.id);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8" data-testid={`button-recipe-${product.id}`}>
          <FileText size={14} className="mr-2" />
          v{recipe.version}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono">Recipe: {product.name} (v{recipe.version})</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {recipe.instructions && (
            <div className="bg-muted p-4 rounded-md text-sm font-mono">
              {recipe.instructions}
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            Output: <span className="font-mono font-medium">{parseFloat(recipe.outputQuantity).toFixed(0)} KG</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any) => {
                const mat = materials.find(m => m.id === item.materialId);
                return (
                  <TableRow key={item.id}>
                    <TableCell>{mat?.name || 'Unknown'}</TableCell>
                    <TableCell className="text-right font-mono">{parseFloat(item.quantity).toFixed(0)} {mat?.unit || 'KG'}</TableCell>
                  </TableRow>
                );
              })}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    No ingredients defined
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

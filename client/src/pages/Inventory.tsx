import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, Plus, Loader2, AlertCircle, Pencil, Trash2, Package, Box, Layers } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  useMaterials, useProducts, useCategories, useLots,
  useCreateMaterial, useUpdateMaterial, useDeleteMaterial, 
  useCreateProduct, useUpdateProduct, useDeleteProduct,
  type Material, type Product, type Category, type Lot
} from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isCreateMaterialOpen, setIsCreateMaterialOpen] = useState(false);
  const [isEditMaterialOpen, setIsEditMaterialOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [materialForm, setMaterialForm] = useState({
    sku: '', name: '', description: '', unit: 'KG', minStock: '0', currentStock: '0', categoryId: '' as string | null,
  });
  
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    sku: '', name: '', description: '', unit: 'KG', minStock: '0', currentStock: '0', categoryId: '' as string | null,
  });

  const { data: materials = [], isLoading: materialsLoading, isError: materialsError } = useMaterials();
  const { data: products = [], isLoading: productsLoading, isError: productsError } = useProducts();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: lots = [], isLoading: lotsLoading } = useLots();
  
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const deleteMaterial = useDeleteMaterial();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const { toast } = useToast();

  const isLoading = materialsLoading || productsLoading || lotsLoading;
  const hasError = materialsError || productsError;
  
  const visibleCategories = categories.filter(c => c.showInTabs);
  
  useEffect(() => {
    if (visibleCategories.length > 0 && !activeTab) {
      setActiveTab(`cat-${visibleCategories[0].id}`);
    }
  }, [visibleCategories, activeTab]);

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (m.sku && m.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getMaterialName = (materialId: string | null) => {
    if (!materialId) return null;
    const material = materials.find(m => m.id === materialId);
    return material?.name || 'Unknown Material';
  };

  const getProductName = (productId: string | null) => {
    if (!productId) return null;
    const product = products.find(p => p.id === productId);
    return product?.name || 'Unknown Product';
  };

  const getLotItemName = (lot: Lot) => {
    const materialName = getMaterialName(lot.materialId);
    const productName = getProductName(lot.productId);
    return materialName || productName || 'Unassigned';
  };

  const resetMaterialForm = () => setMaterialForm({ sku: '', name: '', description: '', unit: 'KG', minStock: '0', currentStock: '0', categoryId: null });

  const handleCreateMaterial = async () => {
    if (!materialForm.name) {
      toast({ title: "Missing fields", description: "Please fill in Name", variant: "destructive" });
      return;
    }
    try {
      await createMaterial.mutateAsync({
        sku: materialForm.sku, name: materialForm.name, description: materialForm.description || null,
        unit: materialForm.unit, minStock: materialForm.minStock, currentStock: materialForm.currentStock, 
        categoryId: materialForm.categoryId || null, active: true,
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
      categoryId: material.categoryId,
    });
    setIsEditMaterialOpen(true);
  };

  const handleUpdateMaterial = async () => {
    if (!selectedMaterial || !materialForm.name) return;
    try {
      await updateMaterial.mutateAsync({
        id: selectedMaterial.id, name: materialForm.name, description: materialForm.description || null,
        unit: materialForm.unit, minStock: materialForm.minStock, currentStock: materialForm.currentStock,
        categoryId: materialForm.categoryId || null,
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

  const resetProductForm = () => setProductForm({ sku: '', name: '', description: '', unit: 'KG', minStock: '0', currentStock: '0', categoryId: null });

  const handleCreateProduct = async () => {
    if (!productForm.name) {
      toast({ title: "Missing fields", description: "Please fill in Name", variant: "destructive" });
      return;
    }
    try {
      await createProduct.mutateAsync({
        sku: productForm.sku, name: productForm.name, description: productForm.description || null,
        unit: productForm.unit, minStock: productForm.minStock, currentStock: productForm.currentStock, 
        categoryId: productForm.categoryId || null, active: true,
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
      unit: product.unit || 'KG', minStock: product.minStock, currentStock: product.currentStock,
      categoryId: product.categoryId,
    });
    setIsEditProductOpen(true);
  };

  const handleUpdateProduct = async () => {
    if (!selectedProduct || !productForm.name) return;
    try {
      await updateProduct.mutateAsync({
        id: selectedProduct.id, name: productForm.name, description: productForm.description || null,
        unit: productForm.unit, minStock: productForm.minStock, currentStock: productForm.currentStock,
        categoryId: productForm.categoryId || null,
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

  const totalMaterialStock = materials.reduce((sum, m) => sum + parseFloat(m.currentStock || '0'), 0);
  const totalProductStock = products.reduce((sum, p) => sum + parseFloat(p.currentStock || '0'), 0);
  const lowStockMaterials = materials.filter(m => parseFloat(m.currentStock) <= parseFloat(m.minStock)).length;
  const lowStockProducts = products.filter(p => parseFloat(p.currentStock) <= parseFloat(p.minStock)).length;

  const allItems = [
    ...filteredMaterials.map(m => ({ ...m, itemType: 'material' as const })),
    ...filteredProducts.map(p => ({ ...p, itemType: 'product' as const })),
  ].sort((a, b) => a.sku.localeCompare(b.sku));

  const renderMaterialRow = (material: Material) => {
    const isLow = parseFloat(material.currentStock) <= parseFloat(material.minStock);
    return (
      <TableRow key={material.id} data-testid={`row-material-${material.id}`}>
        <TableCell className="font-mono font-medium">{material.sku}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Box className="h-4 w-4 text-muted-foreground" />
            {material.name}
          </div>
        </TableCell>
        <TableCell className="text-center">
          <Badge variant="secondary">Material</Badge>
        </TableCell>
        <TableCell className="text-right font-mono">{parseFloat(material.currentStock).toFixed(2)} {material.unit || 'KG'}</TableCell>
        <TableCell className="text-center">
          {isLow ? <Badge variant="destructive">Low</Badge> : <Badge variant="outline" className="text-green-600 border-green-200">OK</Badge>}
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
  };

  const renderProductRow = (product: Product) => {
    const isLow = parseFloat(product.currentStock) <= parseFloat(product.minStock);
    const productCategory = categories.find(c => c.id === product.categoryId);
    return (
      <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
        <TableCell className="font-mono font-medium">{product.sku}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            {product.name}
          </div>
        </TableCell>
        <TableCell className="text-center">
          {productCategory ? (
            <Badge variant="outline" className="text-primary border-primary/30">{productCategory.name}</Badge>
          ) : (
            <span className="text-muted-foreground text-xs">-</span>
          )}
        </TableCell>
        <TableCell className="text-right font-mono">{parseFloat(product.currentStock).toFixed(2)} {product.unit || 'KG'}</TableCell>
        <TableCell className="text-center">
          {isLow ? <Badge variant="destructive">Low</Badge> : <Badge variant="outline" className="text-green-600 border-green-200">OK</Badge>}
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
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-mono" data-testid="text-inventory-title">Inventory</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage raw materials and finished goods.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Items</div>
          <div className="text-2xl font-bold font-mono">{materials.length + products.length}</div>
          <div className="text-xs text-muted-foreground">{materials.length} materials, {products.length} goods</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Materials Stock</div>
          <div className="text-2xl font-bold font-mono">{totalMaterialStock.toFixed(0)} KG</div>
          <div className="text-xs text-muted-foreground">{materials.length} items</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Goods Stock</div>
          <div className="text-2xl font-bold font-mono">{totalProductStock.toFixed(0)} KG</div>
          <div className="text-xs text-muted-foreground">{products.length} items</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Low Stock Alerts</div>
          <div className="text-2xl font-bold font-mono text-amber-600">{lowStockMaterials + lowStockProducts}</div>
          <div className="text-xs text-muted-foreground">items below min</div>
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
          {visibleCategories.map((category) => (
            <TabsTrigger key={category.id} value={`cat-${category.id}`} className="flex items-center gap-2" data-testid={`tab-category-${category.id}`}>
              {category.name}
            </TabsTrigger>
          ))}
          <TabsTrigger value="all" className="flex items-center gap-2" data-testid="tab-all">
            <Layers size={16} /> All
          </TabsTrigger>
        </TabsList>

        {visibleCategories.map((category) => {
          const categoryMaterials = filteredMaterials.filter(m => m.categoryId === category.id);
          const categoryProducts = filteredProducts.filter(p => p.categoryId === category.id);
          const categoryItems = [
            ...categoryMaterials.map(m => ({ ...m, itemType: 'material' as const })),
            ...categoryProducts.map(p => ({ ...p, itemType: 'product' as const }))
          ];
          return (
            <TabsContent key={category.id} value={`cat-${category.id}`} className="space-y-4">
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateMaterialOpen(true)} data-testid={`button-new-material-cat-${category.id}`}>
                  <Box size={16} className="mr-2" /> New Material
                </Button>
                <Button onClick={() => setIsCreateProductOpen(true)} data-testid={`button-new-product-cat-${category.id}`}>
                  <Package size={16} className="mr-2" /> New Product
                </Button>
              </div>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[100px]">SKU</TableHead>
                        <TableHead className="min-w-[150px]">Name</TableHead>
                        <TableHead className="min-w-[80px] text-center">Type</TableHead>
                        <TableHead className="min-w-[100px] text-right">Stock</TableHead>
                        <TableHead className="min-w-[80px] text-center">Status</TableHead>
                        <TableHead className="min-w-[100px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No items in {category.name}. Add materials or products to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        categoryItems.map((item) => 
                          item.itemType === 'material' 
                            ? renderMaterialRow(item as Material)
                            : renderProductRow(item as Product)
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>
          );
        })}

        <TabsContent value="all" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCreateMaterialOpen(true)} data-testid="button-new-material">
              <Box size={16} className="mr-2" /> New Material
            </Button>
            <Button onClick={() => setIsCreateProductOpen(true)} data-testid="button-new-product">
              <Package size={16} className="mr-2" /> New Product
            </Button>
          </div>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">SKU</TableHead>
                    <TableHead className="min-w-[150px]">Name</TableHead>
                    <TableHead className="min-w-[100px] text-center">Category</TableHead>
                    <TableHead className="min-w-[100px] text-right">Stock</TableHead>
                    <TableHead className="min-w-[80px] text-center">Status</TableHead>
                    <TableHead className="min-w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No items found. Add materials or products to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    allItems.map((item) => 
                      item.itemType === 'material' 
                        ? renderMaterialRow(item as Material)
                        : renderProductRow(item as Product)
                    )
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isCreateMaterialOpen} onOpenChange={setIsCreateMaterialOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Material</DialogTitle>
            <DialogDescription>Create a new raw material</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input placeholder="e.g. RM-001" value={materialForm.sku} onChange={(e) => setMaterialForm({ ...materialForm, sku: e.target.value })} data-testid="input-material-sku" />
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input placeholder="e.g. Strawberry Slice" value={materialForm.name} onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })} data-testid="input-material-name" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Optional" value={materialForm.description} onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })} data-testid="input-material-description" />
            </div>
            <div className="space-y-2">
              <Label>Unit of Measure</Label>
              <Select value={materialForm.unit} onValueChange={(v) => setMaterialForm({ ...materialForm, unit: v })}>
                <SelectTrigger data-testid="select-material-unit">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KG">KG (Kilograms)</SelectItem>
                  <SelectItem value="QTY">QTY (Quantity/Pieces)</SelectItem>
                  <SelectItem value="L">L (Liters)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Stock ({materialForm.unit})</Label>
                <Input type="number" value={materialForm.currentStock} onChange={(e) => setMaterialForm({ ...materialForm, currentStock: e.target.value })} data-testid="input-material-current-stock" />
              </div>
              <div className="space-y-2">
                <Label>Min Stock ({materialForm.unit})</Label>
                <Input type="number" value={materialForm.minStock} onChange={(e) => setMaterialForm({ ...materialForm, minStock: e.target.value })} data-testid="input-material-min-stock" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={materialForm.categoryId || ''}
                onValueChange={(v) => setMaterialForm({ ...materialForm, categoryId: v || null })}
              >
                <SelectTrigger data-testid="select-material-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      <Dialog open={isCreateProductOpen} onOpenChange={setIsCreateProductOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Good</DialogTitle>
            <DialogDescription>Create a new finished good</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input placeholder="e.g. FG-001" value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} data-testid="input-product-sku" />
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input placeholder="e.g. Freeze Dried Strawberry" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} data-testid="input-product-name" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Optional" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} data-testid="input-product-description" />
            </div>
            <div className="space-y-2">
              <Label>Unit of Measure</Label>
              <Select value={productForm.unit} onValueChange={(v) => setProductForm({ ...productForm, unit: v })}>
                <SelectTrigger data-testid="select-product-unit">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KG">KG (Kilograms)</SelectItem>
                  <SelectItem value="QTY">QTY (Quantity/Pieces)</SelectItem>
                  <SelectItem value="L">L (Liters)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Stock ({productForm.unit})</Label>
                <Input type="number" value={productForm.currentStock} onChange={(e) => setProductForm({ ...productForm, currentStock: e.target.value })} data-testid="input-product-current-stock" />
              </div>
              <div className="space-y-2">
                <Label>Min Stock ({productForm.unit})</Label>
                <Input type="number" value={productForm.minStock} onChange={(e) => setProductForm({ ...productForm, minStock: e.target.value })} data-testid="input-product-min-stock" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={productForm.categoryId || ''}
                onValueChange={(v) => setProductForm({ ...productForm, categoryId: v || null })}
              >
                <SelectTrigger data-testid="select-product-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateProductOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateProduct} disabled={createProduct.isPending} data-testid="button-submit-product">
              {createProduct.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Good
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditMaterialOpen} onOpenChange={setIsEditMaterialOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Material</DialogTitle>
            <DialogDescription>Update material details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input value={materialForm.sku} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={materialForm.name} onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })} data-testid="input-edit-material-name" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={materialForm.description} onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })} data-testid="input-edit-material-description" />
            </div>
            <div className="space-y-2">
              <Label>Unit of Measure</Label>
              <Select value={materialForm.unit} onValueChange={(v) => setMaterialForm({ ...materialForm, unit: v })}>
                <SelectTrigger data-testid="select-edit-material-unit">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KG">KG (Kilograms)</SelectItem>
                  <SelectItem value="QTY">QTY (Quantity/Pieces)</SelectItem>
                  <SelectItem value="L">L (Liters)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Stock ({materialForm.unit})</Label>
                <Input type="number" value={materialForm.currentStock} onChange={(e) => setMaterialForm({ ...materialForm, currentStock: e.target.value })} data-testid="input-edit-material-current-stock" />
              </div>
              <div className="space-y-2">
                <Label>Min Stock ({materialForm.unit})</Label>
                <Input type="number" value={materialForm.minStock} onChange={(e) => setMaterialForm({ ...materialForm, minStock: e.target.value })} data-testid="input-edit-material-min-stock" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={materialForm.categoryId || ''}
                onValueChange={(v) => setMaterialForm({ ...materialForm, categoryId: v || null })}
              >
                <SelectTrigger data-testid="select-edit-material-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditMaterialOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateMaterial} disabled={updateMaterial.isPending} data-testid="button-update-material">
              {updateMaterial.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditProductOpen} onOpenChange={setIsEditProductOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Good</DialogTitle>
            <DialogDescription>Update product details and categories</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input value={productForm.sku} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} data-testid="input-edit-product-name" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} data-testid="input-edit-product-description" />
            </div>
            <div className="space-y-2">
              <Label>Unit of Measure</Label>
              <Select value={productForm.unit} onValueChange={(v) => setProductForm({ ...productForm, unit: v })}>
                <SelectTrigger data-testid="select-edit-product-unit">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KG">KG (Kilograms)</SelectItem>
                  <SelectItem value="QTY">QTY (Quantity/Pieces)</SelectItem>
                  <SelectItem value="L">L (Liters)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Stock ({productForm.unit})</Label>
                <Input type="number" value={productForm.currentStock} onChange={(e) => setProductForm({ ...productForm, currentStock: e.target.value })} data-testid="input-edit-product-current-stock" />
              </div>
              <div className="space-y-2">
                <Label>Min Stock ({productForm.unit})</Label>
                <Input type="number" value={productForm.minStock} onChange={(e) => setProductForm({ ...productForm, minStock: e.target.value })} data-testid="input-edit-product-min-stock" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={productForm.categoryId || ''}
                onValueChange={(v) => setProductForm({ ...productForm, categoryId: v || null })}
              >
                <SelectTrigger data-testid="select-edit-product-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditProductOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateProduct} disabled={updateProduct.isPending} data-testid="button-update-product">
              {updateProduct.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Good
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

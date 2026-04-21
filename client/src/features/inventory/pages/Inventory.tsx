import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, Plus, Loader2, AlertCircle, Pencil, Trash2, Package, Box, Layers, Printer, QrCode, CheckCircle2, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useMaterials, useProducts, useCategories, useLots,
  useUpdateMaterial, useDeleteMaterial,
  useCreateProduct, useUpdateProduct, useDeleteProduct,
  useReceiveStock, useMarkBarcodePrinted,
  type Material, type Product, type Category, type Lot, type LotWithDetails,
} from '@/lib/api';
import { printBarcodeLabel } from '@/lib/barcodePrint';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/contexts/AuthContext';

const EMPTY_RECEIVE_FORM = {
  materialId: '',
  quantity: '',
  supplierName: '',
  sourceName: '',
  supplierLot: '',
  sourceType: '' as '' | 'supplier' | 'farmer' | 'internal_batch',
  receivedDate: format(new Date(), 'yyyy-MM-dd'),
  expiryDate: '',
  notes: '',
};

function getLotStatusBadge(status: string | null) {
  switch (status) {
    case 'active': return <Badge className="bg-green-100 text-green-800 border-green-300">Active</Badge>;
    case 'consumed': return <Badge variant="secondary">Consumed</Badge>;
    case 'quarantined': return <Badge variant="destructive">Quarantined</Badge>;
    case 'released': return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Released</Badge>;
    case 'expired': return <Badge variant="outline" className="text-amber-600">Expired</Badge>;
    default: return <Badge variant="outline">{status || 'Unknown'}</Badge>;
  }
}

function getLotTypeBadge(lotType: string | null) {
  switch (lotType) {
    case 'raw_material': return <Badge variant="outline" className="text-xs">Raw Mat.</Badge>;
    case 'finished_good': return <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">Fin. Good</Badge>;
    case 'intermediate': return <Badge variant="outline" className="text-xs text-purple-600 border-purple-200">Inter.</Badge>;
    default: return null;
  }
}

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [lotSearchTerm, setLotSearchTerm] = useState('');

  const [isEditMaterialOpen, setIsEditMaterialOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [materialForm, setMaterialForm] = useState({
    sku: '', name: '', description: '', unit: 'KG', minStock: '0', currentStock: '0', categoryId: '' as string | null,
  });

  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    sku: '', name: '', description: '', unit: 'KG', minStock: '0', currentStock: '0', categoryId: '' as string | null, fruitCode: '',
  });

  const [isReceiveStockOpen, setIsReceiveStockOpen] = useState(false);
  const [receiveForm, setReceiveForm] = useState(EMPTY_RECEIVE_FORM);
  const [receivedLot, setReceivedLot] = useState<LotWithDetails | null>(null);
  const [materialSearchOpen, setMaterialSearchOpen] = useState(false);

  const { canReceiveStock, canManageSettings } = useRole();

  const { data: materials = [], isLoading: materialsLoading, isError: materialsError } = useMaterials();
  const { data: products = [], isLoading: productsLoading, isError: productsError } = useProducts();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: lots = [], isLoading: lotsLoading } = useLots();

  const updateMaterial = useUpdateMaterial();
  const deleteMaterial = useDeleteMaterial();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const receiveStock = useReceiveStock();
  const markBarcodePrinted = useMarkBarcodePrinted();
  const { toast } = useToast();

  const isLoading = materialsLoading || productsLoading || lotsLoading;
  const hasError = materialsError || productsError;

  const visibleCategories = categories.filter(c => c.showInTabs);

  useEffect(() => {
    if (visibleCategories.length > 0 && !activeTab) {
      setActiveTab(`cat-${visibleCategories[0].id}`);
    }
  }, [visibleCategories, activeTab]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'receive') {
      setIsReceiveStockOpen(true);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const filteredMaterials = materials.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.sku && m.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredLots = (lots as Lot[]).filter(lot => {
    if (!lotSearchTerm) return true;
    const term = lotSearchTerm.toLowerCase();
    const materialName = getMaterialName(lot.materialId);
    const productName = getProductName(lot.productId);
    return (
      lot.lotNumber.toLowerCase().includes(term) ||
      (lot.barcodeValue && lot.barcodeValue.toLowerCase().includes(term)) ||
      (materialName && materialName.toLowerCase().includes(term)) ||
      (productName && productName.toLowerCase().includes(term)) ||
      (lot.supplierName && lot.supplierName.toLowerCase().includes(term)) ||
      (lot.sourceName && lot.sourceName.toLowerCase().includes(term))
    );
  });

  function getMaterialName(materialId: string | null) {
    if (!materialId) return null;
    return materials.find(m => m.id === materialId)?.name || 'Unknown';
  }

  function getProductName(productId: string | null) {
    if (!productId) return null;
    return products.find(p => p.id === productId)?.name || 'Unknown';
  }

  function getLotItemName(lot: Lot) {
    return getMaterialName(lot.materialId) || getProductName(lot.productId) || 'Unassigned';
  }

  function getLotUnit(lot: Lot): string {
    if (lot.materialId) return materials.find(m => m.id === lot.materialId)?.unit || 'KG';
    if (lot.productId) return products.find(p => p.id === lot.productId)?.unit || 'KG';
    return 'KG';
  }

  function handlePrintLabel(lot: Lot) {
    const itemName = getLotItemName(lot);
    const unit = getLotUnit(lot);
    const sourceLabel = lot.supplierName || lot.sourceName || undefined;
    printBarcodeLabel({
      lotNumber: lot.lotNumber,
      barcodeValue: lot.barcodeValue,
      itemName,
      quantity: lot.originalQuantity || lot.quantity,
      unit,
      sourceLabel,
      receivedDate: lot.receivedDate,
      expiryDate: lot.expiryDate,
      supplierLot: lot.supplierLot,
    });
    if (!lot.barcodePrintedAt) {
      markBarcodePrinted.mutate(lot.id);
    }
  }

  const resetMaterialForm = () => setMaterialForm({ sku: '', name: '', description: '', unit: 'KG', minStock: '0', currentStock: '0', categoryId: null });
  const resetProductForm = () => setProductForm({ sku: '', name: '', description: '', unit: 'KG', minStock: '0', currentStock: '0', categoryId: null, fruitCode: '' });

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
        id: selectedMaterial.id, sku: materialForm.sku, name: materialForm.name, description: materialForm.description || null,
        unit: materialForm.unit, minStock: materialForm.minStock, currentStock: materialForm.currentStock,
        categoryId: materialForm.categoryId || null,
      });
      toast({ title: "Material updated", description: `${materialForm.name} updated successfully` });
      setIsEditMaterialOpen(false);
      setSelectedMaterial(null);
      resetMaterialForm();
    } catch {
      toast({ title: "Error", description: "Failed to update material", variant: "destructive" });
    }
  };

  const handleDeleteMaterial = async (material: Material) => {
    try {
      await deleteMaterial.mutateAsync(material.id);
      toast({ title: "Material deleted", description: `${material.name} has been removed` });
    } catch {
      toast({ title: "Error", description: "Failed to delete material", variant: "destructive" });
    }
  };

  const handleCreateProduct = async () => {
    if (!productForm.name) return;
    try {
      await createProduct.mutateAsync({
        sku: productForm.sku, name: productForm.name, description: productForm.description || null,
        unit: productForm.unit, minStock: productForm.minStock, currentStock: productForm.currentStock,
        categoryId: productForm.categoryId || null,
        fruitCode: productForm.fruitCode || null,
      });
      toast({ title: "Product created", description: `${productForm.name} added to inventory` });
      setIsCreateProductOpen(false);
      resetProductForm();
    } catch {
      toast({ title: "Error", description: "Failed to create product", variant: "destructive" });
    }
  };

  const handleEditProductClick = (product: Product) => {
    setSelectedProduct(product);
    setProductForm({
      sku: product.sku, name: product.name, description: product.description || '',
      unit: product.unit || 'KG', minStock: product.minStock, currentStock: product.currentStock,
      categoryId: product.categoryId,
      fruitCode: product.fruitCode || '',
    });
    setIsEditProductOpen(true);
  };

  const handleUpdateProduct = async () => {
    if (!selectedProduct || !productForm.name) return;
    try {
      await updateProduct.mutateAsync({
        id: selectedProduct.id, sku: productForm.sku, name: productForm.name, description: productForm.description || null,
        unit: productForm.unit, minStock: productForm.minStock, currentStock: productForm.currentStock,
        categoryId: productForm.categoryId || null,
        fruitCode: productForm.fruitCode || null,
      });
      toast({ title: "Product updated", description: `${productForm.name} updated successfully` });
      setIsEditProductOpen(false);
      setSelectedProduct(null);
      resetProductForm();
    } catch {
      toast({ title: "Error", description: "Failed to update product", variant: "destructive" });
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    try {
      await deleteProduct.mutateAsync(product.id);
      toast({ title: "Product deleted", description: `${product.name} has been removed` });
    } catch {
      toast({ title: "Error", description: "Failed to delete product", variant: "destructive" });
    }
  };

  const handleReceiveStock = async () => {
    if (!receiveForm.materialId || !receiveForm.quantity) {
      toast({ title: "Missing fields", description: "Please select a material and enter quantity", variant: "destructive" });
      return;
    }
    const qty = parseFloat(receiveForm.quantity);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: "Invalid quantity", description: "Quantity must be a positive number", variant: "destructive" });
      return;
    }
    try {
      const result = await receiveStock.mutateAsync({
        materialId: receiveForm.materialId,
        quantity: receiveForm.quantity,
        supplierName: receiveForm.supplierName || undefined,
        sourceName: receiveForm.sourceName || undefined,
        supplierLot: receiveForm.supplierLot || undefined,
        sourceType: receiveForm.sourceType || undefined,
        receivedDate: receiveForm.receivedDate || undefined,
        expiryDate: receiveForm.expiryDate || undefined,
        notes: receiveForm.notes || undefined,
      });
      const materialName = getMaterialName(receiveForm.materialId) || 'material';
      const lotWithDetails: LotWithDetails = { ...result.lot, materialName };
      setReceivedLot(lotWithDetails);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to receive stock';
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleOpenReceive = () => {
    setReceiveForm(EMPTY_RECEIVE_FORM);
    setReceivedLot(null);
    setIsReceiveStockOpen(true);
  };

  const handleCloseReceive = () => {
    setIsReceiveStockOpen(false);
    setReceivedLot(null);
    setReceiveForm(EMPTY_RECEIVE_FORM);
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
  const activeLots = (lots as Lot[]).filter(l => l.status === 'active').length;

  const allItems = [
    ...filteredMaterials.map(m => ({ ...m, itemType: 'material' as const })),
    ...filteredProducts.map(p => ({ ...p, itemType: 'product' as const })),
  ].sort((a, b) => a.sku.localeCompare(b.sku));

  const renderMaterialRow = (material: Material) => {
    const isLow = parseFloat(material.currentStock) <= parseFloat(material.minStock);
    const materialCategory = categories.find(c => c.id === material.categoryId);
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
          {materialCategory ? (
            <Badge variant="outline" className="text-primary border-primary/30">{materialCategory.name}</Badge>
          ) : (
            <span className="text-muted-foreground text-xs">-</span>
          )}
        </TableCell>
        <TableCell className="text-right font-mono">{parseFloat(material.currentStock).toFixed(2)} {material.unit || 'KG'}</TableCell>
        <TableCell className="text-center">
          {isLow ? <Badge variant="destructive">Low</Badge> : <Badge variant="outline" className="text-green-600 border-green-200">OK</Badge>}
        </TableCell>
        <TableCell className="text-right">
          {canManageSettings && (
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
          )}
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
          {canManageSettings && (
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
          )}
        </TableCell>
      </TableRow>
    );
  };

  const renderLotRow = (lot: Lot) => {
    const itemName = getLotItemName(lot);
    const unit = getLotUnit(lot);
    return (
      <TableRow key={lot.id} data-testid={`row-lot-${lot.id}`}>
        <TableCell>
          <div className="font-mono font-medium text-sm">{lot.lotNumber}</div>
          {lot.barcodeValue && (
            <div className="text-xs text-muted-foreground font-mono mt-0.5">{lot.barcodeValue}</div>
          )}
        </TableCell>
        <TableCell>
          <div className="font-medium">{itemName}</div>
          {getLotTypeBadge(lot.lotType)}
        </TableCell>
        <TableCell className="text-center">{getLotStatusBadge(lot.status)}</TableCell>
        <TableCell className="text-right font-mono">
          <div>{parseFloat(lot.remainingQuantity || '0').toFixed(2)} {unit}</div>
          <div className="text-xs text-muted-foreground">of {parseFloat(lot.originalQuantity || lot.quantity).toFixed(2)}</div>
        </TableCell>
        <TableCell>
          <div className="text-sm">{lot.supplierName || lot.sourceName || <span className="text-muted-foreground">—</span>}</div>
          {lot.supplierLot && <div className="text-xs text-muted-foreground">Sup. lot: {lot.supplierLot}</div>}
        </TableCell>
        <TableCell>
          <div className="text-sm">{lot.receivedDate ? format(new Date(lot.receivedDate), 'dd MMM yy') : '—'}</div>
          {lot.expiryDate && (
            <div className="text-xs text-amber-600">Exp: {format(new Date(lot.expiryDate), 'dd MMM yy')}</div>
          )}
        </TableCell>
        <TableCell className="text-right">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => handlePrintLabel(lot)}
            data-testid={`button-print-label-${lot.id}`}
          >
            <Printer className="h-3.5 w-3.5" />
            {lot.barcodePrintedAt ? 'Reprint' : 'Print'}
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  const selectedReceiveMaterial = receiveForm.materialId ? materials.find(m => m.id === receiveForm.materialId) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-mono" data-testid="text-inventory-title">Inventory</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage raw materials and finished goods.</p>
        </div>
        {canReceiveStock && (
          <Button onClick={handleOpenReceive} className="gap-2" data-testid="button-receive-stock">
            <Download className="h-4 w-4" /> Receive Stock
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Items</div>
          <div className="text-2xl font-bold font-mono">{materials.length + products.length}</div>
          <div className="text-xs text-muted-foreground">{materials.length} materials, {products.length} goods</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Materials Stock</div>
          <div className="text-2xl font-bold font-mono">{totalMaterialStock.toFixed(0)}</div>
          <div className="text-xs text-muted-foreground">{materials.length} items (mixed units)</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Goods Stock</div>
          <div className="text-2xl font-bold font-mono">{totalProductStock.toFixed(0)}</div>
          <div className="text-xs text-muted-foreground">{products.length} items (mixed units)</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Low Stock Alerts</div>
          <div className="text-2xl font-bold font-mono text-amber-600">{lowStockMaterials + lowStockProducts}</div>
          <div className="text-xs text-muted-foreground">items below min</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Active Lots</div>
          <div className="text-2xl font-bold font-mono text-green-600">{activeLots}</div>
          <div className="text-xs text-muted-foreground">of {(lots as Lot[]).length} total</div>
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
          <TabsTrigger value="lots" className="flex items-center gap-2" data-testid="tab-lots">
            <QrCode size={16} /> Lots
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
              {canManageSettings && (
                <div className="flex justify-end gap-2">
                  <Button onClick={() => { setProductForm(prev => ({ ...prev, categoryId: category.id })); setIsCreateProductOpen(true); }} data-testid={`button-new-product-cat-${category.id}`}>
                    <Plus size={16} className="mr-2" /> New Product
                  </Button>
                </div>
              )}
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
          {canManageSettings && (
            <div className="flex justify-end gap-2">
              <Button onClick={() => setIsCreateProductOpen(true)} data-testid="button-new-product">
                <Plus size={16} className="mr-2" /> New Product
              </Button>
            </div>
          )}
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

        <TabsContent value="lots" className="space-y-4">
          <div className="flex items-center space-x-2 bg-card p-2 rounded-md border max-w-md">
            <Search className="w-4 h-4 text-muted-foreground ml-2" />
            <Input
              placeholder="Search lots by number, barcode, or source..."
              className="border-none shadow-none focus-visible:ring-0"
              value={lotSearchTerm}
              onChange={(e) => setLotSearchTerm(e.target.value)}
              data-testid="input-search-lots"
            />
          </div>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Lot / Barcode</TableHead>
                    <TableHead className="min-w-[150px]">Item</TableHead>
                    <TableHead className="min-w-[90px] text-center">Status</TableHead>
                    <TableHead className="min-w-[110px] text-right">Qty Remaining</TableHead>
                    <TableHead className="min-w-[120px]">Source</TableHead>
                    <TableHead className="min-w-[100px]">Dates</TableHead>
                    <TableHead className="min-w-[90px] text-right">Label</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLots.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {lotSearchTerm ? 'No lots match your search.' : 'No lots yet. Use "Receive Stock" to create your first lot.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLots.map((lot) => renderLotRow(lot as Lot))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Receive Stock Dialog */}
      <Dialog open={isReceiveStockOpen} onOpenChange={(open) => { if (!open) handleCloseReceive(); }}>
        <DialogContent className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" /> Receive Stock
            </DialogTitle>
            <DialogDescription>Record incoming raw materials. A lot number and barcode will be generated automatically.</DialogDescription>
          </DialogHeader>

          {receivedLot ? (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Stock received successfully</span>
              </div>
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Material</span>
                  <span className="font-medium">{receivedLot.materialName || getLotItemName(receivedLot as Lot)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Quantity</span>
                  <span className="font-mono font-medium">{receivedLot.quantity} {getLotUnit(receivedLot as Lot)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-muted-foreground">Lot Number</span>
                    <span className="font-mono font-bold text-lg tracking-wide">{receivedLot.lotNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Barcode</span>
                    <span className="font-mono text-sm text-muted-foreground">{receivedLot.barcodeValue}</span>
                  </div>
                </div>
              </div>
              <Button
                className="w-full gap-2"
                onClick={() => handlePrintLabel(receivedLot as Lot)}
                data-testid="button-print-label-received"
              >
                <Printer className="h-4 w-4" /> Print Label
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setReceiveForm(EMPTY_RECEIVE_FORM); setReceivedLot(null); }}
                data-testid="button-receive-another"
              >
                Receive Another
              </Button>
              <Button variant="ghost" className="w-full" onClick={handleCloseReceive} data-testid="button-close-receive">
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Material *</Label>
                <Popover open={materialSearchOpen} onOpenChange={setMaterialSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal"
                      data-testid="select-receive-material"
                    >
                      {selectedReceiveMaterial ? selectedReceiveMaterial.name : 'Select material...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search materials..." />
                      <CommandList>
                        <CommandEmpty>No material found.</CommandEmpty>
                        <CommandGroup>
                          {materials.map(material => (
                            <CommandItem
                              key={material.id}
                              value={`${material.sku} ${material.name}`}
                              onSelect={() => {
                                setReceiveForm({ ...receiveForm, materialId: material.id });
                                setMaterialSearchOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", receiveForm.materialId === material.id ? "opacity-100" : "opacity-0")} />
                              {material.sku ? `${material.sku} — ` : ''}{material.name} ({material.unit})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 500"
                    value={receiveForm.quantity}
                    onChange={(e) => setReceiveForm({ ...receiveForm, quantity: e.target.value })}
                    data-testid="input-receive-quantity"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Source Type</Label>
                  <Select
                    value={receiveForm.sourceType}
                    onValueChange={(v) => setReceiveForm({ ...receiveForm, sourceType: v as typeof receiveForm.sourceType })}
                  >
                    <SelectTrigger data-testid="select-receive-source-type">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supplier">Supplier</SelectItem>
                      <SelectItem value="farmer">Farmer</SelectItem>
                      <SelectItem value="internal_batch">Internal Batch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Supplier / Source Name</Label>
                  <Input
                    placeholder="e.g. Farm Fresh Co."
                    value={receiveForm.supplierName}
                    onChange={(e) => setReceiveForm({ ...receiveForm, supplierName: e.target.value, sourceName: e.target.value })}
                    data-testid="input-receive-supplier-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Supplier Lot #</Label>
                  <Input
                    placeholder="e.g. SL-2024-001"
                    value={receiveForm.supplierLot}
                    onChange={(e) => setReceiveForm({ ...receiveForm, supplierLot: e.target.value })}
                    data-testid="input-receive-supplier-lot"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Received Date</Label>
                  <Input
                    type="date"
                    value={receiveForm.receivedDate}
                    onChange={(e) => setReceiveForm({ ...receiveForm, receivedDate: e.target.value })}
                    data-testid="input-receive-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expiry Date (optional)</Label>
                  <Input
                    type="date"
                    value={receiveForm.expiryDate}
                    onChange={(e) => setReceiveForm({ ...receiveForm, expiryDate: e.target.value })}
                    data-testid="input-receive-expiry"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input
                  placeholder="Any additional notes..."
                  value={receiveForm.notes}
                  onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })}
                  data-testid="input-receive-notes"
                />
              </div>
            </div>
          )}

          {!receivedLot && (
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseReceive}>Cancel</Button>
              <Button onClick={handleReceiveStock} disabled={receiveStock.isPending} data-testid="button-submit-receive">
                {receiveStock.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Receive Stock
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Add New Product Dialog */}
      <Dialog open={isCreateProductOpen} onOpenChange={setIsCreateProductOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>Create a new product and assign it to a category</DialogDescription>
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
                <SelectTrigger data-testid="select-product-unit"><SelectValue placeholder="Select unit" /></SelectTrigger>
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
              <Select value={productForm.categoryId || ''} onValueChange={(v) => setProductForm({ ...productForm, categoryId: v || null })}>
                <SelectTrigger data-testid="select-product-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fruit Code</Label>
              <Input
                placeholder="e.g. SW, BW, PP"
                value={productForm.fruitCode}
                onChange={(e) => setProductForm({ ...productForm, fruitCode: e.target.value.toUpperCase() })}
                maxLength={5}
                data-testid="input-product-fruit-code"
              />
              <p className="text-xs text-muted-foreground">
                Used in SOP batch codes. e.g. SW = Strawberry Whole, BW = Blueberry Whole
              </p>
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
              <Input value={materialForm.sku} onChange={(e) => setMaterialForm({ ...materialForm, sku: e.target.value })} placeholder="Optional" data-testid="input-edit-material-sku" />
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
                <SelectTrigger data-testid="select-edit-material-unit"><SelectValue placeholder="Select unit" /></SelectTrigger>
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
              <Select value={materialForm.categoryId || ''} onValueChange={(v) => setMaterialForm({ ...materialForm, categoryId: v || null })}>
                <SelectTrigger data-testid="select-edit-material-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}
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

      {/* Edit Product Dialog */}
      <Dialog open={isEditProductOpen} onOpenChange={setIsEditProductOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Good</DialogTitle>
            <DialogDescription>Update product details and categories</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} placeholder="Optional" data-testid="input-edit-product-sku" />
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
                <SelectTrigger data-testid="select-edit-product-unit"><SelectValue placeholder="Select unit" /></SelectTrigger>
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
              <Select value={productForm.categoryId || ''} onValueChange={(v) => setProductForm({ ...productForm, categoryId: v || null })}>
                <SelectTrigger data-testid="select-edit-product-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fruit Code</Label>
              <Input
                placeholder="e.g. SW, BW, PP"
                value={productForm.fruitCode}
                onChange={(e) => setProductForm({ ...productForm, fruitCode: e.target.value.toUpperCase() })}
                maxLength={5}
                data-testid="input-edit-product-fruit-code"
              />
              <p className="text-xs text-muted-foreground">
                Used in SOP batch codes. e.g. SW = Strawberry Whole, BW = Blueberry Whole
              </p>
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

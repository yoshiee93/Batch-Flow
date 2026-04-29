import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Loader2, AlertCircle, Pencil, Trash2, Settings2, Tags, LayoutList, Leaf, Database, Download, Upload, ShieldAlert } from 'lucide-react';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, useProducts, useUpdateProduct, type Category, type Product } from '@/features/catalog/api';
import { PROCESS_CODE_MAP, FRUIT_CODE_MAP } from '@shared/batchCodeConfig';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/use-settings';
import { useRole } from '@/contexts/AuthContext';

export default function Settings() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    excludeFromYield: false,
    showInTabs: true,
    sortOrder: 0,
    processCode: '',
  });

  const [isFruitCodeDialogOpen, setIsFruitCodeDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [fruitCodeInput, setFruitCodeInput] = useState('');
  const [fruitCodeIsReceivable, setFruitCodeIsReceivable] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);

  const { canManageSettings, isAdmin } = useRole();

  const { data: categories = [], isLoading, isError } = useCategories();
  const { data: products = [] } = useProducts();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const updateProduct = useUpdateProduct();
  const { toast } = useToast();
  const { settings, updateSetting } = useSettings();

  const handleFruitCodeEdit = (product: Product) => {
    setSelectedProduct(product);
    setFruitCodeInput(product.fruitCode || '');
    setFruitCodeIsReceivable(product.isReceivable);
    setIsFruitCodeDialogOpen(true);
  };

  const handleFruitCodeSave = async () => {
    if (!selectedProduct) return;
    try {
      await updateProduct.mutateAsync({
        id: selectedProduct.id,
        fruitCode: fruitCodeInput.toUpperCase() || null,
        isReceivable: fruitCodeIsReceivable,
      });
      toast({ title: "Product updated", description: `Settings for "${selectedProduct.name}" updated` });
      setIsFruitCodeDialogOpen(false);
      setSelectedProduct(null);
    } catch {
      toast({ title: "Error", description: "Failed to update product", variant: "destructive" });
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/admin/export', { credentials: 'include' });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `ginas-table-export-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Export complete', description: 'Database snapshot downloaded successfully.' });
    } catch {
      toast({ title: 'Export failed', description: 'Could not export database.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingImportFile(file);
    setIsImportConfirmOpen(true);
    e.target.value = '';
  };

  const handleImportConfirm = async () => {
    if (!pendingImportFile) return;
    setIsImportConfirmOpen(false);
    setIsImporting(true);
    try {
      const text = await pendingImportFile.text();
      const payload = JSON.parse(text);
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      toast({ title: 'Import complete', description: 'Database restored successfully from backup.' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Import failed';
      toast({ title: 'Import failed', description: message, variant: 'destructive' });
    } finally {
      setIsImporting(false);
      setPendingImportFile(null);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', excludeFromYield: false, showInTabs: true, sortOrder: 0, processCode: '' });
  };

  const handleCreate = async () => {
    if (!formData.name) {
      toast({ title: "Missing fields", description: "Please enter a category name", variant: "destructive" });
      return;
    }
    try {
      await createCategory.mutateAsync({
        name: formData.name,
        excludeFromYield: formData.excludeFromYield,
        showInTabs: formData.showInTabs,
        isDefault: false,
        sortOrder: formData.sortOrder,
        processCode: formData.processCode || null,
      });
      toast({ title: "Category created", description: `Category "${formData.name}" created successfully` });
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({ title: "Error", description: "Failed to create category", variant: "destructive" });
    }
  };

  const handleEditClick = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      excludeFromYield: category.excludeFromYield,
      showInTabs: category.showInTabs,
      sortOrder: category.sortOrder,
      processCode: category.processCode || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedCategory || !formData.name) {
      toast({ title: "Missing fields", description: "Please enter a category name", variant: "destructive" });
      return;
    }
    try {
      await updateCategory.mutateAsync({
        id: selectedCategory.id,
        name: formData.name,
        excludeFromYield: formData.excludeFromYield,
        showInTabs: formData.showInTabs,
        sortOrder: formData.sortOrder,
        processCode: formData.processCode || null,
      });
      toast({ title: "Category updated", description: `Category "${formData.name}" updated successfully` });
      setIsEditDialogOpen(false);
      setSelectedCategory(null);
      resetForm();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update category", variant: "destructive" });
    }
  };

  const handleDelete = async (category: Category) => {
    try {
      await deleteCategory.mutateAsync(category.id);
      toast({ title: "Category deleted", description: `Category "${category.name}" has been removed` });
    } catch (error: any) {
      const message = error?.message || "Failed to delete category. It may still have products assigned.";
      toast({ title: "Cannot delete category", description: message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]" data-testid="loading-indicator">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-destructive" data-testid="error-message">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>Failed to load settings</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Settings2 className="h-6 w-6 sm:h-8 sm:w-8" />
            Settings
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">Configure system settings and categories</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutList className="h-5 w-5" />
            Display Preferences
          </CardTitle>
          <CardDescription>
            Customize how information is displayed throughout the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="cards-expanded">Expand cards by default</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, order cards on the dashboard and order details will be expanded by default
              </p>
            </div>
            <Switch
              id="cards-expanded"
              checked={settings.cardsExpandedByDefault}
              onCheckedChange={(checked) => updateSetting('cardsExpandedByDefault', checked)}
              data-testid="switch-cards-expanded"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5" />
              Product Categories
            </CardTitle>
            <CardDescription>
              Manage categories used to organize products. Categories control inventory tabs and yield calculations.
            </CardDescription>
          </div>
          {canManageSettings && (
            <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-add-category">
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tags className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No categories defined yet</p>
              <p className="text-sm">Add categories to organize your products</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Name</TableHead>
                    <TableHead className="text-center min-w-[80px]">Sort Order</TableHead>
                    <TableHead className="text-center min-w-[100px]">Process Code</TableHead>
                    <TableHead className="text-center min-w-[100px]">Show in Tabs</TableHead>
                    <TableHead className="text-center min-w-[120px]">Exclude from Yield</TableHead>
                    <TableHead className="text-center min-w-[70px]">Default</TableHead>
                    <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id} data-testid={`row-category-${category.id}`}>
                    <TableCell className="font-medium" data-testid={`text-category-name-${category.id}`}>
                      {category.name}
                    </TableCell>
                    <TableCell className="text-center">{category.sortOrder}</TableCell>
                    <TableCell className="text-center">
                      {category.processCode ? (
                        <span className="font-mono font-medium text-primary">
                          {category.processCode}
                          <span className="text-muted-foreground font-normal text-xs ml-1">
                            — {PROCESS_CODE_MAP[category.processCode] || ''}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {category.showInTabs ? (
                        <span className="text-green-600">Yes</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {category.excludeFromYield ? (
                        <span className="text-amber-600">Yes</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {category.isDefault ? (
                        <span className="text-muted-foreground text-sm">System</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {canManageSettings && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(category)}
                            data-testid={`button-edit-category-${category.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {!category.isDefault && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-delete-category-${category.id}`}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{category.name}"? Products using this category will need to be reassigned.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(category)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5" />
              SOP Fruit Codes
            </CardTitle>
            <CardDescription>
              Assign a fruit code to each product for SOP batch code generation. Codes must be 1–5 alphanumeric characters (e.g. SW = Strawberry Whole).
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Leaf className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No products defined yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Product</TableHead>
                    <TableHead className="min-w-[80px]">SKU</TableHead>
                    <TableHead className="text-center min-w-[120px]">Fruit Code</TableHead>
                    <TableHead className="text-right min-w-[80px]">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id} data-testid={`row-product-fruitcode-${product.id}`}>
                      <TableCell className="font-medium" data-testid={`text-product-name-fruitcode-${product.id}`}>{product.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{product.sku}</TableCell>
                      <TableCell className="text-center">
                        {product.fruitCode ? (
                          <span className="font-mono font-medium text-primary">
                            {product.fruitCode}
                            <span className="text-muted-foreground font-normal text-xs ml-1">
                              — {FRUIT_CODE_MAP[product.fruitCode] || ''}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {canManageSettings && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleFruitCodeEdit(product)}
                            data-testid={`button-edit-fruitcode-${product.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Management
            </CardTitle>
            <CardDescription>
              Export a full backup of all database records, or restore from a previously exported file.
              These actions affect all data across the entire system.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <Download className="h-4 w-4 text-primary" />
                  Export Database
                </div>
                <p className="text-sm text-muted-foreground">
                  Downloads a complete JSON snapshot of all tables — materials, products, batches, lots, orders, recipes, and more.
                </p>
                <Button
                  variant="outline"
                  onClick={handleExport}
                  disabled={isExporting}
                  data-testid="button-export-database"
                >
                  {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                  {isExporting ? 'Exporting...' : 'Download Backup'}
                </Button>
              </div>

              <div className="flex-1 rounded-lg border border-destructive/30 p-4 space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <Upload className="h-4 w-4 text-destructive" />
                  Import / Restore
                </div>
                <p className="text-sm text-muted-foreground">
                  Restore the database from a backup file. <span className="text-destructive font-medium">This will overwrite all existing data.</span>
                </p>
                <label>
                  <Button
                    variant="outline"
                    className="border-destructive/50 text-destructive hover:bg-destructive/10 cursor-pointer"
                    disabled={isImporting}
                    asChild
                    data-testid="button-import-database"
                  >
                    <span>
                      {isImporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                      {isImporting ? 'Restoring...' : 'Restore from Backup'}
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={handleImportFileSelect}
                        data-testid="input-import-file"
                      />
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={isImportConfirmOpen} onOpenChange={setIsImportConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Confirm Database Restore
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>You are about to restore the database from <strong>{pendingImportFile?.name}</strong>.</p>
                <p className="text-destructive font-medium">This will permanently overwrite ALL existing data in the system, including batches, lots, orders, inventory, and users.</p>
                <p>This action cannot be undone. Make sure you have a current backup before proceeding.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-import" onClick={() => setPendingImportFile(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleImportConfirm}
              data-testid="button-confirm-import"
            >
              Yes, Overwrite Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isFruitCodeDialogOpen} onOpenChange={setIsFruitCodeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product Settings</DialogTitle>
            <DialogDescription>
              Configure SOP fruit code and stock receiving for "{selectedProduct?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fruit-code-input">Fruit Code</Label>
              <Input
                id="fruit-code-input"
                value={fruitCodeInput}
                onChange={(e) => setFruitCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. SW, BW, PP"
                maxLength={5}
                data-testid="input-fruitcode-edit"
              />
              <p className="text-xs text-muted-foreground">1–5 alphanumeric characters. Leave blank to clear. Known codes: SW = Strawberry Whole, BW = Blueberry Whole, PP = Passion Fruit Puree.</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Can be received into stock</Label>
                <p className="text-xs text-muted-foreground">Allow this product to appear in the Receive Stock form</p>
              </div>
              <Switch
                checked={fruitCodeIsReceivable}
                onCheckedChange={setFruitCodeIsReceivable}
                data-testid="switch-settings-product-receivable"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsFruitCodeDialogOpen(false); setSelectedProduct(null); }}>
              Cancel
            </Button>
            <Button onClick={handleFruitCodeSave} disabled={updateProduct.isPending} data-testid="button-confirm-fruitcode">
              {updateProduct.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>
              Create a new category to organize products
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Powders"
                data-testid="input-category-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-processCode">Process Code</Label>
              <Input
                id="create-processCode"
                value={formData.processCode}
                onChange={(e) => setFormData({ ...formData, processCode: e.target.value.toUpperCase() })}
                placeholder="e.g., 3, 4, 6"
                maxLength={1}
                data-testid="input-category-process-code"
              />
              <p className="text-xs text-muted-foreground">
                Used in SOP batch codes. Known codes: 3 = Fresh/IQF, 4 = Freeze Dried, 6 = Frozen
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-sortOrder">Sort Order</Label>
              <Input
                id="create-sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                placeholder="0"
                data-testid="input-sort-order"
              />
              <p className="text-xs text-muted-foreground">Lower numbers appear first in lists</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="create-showInTabs">Show in Inventory Tabs</Label>
                <p className="text-xs text-muted-foreground">Display this category as a tab on the Inventory page</p>
              </div>
              <Switch
                id="create-showInTabs"
                checked={formData.showInTabs}
                onCheckedChange={(checked) => setFormData({ ...formData, showInTabs: checked })}
                data-testid="switch-show-in-tabs"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="create-excludeFromYield">Exclude from Yield</Label>
                <p className="text-xs text-muted-foreground">Products in this category won't count toward yield percentage</p>
              </div>
              <Switch
                id="create-excludeFromYield"
                checked={formData.excludeFromYield}
                onCheckedChange={(checked) => setFormData({ ...formData, excludeFromYield: checked })}
                data-testid="switch-exclude-yield"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createCategory.isPending} data-testid="button-confirm-create">
              {createCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update category settings
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Powders"
                data-testid="input-edit-category-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-processCode">Process Code</Label>
              <Input
                id="edit-processCode"
                value={formData.processCode}
                onChange={(e) => setFormData({ ...formData, processCode: e.target.value.toUpperCase() })}
                placeholder="e.g., 3, 4, 6"
                maxLength={1}
                data-testid="input-edit-category-process-code"
              />
              <p className="text-xs text-muted-foreground">
                Used in SOP batch codes. Known codes: 3 = Fresh/IQF, 4 = Freeze Dried, 6 = Frozen
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-sortOrder">Sort Order</Label>
              <Input
                id="edit-sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                placeholder="0"
                data-testid="input-edit-sort-order"
              />
              <p className="text-xs text-muted-foreground">Lower numbers appear first in lists</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="edit-showInTabs">Show in Inventory Tabs</Label>
                <p className="text-xs text-muted-foreground">Display this category as a tab on the Inventory page</p>
              </div>
              <Switch
                id="edit-showInTabs"
                checked={formData.showInTabs}
                onCheckedChange={(checked) => setFormData({ ...formData, showInTabs: checked })}
                data-testid="switch-edit-show-in-tabs"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="edit-excludeFromYield">Exclude from Yield</Label>
                <p className="text-xs text-muted-foreground">Products in this category won't count toward yield percentage</p>
              </div>
              <Switch
                id="edit-excludeFromYield"
                checked={formData.excludeFromYield}
                onCheckedChange={(checked) => setFormData({ ...formData, excludeFromYield: checked })}
                data-testid="switch-edit-exclude-yield"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setSelectedCategory(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateCategory.isPending} data-testid="button-confirm-update">
              {updateCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

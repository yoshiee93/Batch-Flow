import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Plus, Loader2, AlertCircle, Pencil, Trash2, Settings2, Tags, LayoutList, Leaf,
  Database, Download, Upload, ShieldAlert, Tag, Wrench, ShieldCheck, Construction, Printer, History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, useProducts, useUpdateProduct, type Category, type Product } from '@/features/catalog/api';
import { PROCESS_CODE_MAP, FRUIT_CODE_MAP } from '@shared/batchCodeConfig';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/use-settings';
import { useRole } from '@/contexts/AuthContext';
import { queryClient } from '@/lib/queryClient';
import LabelTemplatesPanel from '@/features/labels/pages/Labels';
import CustomLabelBuilder from '@/features/labels/components/CustomLabelBuilder';
import PrintCustomLabel from '@/features/labels/components/PrintCustomLabel';
import PrintHistoryPanel from '@/features/labels/components/PrintHistoryPanel';

const TAB_VALUES = ['general', 'production', 'labels', 'data', 'security'] as const;
type TabValue = typeof TAB_VALUES[number];

interface SectionDescriptor {
  id: string;
  label: string;
  icon: LucideIcon;
  render: () => React.ReactNode;
}

function readQueryParams(): { tab: TabValue; section: string | null } {
  if (typeof window === 'undefined') return { tab: 'general', section: null };
  const p = new URLSearchParams(window.location.search);
  const t = p.get('tab');
  return {
    tab: (TAB_VALUES as readonly string[]).includes(t ?? '') ? (t as TabValue) : 'general',
    section: p.get('section'),
  };
}

export default function Settings() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    excludeFromYield: false,
    showInTabs: true,
    showInInventory: true,
    showInReceiveStock: true,
    showInProductionBatch: true,
    showInProductionInputs: true,
    showInProductionOutputs: true,
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
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<TabValue>(() => readQueryParams().tab);
  const [activeSection, setActiveSection] = useState<string | null>(() => readQueryParams().section);

  useEffect(() => {
    const onPop = () => {
      const { tab, section } = readQueryParams();
      setActiveTab(tab);
      setActiveSection(section);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const [processCodeEdits, setProcessCodeEdits] = useState<Record<string, string>>({});

  const { data: categories = [], isLoading, isError } = useCategories();
  const { data: products = [] } = useProducts();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const updateProduct = useUpdateProduct();
  const { toast } = useToast();
  const { settings, updateSetting } = useSettings();

  const handleProcessCodeSave = async (category: Category) => {
    const next = (processCodeEdits[category.id] ?? category.processCode ?? '').toUpperCase();
    const current = category.processCode ?? '';
    if (next === current) return;
    try {
      await updateCategory.mutateAsync({
        id: category.id,
        name: category.name,
        excludeFromYield: category.excludeFromYield,
        showInTabs: category.showInTabs,
        showInInventory: category.showInInventory,
        showInReceiveStock: category.showInReceiveStock,
        showInProductionBatch: category.showInProductionBatch,
        showInProductionInputs: category.showInProductionInputs,
        showInProductionOutputs: category.showInProductionOutputs,
        sortOrder: category.sortOrder,
        processCode: next || null,
      });
      toast({ title: "Process code updated", description: `"${category.name}" set to ${next || 'none'}` });
      setProcessCodeEdits(prev => {
        const copy = { ...prev };
        delete copy[category.id];
        return copy;
      });
    } catch {
      toast({ title: "Error", description: "Failed to update process code", variant: "destructive" });
    }
  };

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
      queryClient.clear();
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
    setFormData({ name: '', excludeFromYield: false, showInTabs: true, showInInventory: true, showInReceiveStock: true, showInProductionBatch: true, showInProductionInputs: true, showInProductionOutputs: true, sortOrder: 0, processCode: '' });
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
        showInInventory: formData.showInInventory,
        showInReceiveStock: formData.showInReceiveStock,
        showInProductionBatch: formData.showInProductionBatch,
        showInProductionInputs: formData.showInProductionInputs,
        showInProductionOutputs: formData.showInProductionOutputs,
        isDefault: false,
        sortOrder: formData.sortOrder,
        processCode: formData.processCode || null,
      });
      toast({ title: "Category created", description: `Category "${formData.name}" created successfully` });
      setIsCreateDialogOpen(false);
      resetForm();
    } catch {
      toast({ title: "Error", description: "Failed to create category", variant: "destructive" });
    }
  };

  const handleEditClick = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      excludeFromYield: category.excludeFromYield,
      showInTabs: category.showInTabs,
      showInInventory: category.showInInventory,
      showInReceiveStock: category.showInReceiveStock,
      showInProductionBatch: category.showInProductionBatch,
      showInProductionInputs: category.showInProductionInputs,
      showInProductionOutputs: category.showInProductionOutputs,
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
        showInInventory: formData.showInInventory,
        showInReceiveStock: formData.showInReceiveStock,
        showInProductionBatch: formData.showInProductionBatch,
        showInProductionInputs: formData.showInProductionInputs,
        showInProductionOutputs: formData.showInProductionOutputs,
        sortOrder: formData.sortOrder,
        processCode: formData.processCode || null,
      });
      toast({ title: "Category updated", description: `Category "${formData.name}" updated successfully` });
      setIsEditDialogOpen(false);
      setSelectedCategory(null);
      resetForm();
    } catch {
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

  // ------------------------------------------------------------------
  // Section content render fns (closures over local state + handlers)
  // ------------------------------------------------------------------

  const renderDisplayPreferences = () => (
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
  );

  const renderFruitCodes = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Leaf className="h-5 w-5" />
          SOP Fruit Codes
        </CardTitle>
        <CardDescription>
          Assign a fruit code to each product for SOP batch code generation. Codes must be 1–5 alphanumeric characters (e.g. SW = Strawberry Whole).
        </CardDescription>
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
  );

  const renderProcessCodes = () => (
    <Card data-testid="card-process-codes">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Process Codes
        </CardTitle>
        <CardDescription>
          Assign a single-character process code to each category for SOP batch code generation. Known codes: 3 = Fresh/IQF, 4 = Freeze Dried, 6 = Frozen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Tags className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No categories defined yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">Category</TableHead>
                  <TableHead className="text-center min-w-[120px]">Process Code</TableHead>
                  <TableHead className="min-w-[160px]">Meaning</TableHead>
                  <TableHead className="text-right min-w-[100px]">Save</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => {
                  const draft = processCodeEdits[category.id] ?? category.processCode ?? '';
                  const dirty = draft.toUpperCase() !== (category.processCode ?? '');
                  return (
                    <TableRow key={category.id} data-testid={`row-process-code-${category.id}`}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-center">
                        <Input
                          value={draft}
                          onChange={(e) => setProcessCodeEdits(prev => ({ ...prev, [category.id]: e.target.value.toUpperCase() }))}
                          placeholder="—"
                          maxLength={1}
                          className="w-16 mx-auto text-center font-mono"
                          disabled={!canManageSettings}
                          data-testid={`input-process-code-${category.id}`}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {draft ? (PROCESS_CODE_MAP[draft.toUpperCase()] || <span className="italic">Custom</span>) : <span className="italic">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {canManageSettings && (
                          <Button
                            size="sm"
                            variant={dirty ? 'default' : 'outline'}
                            disabled={!dirty || updateCategory.isPending}
                            onClick={() => handleProcessCodeSave(category)}
                            data-testid={`button-save-process-code-${category.id}`}
                          >
                            {updateCategory.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                            Save
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderLabelTemplates = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Label Templates
        </CardTitle>
        <CardDescription>
          Configure which fields appear on printed labels for raw intake, finished outputs, and batches. Templates can be customer-specific or system-wide defaults.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LabelTemplatesPanel />
      </CardContent>
    </Card>
  );

  const renderCategories = () => (
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
  );

  const renderImportExport = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Export / Import
        </CardTitle>
        <CardDescription>
          Export a full backup of all database records, or restore from a previously exported file. These actions affect all data across the entire system.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border p-4 space-y-2">
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

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-destructive">
            <ShieldAlert className="h-4 w-4" />
            Danger Zone
          </div>
          <div className="rounded-lg border border-destructive/30 p-4 space-y-2">
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
  );

  const renderSecurityRoles = () => (
    <Card data-testid="card-security-roles">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          User Roles & Permissions
        </CardTitle>
        <CardDescription>
          Overview of system roles and what each role can do. User account and audit-log management will arrive here in a future update.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border bg-muted/40 p-6 text-sm text-muted-foreground space-y-2">
          <p><strong className="text-foreground">Admin</strong> — full access to settings, label templates, data import/export, and all production data.</p>
          <p><strong className="text-foreground">Production</strong> — manages batches, inputs, outputs, and finalisation.</p>
          <p><strong className="text-foreground">Inventory</strong> — receives stock, manages lots, and views inventory.</p>
          <p><strong className="text-foreground">View Only</strong> — read-only access to dashboards and traceability.</p>
        </div>
      </CardContent>
    </Card>
  );

  // Build sectionsByTab (admin-gated sections only added for admins)
  const sectionsByTab: Record<TabValue, SectionDescriptor[]> = {
    general: [
      { id: 'display-preferences', label: 'Display Preferences', icon: LayoutList, render: renderDisplayPreferences },
    ],
    production: [
      { id: 'fruit-codes', label: 'Fruit Codes (SOP)', icon: Leaf, render: renderFruitCodes },
      { id: 'process-codes', label: 'Process Codes', icon: Wrench, render: renderProcessCodes },
    ],
    labels: [
      { id: 'templates', label: 'Templates', icon: Tag, render: renderLabelTemplates },
      ...(isAdmin
        ? [
            { id: 'builder', label: 'Custom Label Builder', icon: Construction, render: () => <CustomLabelBuilder /> },
            { id: 'print', label: 'Print Custom Label', icon: Printer, render: () => <PrintCustomLabel /> },
            { id: 'history', label: 'Print History', icon: History, render: () => <PrintHistoryPanel /> },
          ]
        : []),
    ],
    data: [
      { id: 'categories', label: 'Product Categories', icon: Tags, render: renderCategories },
      ...(isAdmin
        ? [{ id: 'import-export', label: 'Export / Import', icon: Database, render: renderImportExport }]
        : []),
    ],
    security: [
      { id: 'roles', label: 'User Roles & Permissions', icon: ShieldCheck, render: renderSecurityRoles },
    ],
  };

  const tabSections = sectionsByTab[activeTab];
  const resolvedSectionId =
    activeSection && tabSections.some((s) => s.id === activeSection)
      ? activeSection
      : tabSections[0]?.id ?? null;
  const activeSectionDescriptor = tabSections.find((s) => s.id === resolvedSectionId) ?? tabSections[0];

  function buildUrl(tab: TabValue, sectionId: string | null): string {
    const params = new URLSearchParams();
    const firstId = sectionsByTab[tab][0]?.id ?? null;
    const useSection = sectionId && sectionId !== firstId;
    if (tab !== 'general') params.set('tab', tab);
    if (useSection && sectionId) params.set('section', sectionId);
    const qs = params.toString();
    return `/settings${qs ? `?${qs}` : ''}`;
  }

  const handleTabChange = (value: string) => {
    if (!(TAB_VALUES as readonly string[]).includes(value)) return;
    const next = value as TabValue;
    setActiveTab(next);
    setActiveSection(null);
    navigate(buildUrl(next, null), { replace: true });
  };

  const handleSectionChange = (sectionId: string) => {
    if (!tabSections.some((s) => s.id === sectionId)) return;
    setActiveSection(sectionId);
    navigate(buildUrl(activeTab, sectionId), { replace: true });
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

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid grid-cols-3 sm:grid-cols-5 w-full">
          <TabsTrigger value="general" data-testid="tab-general">
            <Settings2 className="h-4 w-4 mr-1.5 hidden sm:inline" />
            General
          </TabsTrigger>
          <TabsTrigger value="production" data-testid="tab-production">
            <Wrench className="h-4 w-4 mr-1.5 hidden sm:inline" />
            Production
          </TabsTrigger>
          <TabsTrigger value="labels" data-testid="tab-labels">
            <Tag className="h-4 w-4 mr-1.5 hidden sm:inline" />
            Labels
          </TabsTrigger>
          <TabsTrigger value="data" data-testid="tab-data">
            <Database className="h-4 w-4 mr-1.5 hidden sm:inline" />
            Data
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">
            <ShieldCheck className="h-4 w-4 mr-1.5 hidden sm:inline" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Mobile: stacked accordion */}
        <div className="md:hidden">
          <Accordion
            type="single"
            collapsible
            value={resolvedSectionId ?? undefined}
            onValueChange={(v) => v && handleSectionChange(v)}
            className="space-y-2"
          >
            {tabSections.map((s) => {
              const Icon = s.icon;
              return (
                <AccordionItem
                  key={s.id}
                  value={s.id}
                  className="border rounded-md px-3"
                  data-testid={`section-accordion-${s.id}`}
                >
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2 font-medium">
                      <Icon className="h-4 w-4" />
                      {s.label}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-2">{s.render()}</div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>

        {/* Desktop: side-rail + content */}
        <div className="hidden md:grid md:grid-cols-[220px_1fr] gap-6">
          <nav className="space-y-1" data-testid="settings-section-rail">
            {tabSections.map((s) => {
              const Icon = s.icon;
              const isActive = s.id === resolvedSectionId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSectionChange(s.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                  )}
                  data-testid={`section-link-${s.id}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{s.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="space-y-6 min-w-0" data-testid="settings-section-content">
            {activeSectionDescriptor?.render()}
          </div>
        </div>
      </Tabs>

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
              {!fruitCodeIsReceivable && !fruitCodeInput.trim() && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800" data-testid="warning-no-fruitcode">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
                  <p className="text-xs">This product is a finished good but has no fruit code. Lot numbers will use the generic format (FG-YYMMDD-NNNN) instead of matching the batch number.</p>
                </div>
              )}
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
            <div className="space-y-1">
              <Label className="text-sm font-medium">Section Visibility</Label>
              <p className="text-xs text-muted-foreground">Control where this category appears across the system. These flags only affect where items show up in forms and dropdowns — existing stock, lots, and traceability records are never affected.</p>
              <div className="rounded-md border divide-y mt-1">
                <div className="flex items-center justify-between px-3 py-2">
                  <Label htmlFor="create-showInTabs" className="font-normal text-sm cursor-pointer">Inventory tabs</Label>
                  <Switch id="create-showInTabs" checked={formData.showInTabs} onCheckedChange={(checked) => setFormData({ ...formData, showInTabs: checked })} data-testid="switch-show-in-tabs" />
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <Label htmlFor="create-showInReceiveStock" className="font-normal text-sm cursor-pointer">Receive Stock form</Label>
                  <Switch id="create-showInReceiveStock" checked={formData.showInReceiveStock} onCheckedChange={(checked) => setFormData({ ...formData, showInReceiveStock: checked })} data-testid="switch-show-in-receive-stock" />
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <Label htmlFor="create-showInProductionBatch" className="font-normal text-sm cursor-pointer">Create Batch product list</Label>
                  <Switch id="create-showInProductionBatch" checked={formData.showInProductionBatch} onCheckedChange={(checked) => setFormData({ ...formData, showInProductionBatch: checked })} data-testid="switch-show-in-production-batch" />
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <Label htmlFor="create-showInProductionInputs" className="font-normal text-sm cursor-pointer">Batch inputs (product type)</Label>
                  <Switch id="create-showInProductionInputs" checked={formData.showInProductionInputs} onCheckedChange={(checked) => setFormData({ ...formData, showInProductionInputs: checked })} data-testid="switch-show-in-production-inputs" />
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <Label htmlFor="create-showInProductionOutputs" className="font-normal text-sm cursor-pointer">Batch outputs</Label>
                  <Switch id="create-showInProductionOutputs" checked={formData.showInProductionOutputs} onCheckedChange={(checked) => setFormData({ ...formData, showInProductionOutputs: checked })} data-testid="switch-show-in-production-outputs" />
                </div>
              </div>
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
            <div className="space-y-1">
              <Label className="text-sm font-medium">Section Visibility</Label>
              <p className="text-xs text-muted-foreground">Control where this category appears across the system. These flags only affect where items show up in forms and dropdowns — existing stock, lots, and traceability records are never affected.</p>
              <div className="rounded-md border divide-y mt-1">
                <div className="flex items-center justify-between px-3 py-2">
                  <Label htmlFor="edit-showInTabs" className="font-normal text-sm cursor-pointer">Inventory tabs</Label>
                  <Switch id="edit-showInTabs" checked={formData.showInTabs} onCheckedChange={(checked) => setFormData({ ...formData, showInTabs: checked })} data-testid="switch-edit-show-in-tabs" />
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <Label htmlFor="edit-showInReceiveStock" className="font-normal text-sm cursor-pointer">Receive Stock form</Label>
                  <Switch id="edit-showInReceiveStock" checked={formData.showInReceiveStock} onCheckedChange={(checked) => setFormData({ ...formData, showInReceiveStock: checked })} data-testid="switch-edit-show-in-receive-stock" />
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <Label htmlFor="edit-showInProductionBatch" className="font-normal text-sm cursor-pointer">Create Batch product list</Label>
                  <Switch id="edit-showInProductionBatch" checked={formData.showInProductionBatch} onCheckedChange={(checked) => setFormData({ ...formData, showInProductionBatch: checked })} data-testid="switch-edit-show-in-production-batch" />
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <Label htmlFor="edit-showInProductionInputs" className="font-normal text-sm cursor-pointer">Batch inputs (product type)</Label>
                  <Switch id="edit-showInProductionInputs" checked={formData.showInProductionInputs} onCheckedChange={(checked) => setFormData({ ...formData, showInProductionInputs: checked })} data-testid="switch-edit-show-in-production-inputs" />
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <Label htmlFor="edit-showInProductionOutputs" className="font-normal text-sm cursor-pointer">Batch outputs</Label>
                  <Switch id="edit-showInProductionOutputs" checked={formData.showInProductionOutputs} onCheckedChange={(checked) => setFormData({ ...formData, showInProductionOutputs: checked })} data-testid="switch-edit-show-in-production-outputs" />
                </div>
              </div>
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

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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { applyServerFieldErrors } from '@/lib/applyServerFieldErrors';
import { ApiValidationError } from '@/lib/fetchApi';
import { Search, Plus, Loader2, AlertCircle, Pencil, Trash2, Package, Box, Layers, Printer, QrCode, CheckCircle2, Download, Camera, X as XIcon, ImageIcon, ThermometerSnowflake } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useMaterials, useProducts, useCategories, useLots, useBatches,
  useUpdateMaterial, useDeleteMaterial,
  useCreateProduct, useUpdateProduct, useDeleteProduct,
  useReceiveStock, useReceivableItems, useMarkBarcodePrinted,
  type Material, type Product, type Category, type Lot, type LotWithDetails, type ReceivableItem,
  type LotPhoto, type VisualInspection,
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers } from '@/features/quality/api';
import { fetchLabelTemplate, useRecordPrint } from '@/features/labels/api';
import { printAndRecord } from '@/lib/printAndRecord';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/contexts/AuthContext';
import { useSmartDefault } from '@/hooks/useSmartDefault';

const EMPTY_RECEIVE_FORM = {
  itemId: '',
  itemType: '' as '' | 'material' | 'product',
  quantity: '',
  supplierName: '',
  sourceName: '',
  supplierLot: '',
  sourceType: '' as '' | 'supplier' | 'farmer' | 'internal_batch',
  receivedDate: format(new Date(), 'yyyy-MM-dd'),
  expiryDate: '',
  notes: '',
  productTemperature: '',
  visualInspection: '' as '' | 'pass' | 'fail' | 'conditional',
  receivedById: '',
  freight: '',
  photos: [] as LotPhoto[],
};

const PHOTO_MAX_BYTES = 1_000_000;
const PHOTOS_TOTAL_MAX_BYTES = 5_000_000;
const VISUAL_INSPECTION_OPTIONS: { value: VisualInspection; label: string; className: string }[] = [
  { value: 'pass',        label: 'Pass',        className: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'conditional', label: 'Conditional', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  { value: 'fail',        label: 'Fail',        className: 'bg-red-100 text-red-800 border-red-300' },
];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function getInspectionBadgeClass(v: VisualInspection | null | undefined) {
  return VISUAL_INSPECTION_OPTIONS.find(o => o.value === v)?.className
    ?? 'bg-gray-100 text-gray-700 border-gray-300';
}

function getInspectionLabel(v: VisualInspection | null | undefined) {
  return VISUAL_INSPECTION_OPTIONS.find(o => o.value === v)?.label ?? null;
}

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

type CardFilter = 'all' | 'materials' | 'products' | 'lowstock' | 'lots';

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [lotSearchTerm, setLotSearchTerm] = useState('');
  const [cardFilter, setCardFilter] = useState<CardFilter>('all');
  const [selectedProductForBreakdown, setSelectedProductForBreakdown] = useState<Product | null>(null);

  const [isEditMaterialOpen, setIsEditMaterialOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [materialForm, setMaterialForm] = useState({
    sku: '', name: '', description: '', unit: 'KG', minStock: '0', currentStock: '0', categoryId: '' as string | null, isReceivable: true,
  });

  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const productSchema = z.object({
    sku: z.string().optional().or(z.literal('')),
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional().or(z.literal('')),
    unit: z.string().min(1, 'Unit is required'),
    minStock: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, { message: 'Min stock must be a non-negative number' }),
    currentStock: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, { message: 'Current stock must be a non-negative number' }),
    categoryId: z.string().nullable(),
    fruitCode: z.string().optional().or(z.literal('')),
    isReceivable: z.boolean(),
  });
  type ProductFormValues = z.infer<typeof productSchema>;
  const productFormDefaults: ProductFormValues = { sku: '', name: '', description: '', unit: 'KG', minStock: '0', currentStock: '0', categoryId: null, fruitCode: '', isReceivable: false };
  const productRhf = useForm<ProductFormValues>({ resolver: zodResolver(productSchema), defaultValues: productFormDefaults, mode: 'onChange' });
  const productForm = productRhf.watch();
  const setProductForm = (next: Partial<ProductFormValues> | ((prev: ProductFormValues) => ProductFormValues)) => {
    const current = productRhf.getValues();
    const partial = typeof next === 'function' ? next(current) : next;
    (Object.keys(partial) as Array<keyof ProductFormValues>).forEach((key) => {
      const value = partial[key];
      if (value !== undefined) {
        productRhf.setValue(key, value as ProductFormValues[typeof key], {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        });
      }
    });
  };

  const [isReceiveStockOpen, setIsReceiveStockOpen] = useState(false);
  const receiveSchema = z.object({
    itemId: z.string().min(1, 'Item is required'),
    itemType: z.union([z.literal(''), z.enum(['material', 'product'])]).refine((v) => v === 'material' || v === 'product', { message: 'Item is required' }),
    quantity: z.string()
      .min(1, 'Quantity is required')
      .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, { message: 'Quantity must be a positive number' }),
    supplierName: z.string().optional().or(z.literal('')),
    sourceName: z.string().optional().or(z.literal('')),
    supplierLot: z.string().optional().or(z.literal('')),
    sourceType: z.union([z.literal(''), z.enum(['supplier', 'farmer', 'internal_batch'])]),
    receivedDate: z.string().optional().or(z.literal('')),
    expiryDate: z.string().optional().or(z.literal('')),
    notes: z.string().optional().or(z.literal('')),
    productTemperature: z.string().refine((v) => v === '' || !isNaN(parseFloat(v)), { message: 'Temperature must be a number' }),
    visualInspection: z.union([z.literal(''), z.enum(['pass', 'fail', 'conditional'])]),
    receivedById: z.string(),
    freight: z.string(),
    photos: z.array(z.object({
      dataUrl: z.string().min(1),
      name: z.string().optional(),
      size: z.number().optional(),
    }))
      .max(8, 'At most 8 photos')
      .refine((arr) => arr.reduce((s, p) => s + p.dataUrl.length, 0) <= 7_500_000, { message: 'Photos exceed 5 MB total' }),
  });
  type ReceiveFormValues = {
    itemId: string;
    itemType: '' | 'material' | 'product';
    quantity: string;
    supplierName: string;
    sourceName: string;
    supplierLot: string;
    sourceType: '' | 'supplier' | 'farmer' | 'internal_batch';
    receivedDate: string;
    expiryDate: string;
    notes: string;
    productTemperature: string;
    visualInspection: '' | 'pass' | 'fail' | 'conditional';
    receivedById: string;
    freight: string;
    photos: LotPhoto[];
  };
  const receiveRhf = useForm<ReceiveFormValues>({
    resolver: zodResolver(receiveSchema),
    defaultValues: EMPTY_RECEIVE_FORM as unknown as ReceiveFormValues,
    mode: 'onChange',
  });
  const receiveForm = receiveRhf.watch();
  const setReceiveForm = (next: Partial<ReceiveFormValues> | ((prev: ReceiveFormValues) => ReceiveFormValues)) => {
    const current = receiveRhf.getValues();
    const partial = typeof next === 'function' ? next(current) : next;
    (Object.keys(partial) as Array<keyof ReceiveFormValues>).forEach((key) => {
      const value = partial[key];
      if (value !== undefined) {
        receiveRhf.setValue(key, value as ReceiveFormValues[typeof key], {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        });
      }
    });
  };
  const [receivedLot, setReceivedLot] = useState<LotWithDetails | null>(null);
  const [itemSearchOpen, setItemSearchOpen] = useState(false);
  const [receiveCategoryFilter, setReceiveCategoryFilter] = useState<string>('all');
  const [receivedTemplateName, setReceivedTemplateName] = useState<string | null>(null);
  type RecentReceivePrint = {
    key: string;
    lot: LotWithDetails;
    printedAt: Date;
  };
  const [recentReceivePrints, setRecentReceivePrints] = useState<RecentReceivePrint[]>([]);

  const { canReceiveStock, canManageSettings } = useRole();
  const { user: currentUser } = useAuth();
  const { data: usersList = [] } = useUsers();
  const smartSupplier = useSmartDefault('receiveStock:supplier');
  const smartReceiveCategory = useSmartDefault('receiveStock:category');
  const smartProductCategory = useSmartDefault('product:category');

  const { data: materials = [], isLoading: materialsLoading, isError: materialsError } = useMaterials();
  const { data: products = [], isLoading: productsLoading, isError: productsError } = useProducts();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: lots = [], isLoading: lotsLoading } = useLots();
  const { data: batches = [] } = useBatches();
  const { data: receivableItems = [] } = useReceivableItems();

  const updateMaterial = useUpdateMaterial();
  const deleteMaterial = useDeleteMaterial();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const receiveStock = useReceiveStock();
  const markBarcodePrinted = useMarkBarcodePrinted();
  const recordPrint = useRecordPrint();
  const { toast } = useToast();

  const isLoading = materialsLoading || productsLoading || lotsLoading;
  const hasError = materialsError || productsError;

  const visibleCategories = categories.filter(c => c.showInTabs);

  useEffect(() => {
    if (visibleCategories.length > 0 && !activeTab) {
      setActiveTab(`cat-${visibleCategories[0].id}`);
    }
  }, [visibleCategories, activeTab]);

  const [lowStockOnly, setLowStockOnly] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('filter') === 'lowstock';
  });

  const [urlActionHandled, setUrlActionHandled] = useState(false);
  useEffect(() => {
    if (urlActionHandled) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'receive' || params.get('filter') === 'lowstock') {
      if (params.get('action') === 'receive') handleOpenReceive();
      window.history.replaceState(null, '', window.location.pathname);
      setUrlActionHandled(true);
    }
  }, [urlActionHandled]);

  const filteredMaterials = materials.filter(m => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.sku && m.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchesSearch) return false;
    if (cardFilter === 'products') return false;
    if ((lowStockOnly || cardFilter === 'lowstock') && parseFloat(m.currentStock) > parseFloat(m.minStock)) return false;
    return true;
  });

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchesSearch) return false;
    if (cardFilter === 'materials') return false;
    if ((lowStockOnly || cardFilter === 'lowstock') && parseFloat(p.currentStock) > parseFloat(p.minStock)) return false;
    return true;
  });

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

  async function handlePrintLabel(lot: Lot) {
    const itemName = getLotItemName(lot);
    const unit = getLotUnit(lot);
    const onAfter = () => { if (!lot.barcodePrintedAt) markBarcodePrinted.mutate(lot.id); };
    if (lot.lotType === 'finished_good' || lot.lotType === 'intermediate') {
      const srcBatch = lot.sourceBatchId ? batches.find(b => b.id === lot.sourceBatchId) : undefined;
      await printAndRecord({
        kind: 'finished_output',
        customerId: lot.customerId ?? null,
        legacyData: {
          template: 'finished_output',
          lotNumber: lot.lotNumber, barcodeValue: lot.barcodeValue, productName: itemName,
          quantity: lot.originalQuantity || lot.quantity, unit,
          producedDate: lot.producedDate || lot.receivedDate,
          sourceBatch: srcBatch?.batchCode || srcBatch?.batchNumber || 'N/A',
          expiryDate: lot.expiryDate,
        },
        entityType: 'lot', entityId: lot.id,
        displayName: itemName, secondaryName: lot.lotNumber,
        toast, recordPrint: (d) => recordPrint.mutate(d), onAfterPrint: onAfter,
      });
    } else {
      await printAndRecord({
        kind: 'raw_intake',
        customerId: lot.customerId ?? null,
        legacyData: {
          template: 'raw_intake',
          lotNumber: lot.lotNumber, barcodeValue: lot.barcodeValue, itemName,
          quantity: lot.originalQuantity || lot.quantity, unit,
          sourceLabel: lot.supplierName || lot.sourceName || undefined,
          receivedDate: lot.receivedDate, expiryDate: lot.expiryDate, supplierLot: lot.supplierLot,
        },
        entityType: 'lot', entityId: lot.id,
        displayName: itemName, secondaryName: lot.lotNumber,
        toast, recordPrint: (d) => recordPrint.mutate(d), onAfterPrint: onAfter,
      });
    }
  }

  const resetMaterialForm = () => setMaterialForm({ sku: '', name: '', description: '', unit: 'KG', minStock: '0', currentStock: '0', categoryId: null, isReceivable: true });
  const resetProductForm = () => setProductForm({ sku: '', name: '', description: '', unit: 'KG', minStock: '0', currentStock: '0', categoryId: null, fruitCode: '', isReceivable: false });

  const handleEditMaterialClick = (material: Material) => {
    setSelectedMaterial(material);
    setMaterialForm({
      sku: material.sku, name: material.name, description: material.description || '',
      unit: material.unit, minStock: material.minStock, currentStock: material.currentStock,
      categoryId: material.categoryId, isReceivable: material.isReceivable,
    });
    setIsEditMaterialOpen(true);
  };

  const handleUpdateMaterial = async () => {
    if (!selectedMaterial) return;
    const materialUpdateSchema = z.object({
      name: z.string().min(1, 'Name is required'),
      sku: z.string().optional().or(z.literal('')),
      unit: z.string().min(1, 'Unit is required'),
      minStock: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Must be ≥ 0'),
      currentStock: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Must be ≥ 0'),
    });
    const parsed = materialUpdateSchema.safeParse(materialForm);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      toast({ title: 'Validation', description: `${first.path.join('.')}: ${first.message}`, variant: 'destructive' });
      return;
    }
    try {
      await updateMaterial.mutateAsync({
        id: selectedMaterial.id, sku: materialForm.sku, name: materialForm.name, description: materialForm.description || null,
        unit: materialForm.unit, minStock: materialForm.minStock, currentStock: materialForm.currentStock,
        categoryId: materialForm.categoryId || null, isReceivable: materialForm.isReceivable,
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

  const handleCreateProduct = productRhf.handleSubmit(async (values) => {
    try {
      await createProduct.mutateAsync({
        sku: values.sku || '', name: values.name, description: values.description || null,
        unit: values.unit, minStock: values.minStock, currentStock: values.currentStock,
        categoryId: values.categoryId || null,
        fruitCode: values.fruitCode || null,
        isReceivable: values.isReceivable,
      });
      toast({ title: "Product created", description: `${values.name} added to inventory` });
      smartProductCategory.set(values.categoryId || '');
      setIsCreateProductOpen(false);
      productRhf.reset(productFormDefaults);
    } catch (error) {
      if (error instanceof ApiValidationError) {
        const unmatched = applyServerFieldErrors(error, productRhf.setError, ['sku','name','description','unit','minStock','currentStock','categoryId','fruitCode','isReceivable']);
        if (!unmatched.handled) toast({ title: "Error", description: error.message || "Failed to create product", variant: "destructive" });
      } else {
        toast({ title: "Error", description: (error as Error)?.message || "Failed to create product", variant: "destructive" });
      }
    }
  });

  const handleEditProductClick = (product: Product) => {
    setSelectedProduct(product);
    setProductForm({
      sku: product.sku, name: product.name, description: product.description || '',
      unit: product.unit || 'KG', minStock: product.minStock, currentStock: product.currentStock,
      categoryId: product.categoryId,
      fruitCode: product.fruitCode || '',
      isReceivable: product.isReceivable,
    });
    setIsEditProductOpen(true);
  };

  const handleUpdateProduct = productRhf.handleSubmit(async (values) => {
    if (!selectedProduct) return;
    try {
      await updateProduct.mutateAsync({
        id: selectedProduct.id, sku: values.sku || '', name: values.name, description: values.description || null,
        unit: values.unit, minStock: values.minStock, currentStock: values.currentStock,
        categoryId: values.categoryId || null,
        fruitCode: values.fruitCode || null,
        isReceivable: values.isReceivable,
      });
      toast({ title: "Product updated", description: `${values.name} updated successfully` });
      setIsEditProductOpen(false);
      setSelectedProduct(null);
      productRhf.reset(productFormDefaults);
    } catch (error) {
      if (error instanceof ApiValidationError) {
        const unmatched = applyServerFieldErrors(error, productRhf.setError, ['sku','name','description','unit','minStock','currentStock','categoryId','fruitCode','isReceivable']);
        if (!unmatched.handled) toast({ title: "Error", description: error.message || "Failed to update product", variant: "destructive" });
      } else {
        toast({ title: "Error", description: (error as Error)?.message || "Failed to update product", variant: "destructive" });
      }
    }
  });

  const handleDeleteProduct = async (product: Product) => {
    try {
      await deleteProduct.mutateAsync(product.id);
      toast({ title: "Product deleted", description: `${product.name} has been removed` });
    } catch {
      toast({ title: "Error", description: "Failed to delete product", variant: "destructive" });
    }
  };

  const handleReceiveStock = receiveRhf.handleSubmit(async (values) => {
    try {
      const result = await receiveStock.mutateAsync({
        itemId: values.itemId,
        itemType: values.itemType as 'material' | 'product',
        quantity: values.quantity,
        supplierName: values.supplierName || undefined,
        sourceName: values.sourceName || undefined,
        supplierLot: values.supplierLot || undefined,
        sourceType: (values.sourceType || undefined) as 'supplier' | 'farmer' | 'internal_batch' | undefined,
        receivedDate: values.receivedDate || undefined,
        expiryDate: values.expiryDate || undefined,
        notes: values.notes || undefined,
        productTemperature: values.productTemperature || undefined,
        visualInspection: (values.visualInspection || undefined) as VisualInspection | undefined,
        receivedById: values.receivedById || undefined,
        freight: values.freight || undefined,
        photos: values.photos.length > 0 ? values.photos : undefined,
      });
      const selectedItem = receivableItems.find(i => i.id === values.itemId);
      const itemName = selectedItem?.name || 'item';
      const lotWithDetails: LotWithDetails = {
        ...result.lot,
        ...(values.itemType === 'material' ? { materialName: itemName } : { productName: itemName }),
      };
      setReceivedLot(lotWithDetails);
      setReceivedTemplateName(null);
      fetchLabelTemplate('raw_intake', result.lot.customerId).then(tmpl => {
        setReceivedTemplateName(tmpl ? tmpl.name : null);
      });
      smartSupplier.set(values.supplierName || '');
      smartReceiveCategory.set(receiveCategoryFilter !== 'all' ? receiveCategoryFilter : '');
    } catch (error: unknown) {
      if (error instanceof ApiValidationError) {
        const unmatched = applyServerFieldErrors(error, receiveRhf.setError, ['itemId','itemType','quantity','supplierName','supplierLot','sourceType','receivedDate','expiryDate','notes','productTemperature','visualInspection','receivedById','freight','photos']);
        if (!unmatched.handled) toast({ title: "Error", description: error.message || "Failed to receive stock", variant: "destructive" });
      } else {
        const msg = error instanceof Error ? error.message : 'Failed to receive stock';
        toast({ title: "Error", description: msg, variant: "destructive" });
      }
    }
  });

  async function handlePrintReceivedLot(lot: LotWithDetails) {
    const itemName = lot.materialName || lot.productName || getLotItemName(lot as Lot);
    const unit = getLotUnit(lot as Lot);
    await printAndRecord({
      kind: 'raw_intake',
      customerId: lot.customerId ?? null,
      legacyData: {
        template: 'raw_intake',
        lotNumber: lot.lotNumber, barcodeValue: lot.barcodeValue, itemName,
        quantity: lot.originalQuantity || lot.quantity, unit,
        sourceLabel: lot.supplierName || lot.sourceName || undefined,
        receivedDate: lot.receivedDate, expiryDate: lot.expiryDate, supplierLot: lot.supplierLot,
      },
      entityType: 'lot', entityId: lot.id,
      displayName: itemName, secondaryName: lot.lotNumber,
      toast, recordPrint: (d) => recordPrint.mutate(d),
      onAfterPrint: () => {
        if (!lot.barcodePrintedAt) markBarcodePrinted.mutate(lot.id);
        setRecentReceivePrints((prev) => {
          const next = [{ key: `${lot.id}-${Date.now()}`, lot, printedAt: new Date() }, ...prev.filter(r => r.lot.id !== lot.id)];
          return next.slice(0, 5);
        });
      },
    });
  }

  const handleOpenReceive = () => {
    const savedSupplier = smartSupplier.get();
    const savedCategory = smartReceiveCategory.get();
    receiveRhf.reset({
      ...(EMPTY_RECEIVE_FORM as unknown as ReceiveFormValues),
      receivedById: currentUser?.id ?? '',
      supplierName: savedSupplier,
      sourceName: savedSupplier,
    });
    setReceivedLot(null);
    setReceivedTemplateName(null);
    setReceiveCategoryFilter(savedCategory || 'all');
    setRecentReceivePrints([]);
    setIsReceiveStockOpen(true);
  };

  const handleCloseReceive = () => {
    setIsReceiveStockOpen(false);
    setReceivedLot(null);
    setReceivedTemplateName(null);
    setRecentReceivePrints([]);
    receiveRhf.reset(EMPTY_RECEIVE_FORM as unknown as ReceiveFormValues);
    setReceiveCategoryFilter('all');
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
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="icon" data-testid={`button-delete-material-${material.id}`}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                }
                title="Delete Material"
                description={`Are you sure you want to delete ${material.name}?`}
                confirmLabel="Delete"
                variant="destructive"
                onConfirm={() => handleDeleteMaterial(material)}
                pending={deleteMaterial.isPending}
                testId={`confirm-delete-material-${material.id}`}
              />
            </div>
          )}
        </TableCell>
      </TableRow>
    );
  };

  const renderProductRow = (product: Product) => {
    const isLow = parseFloat(product.currentStock) <= parseFloat(product.minStock);
    const productCategory = categories.find(c => c.id === product.categoryId);
    const hasStock = parseFloat(product.currentStock) > 0;
    return (
      <TableRow
        key={product.id}
        data-testid={`row-product-${product.id}`}
        className={hasStock ? "cursor-pointer hover:bg-muted/60" : undefined}
        onClick={hasStock ? () => setSelectedProductForBreakdown(product) : undefined}
      >
        <TableCell className="font-mono font-medium">{product.sku}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            {product.name}
            {hasStock && <span className="text-[10px] text-muted-foreground ml-1 hidden sm:inline">click for breakdown</span>}
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
        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
          {canManageSettings && (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon" onClick={() => handleEditProductClick(product)} data-testid={`button-edit-product-${product.id}`}>
                <Pencil className="h-4 w-4" />
              </Button>
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="icon" data-testid={`button-delete-product-${product.id}`}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                }
                title="Delete Product"
                description={`Are you sure you want to delete ${product.name}?`}
                confirmLabel="Delete"
                variant="destructive"
                onConfirm={() => handleDeleteProduct(product)}
                pending={deleteProduct.isPending}
                testId={`confirm-delete-product-${product.id}`}
              />
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
          <div className="font-medium flex items-center gap-1.5">
            {itemName}
            {lot.photos && lot.photos.length > 0 && (
              <Camera className="h-3.5 w-3.5 text-muted-foreground" data-testid={`icon-photos-${lot.id}`} aria-label={`${lot.photos.length} photo(s)`} />
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {getLotTypeBadge(lot.lotType)}
            {lot.visualInspection && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getInspectionBadgeClass(lot.visualInspection as VisualInspection)}`} data-testid={`badge-inspection-${lot.id}`}>
                {getInspectionLabel(lot.visualInspection as VisualInspection)}
              </span>
            )}
          </div>
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
            {lot.barcodePrintedAt ? 'Print Again' : 'Print Label'}
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  const selectedReceiveItem = receiveForm.itemId ? receivableItems.find(i => i.id === receiveForm.itemId) : null;

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

      {lowStockOnly && (
        <div
          className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-destructive/30 bg-destructive/5 text-sm text-destructive"
          data-testid="banner-lowstock-filter"
        >
          <span>Showing only items at or below minimum stock.</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLowStockOnly(false)}
            data-testid="button-clear-lowstock-filter"
          >
            Clear filter
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card
          className={cn("p-4 cursor-pointer transition-all hover:shadow-md", cardFilter === 'all' && "ring-2 ring-primary")}
          onClick={() => { setCardFilter('all'); setLowStockOnly(false); }}
          data-testid="card-filter-all"
        >
          <div className="text-sm text-muted-foreground">Total Items</div>
          <div className="text-2xl font-bold font-mono">{materials.length + products.length}</div>
          <div className="text-xs text-muted-foreground">{materials.length} materials, {products.length} goods</div>
        </Card>
        <Card
          className={cn("p-4 cursor-pointer transition-all hover:shadow-md", cardFilter === 'materials' && "ring-2 ring-primary")}
          onClick={() => { setCardFilter(prev => prev === 'materials' ? 'all' : 'materials'); setLowStockOnly(false); if (activeTab === 'lots') setActiveTab('all'); }}
          data-testid="card-filter-materials"
        >
          <div className="text-sm text-muted-foreground">Materials Stock</div>
          <div className="text-2xl font-bold font-mono">{totalMaterialStock.toFixed(0)}</div>
          <div className="text-xs text-muted-foreground">{materials.length} items (mixed units)</div>
        </Card>
        <Card
          className={cn("p-4 cursor-pointer transition-all hover:shadow-md", cardFilter === 'products' && "ring-2 ring-primary")}
          onClick={() => { setCardFilter(prev => prev === 'products' ? 'all' : 'products'); setLowStockOnly(false); if (activeTab === 'lots') setActiveTab('all'); }}
          data-testid="card-filter-products"
        >
          <div className="text-sm text-muted-foreground">Goods Stock</div>
          <div className="text-2xl font-bold font-mono">{totalProductStock.toFixed(0)}</div>
          <div className="text-xs text-muted-foreground">{products.length} items (mixed units)</div>
        </Card>
        <Card
          className={cn("p-4 cursor-pointer transition-all hover:shadow-md", cardFilter === 'lowstock' && "ring-2 ring-amber-500 bg-amber-50/50")}
          onClick={() => { const next = cardFilter === 'lowstock' ? 'all' : 'lowstock'; setCardFilter(next); setLowStockOnly(false); if (next === 'lowstock' && activeTab === 'lots') setActiveTab('all'); }}
          data-testid="card-filter-lowstock"
        >
          <div className="text-sm text-muted-foreground">Low Stock Alerts</div>
          <div className="text-2xl font-bold font-mono text-amber-600">{lowStockMaterials + lowStockProducts}</div>
          <div className="text-xs text-muted-foreground">items below min</div>
        </Card>
        <Card
          className={cn("p-4 cursor-pointer transition-all hover:shadow-md", cardFilter === 'lots' && "ring-2 ring-green-500 bg-green-50/50")}
          onClick={() => { const next = cardFilter === 'lots' ? 'all' : 'lots'; setCardFilter(next); setLowStockOnly(false); if (next === 'lots') setActiveTab('lots'); }}
          data-testid="card-filter-lots"
        >
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
              <Button onClick={() => { productRhf.reset({ ...productFormDefaults, categoryId: smartProductCategory.get() || null }); setIsCreateProductOpen(true); }} data-testid="button-new-product">
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

      {/* Product Stock Breakdown Sheet */}
      <Sheet open={!!selectedProductForBreakdown} onOpenChange={(open) => { if (!open) setSelectedProductForBreakdown(null); }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto" data-testid="sheet-stock-breakdown">
          {selectedProductForBreakdown && (() => {
            const productLots = (lots as Lot[])
              .filter(l => l.productId === selectedProductForBreakdown.id && l.status === 'active')
              .sort((a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime());
            const lotsTotal = productLots.reduce((sum, l) => sum + parseFloat(l.remainingQuantity || '0'), 0);
            const unit = selectedProductForBreakdown.unit || 'KG';
            return (
              <>
                <SheetHeader className="mb-4">
                  <SheetTitle data-testid="text-breakdown-title">{selectedProductForBreakdown.name} — Stock Breakdown</SheetTitle>
                  <SheetDescription>
                    Active lots contributing to current stock.
                  </SheetDescription>
                </SheetHeader>

                <div className="mb-4 p-3 rounded-md bg-muted/50 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recorded stock</span>
                    <span className="font-mono font-medium">{parseFloat(selectedProductForBreakdown.currentStock).toFixed(2)} {unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active lot total</span>
                    <span className="font-mono font-medium">{lotsTotal.toFixed(2)} {unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active lots</span>
                    <span className="font-mono font-medium">{productLots.length}</span>
                  </div>
                </div>

                {productLots.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    No active lots found for this product. Stock may have been manually adjusted.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {productLots.map(lot => {
                      const sourceBatch = lot.sourceBatchId ? (batches as any[]).find(b => b.id === lot.sourceBatchId) : null;
                      return (
                        <div key={lot.id} className="border rounded-md p-3 space-y-1.5 text-sm" data-testid={`card-lot-breakdown-${lot.id}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-medium">{lot.lotNumber}</span>
                            <span className="font-mono font-semibold">{parseFloat(lot.remainingQuantity || '0').toFixed(2)} {unit}</span>
                          </div>
                          {sourceBatch && (
                            <div className="text-muted-foreground flex items-center gap-1">
                              <Layers className="h-3 w-3" />
                              Batch: <span className="font-mono">{sourceBatch.batchNumber}</span>
                            </div>
                          )}
                          {lot.sourceName && !sourceBatch && (
                            <div className="text-muted-foreground">{lot.sourceName}</div>
                          )}
                          <div className="text-muted-foreground">
                            {lot.producedDate
                              ? `Produced ${format(new Date(lot.producedDate), 'dd MMM yyyy')}`
                              : `Received ${format(new Date(lot.receivedDate), 'dd MMM yyyy')}`}
                          </div>
                          {lot.expiryDate && (
                            <div className="text-amber-600">Expires {format(new Date(lot.expiryDate), 'dd MMM yyyy')}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Receive Stock Dialog */}
      <Dialog open={isReceiveStockOpen} onOpenChange={(open) => { if (!open) handleCloseReceive(); }}>
        <DialogContent className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" /> Receive Stock
            </DialogTitle>
            <DialogDescription>Record incoming stock. A lot number and barcode will be generated automatically.</DialogDescription>
          </DialogHeader>

          {receivedLot ? (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Stock received successfully</span>
              </div>
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Item</span>
                  <span className="font-medium">{receivedLot.materialName || receivedLot.productName || getLotItemName(receivedLot as Lot)}</span>
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
                  <div className="flex justify-between items-center mt-2 pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Label template</span>
                    <span className="text-sm font-medium" data-testid="text-received-template-name">
                      {receivedTemplateName ?? 'Default Raw Intake'}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                className="w-full gap-2"
                onClick={() => handlePrintReceivedLot(receivedLot)}
                data-testid="button-print-label-received"
              >
                <Printer className="h-4 w-4" />
                {recentReceivePrints.some(r => r.lot.id === receivedLot.id) ? 'Print Again' : 'Print Label'}
              </Button>
              {recentReceivePrints.length > 0 && (
                <div className="border rounded-lg p-3 space-y-2" data-testid="section-recent-prints">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent Prints</div>
                  <div className="space-y-1.5">
                    {recentReceivePrints.map((r) => (
                      <div key={r.key} className="flex items-center justify-between gap-2 text-sm" data-testid={`row-recent-print-${r.lot.id}`}>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{r.lot.materialName || r.lot.productName || getLotItemName(r.lot as Lot)}</div>
                          <div className="text-xs text-muted-foreground font-mono">{r.lot.lotNumber} · {format(r.printedAt, 'HH:mm')}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 h-8"
                          onClick={() => handlePrintReceivedLot(r.lot)}
                          data-testid={`button-recent-print-again-${r.lot.id}`}
                        >
                          <Printer className="h-3.5 w-3.5" /> Print Again
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setReceiveForm(EMPTY_RECEIVE_FORM); setReceivedLot(null); setReceivedTemplateName(null); }}
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
                <Label>Item *</Label>
                {receivableItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground border rounded-md px-3 py-2">
                    No receivable items configured. Mark materials or products as receivable in their settings.
                  </p>
                ) : (() => {
                  // Filter receivable items: exclude items whose category has showInReceiveStock === false
                  const visibleReceivableItems = receivableItems.filter(i => {
                    if (!i.categoryId) return true;
                    const cat = categories.find(c => c.id === i.categoryId);
                    return !cat || cat.showInReceiveStock;
                  });
                  const receivableCategories = categories.filter(c =>
                    c.showInReceiveStock && visibleReceivableItems.some(i => i.categoryId === c.id)
                  );
                  const hasUncategorised = visibleReceivableItems.some(i => !i.categoryId);
                  const filteredItems = receiveCategoryFilter === 'all'
                    ? visibleReceivableItems
                    : receiveCategoryFilter === 'uncategorised'
                      ? visibleReceivableItems.filter(i => !i.categoryId)
                      : visibleReceivableItems.filter(i => i.categoryId === receiveCategoryFilter);

                  const buildGroups = () => {
                    if (receiveCategoryFilter !== 'all') {
                      return [{ label: null, items: filteredItems }];
                    }
                    const groups: { label: string | null; items: typeof visibleReceivableItems }[] = [];
                    for (const cat of receivableCategories) {
                      const catItems = visibleReceivableItems.filter(i => i.categoryId === cat.id);
                      if (catItems.length > 0) groups.push({ label: cat.name, items: catItems });
                    }
                    if (hasUncategorised) {
                      const uncatItems = visibleReceivableItems.filter(i => !i.categoryId);
                      if (uncatItems.length > 0) groups.push({ label: 'Uncategorised', items: uncatItems });
                    }
                    return groups;
                  };

                  return (
                    <div className="space-y-2">
                      {(receivableCategories.length > 0 || hasUncategorised) && (
                        <Select value={receiveCategoryFilter} onValueChange={(v) => {
                          setReceiveCategoryFilter(v);
                          if (receiveForm.itemId) {
                            const stillVisible = (v === 'all'
                              ? visibleReceivableItems
                              : v === 'uncategorised'
                                ? visibleReceivableItems.filter(i => !i.categoryId)
                                : visibleReceivableItems.filter(i => i.categoryId === v)
                            ).some(i => i.id === receiveForm.itemId);
                            if (!stillVisible) setReceiveForm({ ...receiveForm, itemId: '', itemType: '' as '' | 'material' | 'product' });
                          }
                        }}>
                          <SelectTrigger data-testid="select-receive-category-filter">
                            <SelectValue placeholder="All categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All categories</SelectItem>
                            {receivableCategories.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                            {hasUncategorised && <SelectItem value="uncategorised">Uncategorised</SelectItem>}
                          </SelectContent>
                        </Select>
                      )}
                      <Popover open={itemSearchOpen} onOpenChange={setItemSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between font-normal"
                            data-testid="select-receive-item"
                          >
                            {selectedReceiveItem ? selectedReceiveItem.name : 'Select item...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search items..." />
                            <CommandList>
                              <CommandEmpty>No item found.</CommandEmpty>
                              {buildGroups().map((group, gi) => (
                                <CommandGroup key={gi} heading={group.label ?? undefined}>
                                  {group.items.map((item: ReceivableItem) => (
                                    <CommandItem
                                      key={item.id}
                                      value={`${item.sku} ${item.name} ${item.itemType}`}
                                      onSelect={() => {
                                        setReceiveForm({ ...receiveForm, itemId: item.id, itemType: item.itemType });
                                        setItemSearchOpen(false);
                                      }}
                                    >
                                      <Check className={cn("mr-2 h-4 w-4", receiveForm.itemId === item.id ? "opacity-100" : "opacity-0")} />
                                      <span className="flex-1">{item.sku ? `${item.sku} — ` : ''}{item.name} ({item.unit})</span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              ))}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {receiveRhf.formState.errors.itemId && (
                        <p className="text-sm text-destructive" data-testid="error-receive-item">{receiveRhf.formState.errors.itemId.message}</p>
                      )}
                      {receiveRhf.formState.errors.itemType && (
                        <p className="text-sm text-destructive" data-testid="error-receive-item-type">{receiveRhf.formState.errors.itemType.message}</p>
                      )}
                    </div>
                  );
                })()}
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
                  {receiveRhf.formState.errors.quantity && (
                    <p className="text-sm text-destructive" data-testid="error-receive-quantity">{receiveRhf.formState.errors.quantity.message}</p>
                  )}
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <ThermometerSnowflake className="h-3.5 w-3.5" />
                    Product Temperature (°C)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 4.2"
                    value={receiveForm.productTemperature}
                    onChange={(e) => setReceiveForm({ ...receiveForm, productTemperature: e.target.value })}
                    data-testid="input-receive-temperature"
                  />
                  {receiveRhf.formState.errors.productTemperature && (
                    <p className="text-sm text-destructive" data-testid="error-receive-temperature">{receiveRhf.formState.errors.productTemperature.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Visual Inspection</Label>
                  <Select
                    value={receiveForm.visualInspection}
                    onValueChange={(v) => setReceiveForm({ ...receiveForm, visualInspection: v as typeof receiveForm.visualInspection })}
                  >
                    <SelectTrigger data-testid="select-receive-visual-inspection">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {VISUAL_INSPECTION_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value} data-testid={`option-visual-inspection-${o.value}`}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Received By</Label>
                  <Select
                    value={receiveForm.receivedById}
                    onValueChange={(v) => setReceiveForm({ ...receiveForm, receivedById: v })}
                  >
                    <SelectTrigger data-testid="select-receive-received-by">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {usersList.map((u) => (
                        <SelectItem key={u.id} value={u.id} data-testid={`option-received-by-${u.id}`}>
                          {u.fullName || u.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Freight / Carrier</Label>
                  <Input
                    placeholder="e.g. DHL · AWB 1234"
                    value={receiveForm.freight}
                    onChange={(e) => setReceiveForm({ ...receiveForm, freight: e.target.value })}
                    data-testid="input-receive-freight"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5" />
                  Photos ({receiveForm.photos.length}/8)
                </Label>
                <div className="flex flex-wrap items-center gap-2">
                  {receiveForm.photos.map((p, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded border overflow-hidden bg-muted" data-testid={`thumb-receive-photo-${idx}`}>
                      <img src={p.dataUrl} alt={p.name || `photo-${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        className="absolute top-0.5 right-0.5 rounded-full bg-black/60 text-white p-0.5 hover:bg-black/80"
                        onClick={() => setReceiveForm({ ...receiveForm, photos: receiveForm.photos.filter((_, i) => i !== idx) })}
                        aria-label="Remove photo"
                        data-testid={`button-remove-photo-${idx}`}
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {receiveForm.photos.length < 8 && (
                    <label className="w-20 h-20 rounded border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer text-muted-foreground hover:bg-accent text-xs" data-testid="button-add-photo">
                      <Camera className="h-5 w-5" />
                      <span>Add</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          e.target.value = '';
                          if (files.length === 0) return;
                          const next = [...receiveForm.photos];
                          let totalBytes = next.reduce((s, p) => s + (p.size ?? p.dataUrl.length), 0);
                          for (const f of files) {
                            if (next.length >= 8) {
                              toast({ title: 'Photo limit', description: 'You can attach at most 8 photos.', variant: 'destructive' });
                              break;
                            }
                            if (f.size > PHOTO_MAX_BYTES) {
                              toast({ title: 'Photo too large', description: `${f.name} is over 1 MB.`, variant: 'destructive' });
                              continue;
                            }
                            if (totalBytes + f.size > PHOTOS_TOTAL_MAX_BYTES) {
                              toast({ title: 'Photo total too large', description: 'Total photo size exceeds 5 MB.', variant: 'destructive' });
                              break;
                            }
                            try {
                              const dataUrl = await readFileAsDataUrl(f);
                              next.push({ dataUrl, name: f.name, size: f.size });
                              totalBytes += f.size;
                            } catch {
                              toast({ title: 'Could not read photo', description: f.name, variant: 'destructive' });
                            }
                          }
                          setReceiveForm({ ...receiveForm, photos: next });
                        }}
                        data-testid="input-receive-photos"
                      />
                    </label>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Max 1 MB per image, 5 MB total. Tap to use camera on mobile.</p>
                {receiveRhf.formState.errors.photos && (
                  <p className="text-sm text-destructive" data-testid="error-receive-photos">{(receiveRhf.formState.errors.photos as { message?: string }).message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Remarks / Notes (optional)</Label>
                <Textarea
                  placeholder="Any additional notes..."
                  value={receiveForm.notes}
                  onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })}
                  rows={2}
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
              {productRhf.formState.errors.name && (
                <p className="text-sm text-destructive" data-testid="error-product-name">{productRhf.formState.errors.name.message}</p>
              )}
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
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Can be received into stock</Label>
                <p className="text-xs text-muted-foreground">Allow this product to appear in the Receive Stock form</p>
              </div>
              <Switch
                checked={productForm.isReceivable}
                onCheckedChange={(checked) => setProductForm({ ...productForm, isReceivable: checked })}
                data-testid="switch-product-receivable"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateProductOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateProduct} disabled={!productRhf.formState.isValid || createProduct.isPending} data-testid="button-submit-product">
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
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Can be received into stock</Label>
                <p className="text-xs text-muted-foreground">Allow this material to appear in the Receive Stock form</p>
              </div>
              <Switch
                checked={materialForm.isReceivable}
                onCheckedChange={(checked) => setMaterialForm({ ...materialForm, isReceivable: checked })}
                data-testid="switch-material-receivable"
              />
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
              {productRhf.formState.errors.name && (
                <p className="text-sm text-destructive" data-testid="error-edit-product-name">{productRhf.formState.errors.name.message}</p>
              )}
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
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Can be received into stock</Label>
                <p className="text-xs text-muted-foreground">Allow this product to appear in the Receive Stock form</p>
              </div>
              <Switch
                checked={productForm.isReceivable}
                onCheckedChange={(checked) => setProductForm({ ...productForm, isReceivable: checked })}
                data-testid="switch-edit-product-receivable"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditProductOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateProduct} disabled={!productRhf.formState.isValid || updateProduct.isPending} data-testid="button-update-product">
              {updateProduct.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Good
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

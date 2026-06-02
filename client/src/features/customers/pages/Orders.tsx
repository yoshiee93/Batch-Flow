import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Filter, CheckCircle2, AlertCircle, Truck, Clock, Loader2, Pencil, Trash2, Package, MoreHorizontal, ChevronsUpDown, Check, ChevronDown, Archive, FlaskConical, ArrowUp, ArrowDown, BoxSelect, Ship, Box, ArrowLeft, GitBranch } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { applyServerFieldErrors } from '@/lib/applyServerFieldErrors';
import { ApiValidationError } from '@/lib/fetchApi';
import {
  useOrders, useProducts, useOrderItems, useUpdateOrder, useCreateOrder, useCreateOrderItem,
  useDeleteOrderItem, useDeleteOrder, useCustomers, useOrdersWithAllocation, useCompleteOrder,
  useOrderStockCheck, usePackOrder, useShipOrder, useOrderAllocations, useOrderTraceability,
  type Order, type OrderItem, type Product, type Customer, type OrderWithAllocation,
  type StockCheckItem, type OrderStockCheck, type OrderAllocation,
  type OrderProvenanceResult,
} from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/use-settings';
import { useRole } from '@/contexts/AuthContext';

export default function Orders() {
  const [searchTerm, setSearchTerm] = useState('');
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
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isPackDialogOpen, setIsPackDialogOpen] = useState(false);
  const [isShipDialogOpen, setIsShipDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewingOrder, setViewingOrder] = useState<OrderWithAllocation | null>(null);
  const [packingOrder, setPackingOrder] = useState<OrderWithAllocation | null>(null);
  const [shippingOrder, setShippingOrder] = useState<OrderWithAllocation | null>(null);

  const createOrderSchema = z.object({
    orderNumber: z.string().min(1, 'Order number is required'),
    customerId: z.string().min(1, 'Please select a customer'),
    customerName: z.string().min(1, 'Customer is required'),
    priority: z.enum(['low', 'normal', 'high', 'urgent']),
    dueDate: z.string().min(1, 'Due date is required'),
    poNumber: z.string().optional().or(z.literal('')),
    customBatchNumber: z.string().optional().or(z.literal('')),
    freight: z.string().optional().or(z.literal('')),
  });
  type CreateOrderValues = z.infer<typeof createOrderSchema>;
  const createOrderForm = useForm<CreateOrderValues>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: { orderNumber: '', customerName: '', customerId: '', priority: 'normal', dueDate: '', poNumber: '', customBatchNumber: '', freight: '' },
    mode: 'onChange',
  });
  const newOrder = createOrderForm.watch();
  const setNewOrder = (next: Partial<CreateOrderValues> | ((prev: CreateOrderValues) => CreateOrderValues)) => {
    const current = createOrderForm.getValues();
    const partial = typeof next === 'function' ? next(current) : next;
    (Object.keys(partial) as Array<keyof CreateOrderValues>).forEach((key) => {
      const value = partial[key];
      if (value !== undefined) {
        createOrderForm.setValue(key, value as CreateOrderValues[typeof key], {
          shouldValidate: true, shouldDirty: true, shouldTouch: true,
        });
      }
    });
  };

  const editOrderSchema = z.object({
    customerId: z.string().min(1, 'Please select a customer'),
    customerName: z.string().min(1, 'Customer is required'),
    priority: z.enum(['low', 'normal', 'high', 'urgent']),
    dueDate: z.string().min(1, 'Due date is required'),
    notes: z.string().optional().or(z.literal('')),
    poNumber: z.string().optional().or(z.literal('')),
    customBatchNumber: z.string().optional().or(z.literal('')),
    freight: z.string().optional().or(z.literal('')),
  });
  type EditOrderValues = z.infer<typeof editOrderSchema>;
  const editOrderForm = useForm<EditOrderValues>({
    resolver: zodResolver(editOrderSchema),
    defaultValues: { customerName: '', customerId: '', priority: 'normal', dueDate: '', notes: '', poNumber: '', customBatchNumber: '', freight: '' },
    mode: 'onChange',
  });
  const editOrder = editOrderForm.watch();
  const setEditOrder = (next: Partial<EditOrderValues> | ((prev: EditOrderValues) => EditOrderValues)) => {
    const current = editOrderForm.getValues();
    const partial = typeof next === 'function' ? next(current) : next;
    (Object.keys(partial) as Array<keyof EditOrderValues>).forEach((key) => {
      const value = partial[key];
      if (value !== undefined) {
        editOrderForm.setValue(key, value as EditOrderValues[typeof key], {
          shouldValidate: true, shouldDirty: true, shouldTouch: true,
        });
      }
    });
  };

  const { canManageOrders } = useRole();
  const { data: ordersWithAllocation = [], isLoading, isError } = useOrdersWithAllocation();
  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
  const updateOrder = useUpdateOrder();
  const createOrder = useCreateOrder();
  const deleteOrder = useDeleteOrder();
  const completeOrder = useCompleteOrder();
  const packOrder = usePackOrder();
  const shipOrder = useShipOrder();
  const { toast } = useToast();
  const { settings } = useSettings();

  const handleCompleteOrder = async (orderId: string) => {
    try {
      const result = await completeOrder.mutateAsync(orderId);
      toast({ title: "Order completed", description: `Order shipped successfully. ${result.movements.length} stock movement(s) logged.` });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to complete order";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleOpenPack = (order: OrderWithAllocation) => {
    setPackingOrder(order);
    setIsPackDialogOpen(true);
  };

  const handleOpenShip = (order: OrderWithAllocation) => {
    setShippingOrder(order);
    setIsShipDialogOpen(true);
  };

  const filteredOrders = ordersWithAllocation.filter(o =>
    o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.poNumber ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentOrders = filteredOrders.filter(o =>
    o.status !== 'shipped' && o.status !== 'completed' && o.status !== 'cancelled'
  );

  const archivedOrders = filteredOrders.filter(o =>
    o.status === 'shipped' || o.status === 'completed' || o.status === 'cancelled'
  );

  type SortDir = 'asc' | 'desc';
  type SortKey = 'orderNumber' | 'customerName' | 'itemsCount' | 'allocationStatus' | 'priority' | 'status' | 'dueDate' | 'completedAt';
  const [currentSort, setCurrentSort] = useState<{ key: SortKey | null; dir: SortDir }>({ key: null, dir: 'asc' });
  const [archivedSort, setArchivedSort] = useState<{ key: SortKey | null; dir: SortDir }>({ key: null, dir: 'asc' });

  const priorityRank: Record<string, number> = { low: 0, normal: 1, high: 2, urgent: 3 };
  const statusRank: Record<string, number> = { pending: 0, in_production: 1, ready: 2, partially_packed: 3, packed: 4, shipped: 5, completed: 6, cancelled: 7 };
  const allocationRank: Record<string, number> = { awaiting_stock: 0, partially_allocated: 1, partially_packed: 2, ready_to_ship: 3, packed: 4, shipped: 5, cancelled: 6 };

  const compareOrders = (a: OrderWithAllocation, b: OrderWithAllocation, key: SortKey): number => {
    switch (key) {
      case 'orderNumber': return a.orderNumber.localeCompare(b.orderNumber);
      case 'customerName': return (a.customerName || '').localeCompare(b.customerName || '');
      case 'itemsCount': return a.items.length - b.items.length;
      case 'allocationStatus': return (allocationRank[a.allocationStatus] ?? -1) - (allocationRank[b.allocationStatus] ?? -1);
      case 'priority': return (priorityRank[a.priority] ?? -1) - (priorityRank[b.priority] ?? -1);
      case 'status': return (statusRank[a.status] ?? -1) - (statusRank[b.status] ?? -1);
      case 'dueDate': return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      case 'completedAt': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      default: return 0;
    }
  };

  const applySort = (orders: OrderWithAllocation[], sort: { key: SortKey | null; dir: SortDir }) => {
    if (!sort.key) return orders;
    const key = sort.key;
    const sign = sort.dir === 'desc' ? -1 : 1;
    return [...orders].sort((a, b) => sign * compareOrders(a, b, key));
  };

  const sortedCurrentOrders = applySort(currentOrders, currentSort);
  const sortedArchivedOrders = applySort(archivedOrders, archivedSort);

  const toggleSort = (
    sort: { key: SortKey | null; dir: SortDir },
    setSort: (s: { key: SortKey | null; dir: SortDir }) => void,
    key: SortKey,
  ) => {
    if (sort.key !== key) setSort({ key, dir: 'asc' });
    else if (sort.dir === 'asc') setSort({ key, dir: 'desc' });
    else setSort({ key: null, dir: 'asc' });
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await updateOrder.mutateAsync({ id: orderId, status: newStatus as any });
      toast({ title: "Order updated", description: `Status changed to ${newStatus.replace('_', ' ')}` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update order", variant: "destructive" });
    }
  };

  const handleCreateOrder = createOrderForm.handleSubmit(async (values) => {
    try {
      const createdOrder = await createOrder.mutateAsync({
        orderNumber: values.orderNumber,
        customerName: values.customerName,
        customerId: values.customerId || null,
        priority: values.priority,
        dueDate: new Date(values.dueDate).toISOString(),
        status: 'pending',
        poNumber: values.poNumber || null,
        customBatchNumber: values.customBatchNumber || null,
        freight: values.freight || null,
      });
      toast({ title: "Order created", description: `Order ${values.orderNumber} created. Add products below.` });
      setIsCreateDialogOpen(false);
      createOrderForm.reset({ orderNumber: '', customerName: '', customerId: '', priority: 'normal', dueDate: '', poNumber: '', customBatchNumber: '', freight: '' });

      if (createdOrder) {
        setSelectedOrder(createdOrder);
        setEditOrder({
          customerName: createdOrder.customerName,
          customerId: createdOrder.customerId || '',
          priority: createdOrder.priority,
          dueDate: createdOrder.dueDate.split('T')[0],
          notes: createdOrder.notes || '',
          poNumber: createdOrder.poNumber || '',
          customBatchNumber: createdOrder.customBatchNumber || '',
          freight: createdOrder.freight || '',
        });
        setIsEditDialogOpen(true);
        setTimeout(() => editOrderForm.trigger(), 0);
      }
    } catch (error) {
      if (error instanceof ApiValidationError) {
        const unmatched = applyServerFieldErrors(error, createOrderForm.setError, ['orderNumber', 'customerName', 'customerId', 'priority', 'dueDate', 'poNumber', 'customBatchNumber', 'freight']);
        if (!unmatched.handled) toast({ title: "Error", description: error.message || "Failed to create order", variant: "destructive" });
      } else {
        toast({ title: "Error", description: (error as Error)?.message || "Failed to create order", variant: "destructive" });
      }
    }
  });

  const handleEditClick = (order: Order) => {
    setSelectedOrder(order);
    setEditOrder({
      customerName: order.customerName,
      customerId: order.customerId || '',
      priority: order.priority,
      dueDate: order.dueDate.split('T')[0],
      notes: order.notes || '',
      poNumber: order.poNumber || '',
      customBatchNumber: order.customBatchNumber || '',
      freight: order.freight || '',
    });
    setIsEditDialogOpen(true);
    setTimeout(() => editOrderForm.trigger(), 0);
  };

  const handleViewClick = (order: OrderWithAllocation) => {
    setViewingOrder(order);
    setIsViewDialogOpen(true);
  };

  const handleUpdateOrder = editOrderForm.handleSubmit(async (values) => {
    if (!selectedOrder) return;
    try {
      await updateOrder.mutateAsync({
        id: selectedOrder.id,
        customerName: values.customerName,
        customerId: values.customerId || null,
        priority: values.priority,
        dueDate: new Date(values.dueDate).toISOString(),
        notes: values.notes || null,
        poNumber: values.poNumber || null,
        customBatchNumber: values.customBatchNumber || null,
        freight: values.freight || null,
      });
      toast({ title: 'Order updated', description: `Order ${selectedOrder.orderNumber} updated successfully` });
      setIsEditDialogOpen(false);
    } catch (error) {
      if (error instanceof ApiValidationError) {
        const unmatched = applyServerFieldErrors(error, editOrderForm.setError, ['customerName', 'customerId', 'priority', 'dueDate', 'notes', 'poNumber', 'customBatchNumber', 'freight']);
        if (!unmatched.handled) toast({ title: 'Error', description: error.message || 'Failed to update order', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: (error as Error)?.message || 'Failed to update order', variant: 'destructive' });
      }
    }
  });

  const handleCustomerSelect = (customerId: string, isCreate: boolean) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      if (isCreate) setNewOrder({ customerId, customerName: customer.name });
      else setEditOrder({ customerId, customerName: customer.name });
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    try {
      await deleteOrder.mutateAsync(order.id);
      toast({ title: "Order deleted", description: `Order ${order.orderNumber} has been removed` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete order", variant: "destructive" });
    }
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
        <h2 className="text-xl font-semibold mb-2">Failed to load orders</h2>
        <p className="text-muted-foreground mb-4">There was an error loading the orders. Please try refreshing the page.</p>
        <Button onClick={() => window.location.reload()}>Refresh Page</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-mono" data-testid="text-orders-title">Orders</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Manage customer orders and fulfillment.</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={canManageOrders ? setIsCreateDialogOpen : undefined}>
          {canManageOrders && (
            <DialogTrigger asChild>
              <Button size="lg" className="font-mono" data-testid="button-create-order">
                <Plus size={16} className="mr-2" /> Create Order
              </Button>
            </DialogTrigger>
          )}
          <DialogContent>
            <DialogHeader><DialogTitle>Create New Order</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="orderNumber">Order Number *</Label>
                <Input id="orderNumber" placeholder="e.g. ORD-2025-005" value={newOrder.orderNumber}
                  onChange={(e) => setNewOrder({ ...newOrder, orderNumber: e.target.value })} data-testid="input-order-number" />
                {createOrderForm.formState.errors.orderNumber && (
                  <p className="text-sm text-destructive" data-testid="error-order-number">{createOrderForm.formState.errors.orderNumber.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer">Customer *</Label>
                <CustomerCombobox customers={customers} customerId={newOrder.customerId} customerName={newOrder.customerName}
                  onSelect={(id) => handleCustomerSelect(id, true)} testId="select-customer" />
                {(createOrderForm.formState.errors.customerId || createOrderForm.formState.errors.customerName) && (
                  <p className="text-sm text-destructive" data-testid="error-customer-name">
                    {createOrderForm.formState.errors.customerId?.message || createOrderForm.formState.errors.customerName?.message}
                  </p>
                )}
                {customers.length === 0 && (
                  <p className="text-xs text-muted-foreground">No customers exist yet. <a href="/customers" className="underline">Add a customer</a> to get started.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={newOrder.priority} onValueChange={(v) => setNewOrder({ ...newOrder, priority: v as any })}>
                  <SelectTrigger data-testid="select-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input id="dueDate" type="date" value={newOrder.dueDate}
                  onChange={(e) => setNewOrder({ ...newOrder, dueDate: e.target.value })} data-testid="input-due-date" />
                {createOrderForm.formState.errors.dueDate && (
                  <p className="text-sm text-destructive" data-testid="error-due-date">{createOrderForm.formState.errors.dueDate.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="poNumber">Invoice Number</Label>
                <Input id="poNumber" placeholder="e.g. INV-12345" value={newOrder.poNumber || ''}
                  onChange={(e) => setNewOrder({ ...newOrder, poNumber: e.target.value })} data-testid="input-po-number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customBatchNumber">Custom Batch Number</Label>
                <Input id="customBatchNumber" placeholder="Optional override of internal batch code"
                  value={newOrder.customBatchNumber || ''} onChange={(e) => setNewOrder({ ...newOrder, customBatchNumber: e.target.value })}
                  data-testid="input-custom-batch-number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="freight">Freight</Label>
                <Input id="freight" placeholder="e.g. DHL — AWB 123 — $185" value={newOrder.freight || ''}
                  onChange={(e) => setNewOrder({ ...newOrder, freight: e.target.value })} data-testid="input-freight" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateOrder} disabled={!createOrderForm.formState.isValid || createOrder.isPending} data-testid="button-submit-order">
                {createOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2 bg-card p-2 rounded-md border w-full sm:max-w-md">
        <Search className="w-4 h-4 text-muted-foreground ml-2 flex-shrink-0" />
        <Input placeholder="Search orders..." className="border-none shadow-none focus-visible:ring-0"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} data-testid="input-search-orders" />
        <Button variant="ghost" size="icon" className="flex-shrink-0" data-testid="button-filter-orders">
          <Filter size={16} />
        </Button>
      </div>

      <Tabs defaultValue="current" className="space-y-4">
        <TabsList>
          <TabsTrigger value="current" data-testid="tab-current-orders">Current ({currentOrders.length})</TabsTrigger>
          <TabsTrigger value="archive" data-testid="tab-archive-orders">
            <Archive size={14} className="mr-1" /> Archive ({archivedOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead className="w-[100px] sm:w-[140px]" sort={currentSort} sortKey="orderNumber" onToggle={(k) => toggleSort(currentSort, setCurrentSort, k)} testId="sort-current-orderNumber">Order #</SortableHead>
                    <SortableHead className="min-w-[120px]" sort={currentSort} sortKey="customerName" onToggle={(k) => toggleSort(currentSort, setCurrentSort, k)} testId="sort-current-customerName">Customer</SortableHead>
                    <SortableHead className="min-w-[200px]" sort={currentSort} sortKey="itemsCount" onToggle={(k) => toggleSort(currentSort, setCurrentSort, k)} testId="sort-current-items">Items</SortableHead>
                    <SortableHead className="text-center min-w-[120px]" align="center" sort={currentSort} sortKey="allocationStatus" onToggle={(k) => toggleSort(currentSort, setCurrentSort, k)} testId="sort-current-stock">Stock / Pack</SortableHead>
                    <SortableHead className="text-center min-w-[80px]" align="center" sort={currentSort} sortKey="priority" onToggle={(k) => toggleSort(currentSort, setCurrentSort, k)} testId="sort-current-priority">Priority</SortableHead>
                    <SortableHead className="text-center min-w-[80px]" align="center" sort={currentSort} sortKey="status" onToggle={(k) => toggleSort(currentSort, setCurrentSort, k)} testId="sort-current-status">Status</SortableHead>
                    <SortableHead className="text-right min-w-[100px]" align="right" sort={currentSort} sortKey="dueDate" onToggle={(k) => toggleSort(currentSort, setCurrentSort, k)} testId="sort-current-dueDate">Due Date</SortableHead>
                    <TableHead className="text-right min-w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCurrentOrders.map((order) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      onStatusChange={handleStatusChange}
                      onEditClick={handleEditClick}
                      onDelete={handleDeleteOrder}
                      onComplete={handleCompleteOrder}
                      onViewClick={handleViewClick}
                      onPackClick={handleOpenPack}
                      onShipClick={handleOpenShip}
                      products={products}
                      isDeletePending={deleteOrder.isPending}
                      isCompletePending={completeOrder.isPending}
                    />
                  ))}
                  {sortedCurrentOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No active orders. Click "Create Order" to add a new order.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="archive">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead className="w-[100px] sm:w-[140px]" sort={archivedSort} sortKey="orderNumber" onToggle={(k) => toggleSort(archivedSort, setArchivedSort, k)} testId="sort-archived-orderNumber">Order #</SortableHead>
                    <SortableHead className="min-w-[120px]" sort={archivedSort} sortKey="customerName" onToggle={(k) => toggleSort(archivedSort, setArchivedSort, k)} testId="sort-archived-customerName">Customer</SortableHead>
                    <SortableHead className="min-w-[200px]" sort={archivedSort} sortKey="itemsCount" onToggle={(k) => toggleSort(archivedSort, setArchivedSort, k)} testId="sort-archived-items">Items</SortableHead>
                    <SortableHead className="text-center min-w-[100px]" align="center" sort={archivedSort} sortKey="status" onToggle={(k) => toggleSort(archivedSort, setArchivedSort, k)} testId="sort-archived-status">Status</SortableHead>
                    <SortableHead className="text-center min-w-[80px]" align="center" sort={archivedSort} sortKey="priority" onToggle={(k) => toggleSort(archivedSort, setArchivedSort, k)} testId="sort-archived-priority">Priority</SortableHead>
                    <SortableHead className="text-right min-w-[100px]" align="right" sort={archivedSort} sortKey="completedAt" onToggle={(k) => toggleSort(archivedSort, setArchivedSort, k)} testId="sort-archived-completed">Completed</SortableHead>
                    <TableHead className="text-right min-w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedArchivedOrders.map((order) => (
                    <ArchivedOrderRow
                      key={order.id}
                      order={order}
                      onViewClick={handleViewClick}
                      onDelete={handleDeleteOrder}
                      products={products}
                      isArchivedDeletePending={deleteOrder.isPending}
                    />
                  ))}
                  {sortedArchivedOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No archived orders yet. Completed orders will appear here.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Order {selectedOrder?.orderNumber}</DialogTitle>
            <DialogDescription>Update order details and manage order items</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <EditOrderContent
              order={selectedOrder}
              editOrder={editOrder}
              setEditOrder={setEditOrder}
              customers={customers}
              products={products}
              onCustomerSelect={(id) => handleCustomerSelect(id, false)}
              onSave={handleUpdateOrder}
              isPending={updateOrder.isPending}
              isValid={editOrderForm.formState.isValid}
              onClose={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order {viewingOrder?.orderNumber}
            </DialogTitle>
            <DialogDescription>Order details and stock status</DialogDescription>
          </DialogHeader>
          {viewingOrder && (() => {
            const showTraceability = ['packed', 'partially_packed', 'shipped', 'completed'].includes(viewingOrder.status);
            return (
              <Tabs defaultValue="details" className="py-2">
                <TabsList className="mb-4">
                  <TabsTrigger value="details" data-testid="tab-order-details">Details</TabsTrigger>
                  {showTraceability && (
                    <TabsTrigger value="traceability" data-testid="tab-order-traceability">
                      <GitBranch className="h-3.5 w-3.5 mr-1.5" />
                      Traceability
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="details" className="space-y-6 mt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <p className="font-medium">{viewingOrder.customerName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Due Date</p>
                      <p className="font-medium">{format(new Date(viewingOrder.dueDate), 'MMM d, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Priority</p>
                      <PriorityBadge priority={viewingOrder.priority} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <OrderStatusBadge status={viewingOrder.status} />
                    </div>
                    {viewingOrder.poNumber && (
                      <div data-testid="view-po-number">
                        <p className="text-sm text-muted-foreground">Invoice #</p>
                        <p className="font-medium font-mono">{viewingOrder.poNumber}</p>
                      </div>
                    )}
                    {viewingOrder.customBatchNumber && (
                      <div data-testid="view-custom-batch-number">
                        <p className="text-sm text-muted-foreground">Custom Batch #</p>
                        <p className="font-medium font-mono">{viewingOrder.customBatchNumber}</p>
                      </div>
                    )}
                    {viewingOrder.freight && (
                      <div className="col-span-2" data-testid="view-freight">
                        <p className="text-sm text-muted-foreground">Freight</p>
                        <p className="font-medium">{viewingOrder.freight}</p>
                      </div>
                    )}
                    {viewingOrder.shippedAt && (
                      <div data-testid="view-shipped-at">
                        <p className="text-sm text-muted-foreground">Shipped</p>
                        <p className="font-medium">{format(new Date(viewingOrder.shippedAt), 'MMM d, yyyy')}</p>
                      </div>
                    )}
                    {viewingOrder.shippingCarrier && (
                      <div data-testid="view-carrier">
                        <p className="text-sm text-muted-foreground">Carrier</p>
                        <p className="font-medium">{viewingOrder.shippingCarrier}</p>
                      </div>
                    )}
                    {viewingOrder.trackingReference && (
                      <div data-testid="view-tracking">
                        <p className="text-sm text-muted-foreground">Tracking</p>
                        <p className="font-medium font-mono">{viewingOrder.trackingReference}</p>
                      </div>
                    )}
                  </div>

                  <ViewStockCheckPanel orderId={viewingOrder.id} items={viewingOrder.items} products={products} status={viewingOrder.status} />

                  {viewingOrder.notes && (
                    <div>
                      <h4 className="font-semibold mb-2">Notes</h4>
                      <p className="text-sm text-muted-foreground">{viewingOrder.notes}</p>
                    </div>
                  )}
                </TabsContent>

                {showTraceability && (
                  <TabsContent value="traceability" className="mt-0">
                    <OrderProvenancePanel orderId={viewingOrder.id} />
                  </TabsContent>
                )}
              </Tabs>
            );
          })()}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
            {canManageOrders && viewingOrder && (
              <>
                <Button variant="outline" onClick={() => {
                  setIsViewDialogOpen(false);
                  if (viewingOrder) handleEditClick(viewingOrder);
                }}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit Order
                </Button>
                {viewingOrder.status === 'packed' && (
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
                    setIsViewDialogOpen(false);
                    handleOpenShip(viewingOrder);
                  }} data-testid="button-view-ship-order">
                    <Ship size={14} className="mr-2" /> Ship Order
                  </Button>
                )}
                {(viewingOrder.status === 'partially_packed' || viewingOrder.status === 'pending' || viewingOrder.status === 'in_production' || viewingOrder.status === 'ready') && viewingOrder.items.length > 0 && (
                  <Button className="bg-green-600 hover:bg-green-700" onClick={() => {
                    setIsViewDialogOpen(false);
                    handleOpenPack(viewingOrder);
                  }} data-testid="button-view-pack-order">
                    <BoxSelect size={14} className="mr-2" />
                    {viewingOrder.status === 'partially_packed' ? 'Continue Packing' : 'Pack Order'}
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pack Order Dialog */}
      {packingOrder && (
        <PackOrderDialog
          open={isPackDialogOpen}
          order={packingOrder}
          onClose={() => { setIsPackDialogOpen(false); setPackingOrder(null); }}
        />
      )}

      {/* Ship Order Dialog */}
      {shippingOrder && (
        <ShipOrderDialog
          open={isShipDialogOpen}
          order={shippingOrder}
          onClose={() => { setIsShipDialogOpen(false); setShippingOrder(null); }}
        />
      )}
    </div>
  );
}

// ─── Pack Order Dialog ───────────────────────────────────────────────────────

type AllocState = Record<string, Record<string, string>>; // { [orderItemId]: { [lotId]: qty } }

function PackOrderDialog({
  open,
  order,
  onClose,
}: {
  open: boolean;
  order: OrderWithAllocation;
  onClose: () => void;
}) {
  const { data: stockCheck, isLoading: stockLoading } = useOrderStockCheck(open ? order.id : null);
  // Fetch existing allocations when re-packing a partially-packed order
  const { data: existingAllocations, isLoading: allocLoading } = useOrderAllocations(
    open && order.status === 'partially_packed' ? order.id : null
  );
  const isLoading = stockLoading || allocLoading;
  const packOrder = usePackOrder();
  const { toast } = useToast();
  const [allocations, setAllocations] = useState<AllocState>({});

  // Keep a stable ref to existing allocations so the init effect doesn't loop
  const existingAllocsRef = useRef<OrderAllocation[]>([]);
  useEffect(() => {
    existingAllocsRef.current = existingAllocations ?? [];
  }, [existingAllocations]);

  // Initialize allocation inputs when stockCheck loads (or order changes)
  useEffect(() => {
    if (!stockCheck) return;
    const prevByLot: Record<string, number> = {};
    for (const a of existingAllocsRef.current) {
      prevByLot[a.lotId] = (prevByLot[a.lotId] ?? 0) + parseFloat(a.quantityAllocated);
    }
    const initial: AllocState = {};
    for (const item of stockCheck.items) {
      initial[item.orderItemId] = {};
      for (const lot of item.availableLots) {
        const prevQty = prevByLot[lot.lotId];
        initial[item.orderItemId][lot.lotId] = prevQty != null ? prevQty.toFixed(3) : '';
      }
    }
    setAllocations(initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockCheck]);

  const getTotalAllocated = (item: StockCheckItem) => {
    const itemAllocs = allocations[item.orderItemId] ?? {};
    return Object.values(itemAllocs).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
  };

  const handleSubmit = async () => {
    const allocList: { orderItemId: string; lotId: string; quantityAllocated: number }[] = [];
    for (const [orderItemId, lots] of Object.entries(allocations)) {
      for (const [lotId, qty] of Object.entries(lots)) {
        const quantity = parseFloat(qty);
        if (!isNaN(quantity) && quantity > 0) allocList.push({ orderItemId, lotId, quantityAllocated: quantity });
      }
    }
    if (allocList.length === 0) {
      toast({ title: "No allocations", description: "Enter at least one quantity to allocate.", variant: "destructive" });
      return;
    }
    try {
      const result = await packOrder.mutateAsync({ orderId: order.id, allocations: allocList });
      const statusLabel = result.status === 'packed' ? 'fully packed' : 'partially packed';
      toast({ title: "Order packed", description: `Order ${order.orderNumber} is now ${statusLabel}.` });
      onClose();
    } catch (error) {
      toast({ title: "Pack failed", description: (error as Error).message || "Failed to pack order", variant: "destructive" });
    }
  };

  const [lotSearch, setLotSearch] = useState('');
  const lotSearchRef = useRef<HTMLInputElement>(null);

  // Reset search when dialog opens/closes
  useEffect(() => {
    if (open) {
      setLotSearch('');
      // Auto-focus after the dialog finishes opening
      setTimeout(() => lotSearchRef.current?.focus(), 100);
    }
  }, [open]);

  const allItemsMeetRequirement = stockCheck?.items.every(item => getTotalAllocated(item) >= item.required - 0.001) ?? false;
  const hasAnyAllocation = Object.values(allocations).some(lots => Object.values(lots).some(v => parseFloat(v) > 0));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BoxSelect className="h-5 w-5" />
            Pack Order {order.orderNumber}
          </DialogTitle>
          <DialogDescription>Allocate lots to each product in this order.</DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {stockCheck && !isLoading && (
          <div className="space-y-4 py-2">
            {/* Lot search / barcode scanner slot */}
            <div className="flex items-center gap-2 border rounded-md px-3 py-1.5 bg-background">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <input
                ref={lotSearchRef}
                type="text"
                placeholder="Search or scan lot number…"
                value={lotSearch}
                onChange={(e) => setLotSearch(e.target.value)}
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                data-testid="input-pack-lot-search"
              />
              {lotSearch && (
                <button
                  onClick={() => { setLotSearch(''); lotSearchRef.current?.focus(); }}
                  className="text-muted-foreground hover:text-foreground text-xs"
                  data-testid="button-clear-lot-search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Overall availability banner */}
            <div className={cn(
              "rounded-md p-3 text-sm flex items-center gap-2",
              stockCheck.allAvailable ? "bg-green-50 text-green-800 border border-green-200" : "bg-amber-50 text-amber-800 border border-amber-200"
            )}>
              {stockCheck.allAvailable
                ? <><CheckCircle2 size={16} /> All products are in stock — full packing available.</>
                : <><AlertCircle size={16} /> Some products have insufficient stock — partial packing only.</>
              }
            </div>

            {stockCheck.items.map((item) => {
              const totalAllocated = getTotalAllocated(item);
              const isFullyAllocated = totalAllocated >= item.required - 0.001;
              const itemAllocs = allocations[item.orderItemId] ?? {};

              const visibleLots = lotSearch.trim()
                ? item.availableLots.filter(lot =>
                    lot.lotNumber.toLowerCase().includes(lotSearch.trim().toLowerCase())
                  )
                : item.availableLots;

              if (lotSearch.trim() && visibleLots.length === 0) return null;

              return (
                <div key={item.orderItemId} className="border rounded-lg overflow-hidden" data-testid={`pack-item-${item.orderItemId}`}>
                  <div className="p-3 bg-muted/30 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        Required: {item.required.toFixed(2)} {item.unit}
                        {item.shortfall > 0 && <span className="text-destructive ml-2">· Short by {item.shortfall.toFixed(2)} {item.unit}</span>}
                      </p>
                    </div>
                    <span className={cn("text-sm font-mono font-medium", isFullyAllocated ? "text-green-700" : "text-amber-700")}>
                      {totalAllocated.toFixed(2)} / {item.required.toFixed(2)} {item.unit}
                    </span>
                  </div>

                  {item.availableLots.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground italic">No available lots for this product.</div>
                  ) : (
                    <div className="divide-y">
                      {visibleLots.map((lot) => (
                        <div key={lot.lotId} className="flex items-center gap-3 px-3 py-2 text-sm" data-testid={`pack-lot-${lot.lotId}`}>
                          <div className="flex-1 min-w-0">
                            <span className="font-mono font-medium">{lot.lotNumber}</span>
                            <span className="text-muted-foreground ml-2">({lot.remainingQuantity.toFixed(2)} {item.unit} available)</span>
                            {lot.expiryDate && (
                              <span className="text-amber-600 ml-2 text-xs">Exp {format(new Date(lot.expiryDate), 'dd MMM yyyy')}</span>
                            )}
                          </div>
                          <div className="w-28 flex-shrink-0">
                            <Input
                              type="number"
                              step="0.001"
                              min="0"
                              max={lot.remainingQuantity}
                              value={itemAllocs[lot.lotId] ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                const num = parseFloat(val);
                                const clamped = !isNaN(num) ? Math.min(num, lot.remainingQuantity) : val;
                                setAllocations(prev => ({
                                  ...prev,
                                  [item.orderItemId]: { ...prev[item.orderItemId], [lot.lotId]: String(clamped) },
                                }));
                              }}
                              placeholder="0.000"
                              className="text-right font-mono h-8 text-sm"
                              data-testid={`input-alloc-${item.orderItemId}-${lot.lotId}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasAnyAllocation || packOrder.isPending}
            className={allItemsMeetRequirement ? "bg-green-600 hover:bg-green-700" : "bg-amber-600 hover:bg-amber-700"}
            data-testid="button-submit-pack"
          >
            {packOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {allItemsMeetRequirement ? 'Pack Order' : 'Partial Pack'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Ship Order Dialog ───────────────────────────────────────────────────────

function ShipOrderDialog({
  open,
  order,
  onClose,
}: {
  open: boolean;
  order: OrderWithAllocation;
  onClose: () => void;
}) {
  const shipOrder = useShipOrder();
  const { toast } = useToast();
  const today = new Date().toISOString().split('T')[0];
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  const [shippedDate, setShippedDate] = useState(today);

  const handleSubmit = async () => {
    try {
      const result = await shipOrder.mutateAsync({
        orderId: order.id,
        shippingCarrier: carrier || undefined,
        trackingReference: tracking || undefined,
        shippedAt: shippedDate ? new Date(shippedDate).toISOString() : undefined,
      });
      toast({ title: "Order shipped", description: `Order ${order.orderNumber} has been shipped. ${result.movements.length} movement(s) logged.` });
      onClose();
    } catch (error) {
      toast({ title: "Ship failed", description: (error as Error).message || "Failed to ship order", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="w-full sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5" />
            Ship Order {order.orderNumber}
          </DialogTitle>
          <DialogDescription>Confirm shipping details to mark this order as shipped.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="shippedDate">Shipped Date</Label>
            <Input id="shippedDate" type="date" value={shippedDate}
              onChange={(e) => setShippedDate(e.target.value)} data-testid="input-shipped-date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="carrier">Freight / Carrier <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input id="carrier" placeholder="e.g. DHL, FedEx, StarTrack"
              value={carrier} onChange={(e) => setCarrier(e.target.value)} data-testid="input-shipping-carrier" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tracking">Tracking / Reference <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input id="tracking" placeholder="e.g. AWB 1234567890"
              value={tracking} onChange={(e) => setTracking(e.target.value)} data-testid="input-tracking-reference" />
          </div>
          <p className="text-sm text-muted-foreground">
            Shipping will log stock movements for all packed lots and mark the order as Shipped.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={shipOrder.isPending} className="bg-blue-600 hover:bg-blue-700" data-testid="button-submit-ship">
            {shipOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Ship size={14} className="mr-2" /> Confirm Ship
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Order Content ───────────────────────────────────────────────────────

function EditOrderContent({
  order, editOrder, setEditOrder, customers, products, onCustomerSelect, onSave, isPending, isValid, onClose,
}: {
  order: Order;
  editOrder: { customerName: string; customerId?: string; priority: string; dueDate: string; notes?: string; poNumber?: string; customBatchNumber?: string; freight?: string };
  setEditOrder: (value: any) => void;
  customers: Customer[];
  products: Product[];
  onCustomerSelect: (id: string) => void;
  onSave: () => void;
  isPending: boolean;
  isValid: boolean;
  onClose: () => void;
}) {
  const { canManageOrders } = useRole();
  const { data: orderItems = [], isLoading: itemsLoading } = useOrderItems(order.id);
  const { data: liveStockCheck } = useOrderStockCheck(order.id);
  const createOrderItem = useCreateOrderItem();
  const deleteOrderItem = useDeleteOrderItem();
  const { toast } = useToast();

  const addItemSchema = z.object({
    productId: z.string().min(1, 'Product is required'),
    quantity: z.string()
      .min(1, 'Quantity is required')
      .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, { message: 'Quantity must be greater than 0' }),
  });
  type AddItemValues = z.infer<typeof addItemSchema>;
  const addItemForm = useForm<AddItemValues>({
    resolver: zodResolver(addItemSchema),
    defaultValues: { productId: '', quantity: '' },
    mode: 'onChange',
  });
  const newItem = addItemForm.watch();
  const setNewItem = (next: Partial<AddItemValues> | ((prev: AddItemValues) => AddItemValues)) => {
    const current = addItemForm.getValues();
    const partial = typeof next === 'function' ? next(current) : next;
    (Object.keys(partial) as Array<keyof AddItemValues>).forEach((key) => {
      const value = partial[key];
      if (value !== undefined) {
        addItemForm.setValue(key, value as AddItemValues[typeof key], { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      }
    });
  };
  const [productSearchOpen, setProductSearchOpen] = useState(false);

  const handleAddItem = addItemForm.handleSubmit(async (values) => {
    try {
      await createOrderItem.mutateAsync({ orderId: order.id, productId: values.productId, quantity: values.quantity });
      toast({ title: "Item added", description: "Order item added successfully" });
      addItemForm.reset({ productId: '', quantity: '' });
    } catch (error) {
      if (error instanceof ApiValidationError) {
        const unmatched = applyServerFieldErrors(error, addItemForm.setError, ['productId', 'quantity']);
        if (!unmatched.handled) toast({ title: 'Error', description: error.message || 'Failed to add order item', variant: 'destructive' });
      } else {
        toast({ title: "Error", description: (error instanceof Error ? error.message : "Failed to add order item"), variant: "destructive" });
      }
    }
  });

  const handleRemoveItem = async (itemId: string) => {
    try {
      await deleteOrderItem.mutateAsync(itemId);
      toast({ title: "Item removed", description: "Order item removed successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove order item", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Customer *</Label>
          <CustomerCombobox customers={customers} customerId={editOrder.customerId} customerName={editOrder.customerName}
            onSelect={onCustomerSelect} testId="select-edit-customer" />
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={editOrder.priority} onValueChange={(v) => setEditOrder({ ...editOrder, priority: v })}>
            <SelectTrigger data-testid="select-edit-priority"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Due Date *</Label>
          <Input type="date" value={editOrder.dueDate} onChange={(e) => setEditOrder({ ...editOrder, dueDate: e.target.value })} data-testid="input-edit-due-date" />
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Input value={editOrder.notes} onChange={(e) => setEditOrder({ ...editOrder, notes: e.target.value })} placeholder="Additional notes..." data-testid="input-edit-notes" />
        </div>
        <div className="space-y-2">
          <Label>Invoice Number</Label>
          <Input value={editOrder.poNumber || ''} onChange={(e) => setEditOrder({ ...editOrder, poNumber: e.target.value })} placeholder="e.g. INV-12345" data-testid="input-edit-po-number" />
        </div>
        <div className="space-y-2">
          <Label>Custom Batch Number</Label>
          <Input value={editOrder.customBatchNumber || ''} onChange={(e) => setEditOrder({ ...editOrder, customBatchNumber: e.target.value })} placeholder="Optional override" data-testid="input-edit-custom-batch-number" />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Freight</Label>
          <Input value={editOrder.freight || ''} onChange={(e) => setEditOrder({ ...editOrder, freight: e.target.value })} placeholder="e.g. DHL — AWB 123 — $185" data-testid="input-edit-freight" />
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Package className="h-4 w-4" /> Order Items</h3>
        {itemsLoading ? (
          <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="rounded-md border mb-4 max-h-[280px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">In Stock</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No items in this order. Add products below.</TableCell>
                    </TableRow>
                  ) : (
                    orderItems.map((item) => {
                      const product = products.find(p => p.id === item.productId);
                      return (
                        <TableRow key={item.id} data-testid={`row-order-item-${item.id}`}>
                          <TableCell>{product?.name || 'Unknown Product'}</TableCell>
                          <TableCell className="text-right font-mono">{parseFloat(item.quantity).toFixed(2)}{product?.unit ? ` ${product.unit}` : ''}</TableCell>
                          <TableCell className="text-right font-mono">
                            {(() => {
                              const checkItem = liveStockCheck?.items.find(c => c.productId === item.productId);
                              const avail = checkItem != null
                                ? checkItem.available
                                : product ? parseFloat(product.currentStock) : null;
                              return avail != null
                                ? `${avail.toFixed(2)}${product?.unit ? ` ${product.unit}` : ''}`
                                : '-';
                            })()}
                          </TableCell>
                          <TableCell>
                            {canManageOrders && (
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} disabled={deleteOrderItem.isPending} data-testid={`button-remove-item-${item.id}`}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {canManageOrders && (
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-2">
                  <Label>Add Product</Label>
                  <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={productSearchOpen}
                        className="w-full justify-between font-normal" data-testid="select-add-product">
                        {newItem.productId ? products.find(p => p.id === newItem.productId)?.name || "Select product..." : "Search products..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Type to search products..." />
                        <CommandList>
                          <CommandEmpty>No product found.</CommandEmpty>
                          <CommandGroup>
                            {products.filter(product => !orderItems.some(item => item.productId === product.id)).map(product => (
                              <CommandItem key={product.id} value={`${product.sku} ${product.name}`}
                                onSelect={() => { setNewItem({ ...newItem, productId: product.id }); setProductSearchOpen(false); }}>
                                <Check className={cn("mr-2 h-4 w-4", newItem.productId === product.id ? "opacity-100" : "opacity-0")} />
                                {product.sku ? `${product.sku} - ` : ''}{product.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="w-32 space-y-2">
                  <Label>Quantity{(() => { const p = products.find(pp => pp.id === newItem.productId); return p?.unit ? ` (${p.unit})` : ''; })()}</Label>
                  <Input type="number" step="0.01" value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} placeholder="0.00" data-testid="input-add-quantity" />
                </div>
                <Button onClick={handleAddItem} disabled={!addItemForm.formState.isValid || createOrderItem.isPending} data-testid="button-add-item">
                  {createOrderItem.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        {canManageOrders && (
          <Button onClick={onSave} disabled={!isValid || isPending} data-testid="button-save-order">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}

// ─── Order Table Row ──────────────────────────────────────────────────────────

function OrderRow({
  order, onStatusChange, onEditClick, onDelete, onComplete, onViewClick, onPackClick, onShipClick, products, isDeletePending, isCompletePending,
}: {
  order: OrderWithAllocation;
  onStatusChange: (id: string, status: string) => void;
  onEditClick: (order: Order) => void;
  onDelete: (order: Order) => void;
  onComplete: (id: string) => void;
  onViewClick: (order: OrderWithAllocation) => void;
  onPackClick: (order: OrderWithAllocation) => void;
  onShipClick: (order: OrderWithAllocation) => void;
  products: Product[];
  isDeletePending: boolean;
  isCompletePending: boolean;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const { canManageOrders } = useRole();

  const isArchivableStatus = order.status === 'shipped' || order.status === 'completed' || order.status === 'cancelled';
  const isPackable = !isArchivableStatus && order.status !== 'packed';
  const isShippable = order.status === 'packed';

  const allocationBadge = () => {
    if (order.items.length === 0) return <Badge className="bg-slate-100 text-slate-600">-</Badge>;
    switch (order.allocationStatus) {
      case 'packed':
        return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 size={12} className="mr-1" /> Packed</Badge>;
      case 'partially_packed':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200"><BoxSelect size={12} className="mr-1" /> Part. Packed</Badge>;
      case 'ready_to_ship':
        return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 size={12} className="mr-1" /> Stock Available</Badge>;
      case 'partially_allocated':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200"><Clock size={12} className="mr-1" /> Partial Stock</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-600 border-slate-200"><AlertCircle size={12} className="mr-1" /> Stock Shortage</Badge>;
    }
  };

  return (
    <TableRow data-testid={`row-order-${order.id}`} className="cursor-pointer hover:bg-muted/50" onClick={() => onViewClick(order)}>
      <TableCell className="font-mono font-bold">
        <div className="flex flex-col">
          <span>{order.orderNumber}</span>
          {order.poNumber && <span className="text-xs text-muted-foreground font-normal" data-testid={`text-po-number-${order.id}`}>Inv: {order.poNumber}</span>}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <span>{order.customerName}</span>
          {order.customerRequiresTesting && (
            <Badge className="bg-purple-100 text-purple-700 border-purple-200 self-start" data-testid={`badge-order-testing-${order.id}`}>
              <FlaskConical size={10} className="mr-1" /> Testing
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          {order.items.slice(0, 3).map((item) => {
            const product = products.find(p => p.id === item.productId);
            const allocated = parseFloat(item.reservedQuantity);
            const needed = parseFloat(item.quantity);
            return (
              <div key={item.id} className="text-sm">
                {item.productName} <span className="text-muted-foreground font-mono">({allocated.toFixed(0)}/{needed.toFixed(0)}{product?.unit ? ` ${product.unit}` : ''})</span>
              </div>
            );
          })}
          {order.items.length > 3 && (
            <div className="text-xs text-muted-foreground">+{order.items.length - 3} more</div>
          )}
          {order.items.length === 0 && <span className="text-muted-foreground text-sm italic">No items</span>}
        </div>
      </TableCell>
      <TableCell className="text-center">{allocationBadge()}</TableCell>
      <TableCell className="text-center"><PriorityBadge priority={order.priority} /></TableCell>
      <TableCell className="text-center"><OrderStatusBadge status={order.status} /></TableCell>
      <TableCell className="text-right font-mono text-sm">{format(new Date(order.dueDate), 'MMM d, yyyy')}</TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-order-actions-${order.id}`}>
              <MoreHorizontal size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            {canManageOrders && (
              <>
                <DropdownMenuItem onClick={() => onEditClick(order)} data-testid={`button-edit-order-${order.id}`}>
                  <Pencil size={14} className="mr-2" /> Edit Order
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                {isShippable && (
                  <DropdownMenuItem onClick={() => onShipClick(order)} className="text-blue-600" data-testid={`button-ship-order-${order.id}`}>
                    <Ship size={14} className="mr-2" /> Ship Order
                  </DropdownMenuItem>
                )}

                {isPackable && order.items.length > 0 && (
                  <DropdownMenuItem onClick={() => onPackClick(order)} className="text-green-600" data-testid={`button-pack-order-${order.id}`}>
                    <BoxSelect size={14} className="mr-2" />
                    {order.status === 'partially_packed' ? 'Continue Packing' : order.allocationStatus === 'ready_to_ship' ? 'Pack Order' : 'Partial Pack'}
                  </DropdownMenuItem>
                )}

                {!isPackable && !isShippable && order.items.length > 0 && order.status !== 'cancelled' && (() => {
                  const blockerCount = order.testingBlockers?.length ?? 0;
                  const blocked = blockerCount > 0;
                  const blockerLotNumbers = (order.testingBlockers ?? []).map(b => b.lotNumber).join(', ');
                  const tooltip = blocked ? `Testing required. Blocking lots: ${blockerLotNumbers}` : undefined;
                  return (
                    <DropdownMenuItem onClick={() => setIsCompleteDialogOpen(true)} disabled={blocked} className="text-green-600"
                      data-testid={`button-complete-order-${order.id}`} title={tooltip}>
                      <Truck size={14} className="mr-2" /> Complete Order (Legacy)
                      {blocked && <FlaskConical size={12} className="ml-2" />}
                    </DropdownMenuItem>
                  );
                })()}

                {!isShippable && !isPackable && order.status !== 'cancelled' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onStatusChange(order.id, 'in_production')}>
                      <Clock size={14} className="mr-2" /> Start Production
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onStatusChange(order.id, 'ready')}>
                      <CheckCircle2 size={14} className="mr-2" /> Mark Ready
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => onStatusChange(order.id, 'cancelled')}>
                  Cancel Order
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => setIsDeleteDialogOpen(true)} data-testid={`button-delete-order-${order.id}`}>
                  <Trash2 size={14} className="mr-2" /> Delete Order
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <ConfirmDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          title="Delete Order"
          description={`Are you sure you want to delete order ${order.orderNumber}? This will also remove all associated items. This action cannot be undone.`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => onDelete(order)}
          pending={isDeletePending}
          testId={`confirm-delete-order-${order.id}`}
        />
        <ConfirmDialog
          open={isCompleteDialogOpen}
          onOpenChange={setIsCompleteDialogOpen}
          title="Complete Order (Legacy)"
          description={`Complete order ${order.orderNumber} for ${order.customerName}? This will mark the order as shipped, deduct stock from inventory, and log stock movements.`}
          confirmLabel="Complete Order"
          variant="overwrite"
          onConfirm={() => { onComplete(order.id); setIsCompleteDialogOpen(false); }}
          pending={isCompletePending}
          testId={`confirm-complete-order-${order.id}`}
        />
      </TableCell>
    </TableRow>
  );
}

// ─── Archived Order Row ───────────────────────────────────────────────────────

function ArchivedOrderRow({ order, onViewClick, onDelete, products, isArchivedDeletePending }: {
  order: OrderWithAllocation;
  onViewClick: (order: OrderWithAllocation) => void;
  onDelete: (order: Order) => void;
  products: Product[];
  isArchivedDeletePending: boolean;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { canManageOrders } = useRole();

  const statusBadge = () => {
    if (order.status === 'shipped') return <Badge className="bg-green-100 text-green-700 border-green-200"><Truck size={12} className="mr-1" /> Shipped</Badge>;
    if (order.status === 'completed') return <Badge className="bg-slate-100 text-slate-700 border-slate-200"><CheckCircle2 size={12} className="mr-1" /> Completed</Badge>;
    return <Badge className="bg-red-100 text-red-700 border-red-200">Cancelled</Badge>;
  };

  return (
    <TableRow data-testid={`row-archived-order-${order.id}`} className="cursor-pointer hover:bg-muted/50" onClick={() => onViewClick(order)}>
      <TableCell className="font-mono font-bold">
        <div className="flex flex-col">
          <span>{order.orderNumber}</span>
          {order.poNumber && <span className="text-xs text-muted-foreground font-normal">Inv: {order.poNumber}</span>}
        </div>
      </TableCell>
      <TableCell>{order.customerName}</TableCell>
      <TableCell>
        <div className="space-y-1">
          {order.items.slice(0, 3).map((item) => {
            const product = products.find(p => p.id === item.productId);
            const quantity = parseFloat(item.quantity);
            return (
              <div key={item.id} className="text-sm">
                {item.productName} <span className="text-muted-foreground font-mono">({quantity.toFixed(0)}{product?.unit ? ` ${product.unit}` : ''})</span>
              </div>
            );
          })}
          {order.items.length > 3 && (
            <div className="text-xs text-muted-foreground">+{order.items.length - 3} more</div>
          )}
          {order.items.length === 0 && <span className="text-muted-foreground text-sm italic">No items</span>}
        </div>
      </TableCell>
      <TableCell className="text-center">{statusBadge()}</TableCell>
      <TableCell className="text-center"><PriorityBadge priority={order.priority} /></TableCell>
      <TableCell className="text-right font-mono text-sm">{format(new Date(order.createdAt), 'MMM d, yyyy')}</TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-archived-order-actions-${order.id}`}>
              <MoreHorizontal size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onViewClick(order)}><Package size={14} className="mr-2" /> View Details</DropdownMenuItem>
            {canManageOrders && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => setIsDeleteDialogOpen(true)} data-testid={`button-delete-archived-order-${order.id}`}>
                  <Trash2 size={14} className="mr-2" /> Delete Order
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <ConfirmDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          title="Delete Archived Order"
          description={`Are you sure you want to delete order ${order.orderNumber}? This will remove the order record. This action cannot be undone.`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => onDelete(order)}
          pending={isArchivedDeletePending}
          testId={`confirm-delete-archived-order-${order.id}`}
        />
      </TableCell>
    </TableRow>
  );
}

// ─── Shared Components ────────────────────────────────────────────────────────

// ─── Order Provenance Panel ───────────────────────────────────────────────────

function fmtDateShort(d: string | null | undefined) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return String(d); }
}

function OrderProvenancePanel({ orderId }: { orderId: string }) {
  const { data: trace, isLoading, isError } = useOrderTraceability(orderId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading provenance data…</span>
      </div>
    );
  }

  if (isError || !trace) {
    return (
      <div className="flex flex-col items-center py-8 text-center gap-2">
        <AlertCircle className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Could not load traceability data.</p>
      </div>
    );
  }

  const hasAllocations = trace.lines.some(l => l.allocations.length > 0);

  if (!hasAllocations) {
    return (
      <div className="flex flex-col items-center py-8 text-center gap-2">
        <Package className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No packing allocations recorded yet. Pack this order to see full lot provenance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="order-provenance-panel">
      {trace.lines.map((line) => (
        <div key={line.orderItemId} className="border rounded-lg overflow-hidden" data-testid={`provenance-line-${line.orderItemId}`}>
          <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b">
            <span className="font-medium text-sm">{line.productName}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {parseFloat(line.quantity).toFixed(2)} {line.unit} ordered
            </span>
          </div>

          {line.allocations.length === 0 ? (
            <div className="px-3 py-3 text-sm text-muted-foreground italic">No lots allocated.</div>
          ) : (
            <div className="divide-y">
              {line.allocations.map((alloc) => (
                <div key={alloc.allocationId}>
                  {/* Lot row */}
                  <div className="flex items-start justify-between px-3 py-2.5 gap-2 bg-background">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Box className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <a
                          href={`/traceability?lot=${encodeURIComponent(alloc.lotNumber)}`}
                          className="font-mono font-bold text-sm text-primary hover:underline"
                          data-testid={`provenance-lot-${alloc.lotId}`}
                        >
                          {alloc.lotNumber}
                        </a>
                        {alloc.barcodeValue && (
                          <span className="font-mono text-xs text-muted-foreground">{alloc.barcodeValue}</span>
                        )}
                      </div>
                      {alloc.packedAt && (
                        <span className="text-xs text-muted-foreground pl-5">Packed {fmtDateShort(alloc.packedAt)}</span>
                      )}
                    </div>
                    <span className="font-mono text-sm font-medium shrink-0">
                      {parseFloat(alloc.quantityAllocated).toFixed(2)} {line.unit}
                    </span>
                  </div>

                  {/* Source batch */}
                  {alloc.sourceBatch ? (
                    <div className="border-t bg-muted/20">
                      <div className="flex items-center gap-2 px-3 py-1.5">
                        <ArrowLeft className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground">From batch</span>
                        <a
                          href={`/traceability?batch=${encodeURIComponent(alloc.sourceBatch.batchNumber)}`}
                          className="font-mono text-xs font-bold text-primary hover:underline"
                          data-testid={`provenance-batch-${alloc.sourceBatch.id}`}
                        >
                          {alloc.sourceBatch.batchCode || alloc.sourceBatch.batchNumber}
                        </a>
                      </div>

                      {alloc.sourceBatch.ingredients.length > 0 && (
                        <div className="border-t px-3 py-2 space-y-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            <FlaskConical className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground uppercase font-medium">Ingredients</span>
                          </div>
                          {alloc.sourceBatch.ingredients.map((ing, ii) => (
                            <div key={ii} className="flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                <span>{ing.materialName}</span>
                                <a
                                  href={`/traceability?lot=${encodeURIComponent(ing.lotNumber)}`}
                                  className="font-mono bg-muted px-1.5 py-0.5 rounded hover:bg-accent cursor-pointer"
                                >
                                  {ing.lotNumber}
                                </a>
                                {ing.supplierLot && (
                                  <span className="text-muted-foreground">({ing.supplierLot})</span>
                                )}
                              </div>
                              <span className="font-mono text-muted-foreground shrink-0">
                                {parseFloat(ing.quantityUsed).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border-t bg-muted/10 px-3 py-1.5 flex items-center gap-2">
                      <ArrowLeft className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground">Externally sourced — no production batch</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── View Stock Check Panel ───────────────────────────────────────────────────

function ViewStockCheckPanel({
  orderId,
  items,
  products,
  status,
}: {
  orderId: string;
  items: OrderWithAllocation['items'];
  products: Product[];
  status: string;
}) {
  const isArchived = status === 'shipped' || status === 'completed' || status === 'cancelled';
  const isPacked = status === 'packed';
  const { data: stockCheck, isLoading } = useOrderStockCheck(isArchived || isPacked ? null : orderId);

  if (items.length === 0) {
    return (
      <div>
        <h4 className="font-semibold mb-3">Products Requested (0)</h4>
        <p className="text-muted-foreground text-sm italic">No items in this order</p>
      </div>
    );
  }

  // For packed/shipped orders, show a simple summary from order items
  if (isPacked || isArchived) {
    return (
      <div>
        <h4 className="font-semibold mb-3">
          Products Requested ({items.length})
          {isPacked && <Badge className="ml-2 bg-green-100 text-green-700 border-green-200 text-[10px]"><CheckCircle2 size={10} className="mr-1" /> Packed</Badge>}
          {status === 'shipped' && <Badge className="ml-2 bg-slate-100 text-slate-700 border-slate-200 text-[10px]"><Truck size={10} className="mr-1" /> Shipped</Badge>}
        </h4>
        <div className="space-y-2">
          {items.map(item => {
            const product = products.find(p => p.id === item.productId);
            const qty = parseFloat(item.quantity);
            return (
              <div key={item.id} className="border rounded-md px-3 py-2 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{item.productName}</p>
                  {product?.sku && <p className="text-xs text-muted-foreground">{product.sku}</p>}
                </div>
                <span className="font-mono text-muted-foreground">{qty.toFixed(2)} {product?.unit ?? ''}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <h4 className="font-semibold mb-3">Products Requested ({items.length})</h4>
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking stock availability…
        </div>
      </div>
    );
  }

  const allAvailable = stockCheck?.allAvailable ?? false;
  const anyAvailable = stockCheck?.hasAnyAvailable ?? false;

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h4 className="font-semibold">Products Requested ({items.length})</h4>
        {stockCheck && (
          <Badge className={cn(
            "text-[10px]",
            allAvailable ? "bg-green-100 text-green-700 border-green-200" :
            anyAvailable ? "bg-amber-100 text-amber-700 border-amber-200" :
            "bg-slate-100 text-slate-600 border-slate-200"
          )}>
            {allAvailable
              ? <><CheckCircle2 size={10} className="mr-1" /> All In Stock</>
              : anyAvailable
              ? <><Clock size={10} className="mr-1" /> Partial Stock</>
              : <><AlertCircle size={10} className="mr-1" /> Stock Shortage</>}
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {items.map(item => {
          const product = products.find(p => p.id === item.productId);
          const checkItem = stockCheck?.items.find(c => c.orderItemId === item.id);
          const required = parseFloat(item.quantity);
          const available = checkItem?.available ?? 0;
          const shortfall = checkItem?.shortfall ?? 0;
          const unit = checkItem?.unit ?? product?.unit ?? '';

          const stockStatus = checkItem
            ? (shortfall === 0 ? 'ready' : available > 0 ? 'partial' : 'waiting')
            : null;

          return (
            <div key={item.id} className="border rounded-lg overflow-hidden">
              <div className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.productName}</p>
                  {product?.sku && <p className="text-xs text-muted-foreground">{product.sku}</p>}
                </div>
                {stockStatus === 'ready' && <Badge className="bg-green-100 text-green-700 text-[10px]"><CheckCircle2 size={10} className="mr-1" /> In Stock</Badge>}
                {stockStatus === 'partial' && <Badge className="bg-amber-100 text-amber-700 text-[10px]"><Clock size={10} className="mr-1" /> Partial</Badge>}
                {stockStatus === 'waiting' && <Badge className="bg-slate-100 text-slate-600 text-[10px]"><AlertCircle size={10} className="mr-1" /> No Stock</Badge>}
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm px-3 pb-3 border-t pt-2">
                <div>
                  <p className="text-muted-foreground text-xs">Required</p>
                  <p className="font-mono">{required.toFixed(2)} {unit}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Available</p>
                  <p className={cn("font-mono", available < required && "text-amber-700")}>{available.toFixed(2)} {unit}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Short by</p>
                  <p className={cn("font-mono", shortfall > 0 ? "text-destructive font-medium" : "text-muted-foreground")}>
                    {shortfall > 0 ? `-${shortfall.toFixed(2)} ${unit}` : '—'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    in_production: "bg-blue-100 text-blue-700 border-blue-200",
    ready: "bg-emerald-100 text-emerald-700 border-emerald-200",
    partially_packed: "bg-blue-100 text-blue-800 border-blue-300",
    packed: "bg-green-100 text-green-700 border-green-200",
    shipped: "bg-slate-100 text-slate-700 border-slate-200",
    completed: "bg-slate-100 text-slate-700 border-slate-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
  };
  const labels: Record<string, string> = {
    pending: "Pending",
    in_production: "In Production",
    ready: "Ready",
    partially_packed: "Part. Packed",
    packed: "Packed",
    shipped: "Shipped",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return (
    <Badge variant="outline" className={cn("font-mono uppercase text-[10px]", styles[status])}>
      {labels[status] || status}
    </Badge>
  );
}

function CustomerCombobox({ customers, customerId, customerName, onSelect, testId }: {
  customers: Customer[];
  customerId?: string;
  customerName?: string;
  onSelect: (id: string) => void;
  testId: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = customers.find(c => c.id === customerId);
  const label = selected ? `${selected.code} - ${selected.name}` : customerName ? customerName : customers.length === 0 ? 'No customers available — add one first' : 'Search customers...';
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} disabled={customers.length === 0}
          className="w-full justify-between font-normal" data-testid={testId}>
          <span className={cn("truncate", !selected && !customerName && "text-muted-foreground")}>{label}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Type to search customers..." />
          <CommandList>
            <CommandEmpty>No customer found.</CommandEmpty>
            <CommandGroup>
              {customers.map(customer => (
                <CommandItem key={customer.id} value={`${customer.code} ${customer.name}`}
                  onSelect={() => { onSelect(customer.id); setOpen(false); }}
                  data-testid={`${testId}-option-${customer.id}`}>
                  <Check className={cn("mr-2 h-4 w-4", customerId === customer.id ? "opacity-100" : "opacity-0")} />
                  <span className="font-mono text-xs text-muted-foreground mr-2">{customer.code}</span>
                  {customer.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function SortableHead<K extends string>({
  children, className, align = 'left', sort, sortKey, onToggle, testId,
}: {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  sort: { key: K | null; dir: 'asc' | 'desc' };
  sortKey: K;
  onToggle: (key: K) => void;
  testId?: string;
}) {
  const active = sort.key === sortKey;
  const Icon = active ? (sort.dir === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown;
  return (
    <TableHead className={className}>
      <button type="button" onClick={() => onToggle(sortKey)}
        className={cn("inline-flex items-center gap-1 hover:text-foreground transition-colors select-none",
          active ? "text-foreground font-semibold" : "text-muted-foreground",
          align === 'right' && "ml-auto justify-end w-full",
          align === 'center' && "mx-auto justify-center w-full",
        )}
        data-testid={testId}>
        {children}
        <Icon className={cn("h-3 w-3", !active && "opacity-50")} />
      </button>
    </TableHead>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    low: "bg-slate-50 text-slate-600 border-slate-200",
    normal: "bg-slate-50 text-slate-600 border-slate-200",
    high: "bg-orange-50 text-orange-700 border-orange-200",
    urgent: "bg-red-50 text-red-700 border-red-200",
  };
  const labels: Record<string, string> = { low: "Low", normal: "Normal", high: "High", urgent: "Urgent" };
  return (
    <Badge variant="outline" className={cn("font-mono uppercase text-[10px]", styles[priority])}>
      {labels[priority] || priority}
    </Badge>
  );
}

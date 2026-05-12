import { useState, useEffect } from 'react';
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
import { Plus, Search, Filter, CheckCircle2, AlertCircle, Truck, Clock, Loader2, Pencil, Trash2, Package, MoreHorizontal, ChevronsUpDown, Check, ChevronDown, Archive, FlaskConical, ArrowUp, ArrowDown } from 'lucide-react';
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
import { useOrders, useProducts, useOrderItems, useUpdateOrder, useCreateOrder, useCreateOrderItem, useDeleteOrderItem, useDeleteOrder, useCustomers, useOrdersWithAllocation, useCompleteOrder, type Order, type OrderItem, type Product, type Customer, type OrderWithAllocation } from '@/lib/api';
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
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewingOrder, setViewingOrder] = useState<OrderWithAllocation | null>(null);
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
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
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
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
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
  const { toast } = useToast();
  const { settings } = useSettings();

  const handleCompleteOrder = async (orderId: string) => {
    try {
      const result = await completeOrder.mutateAsync(orderId);
      toast({ 
        title: "Order completed", 
        description: `Order shipped successfully. ${result.movements.length} stock movement(s) logged.` 
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to complete order";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const filteredOrders = ordersWithAllocation.filter(o => 
    o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentOrders = filteredOrders.filter(o => 
    o.status !== 'shipped' && o.status !== 'cancelled'
  );

  const archivedOrders = filteredOrders.filter(o => 
    o.status === 'shipped' || o.status === 'cancelled'
  );

  type SortDir = 'asc' | 'desc';
  type SortKey = 'orderNumber' | 'customerName' | 'itemsCount' | 'allocationStatus' | 'priority' | 'status' | 'dueDate' | 'completedAt';
  const [currentSort, setCurrentSort] = useState<{ key: SortKey | null; dir: SortDir }>({ key: null, dir: 'asc' });
  const [archivedSort, setArchivedSort] = useState<{ key: SortKey | null; dir: SortDir }>({ key: null, dir: 'asc' });

  const priorityRank: Record<string, number> = { low: 0, normal: 1, high: 2, urgent: 3 };
  const statusRank: Record<string, number> = { pending: 0, in_production: 1, ready: 2, shipped: 3, cancelled: 4 };
  const allocationRank: Record<string, number> = { awaiting_stock: 0, partially_allocated: 1, ready_to_ship: 2, shipped: 3, cancelled: 4 };

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
        const unmatched = applyServerFieldErrors(error, createOrderForm.setError, ['orderNumber','customerName','customerId','priority','dueDate','poNumber','customBatchNumber','freight']);
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
        const unmatched = applyServerFieldErrors(error, editOrderForm.setError, ['customerName','customerId','priority','dueDate','notes','poNumber','customBatchNumber','freight']);
        if (!unmatched.handled) toast({ title: 'Error', description: error.message || 'Failed to update order', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: (error as Error)?.message || 'Failed to update order', variant: 'destructive' });
      }
    }
  });
  const handleCustomerSelect = (customerId: string, isCreate: boolean) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      if (isCreate) {
        setNewOrder({ customerId, customerName: customer.name });
      } else {
        setEditOrder({ customerId, customerName: customer.name });
      }
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
            <DialogHeader>
              <DialogTitle>Create New Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="orderNumber">Order Number *</Label>
                <Input
                  id="orderNumber"
                  placeholder="e.g. ORD-2025-005"
                  value={newOrder.orderNumber}
                  onChange={(e) => setNewOrder({ ...newOrder, orderNumber: e.target.value })}
                  data-testid="input-order-number"
                />
                {createOrderForm.formState.errors.orderNumber && (
                  <p className="text-sm text-destructive" data-testid="error-order-number">{createOrderForm.formState.errors.orderNumber.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer">Customer *</Label>
                <CustomerCombobox
                  customers={customers}
                  customerId={newOrder.customerId}
                  customerName={newOrder.customerName}
                  onSelect={(id) => handleCustomerSelect(id, true)}
                  testId="select-customer"
                />
                {(createOrderForm.formState.errors.customerId || createOrderForm.formState.errors.customerName) && (
                  <p className="text-sm text-destructive" data-testid="error-customer-name">
                    {createOrderForm.formState.errors.customerId?.message || createOrderForm.formState.errors.customerName?.message}
                  </p>
                )}
                {customers.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No customers exist yet. <a href="/customers" className="underline">Add a customer</a> to get started.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={newOrder.priority} onValueChange={(v) => setNewOrder({ ...newOrder, priority: v as any })}>
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue />
                  </SelectTrigger>
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
                <Input
                  id="dueDate"
                  type="date"
                  value={newOrder.dueDate}
                  onChange={(e) => setNewOrder({ ...newOrder, dueDate: e.target.value })}
                  data-testid="input-due-date"
                />
                {createOrderForm.formState.errors.dueDate && (
                  <p className="text-sm text-destructive" data-testid="error-due-date">{createOrderForm.formState.errors.dueDate.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="poNumber">Invoice Number</Label>
                <Input
                  id="poNumber"
                  placeholder="e.g. INV-12345"
                  value={newOrder.poNumber || ''}
                  onChange={(e) => setNewOrder({ ...newOrder, poNumber: e.target.value })}
                  data-testid="input-po-number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customBatchNumber">Custom Batch Number</Label>
                <Input
                  id="customBatchNumber"
                  placeholder="Optional override of internal batch code"
                  value={newOrder.customBatchNumber || ''}
                  onChange={(e) => setNewOrder({ ...newOrder, customBatchNumber: e.target.value })}
                  data-testid="input-custom-batch-number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="freight">Freight</Label>
                <Input
                  id="freight"
                  placeholder="e.g. DHL — AWB 123 — $185"
                  value={newOrder.freight || ''}
                  onChange={(e) => setNewOrder({ ...newOrder, freight: e.target.value })}
                  data-testid="input-freight"
                />
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
        <Input 
          placeholder="Search orders..." 
          className="border-none shadow-none focus-visible:ring-0"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="input-search-orders"
        />
        <Button variant="ghost" size="icon" className="flex-shrink-0" data-testid="button-filter-orders">
          <Filter size={16} />
        </Button>
      </div>

      <Tabs defaultValue="current" className="space-y-4">
        <TabsList>
          <TabsTrigger value="current" data-testid="tab-current-orders">
            Current ({currentOrders.length})
          </TabsTrigger>
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
                    <SortableHead className="text-center min-w-[100px]" align="center" sort={currentSort} sortKey="allocationStatus" onToggle={(k) => toggleSort(currentSort, setCurrentSort, k)} testId="sort-current-stock">Stock</SortableHead>
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-full sm:max-w-2xl">
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

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="w-full sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order {viewingOrder?.orderNumber}
            </DialogTitle>
            <DialogDescription>Order details and stock status</DialogDescription>
          </DialogHeader>
          {viewingOrder && (
            <div className="space-y-6 py-4">
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
              </div>

              <div>
                <h4 className="font-semibold mb-3">Products Requested ({viewingOrder.items.length})</h4>
                {viewingOrder.items.length === 0 ? (
                  <p className="text-muted-foreground text-sm italic">No items in this order</p>
                ) : (
                  <div className="space-y-3">
                    {viewingOrder.items.map((item) => {
                      const product = products.find(p => p.id === item.productId);
                      const currentStock = product ? parseFloat(product.currentStock) : 0;
                      const needed = parseFloat(item.quantity);
                      const reserved = parseFloat(item.reservedQuantity);
                      const unit = product?.unit || '';
                      const stockStatus = reserved >= needed ? 'ready' : reserved > 0 ? 'partial' : 'waiting';
                      
                      return (
                        <Collapsible key={item.id} defaultOpen={settings.cardsExpandedByDefault} className="group">
                          <div className="border rounded-lg overflow-hidden">
                            <CollapsibleTrigger className="w-full p-3 flex justify-between items-center hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-2 text-left">
                                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                                <div>
                                  <p className="font-medium">{item.productName}</p>
                                  {product?.sku && <p className="text-xs text-muted-foreground">{product.sku}</p>}
                                </div>
                              </div>
                              {stockStatus === 'ready' && (
                                <Badge className="bg-green-100 text-green-700"><CheckCircle2 size={12} className="mr-1" /> Ready</Badge>
                              )}
                              {stockStatus === 'partial' && (
                                <Badge className="bg-amber-100 text-amber-700"><Clock size={12} className="mr-1" /> Partial</Badge>
                              )}
                              {stockStatus === 'waiting' && (
                                <Badge className="bg-slate-100 text-slate-600"><AlertCircle size={12} className="mr-1" /> Waiting</Badge>
                              )}
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="grid grid-cols-3 gap-2 text-sm p-3 pt-0 border-t">
                                <div>
                                  <p className="text-muted-foreground">Ordered</p>
                                  <p className="font-mono">{needed.toFixed(2)} {unit}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Reserved</p>
                                  <p className="font-mono">{reserved.toFixed(2)} {unit}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">In Stock</p>
                                  <p className={cn("font-mono", currentStock < needed && "text-destructive")}>{currentStock.toFixed(2)} {unit}</p>
                                </div>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}
                  </div>
                )}
              </div>

              {viewingOrder.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground">{viewingOrder.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
            {canManageOrders && (
              <>
                <Button variant="outline" onClick={() => {
                  setIsViewDialogOpen(false);
                  if (viewingOrder) handleEditClick(viewingOrder);
                }}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit Order
                </Button>
                {viewingOrder && viewingOrder.status !== 'shipped' && viewingOrder.status !== 'cancelled' && (
                  <ConfirmDialog
                    trigger={
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        disabled={viewingOrder.items.length === 0}
                        title={viewingOrder.items.length === 0 ? 'Order must have at least one line item before it can be completed' : undefined}
                      >
                        <Truck size={14} className="mr-2" /> Complete Order
                      </Button>
                    }
                    title="Complete Order"
                    description="This will mark the order as shipped and deduct the reserved stock from inventory. This action cannot be undone."
                    confirmLabel="Complete Order"
                    variant="overwrite"
                    onConfirm={() => {
                      handleCompleteOrder(viewingOrder.id);
                      setIsViewDialogOpen(false);
                    }}
                    pending={completeOrder.isPending}
                    testId="confirm-complete-order-view"
                  />
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditOrderContent({
  order,
  editOrder,
  setEditOrder,
  customers,
  products,
  onCustomerSelect,
  onSave,
  isPending,
  isValid,
  onClose,
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
        addItemForm.setValue(key, value as AddItemValues[typeof key], {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        });
      }
    });
  };
  const [productSearchOpen, setProductSearchOpen] = useState(false);

  const handleAddItem = addItemForm.handleSubmit(async (values) => {
    try {
      await createOrderItem.mutateAsync({
        orderId: order.id,
        productId: values.productId,
        quantity: values.quantity,
      });
      toast({ title: "Item added", description: "Order item added successfully" });
      addItemForm.reset({ productId: '', quantity: '' });
    } catch (error) {
      if (error instanceof ApiValidationError) {
        const unmatched = applyServerFieldErrors(error, addItemForm.setError, ['productId', 'quantity']);
        if (!unmatched.handled) toast({ title: 'Error', description: error.message || 'Failed to add order item', variant: 'destructive' });
      } else {
        const msg = error instanceof Error ? error.message : "Failed to add order item";
        toast({ title: "Error", description: msg, variant: "destructive" });
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
          <CustomerCombobox
            customers={customers}
            customerId={editOrder.customerId}
            customerName={editOrder.customerName}
            onSelect={onCustomerSelect}
            testId="select-edit-customer"
          />
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={editOrder.priority} onValueChange={(v) => setEditOrder({ ...editOrder, priority: v })}>
            <SelectTrigger data-testid="select-edit-priority">
              <SelectValue />
            </SelectTrigger>
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
          <Input
            type="date"
            value={editOrder.dueDate}
            onChange={(e) => setEditOrder({ ...editOrder, dueDate: e.target.value })}
            data-testid="input-edit-due-date"
          />
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Input
            value={editOrder.notes}
            onChange={(e) => setEditOrder({ ...editOrder, notes: e.target.value })}
            placeholder="Additional notes..."
            data-testid="input-edit-notes"
          />
        </div>
        <div className="space-y-2">
          <Label>Invoice Number</Label>
          <Input
            value={editOrder.poNumber || ''}
            onChange={(e) => setEditOrder({ ...editOrder, poNumber: e.target.value })}
            placeholder="e.g. INV-12345"
            data-testid="input-edit-po-number"
          />
        </div>
        <div className="space-y-2">
          <Label>Custom Batch Number</Label>
          <Input
            value={editOrder.customBatchNumber || ''}
            onChange={(e) => setEditOrder({ ...editOrder, customBatchNumber: e.target.value })}
            placeholder="Optional override of internal batch code"
            data-testid="input-edit-custom-batch-number"
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Freight</Label>
          <Input
            value={editOrder.freight || ''}
            onChange={(e) => setEditOrder({ ...editOrder, freight: e.target.value })}
            placeholder="e.g. DHL — AWB 123 — $185"
            data-testid="input-edit-freight"
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Package className="h-4 w-4" />
          Order Items
        </h3>
        
        {itemsLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="rounded-md border mb-4">
              <Table>
                <TableHeader>
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
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        No items in this order. Add products below.
                      </TableCell>
                    </TableRow>
                  ) : (
                    orderItems.map((item) => {
                      const product = products.find(p => p.id === item.productId);
                      return (
                        <TableRow key={item.id} data-testid={`row-order-item-${item.id}`}>
                          <TableCell>{product?.name || 'Unknown Product'}</TableCell>
                          <TableCell className="text-right font-mono">{parseFloat(item.quantity).toFixed(2)}{product?.unit ? ` ${product.unit}` : ''}</TableCell>
                          <TableCell className="text-right font-mono">
                            {product ? `${parseFloat(product.currentStock).toFixed(2)}${product.unit ? ` ${product.unit}` : ''}` : '-'}
                          </TableCell>
                          <TableCell>
                            {canManageOrders && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(item.id)}
                                disabled={deleteOrderItem.isPending}
                                data-testid={`button-remove-item-${item.id}`}
                              >
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

            {canManageOrders && <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-2">
                <Label>Add Product</Label>
                <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={productSearchOpen}
                      className="w-full justify-between font-normal"
                      data-testid="select-add-product"
                    >
                      {newItem.productId
                        ? products.find(p => p.id === newItem.productId)?.name || "Select product..."
                        : "Search products..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Type to search products..." />
                      <CommandList>
                        <CommandEmpty>No product found.</CommandEmpty>
                        <CommandGroup>
                          {products
                            .filter(product => !orderItems.some(item => item.productId === product.id))
                            .map(product => (
                            <CommandItem
                              key={product.id}
                              value={`${product.sku} ${product.name}`}
                              onSelect={() => {
                                setNewItem({ ...newItem, productId: product.id });
                                setProductSearchOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  newItem.productId === product.id ? "opacity-100" : "opacity-0"
                                )}
                              />
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
                <Input
                  type="number"
                  step="0.01"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  placeholder="0.00"
                  data-testid="input-add-quantity"
                />
                {addItemForm.formState.errors.quantity && (
                  <p className="text-sm text-destructive" data-testid="error-add-quantity">{addItemForm.formState.errors.quantity.message}</p>
                )}
              </div>
              <Button
                onClick={handleAddItem}
                disabled={!addItemForm.formState.isValid || createOrderItem.isPending}
                data-testid="button-add-item"
              >
                {createOrderItem.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>}
          </>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        {canManageOrders && <Button onClick={onSave} disabled={!isValid || isPending} data-testid="button-save-order">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>}
      </DialogFooter>
    </div>
  );
}

function OrderRow({ order, onStatusChange, onEditClick, onDelete, onComplete, onViewClick, products, isDeletePending, isCompletePending }: { 
  order: OrderWithAllocation; 
  onStatusChange: (id: string, status: string) => void;
  onEditClick: (order: Order) => void;
  onDelete: (order: Order) => void;
  onComplete: (id: string) => void;
  onViewClick: (order: OrderWithAllocation) => void;
  products: Product[];
  isDeletePending: boolean;
  isCompletePending: boolean;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const { canManageOrders } = useRole();

  const allocationBadge = () => {
    if (order.items.length === 0) {
      return <Badge className="bg-slate-100 text-slate-600">-</Badge>;
    }
    switch (order.allocationStatus) {
      case 'ready_to_ship':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle2 size={12} className="mr-1" /> Ready
          </Badge>
        );
      case 'partially_allocated':
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
            <Clock size={12} className="mr-1" /> Partial
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-100 text-slate-600 border-slate-200">
            <AlertCircle size={12} className="mr-1" /> Waiting
          </Badge>
        );
    }
  };

  return (
    <TableRow 
      data-testid={`row-order-${order.id}`} 
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onViewClick(order)}
    >
      <TableCell className="font-mono font-bold">
        <div className="flex flex-col">
          <span>{order.orderNumber}</span>
          {order.poNumber && (
            <span className="text-xs text-muted-foreground font-normal" data-testid={`text-po-number-${order.id}`}>Inv: {order.poNumber}</span>
          )}
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
          {order.items.map((item) => {
            const product = products.find(p => p.id === item.productId);
            const allocated = parseFloat(item.reservedQuantity);
            const needed = parseFloat(item.quantity);
            return (
              <div key={item.id} className="text-sm">
                {item.productName} <span className="text-muted-foreground font-mono">({allocated.toFixed(0)}/{needed.toFixed(0)}{product?.unit ? ` ${product.unit}` : ''})</span>
              </div>
            );
          })}
          {order.items.length === 0 && <span className="text-muted-foreground text-sm italic">No items</span>}
        </div>
      </TableCell>
      <TableCell className="text-center">
        {allocationBadge()}
      </TableCell>
      <TableCell className="text-center">
        <PriorityBadge priority={order.priority} />
      </TableCell>
      <TableCell className="text-center">
        <OrderStatusBadge status={order.status} />
      </TableCell>
      <TableCell className="text-right font-mono text-sm">
        {format(new Date(order.dueDate), 'MMM d, yyyy')}
      </TableCell>
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
                <DropdownMenuItem onClick={() => onStatusChange(order.id, 'in_production')}>
                  <Clock size={14} className="mr-2" /> Start Production
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(order.id, 'ready')}>
                  <CheckCircle2 size={14} className="mr-2" /> Mark Ready
                </DropdownMenuItem>
                {order.status !== 'shipped' && order.status !== 'cancelled' && (() => {
                  const blockerCount = order.testingBlockers?.length ?? 0;
                  const blocked = blockerCount > 0;
                  const blockerLotNumbers = (order.testingBlockers ?? []).map(b => b.lotNumber).join(', ');
                  const tooltip = order.items.length === 0
                    ? 'Order must have at least one line item before it can be completed'
                    : blocked
                      ? `Testing required before shipping. Blocking lots: ${blockerLotNumbers}`
                      : undefined;
                  return (
                    <DropdownMenuItem
                      onClick={() => setIsCompleteDialogOpen(true)}
                      disabled={order.items.length === 0 || blocked}
                      className="text-green-600"
                      data-testid={`button-complete-order-${order.id}`}
                      title={tooltip}
                    >
                      <Truck size={14} className="mr-2" /> Complete Order
                      {blocked && <FlaskConical size={12} className="ml-2" />}
                    </DropdownMenuItem>
                  );
                })()}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => onStatusChange(order.id, 'cancelled')}>
                  Cancel Order
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive" 
                  onClick={() => setIsDeleteDialogOpen(true)}
                  data-testid={`button-delete-order-${order.id}`}
                >
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
          title="Complete Order"
          description={`Complete order ${order.orderNumber} for ${order.customerName}? This will mark the order as shipped, deduct stock from inventory for all items, and log stock movements for traceability.`}
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
    if (order.status === 'shipped') {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          <Truck size={12} className="mr-1" /> Shipped
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200">
        Cancelled
      </Badge>
    );
  };

  return (
    <TableRow 
      data-testid={`row-archived-order-${order.id}`} 
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onViewClick(order)}
    >
      <TableCell className="font-mono font-bold">
        <div className="flex flex-col">
          <span>{order.orderNumber}</span>
          {order.poNumber && (
            <span className="text-xs text-muted-foreground font-normal">Inv: {order.poNumber}</span>
          )}
        </div>
      </TableCell>
      <TableCell>{order.customerName}</TableCell>
      <TableCell>
        <div className="space-y-1">
          {order.items.map((item) => {
            const product = products.find(p => p.id === item.productId);
            const quantity = parseFloat(item.quantity);
            return (
              <div key={item.id} className="text-sm">
                {item.productName} <span className="text-muted-foreground font-mono">({quantity.toFixed(0)}{product?.unit ? ` ${product.unit}` : ''})</span>
              </div>
            );
          })}
          {order.items.length === 0 && <span className="text-muted-foreground text-sm italic">No items</span>}
        </div>
      </TableCell>
      <TableCell className="text-center">
        {statusBadge()}
      </TableCell>
      <TableCell className="text-center">
        <PriorityBadge priority={order.priority} />
      </TableCell>
      <TableCell className="text-right font-mono text-sm">
        {format(new Date(order.createdAt), 'MMM d, yyyy')}
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-archived-order-actions-${order.id}`}>
              <MoreHorizontal size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onViewClick(order)}>
              <Package size={14} className="mr-2" /> View Details
            </DropdownMenuItem>
            {canManageOrders && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive" 
                  onClick={() => setIsDeleteDialogOpen(true)}
                  data-testid={`button-delete-archived-order-${order.id}`}
                >
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

function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    in_production: "bg-blue-100 text-blue-700 border-blue-200",
    ready: "bg-green-100 text-green-700 border-green-200",
    shipped: "bg-slate-100 text-slate-700 border-slate-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
  };

  const labels: Record<string, string> = {
    pending: "Pending",
    in_production: "In Production",
    ready: "Ready",
    shipped: "Shipped",
    cancelled: "Cancelled",
  };

  return (
    <Badge variant="outline" className={cn("font-mono uppercase text-[10px]", styles[status])}>
      {labels[status] || status}
    </Badge>
  );
}

function CustomerCombobox({
  customers,
  customerId,
  customerName,
  onSelect,
  testId,
}: {
  customers: Customer[];
  customerId?: string;
  customerName?: string;
  onSelect: (id: string) => void;
  testId: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = customers.find(c => c.id === customerId);
  const label = selected
    ? `${selected.code} - ${selected.name}`
    : customerName
      ? customerName
      : customers.length === 0
        ? 'No customers available — add one first'
        : 'Search customers...';
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={customers.length === 0}
          className="w-full justify-between font-normal"
          data-testid={testId}
        >
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
                <CommandItem
                  key={customer.id}
                  value={`${customer.code} ${customer.name}`}
                  onSelect={() => {
                    onSelect(customer.id);
                    setOpen(false);
                  }}
                  data-testid={`${testId}-option-${customer.id}`}
                >
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
  children,
  className,
  align = 'left',
  sort,
  sortKey,
  onToggle,
  testId,
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
      <button
        type="button"
        onClick={() => onToggle(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground transition-colors select-none",
          active ? "text-foreground font-semibold" : "text-muted-foreground",
          align === 'right' && "ml-auto justify-end w-full",
          align === 'center' && "mx-auto justify-center w-full",
        )}
        data-testid={testId}
      >
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

  const labels: Record<string, string> = {
    low: "Low",
    normal: "Normal",
    high: "High",
    urgent: "Urgent",
  };

  return (
    <Badge variant="outline" className={cn("font-mono uppercase text-[10px]", styles[priority])}>
      {labels[priority] || priority}
    </Badge>
  );
}

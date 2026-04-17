import { useState, useEffect } from 'react';
import { useSearch } from 'wouter';
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
import { Plus, Search, Filter, CheckCircle2, AlertCircle, Truck, Clock, Loader2, Pencil, Trash2, Package, MoreHorizontal, ChevronsUpDown, Check, ChevronDown, Archive } from 'lucide-react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useOrders, useProducts, useOrderItems, useUpdateOrder, useCreateOrder, useCreateOrderItem, useDeleteOrderItem, useDeleteOrder, useCustomers, useOrdersWithAllocation, useCompleteOrder, type Order, type OrderItem, type Product, type Customer, type OrderWithAllocation } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/use-settings';

export default function Orders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewingOrder, setViewingOrder] = useState<OrderWithAllocation | null>(null);
  const [newOrder, setNewOrder] = useState({
    orderNumber: '',
    customerName: '',
    customerId: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    dueDate: '',
  });
  const [editOrder, setEditOrder] = useState({
    customerName: '',
    customerId: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    dueDate: '',
    notes: '',
  });
  
  const { data: ordersWithAllocation = [], isLoading, isError } = useOrdersWithAllocation();
  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
  const updateOrder = useUpdateOrder();
  const createOrder = useCreateOrder();
  const deleteOrder = useDeleteOrder();
  const completeOrder = useCompleteOrder();
  const { toast } = useToast();
  const { settings } = useSettings();

  const search = useSearch();
  useEffect(() => {
    if (new URLSearchParams(search).get('action') === 'new-order') {
      setIsCreateDialogOpen(true);
    }
  }, [search]);

  const handleCompleteOrder = async (orderId: string) => {
    try {
      const result = await completeOrder.mutateAsync(orderId);
      toast({ 
        title: "Order completed", 
        description: `Order shipped successfully. ${result.movements.length} stock movement(s) logged.` 
      });
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to complete order", 
        variant: "destructive" 
      });
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

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await updateOrder.mutateAsync({ id: orderId, status: newStatus as any });
      toast({ title: "Order updated", description: `Status changed to ${newStatus.replace('_', ' ')}` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update order", variant: "destructive" });
    }
  };

  const handleCreateOrder = async () => {
    if (!newOrder.orderNumber || !newOrder.customerName || !newOrder.dueDate) {
      toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    try {
      const createdOrder = await createOrder.mutateAsync({
        orderNumber: newOrder.orderNumber,
        customerName: newOrder.customerName,
        customerId: newOrder.customerId || null,
        priority: newOrder.priority,
        dueDate: new Date(newOrder.dueDate).toISOString(),
        status: 'pending',
      });
      toast({ title: "Order created", description: `Order ${newOrder.orderNumber} created. Add products below.` });
      setIsCreateDialogOpen(false);
      setNewOrder({ orderNumber: '', customerName: '', customerId: '', priority: 'normal', dueDate: '' });
      
      // Open edit dialog to add products
      if (createdOrder) {
        setSelectedOrder(createdOrder);
        setEditOrder({
          customerName: createdOrder.customerName,
          customerId: createdOrder.customerId || '',
          priority: createdOrder.priority,
          dueDate: createdOrder.dueDate.split('T')[0],
          notes: createdOrder.notes || '',
        });
        setIsEditDialogOpen(true);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create order", variant: "destructive" });
    }
  };

  const handleEditClick = (order: Order) => {
    setSelectedOrder(order);
    setEditOrder({
      customerName: order.customerName,
      customerId: order.customerId || '',
      priority: order.priority,
      dueDate: order.dueDate.split('T')[0],
      notes: order.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleViewClick = (order: OrderWithAllocation) => {
    setViewingOrder(order);
    setIsViewDialogOpen(true);
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder || !editOrder.customerName) {
      toast({ title: "Missing fields", description: "Please fill in the customer name", variant: "destructive" });
      return;
    }
    try {
      await updateOrder.mutateAsync({
        id: selectedOrder.id,
        customerName: editOrder.customerName,
        customerId: editOrder.customerId || null,
        priority: editOrder.priority,
        dueDate: new Date(editOrder.dueDate).toISOString(),
        notes: editOrder.notes || null,
      });
      toast({ title: "Order updated", description: `Order ${selectedOrder.orderNumber} updated successfully` });
      setIsEditDialogOpen(false);
      setSelectedOrder(null);
    } catch (error) {
      toast({ title: "Error", description: "Failed to update order", variant: "destructive" });
    }
  };

  const handleCustomerSelect = (customerId: string, isCreate: boolean) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      if (isCreate) {
        setNewOrder({ ...newOrder, customerId, customerName: customer.name });
      } else {
        setEditOrder({ ...editOrder, customerId, customerName: customer.name });
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
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="font-mono" data-testid="button-create-order">
              <Plus size={16} className="mr-2" /> Create Order
            </Button>
          </DialogTrigger>
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer">Customer *</Label>
                {customers.length > 0 ? (
                  <Select value={newOrder.customerId} onValueChange={(v) => handleCustomerSelect(v, true)}>
                    <SelectTrigger data-testid="select-customer">
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.code} - {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="customerName"
                    placeholder="e.g. Acme Corporation"
                    value={newOrder.customerName}
                    onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
                    data-testid="input-customer-name"
                  />
                )}
                {customers.length > 0 && !newOrder.customerId && (
                  <Input
                    placeholder="Or enter customer name manually"
                    value={newOrder.customerName}
                    onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value, customerId: '' })}
                    className="mt-2"
                    data-testid="input-customer-name-manual"
                  />
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
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateOrder} disabled={createOrder.isPending} data-testid="button-submit-order">
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
                    <TableHead className="w-[100px] sm:w-[140px]">Order #</TableHead>
                    <TableHead className="min-w-[120px]">Customer</TableHead>
                    <TableHead className="min-w-[200px]">Items</TableHead>
                    <TableHead className="text-center min-w-[100px]">Stock</TableHead>
                    <TableHead className="text-center min-w-[80px]">Priority</TableHead>
                    <TableHead className="text-center min-w-[80px]">Status</TableHead>
                    <TableHead className="text-right min-w-[100px]">Due Date</TableHead>
                    <TableHead className="text-right min-w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentOrders.map((order) => (
                    <OrderRow 
                      key={order.id} 
                      order={order} 
                      onStatusChange={handleStatusChange}
                      onEditClick={handleEditClick}
                      onDelete={handleDeleteOrder}
                      onComplete={handleCompleteOrder}
                      onViewClick={handleViewClick}
                      products={products}
                    />
                  ))}
                  {currentOrders.length === 0 && (
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
                    <TableHead className="w-[100px] sm:w-[140px]">Order #</TableHead>
                    <TableHead className="min-w-[120px]">Customer</TableHead>
                    <TableHead className="min-w-[200px]">Items</TableHead>
                    <TableHead className="text-center min-w-[100px]">Status</TableHead>
                    <TableHead className="text-center min-w-[80px]">Priority</TableHead>
                    <TableHead className="text-right min-w-[100px]">Completed</TableHead>
                    <TableHead className="text-right min-w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archivedOrders.map((order) => (
                    <ArchivedOrderRow 
                      key={order.id} 
                      order={order} 
                      onViewClick={handleViewClick}
                      onDelete={handleDeleteOrder}
                      products={products}
                    />
                  ))}
                  {archivedOrders.length === 0 && (
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
                      const unit = product?.unit || 'KG';
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
            <Button variant="outline" onClick={() => {
              setIsViewDialogOpen(false);
              if (viewingOrder) handleEditClick(viewingOrder);
            }}>
              <Pencil className="mr-2 h-4 w-4" /> Edit Order
            </Button>
            {viewingOrder && viewingOrder.status !== 'shipped' && viewingOrder.status !== 'cancelled' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Truck size={14} className="mr-2" /> Complete Order
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Complete Order</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark the order as shipped and deduct the reserved stock from inventory.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        handleCompleteOrder(viewingOrder.id);
                        setIsViewDialogOpen(false);
                      }}
                    >
                      Complete Order
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
  onClose,
}: {
  order: Order;
  editOrder: { customerName: string; customerId: string; priority: string; dueDate: string; notes: string };
  setEditOrder: (value: any) => void;
  customers: Customer[];
  products: Product[];
  onCustomerSelect: (id: string) => void;
  onSave: () => void;
  isPending: boolean;
  onClose: () => void;
}) {
  const { data: orderItems = [], isLoading: itemsLoading } = useOrderItems(order.id);
  const createOrderItem = useCreateOrderItem();
  const deleteOrderItem = useDeleteOrderItem();
  const { toast } = useToast();
  
  const [newItem, setNewItem] = useState({ productId: '', quantity: '' });
  const [productSearchOpen, setProductSearchOpen] = useState(false);

  const handleAddItem = async () => {
    if (!newItem.productId || !newItem.quantity) {
      toast({ title: "Missing fields", description: "Please select a product and enter quantity", variant: "destructive" });
      return;
    }
    try {
      await createOrderItem.mutateAsync({
        orderId: order.id,
        productId: newItem.productId,
        quantity: newItem.quantity,
      });
      toast({ title: "Item added", description: "Order item added successfully" });
      setNewItem({ productId: '', quantity: '' });
    } catch (error) {
      toast({ title: "Error", description: "Failed to add order item", variant: "destructive" });
    }
  };

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
          {customers.length > 0 ? (
            <Select value={editOrder.customerId} onValueChange={onCustomerSelect}>
              <SelectTrigger data-testid="select-edit-customer">
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map(customer => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.code} - {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={editOrder.customerName}
              onChange={(e) => setEditOrder({ ...editOrder, customerName: e.target.value })}
              data-testid="input-edit-customer-name"
            />
          )}
          {customers.length > 0 && (
            <Input
              placeholder="Or enter name manually"
              value={editOrder.customerName}
              onChange={(e) => setEditOrder({ ...editOrder, customerName: e.target.value, customerId: '' })}
              className="mt-2"
              data-testid="input-edit-customer-name-manual"
            />
          )}
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
                    <TableHead className="text-right">Quantity (KG)</TableHead>
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
                          <TableCell className="text-right font-mono">{parseFloat(item.quantity).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono">
                            {product ? parseFloat(product.currentStock).toFixed(2) : '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={deleteOrderItem.isPending}
                              data-testid={`button-remove-item-${item.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2 items-end">
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
                <Label>Quantity (KG)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  placeholder="0.00"
                  data-testid="input-add-quantity"
                />
              </div>
              <Button
                onClick={handleAddItem}
                disabled={createOrderItem.isPending}
                data-testid="button-add-item"
              >
                {createOrderItem.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={onSave} disabled={isPending} data-testid="button-save-order">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </DialogFooter>
    </div>
  );
}

function OrderRow({ order, onStatusChange, onEditClick, onDelete, onComplete, onViewClick, products }: { 
  order: OrderWithAllocation; 
  onStatusChange: (id: string, status: string) => void;
  onEditClick: (order: Order) => void;
  onDelete: (order: Order) => void;
  onComplete: (id: string) => void;
  onViewClick: (order: OrderWithAllocation) => void;
  products: Product[];
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);

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
      <TableCell className="font-mono font-bold">{order.orderNumber}</TableCell>
      <TableCell>{order.customerName}</TableCell>
      <TableCell>
        <div className="space-y-1">
          {order.items.map((item) => {
            const product = products.find(p => p.id === item.productId);
            const allocated = parseFloat(item.reservedQuantity);
            const needed = parseFloat(item.quantity);
            return (
              <div key={item.id} className="text-sm">
                {item.productName} <span className="text-muted-foreground font-mono">({allocated.toFixed(0)}/{needed.toFixed(0)} {product?.unit || 'KG'})</span>
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
            {order.status !== 'shipped' && order.status !== 'cancelled' && (
              <DropdownMenuItem 
                onClick={() => setIsCompleteDialogOpen(true)}
                className="text-green-600"
                data-testid={`button-complete-order-${order.id}`}
              >
                <Truck size={14} className="mr-2" /> Complete Order
              </DropdownMenuItem>
            )}
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
          </DropdownMenuContent>
        </DropdownMenu>
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Order</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete order {order.orderNumber}? This will also remove all associated items. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(order)} data-testid="button-confirm-delete-order">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Complete Order</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div>
                  Complete order {order.orderNumber} for {order.customerName}? This will:
                  <ul className="list-disc ml-4 mt-2 space-y-1">
                    <li>Mark the order as shipped</li>
                    <li>Deduct stock from inventory for all items</li>
                    <li>Log stock movements for traceability</li>
                  </ul>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => { onComplete(order.id); setIsCompleteDialogOpen(false); }} 
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-confirm-complete-order"
              >
                Complete Order
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

function ArchivedOrderRow({ order, onViewClick, onDelete, products }: { 
  order: OrderWithAllocation; 
  onViewClick: (order: OrderWithAllocation) => void;
  onDelete: (order: Order) => void;
  products: Product[];
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
      <TableCell className="font-mono font-bold">{order.orderNumber}</TableCell>
      <TableCell>{order.customerName}</TableCell>
      <TableCell>
        <div className="space-y-1">
          {order.items.map((item) => {
            const product = products.find(p => p.id === item.productId);
            const quantity = parseFloat(item.quantity);
            return (
              <div key={item.id} className="text-sm">
                {item.productName} <span className="text-muted-foreground font-mono">({quantity.toFixed(0)} {product?.unit || 'KG'})</span>
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
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive" 
              onClick={() => setIsDeleteDialogOpen(true)}
              data-testid={`button-delete-archived-order-${order.id}`}
            >
              <Trash2 size={14} className="mr-2" /> Delete Order
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Archived Order</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete order {order.orderNumber}? This will remove the order record. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(order)} data-testid="button-confirm-delete-archived-order">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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

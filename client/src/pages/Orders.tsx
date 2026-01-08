import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter, CheckCircle2, AlertCircle, Truck, Clock, Loader2, Pencil, Trash2, Package, MoreHorizontal } from 'lucide-react';
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
import { useOrders, useProducts, useOrderItems, useUpdateOrder, useCreateOrder, useCreateOrderItem, useDeleteOrderItem, useDeleteOrder, useCustomers, type Order, type OrderItem, type Product, type Customer } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function Orders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
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
  
  const { data: orders = [], isLoading, isError } = useOrders();
  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
  const updateOrder = useUpdateOrder();
  const createOrder = useCreateOrder();
  const deleteOrder = useDeleteOrder();
  const { toast } = useToast();

  const filteredOrders = orders.filter(o => 
    o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customerName.toLowerCase().includes(searchTerm.toLowerCase())
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
      await createOrder.mutateAsync({
        orderNumber: newOrder.orderNumber,
        customerName: newOrder.customerName,
        customerId: newOrder.customerId || null,
        priority: newOrder.priority,
        dueDate: new Date(newOrder.dueDate).toISOString(),
        status: 'pending',
      });
      toast({ title: "Order created", description: `Order ${newOrder.orderNumber} created successfully` });
      setIsCreateDialogOpen(false);
      setNewOrder({ orderNumber: '', customerName: '', customerId: '', priority: 'normal', dueDate: '' });
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
          <h1 className="text-3xl font-bold tracking-tight font-mono" data-testid="text-orders-title">Orders</h1>
          <p className="text-muted-foreground mt-1">Manage customer orders and fulfillment.</p>
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

      <div className="flex items-center space-x-2 bg-card p-2 rounded-md border max-w-md">
        <Search className="w-4 h-4 text-muted-foreground ml-2" />
        <Input 
          placeholder="Search orders..." 
          className="border-none shadow-none focus-visible:ring-0"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="input-search-orders"
        />
        <Button variant="ghost" size="icon" data-testid="button-filter-orders">
          <Filter size={16} />
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-center">Stock</TableHead>
              <TableHead className="text-center">Priority</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Due Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => (
              <OrderRow 
                key={order.id} 
                order={order} 
                products={products} 
                onStatusChange={handleStatusChange}
                onEditClick={handleEditClick}
                onDelete={handleDeleteOrder}
              />
            ))}
            {filteredOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No orders found. Click "Create Order" to add your first order.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
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
                <Select value={newItem.productId} onValueChange={(v) => setNewItem({ ...newItem, productId: v })}>
                  <SelectTrigger data-testid="select-add-product">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.sku} - {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

function OrderRow({ order, products, onStatusChange, onEditClick, onDelete }: { 
  order: Order; 
  products: Product[]; 
  onStatusChange: (id: string, status: string) => void;
  onEditClick: (order: Order) => void;
  onDelete: (order: Order) => void;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { data: items = [] } = useOrderItems(order.id);
  
  const orderItems = items.map(item => {
    const product = products.find(p => p.id === item.productId);
    const inStock = product ? parseFloat(product.currentStock) : 0;
    const canFulfill = inStock >= parseFloat(item.quantity);
    return { ...item, product, canFulfill };
  });
  
  const allFulfillable = orderItems.length > 0 && orderItems.every(i => i.canFulfill);

  return (
    <TableRow data-testid={`row-order-${order.id}`}>
      <TableCell className="font-mono font-bold">{order.orderNumber}</TableCell>
      <TableCell>{order.customerName}</TableCell>
      <TableCell>
        <div className="space-y-1">
          {orderItems.map((item, idx) => (
            <div key={idx} className="text-sm">
              {item.product?.name || 'Loading...'} <span className="text-muted-foreground font-mono">({parseFloat(item.quantity).toFixed(0)} KG)</span>
            </div>
          ))}
          {items.length === 0 && <span className="text-muted-foreground text-sm italic">No items</span>}
        </div>
      </TableCell>
      <TableCell className="text-center">
        {items.length === 0 ? (
          <Badge className="bg-slate-100 text-slate-600">-</Badge>
        ) : allFulfillable ? (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle2 size={12} className="mr-1" /> OK
          </Badge>
        ) : (
          <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">
            <AlertCircle size={12} className="mr-1" /> Low
          </Badge>
        )}
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
      <TableCell className="text-right">
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
            <DropdownMenuItem onClick={() => onStatusChange(order.id, 'shipped')}>
              <Truck size={14} className="mr-2" /> Mark Shipped
            </DropdownMenuItem>
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

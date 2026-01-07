import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Filter, CheckCircle2, AlertCircle, Truck, Clock, Loader2 } from 'lucide-react';
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
import { MoreHorizontal } from 'lucide-react';
import { useOrders, useProducts, useOrderItems, useUpdateOrder } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function Orders() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: orders = [], isLoading } = useOrders();
  const { data: products = [] } = useProducts();
  const updateOrder = useUpdateOrder();
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
        <Button size="lg" className="font-mono" data-testid="button-create-order">
          <Plus size={16} className="mr-2" /> Create Order
        </Button>
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
              />
            ))}
            {filteredOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No orders found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function OrderRow({ order, products, onStatusChange }: { order: any; products: any[]; onStatusChange: (id: string, status: string) => void }) {
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
          {items.length === 0 && <span className="text-muted-foreground text-sm">Loading...</span>}
        </div>
      </TableCell>
      <TableCell className="text-center">
        {items.length === 0 ? (
          <Badge className="bg-slate-100 text-slate-600">...</Badge>
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
          </DropdownMenuContent>
        </DropdownMenu>
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

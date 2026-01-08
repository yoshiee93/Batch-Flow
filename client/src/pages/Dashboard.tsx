import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle2, Package, ShoppingCart, TrendingUp, AlertCircle, Loader2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { useProducts, useMaterials, useDashboardStats, useOrdersWithAllocation, type OrderWithAllocation } from '@/lib/api';

export default function Dashboard() {
  const { data: ordersWithAllocation = [], isLoading: ordersLoading, isError: ordersError } = useOrdersWithAllocation();
  const { data: products = [], isLoading: productsLoading, isError: productsError } = useProducts();
  const { data: materials = [], isLoading: materialsLoading, isError: materialsError } = useMaterials();
  const { data: stats } = useDashboardStats();

  const activeOrders = ordersWithAllocation.filter(o => ['pending', 'in_production'].includes(o.status));
  const lowStockMaterials = materials.filter(m => parseFloat(m.currentStock) <= parseFloat(m.minStock));

  const isLoading = ordersLoading || productsLoading || materialsLoading;
  const hasError = ordersError || productsError || materialsError;

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
        <h2 className="text-xl font-semibold mb-2">Failed to load data</h2>
        <p className="text-muted-foreground mb-4">There was an error loading the dashboard data. Please try refreshing the page.</p>
        <Button onClick={() => window.location.reload()}>Refresh Page</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono" data-testid="text-dashboard-title">Factory Overview</h1>
          <p className="text-muted-foreground mt-1">Real-time orders and stock status.</p>
        </div>
        <div className="flex gap-2">
           <Link href="/orders">
             <Button className="font-mono" data-testid="button-new-order">
               <ShoppingCart size={16} className="mr-2" /> New Order
             </Button>
           </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-active-orders">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{stats?.pendingOrders ?? activeOrders.length}</div>
            <p className="text-xs text-muted-foreground">Orders pending fulfillment</p>
          </CardContent>
        </Card>
        <Card data-testid="card-active-batches">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Batches</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{stats?.activeBatches ?? 0}</div>
            <p className="text-xs text-green-600 flex items-center font-medium">
              <TrendingUp size={12} className="mr-1" /> Production in progress
            </p>
          </CardContent>
        </Card>
        <Card data-testid="card-low-stock">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-destructive">{stats?.lowStockAlerts ?? lowStockMaterials.length}</div>
            <p className="text-xs text-muted-foreground">Items below safety stock</p>
          </CardContent>
        </Card>
        <Card data-testid="card-total-products">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{stats?.totalProducts ?? products.length}</div>
            <p className="text-xs text-muted-foreground">Active SKUs</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Current Orders</CardTitle>
            <CardDescription>Active orders and stock availability.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeOrders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
              {activeOrders.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No active orders</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Material Alerts</CardTitle>
            <CardDescription>Items requiring immediate attention.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockMaterials.map(mat => (
                <div key={mat.id} className="flex items-start space-x-4 p-3 border border-destructive/20 bg-destructive/5 rounded-md" data-testid={`alert-material-${mat.id}`}>
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{mat.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{mat.sku}</p>
                    <div className="flex items-center gap-2 text-xs font-medium text-destructive">
                      <span>Current: {parseFloat(mat.currentStock).toFixed(0)} {mat.unit}</span>
                      <span>•</span>
                      <span>Min: {parseFloat(mat.minStock).toFixed(0)} {mat.unit}</span>
                    </div>
                  </div>
                </div>
              ))}
              {lowStockMaterials.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No stock alerts</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: OrderWithAllocation }) {
  const allocationBadge = () => {
    switch (order.allocationStatus) {
      case 'ready_to_ship':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle2 size={12} className="mr-1" /> Ready to Ship
          </Badge>
        );
      case 'partially_allocated':
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
            <Clock size={12} className="mr-1" /> Partially Allocated
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-100 text-slate-600 border-slate-200">
            <AlertCircle size={12} className="mr-1" /> Awaiting Stock
          </Badge>
        );
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors" data-testid={`card-order-${order.id}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold">{order.orderNumber}</span>
            <OrderStatusBadge status={order.status} />
            <PriorityBadge priority={order.priority} />
          </div>
          <div className="text-sm font-medium">{order.customerName}</div>
          <div className="text-xs text-muted-foreground">
            Due: {format(new Date(order.dueDate), 'MMM d, yyyy')}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {allocationBadge()}
        </div>
      </div>

      {order.items.length > 0 && (
        <div className="space-y-2 mt-3 pt-3 border-t">
          {order.items.map((item) => {
            const allocated = parseFloat(item.reservedQuantity);
            const needed = parseFloat(item.quantity);
            const percent = needed > 0 ? (allocated / needed) * 100 : 0;
            const isFullyAllocated = allocated >= needed;
            
            return (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.productName}</span>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "font-mono text-xs px-2 py-0.5 rounded",
                    isFullyAllocated 
                      ? "bg-green-50 text-green-700" 
                      : allocated > 0
                        ? "bg-amber-50 text-amber-700"
                        : "bg-slate-50 text-slate-500"
                  )}>
                    {allocated.toFixed(0)} / {needed.toFixed(0)} KG allocated
                  </span>
                  <Progress 
                    value={Math.min(percent, 100)} 
                    className={cn(
                      "w-16 h-2",
                      !isFullyAllocated && allocated > 0 && "[&>div]:bg-amber-500",
                      !isFullyAllocated && allocated === 0 && "[&>div]:bg-slate-300"
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
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
    urgent: "bg-red-50 text-red-700 border-red-200 animate-pulse",
  };

  if (priority === 'normal' || priority === 'low') return null;

  return (
    <Badge variant="outline" className={cn("font-mono uppercase text-[10px]", styles[priority])}>
      {priority}
    </Badge>
  );
}

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle2, Clock, Package, ShoppingCart, TrendingUp, AlertCircle } from 'lucide-react';
import { mockMaterials, mockProducts, mockOrders } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';
import { format } from 'date-fns';

export default function Dashboard() {
  const activeOrders = mockOrders.filter(o => ['pending', 'in_production'].includes(o.status));
  const lowStockMaterials = mockMaterials.filter(m => m.currentStock <= m.minStock);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono">Factory Overview</h1>
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{activeOrders.length}</div>
            <p className="text-xs text-muted-foreground">Orders pending fulfillment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Output</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">24,500 KG</div>
            <p className="text-xs text-green-600 flex items-center font-medium">
              <TrendingUp size={12} className="mr-1" /> +12% vs last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-destructive">{lowStockMaterials.length}</div>
            <p className="text-xs text-muted-foreground">Items below safety stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">98.5%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
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
              {activeOrders.map(order => {
                const orderItems = order.items.map(item => {
                  const product = mockProducts.find(p => p.id === item.productId);
                  const inStock = product?.currentStock || 0;
                  const needed = item.quantity;
                  const canFulfill = inStock >= needed;
                  return { ...item, product, inStock, canFulfill };
                });
                const allFulfillable = orderItems.every(i => i.canFulfill);

                return (
                  <div key={order.id} className="p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
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
                        {allFulfillable ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            <CheckCircle2 size={12} className="mr-1" /> Stock OK
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">
                            <AlertCircle size={12} className="mr-1" /> Low Stock
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 mt-3 pt-3 border-t">
                      {orderItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{item.product?.name}</span>
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "font-mono text-xs px-2 py-0.5 rounded",
                              item.canFulfill 
                                ? "bg-green-50 text-green-700" 
                                : "bg-red-50 text-red-700"
                            )}>
                              {item.inStock} / {item.quantity} KG
                            </span>
                            <Progress 
                              value={Math.min((item.inStock / item.quantity) * 100, 100)} 
                              className={cn("w-16 h-2", !item.canFulfill && "[&>div]:bg-destructive")}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
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
                <div key={mat.id} className="flex items-start space-x-4 p-3 border border-destructive/20 bg-destructive/5 rounded-md">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{mat.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{mat.sku}</p>
                    <div className="flex items-center gap-2 text-xs font-medium text-destructive">
                      <span>Current: {mat.currentStock} {mat.unit}</span>
                      <span>•</span>
                      <span>Min: {mat.minStock} {mat.unit}</span>
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

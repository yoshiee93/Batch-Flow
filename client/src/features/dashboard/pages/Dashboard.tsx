import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertTriangle, CheckCircle2, Package, ShoppingCart, TrendingUp, AlertCircle, Loader2, Clock, ChevronDown, FlaskConical, ScanSearch, Users, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import { useProducts, useMaterials, useDashboardStats, useOrdersWithAllocation, useBatches, type OrderWithAllocation } from '@/lib/api';
import { useSettings } from '@/hooks/use-settings';

const QUICK_ACTIONS = [
  { label: 'New Order', icon: ShoppingCart, href: '/orders', description: 'Create a customer order' },
  { label: 'Receive Stock', icon: Package, href: '/inventory', description: 'Record incoming materials' },
  { label: 'New Batch', icon: FlaskConical, href: '/production', description: 'Start a production batch' },
  { label: 'Tracking', icon: ScanSearch, href: '/traceability', description: 'Trace lots and batches' },
  { label: 'Customers', icon: Users, href: '/customers', description: 'View customer accounts' },
] as const;

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { data: ordersWithAllocation = [], isLoading: ordersLoading, isError: ordersError } = useOrdersWithAllocation();
  const { data: products = [], isLoading: productsLoading, isError: productsError } = useProducts();
  const { settings } = useSettings();
  const { data: materials = [], isLoading: materialsLoading, isError: materialsError } = useMaterials();
  const { data: batches = [], isLoading: batchesLoading, isError: batchesError } = useBatches();
  const { data: stats } = useDashboardStats();

  const activeOrders = ordersWithAllocation.filter(o => ['pending', 'in_production'].includes(o.status));
  const lowStockMaterials = materials.filter(m => parseFloat(m.currentStock) <= parseFloat(m.minStock));
  const activeBatches = batches.filter(b => b.status === 'in_progress');

  const isLoading = ordersLoading || productsLoading || materialsLoading || batchesLoading;
  const hasError = ordersError || productsError || materialsError || batchesError;

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-mono" data-testid="text-dashboard-title">Factory Overview</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Real-time orders and stock status.</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="font-mono w-full sm:w-auto" data-testid="button-quick-actions">
              <Zap size={16} className="mr-2" />
              Quick Actions
              <ChevronDown size={14} className="ml-2 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {QUICK_ACTIONS.map((action, i) => (
              <React.Fragment key={action.href}>
                {i === 1 && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  onSelect={() => navigate(action.href)}
                  className="cursor-pointer"
                  data-testid={`quick-action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <action.icon size={15} className="shrink-0" />
                  <span>{action.label}</span>
                </DropdownMenuItem>
              </React.Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <DashboardCard
          title="Active Orders"
          icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
          value={stats?.pendingOrders ?? activeOrders.length}
          description="Orders pending fulfillment"
          testId="card-active-orders"
        />

        <DashboardCard
          title="Active Batches"
          icon={<Package className="h-4 w-4 text-muted-foreground" />}
          value={stats?.activeBatches ?? 0}
          description={
            <span className="text-green-600 flex items-center font-medium">
              <TrendingUp size={12} className="mr-1" /> Production in progress
            </span>
          }
          testId="card-active-batches"
        />

        <DashboardCard
          title="Low Stock Alerts"
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          value={stats?.lowStockAlerts ?? lowStockMaterials.length}
          valueClassName="text-destructive"
          description="Items below safety stock"
          testId="card-low-stock"
        />

        <DashboardCard
          title="Total Products"
          icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
          value={stats?.totalProducts ?? products.length}
          description="Active SKUs"
          testId="card-total-products"
        />
      </div>

      <Card data-testid="card-quick-actions">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-primary" />
            Quick Actions
          </CardTitle>
          <CardDescription>Jump to common workflows</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.href}
                onClick={() => navigate(action.href)}
                className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors text-center group cursor-pointer"
                data-testid={`quick-action-card-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <action.icon size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <p className="text-xs font-medium font-mono leading-tight">{action.label}</p>
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5 hidden sm:block">{action.description}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 overflow-hidden flex flex-col max-h-[500px]">
          <CardHeader className="flex-shrink-0">
            <CardTitle>Current Orders</CardTitle>
            <CardDescription>Active orders and stock availability.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            <div className="space-y-4">
              {activeOrders.map(order => (
                <OrderCard key={order.id} order={order} defaultExpanded={settings.cardsExpandedByDefault} />
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

        <Card className="lg:col-span-1 overflow-hidden flex flex-col max-h-[500px]">
          <CardHeader className="flex-shrink-0">
            <CardTitle>Material Alerts</CardTitle>
            <CardDescription>Items requiring immediate attention.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
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

        <Card className="lg:col-span-1 overflow-hidden flex flex-col max-h-[500px]">
          <CardHeader className="flex-shrink-0">
            <CardTitle>Current Production</CardTitle>
            <CardDescription>Batches currently in progress.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            <div className="space-y-4">
              {activeBatches.map(batch => {
                const product = products.find(p => p.id === batch.productId);
                const plannedQty = parseFloat(batch.plannedQuantity);
                const actualQty = batch.actualQuantity ? parseFloat(batch.actualQuantity) : 0;
                const progress = plannedQty > 0 ? (actualQty / plannedQty) * 100 : 0;
                
                return (
                  <Collapsible key={batch.id} defaultOpen={settings.cardsExpandedByDefault} className="group">
                    <div className="border rounded-lg overflow-hidden" data-testid={`card-batch-${batch.id}`}>
                      <CollapsibleTrigger className="w-full p-3 hover:bg-muted/50 transition-colors text-left">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                              <span className="font-mono font-bold text-sm">{batch.batchNumber}</span>
                              <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                <Clock size={12} className="mr-1" /> In Progress
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground ml-6">{product?.name || 'Unknown Product'}</p>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-3 pb-3 pt-0 border-t space-y-2">
                          <div className="pt-3 flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-mono">{actualQty.toFixed(0)} / {plannedQty.toFixed(0)} {product?.unit || 'KG'}</span>
                          </div>
                          <Progress value={Math.min(progress, 100)} className="h-2" />
                          {batch.startDate && (
                            <p className="text-xs text-muted-foreground">
                              Started: {format(new Date(batch.startDate), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
              {activeBatches.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No active production</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface DashboardCardProps {
  title: string;
  icon: React.ReactNode;
  value: number | string;
  valueClassName?: string;
  description: React.ReactNode;
  testId: string;
}

function DashboardCard({ title, icon, value, valueClassName, description, testId }: DashboardCardProps) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold font-mono", valueClassName)}>{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function OrderCard({ order, defaultExpanded = false }: { order: OrderWithAllocation; defaultExpanded?: boolean }) {
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
    <Collapsible defaultOpen={defaultExpanded} className="group">
      <div className="border rounded-lg overflow-hidden" data-testid={`card-order-${order.id}`}>
        <CollapsibleTrigger className="w-full p-3 hover:bg-muted/50 transition-colors text-left">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                <span className="font-mono font-bold text-sm">{order.orderNumber}</span>
                {allocationBadge()}
              </div>
              <p className="text-sm text-muted-foreground ml-6">{order.customerName}</p>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 border-t">
            <div className="pt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Due Date</span>
                <span className="font-mono">{format(new Date(order.dueDate), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Items</span>
                <span className="font-mono">{order.items.length} product(s)</span>
              </div>
              {order.items.length > 0 && (
                <div className="pt-2 space-y-1">
                  {order.items.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="text-xs text-muted-foreground flex justify-between">
                      <span>{item.productName}</span>
                      <span className="font-mono">{parseFloat(item.quantity).toFixed(0)} KG</span>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <p className="text-xs text-muted-foreground">+{order.items.length - 3} more items</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

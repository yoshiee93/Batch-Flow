import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, CheckCircle2, Package, ShoppingCart, TrendingUp, AlertCircle, Loader2, Clock, ChevronDown, Move, RotateCcw, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { useProducts, useMaterials, useDashboardStats, useOrdersWithAllocation, useBatches, type OrderWithAllocation } from '@/lib/api';
import { useSettings } from '@/hooks/use-settings';
import { useDashboardLayout, type DashboardLayoutItem } from '@/hooks/use-dashboard-layout';
import { useRef, useState, useEffect } from 'react';
import { ResponsiveGridLayout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

export default function Dashboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  const { data: ordersWithAllocation = [], isLoading: ordersLoading, isError: ordersError } = useOrdersWithAllocation();
  const { data: products = [], isLoading: productsLoading, isError: productsError } = useProducts();
  const { settings } = useSettings();
  const { data: materials = [], isLoading: materialsLoading, isError: materialsError } = useMaterials();
  const { data: batches = [], isLoading: batchesLoading, isError: batchesError } = useBatches();
  const { data: stats } = useDashboardStats();
  const { layout, editMode, onLayoutChange, resetLayout, toggleEditMode } = useDashboardLayout();

  const activeOrders = ordersWithAllocation.filter(o => ['pending', 'in_production'].includes(o.status));
  const lowStockMaterials = materials.filter(m => parseFloat(m.currentStock) <= parseFloat(m.minStock));
  const activeBatches = batches.filter(b => b.status === 'in_progress');

  const isLoading = ordersLoading || productsLoading || materialsLoading || batchesLoading;
  const hasError = ordersError || productsError || materialsError || batchesError;

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

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

  const layouts = {
    lg: layout,
    md: layout.map(item => ({ ...item, w: Math.min(item.w, 10) })),
    sm: layout.map(item => ({ ...item, x: 0, w: 6 })),
    xs: layout.map(item => ({ ...item, x: 0, w: 4 })),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-mono" data-testid="text-dashboard-title">Factory Overview</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Real-time orders and stock status.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={toggleEditMode}
            className={cn("font-mono", editMode && "bg-blue-600 hover:bg-blue-700")}
            data-testid="button-edit-layout"
          >
            {editMode ? <Move size={16} className="mr-2" /> : <Pencil size={16} className="mr-2" />}
            {editMode ? "Editing Layout" : "Edit Layout"}
          </Button>
          {editMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetLayout}
              className="font-mono"
              data-testid="button-reset-layout"
            >
              <RotateCcw size={16} className="mr-2" /> Reset
            </Button>
          )}
          <Link href="/orders">
            <Button className="font-mono w-full sm:w-auto" data-testid="button-new-order">
              <ShoppingCart size={16} className="mr-2" /> New Order
            </Button>
          </Link>
        </div>
      </div>

      {editMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 flex items-center gap-2">
          <Move size={16} />
          <span>Drag tiles to rearrange. Drag corners to resize. Changes are saved automatically.</span>
        </div>
      )}

      <div ref={containerRef}>
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
          rowHeight={60}
          width={containerWidth}
          onLayoutChange={(currentLayout) => onLayoutChange(currentLayout as DashboardLayoutItem[])}
          isDraggable={editMode}
          isResizable={editMode}
          draggableHandle=".drag-handle"
          margin={[16, 16]}
        >
        <div key="stats-orders" className={cn(editMode && "ring-2 ring-blue-200 ring-offset-2 rounded-lg")}>
          <DashboardCard
            editMode={editMode}
            title="Active Orders"
            icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
            value={stats?.pendingOrders ?? activeOrders.length}
            description="Orders pending fulfillment"
            testId="card-active-orders"
          />
        </div>

        <div key="stats-batches" className={cn(editMode && "ring-2 ring-blue-200 ring-offset-2 rounded-lg")}>
          <DashboardCard
            editMode={editMode}
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
        </div>

        <div key="stats-alerts" className={cn(editMode && "ring-2 ring-blue-200 ring-offset-2 rounded-lg")}>
          <DashboardCard
            editMode={editMode}
            title="Low Stock Alerts"
            icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
            value={stats?.lowStockAlerts ?? lowStockMaterials.length}
            valueClassName="text-destructive"
            description="Items below safety stock"
            testId="card-low-stock"
          />
        </div>

        <div key="stats-products" className={cn(editMode && "ring-2 ring-blue-200 ring-offset-2 rounded-lg")}>
          <DashboardCard
            editMode={editMode}
            title="Total Products"
            icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
            value={stats?.totalProducts ?? products.length}
            description="Active SKUs"
            testId="card-total-products"
          />
        </div>

        <div key="current-orders" className={cn(editMode && "ring-2 ring-blue-200 ring-offset-2 rounded-lg")}>
          <Card className="h-full overflow-hidden flex flex-col">
            {editMode && (
              <div className="drag-handle bg-blue-50 border-b border-blue-100 px-3 py-1.5 cursor-move flex items-center gap-2 text-blue-600 text-xs font-medium">
                <Move size={14} /> Drag to move
              </div>
            )}
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
        </div>

        <div key="material-alerts" className={cn(editMode && "ring-2 ring-blue-200 ring-offset-2 rounded-lg")}>
          <Card className="h-full overflow-hidden flex flex-col">
            {editMode && (
              <div className="drag-handle bg-blue-50 border-b border-blue-100 px-3 py-1.5 cursor-move flex items-center gap-2 text-blue-600 text-xs font-medium">
                <Move size={14} /> Drag to move
              </div>
            )}
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
        </div>

        <div key="current-production" className={cn(editMode && "ring-2 ring-blue-200 ring-offset-2 rounded-lg")}>
          <Card className="h-full overflow-hidden flex flex-col">
            {editMode && (
              <div className="drag-handle bg-blue-50 border-b border-blue-100 px-3 py-1.5 cursor-move flex items-center gap-2 text-blue-600 text-xs font-medium">
                <Move size={14} /> Drag to move
              </div>
            )}
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
        </ResponsiveGridLayout>
      </div>
    </div>
  );
}

interface DashboardCardProps {
  editMode: boolean;
  title: string;
  icon: React.ReactNode;
  value: number | string;
  valueClassName?: string;
  description: React.ReactNode;
  testId: string;
}

function DashboardCard({ editMode, title, icon, value, valueClassName, description, testId }: DashboardCardProps) {
  return (
    <Card className="h-full flex flex-col" data-testid={testId}>
      {editMode && (
        <div className="drag-handle bg-blue-50 border-b border-blue-100 px-3 py-1 cursor-move flex items-center gap-2 text-blue-600 text-xs font-medium">
          <Move size={12} /> Drag
        </div>
      )}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
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
      <div className="border rounded-lg bg-card overflow-hidden" data-testid={`card-order-${order.id}`}>
        <CollapsibleTrigger className="w-full p-3 sm:p-4 hover:bg-muted/50 transition-colors text-left">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-0">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                <span className="font-mono font-bold text-sm sm:text-base">{order.orderNumber}</span>
                <OrderStatusBadge status={order.status} />
                <PriorityBadge priority={order.priority} />
              </div>
              <div className="text-sm font-medium ml-6">{order.customerName}</div>
              <div className="text-xs text-muted-foreground ml-6">
                Due: {format(new Date(order.dueDate), 'MMM d, yyyy')}
              </div>
            </div>
            <div className="flex items-center ml-6 sm:ml-0">
              {allocationBadge()}
            </div>
          </div>
        </CollapsibleTrigger>

        {order.items.length > 0 && (
          <CollapsibleContent>
            <div className="space-y-2 px-3 sm:px-4 pb-3 sm:pb-4 pt-0 border-t">
              <div className="pt-3">
                {order.items.map((item) => {
                  const allocated = parseFloat(item.reservedQuantity);
                  const needed = parseFloat(item.quantity);
                  const percent = needed > 0 ? (allocated / needed) * 100 : 0;
                  const isFullyAllocated = allocated >= needed;
                  
                  return (
                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 text-sm py-1">
                      <span className="text-muted-foreground truncate">{item.productName}</span>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className={cn(
                          "font-mono text-xs px-2 py-0.5 rounded whitespace-nowrap",
                          isFullyAllocated 
                            ? "bg-green-50 text-green-700" 
                            : allocated > 0
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-50 text-slate-500"
                        )}>
                          {allocated.toFixed(0)}/{needed.toFixed(0)} KG
                        </span>
                        <Progress 
                          value={Math.min(percent, 100)} 
                          className={cn(
                            "w-16 h-2 flex-shrink-0",
                            !isFullyAllocated && allocated > 0 && "[&>div]:bg-amber-500",
                            !isFullyAllocated && allocated === 0 && "[&>div]:bg-slate-300"
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
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

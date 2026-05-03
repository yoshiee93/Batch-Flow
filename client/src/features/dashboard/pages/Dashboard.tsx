import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  CheckCircle2,
  Package,
  AlertCircle,
  Clock,
  FlaskConical,
  ScanSearch,
  Users,
  Zap,
  ShoppingCart,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation, Link } from 'wouter';
import { format } from 'date-fns';
import {
  useProducts,
  useMaterials,
  useDashboardStats,
  useBatches,
} from '@/lib/api';
import { useSettings } from '@/hooks/use-settings';

const QUICK_ACTIONS = [
  { label: 'New Order', icon: ShoppingCart, href: '/orders?action=create', description: 'Create a customer order' },
  { label: 'Receive Stock', icon: Package, href: '/inventory?action=receive', description: 'Record incoming materials' },
  { label: 'New Batch', icon: FlaskConical, href: '/production?action=create', description: 'Start a production batch' },
  { label: 'Tracking', icon: ScanSearch, href: '/traceability', description: 'Trace lots and batches' },
  { label: 'Customers', icon: Users, href: '/customers', description: 'View customer accounts' },
] as const;

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { settings } = useSettings();
  const { data: products = [], isLoading: productsLoading, isError: productsError } = useProducts();
  const { data: materials = [], isLoading: materialsLoading, isError: materialsError } = useMaterials();
  const { data: batches = [], isLoading: batchesLoading, isError: batchesError } = useBatches();
  const { data: stats, isLoading: statsLoading, isError: statsError } = useDashboardStats();

  const hasError = productsError || materialsError || batchesError || statsError;

  const activeBatches = batches
    .filter(b => b.status === 'in_progress' || b.status === 'quality_check')
    .slice(0, 5);

  const lowStockItems = [
    ...materials
      .filter(m => parseFloat(m.currentStock) <= parseFloat(m.minStock))
      .map(m => ({
        id: m.id,
        name: m.name,
        sku: m.sku,
        unit: m.unit,
        currentStock: m.currentStock,
        minStock: m.minStock,
        kind: 'material' as const,
      })),
    ...products
      .filter(p => parseFloat(p.currentStock) <= parseFloat(p.minStock))
      .map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        currentStock: p.currentStock,
        minStock: p.minStock,
        kind: 'product' as const,
      })),
  ]
    .sort((a, b) => parseFloat(a.currentStock) - parseFloat(b.currentStock))
    .slice(0, 8);

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
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-mono" data-testid="text-dashboard-title">
          Today
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {settings.quickActionsEnabled && (
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
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiTile
          title="Batches Created Today"
          icon={<FlaskConical className="h-4 w-4 text-blue-600" />}
          value={stats?.batchesCreatedToday}
          loading={statsLoading}
          onClick={() => navigate('/production?filter=today')}
          testId="kpi-batches-today"
          description="Tap to view production"
        />
        <KpiTile
          title="Labels Printed Today"
          icon={<Printer className="h-4 w-4 text-emerald-600" />}
          value={stats?.labelsPrintedToday}
          loading={statsLoading}
          testId="kpi-labels-today"
          description="From print history"
        />
        <KpiTile
          title="Low-Stock Items"
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          value={stats?.lowStockAlerts}
          valueClassName="text-destructive"
          loading={statsLoading}
          onClick={() => navigate('/inventory?filter=lowstock')}
          testId="kpi-low-stock"
          description="Tap to view inventory"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card data-testid="card-active-batches">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4 text-primary" />
              Active Batches
            </CardTitle>
            <CardDescription>In progress or in quality check</CardDescription>
          </CardHeader>
          <CardContent>
            {batchesLoading || productsLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : activeBatches.length === 0 ? (
              <EmptyState icon={<CheckCircle2 className="h-8 w-8 opacity-50" />} message="All caught up — no active batches" />
            ) : (
              <div className="space-y-2">
                {activeBatches.map(batch => {
                  const product = products.find(p => p.id === batch.productId);
                  const isQC = batch.status === 'quality_check';
                  return (
                    <Link key={batch.id} href={`/batches/${batch.id}`}>
                      <div
                        className="flex items-center justify-between gap-3 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
                        data-testid={`active-batch-${batch.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-semibold text-sm truncate">{batch.batchNumber}</span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] uppercase font-mono",
                                isQC
                                  ? "bg-amber-100 text-amber-700 border-amber-200"
                                  : "bg-blue-100 text-blue-700 border-blue-200"
                              )}
                            >
                              {isQC ? <Clock size={10} className="mr-1" /> : null}
                              {isQC ? 'Quality Check' : 'In Progress'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {product?.name || 'Unknown product'} · {parseFloat(batch.plannedQuantity).toFixed(0)}{product?.unit ? ` ${product.unit}` : ''} planned
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-low-stock-items">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Low Stock Items
            </CardTitle>
            <CardDescription>Items at or below minimum stock</CardDescription>
          </CardHeader>
          <CardContent>
            {materialsLoading || productsLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : lowStockItems.length === 0 ? (
              <EmptyState icon={<CheckCircle2 className="h-8 w-8 opacity-50" />} message="All caught up — no low stock alerts" />
            ) : (
              <div className="space-y-2">
                {lowStockItems.map(item => (
                  <div
                    key={`${item.kind}-${item.id}`}
                    onClick={() => navigate('/inventory?filter=lowstock')}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors cursor-pointer"
                    data-testid={`low-stock-item-${item.kind}-${item.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{item.name}</span>
                        <Badge variant="outline" className="text-[10px] uppercase shrink-0">
                          {item.kind}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.sku || '—'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-medium text-destructive font-mono">
                        {parseFloat(item.currentStock).toFixed(0)} / {parseFloat(item.minStock).toFixed(0)} {item.unit}
                      </div>
                      <div className="text-[10px] text-muted-foreground">current / min</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface KpiTileProps {
  title: string;
  icon: React.ReactNode;
  value: number | undefined;
  valueClassName?: string;
  loading?: boolean;
  onClick?: () => void;
  description?: string;
  testId: string;
}

function KpiTile({ title, icon, value, valueClassName, loading, onClick, description, testId }: KpiTileProps) {
  const interactive = !!onClick;
  const Wrapper: React.ElementType = interactive ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        "block w-full text-left",
        interactive && "cursor-pointer"
      )}
      data-testid={testId}
    >
      <Card className={cn(
        "transition-colors h-full",
        interactive && "hover:bg-accent/40"
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div className={cn("text-3xl font-bold font-mono", valueClassName)} data-testid={`${testId}-value`}>
              {value === undefined ? '—' : value}
            </div>
          )}
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </CardContent>
      </Card>
    </Wrapper>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
      {icon}
      <p className="text-sm mt-2">{message}</p>
    </div>
  );
}

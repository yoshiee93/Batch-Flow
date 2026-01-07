import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle2, Clock, Package, Play, TrendingUp } from 'lucide-react';
import { mockBatches, mockMaterials, mockProducts } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';

export default function Dashboard() {
  const activeBatches = mockBatches.filter(b => ['planned', 'in_progress', 'quality_check'].includes(b.status));
  const lowStockMaterials = mockMaterials.filter(m => m.currentStock <= m.minStock);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono">Factory Overview</h1>
          <p className="text-muted-foreground mt-1">Real-time production metrics and status.</p>
        </div>
        <div className="flex gap-2">
           <Link href="/production">
             <Button className="font-mono">
               <Play size={16} className="mr-2" /> New Batch
             </Button>
           </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Batches</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{activeBatches.length}</div>
            <p className="text-xs text-muted-foreground">+1 from yesterday</p>
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
        {/* Active Production Board */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Production Schedule</CardTitle>
            <CardDescription>Currently active and planned batches.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeBatches.map(batch => (
                <div key={batch.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">{batch.batchNumber}</span>
                      <StatusBadge status={batch.status} />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {mockProducts.find(p => p.id === batch.productId)?.name}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-sm font-medium">
                      {batch.actualQuantity || 0} / {batch.plannedQuantity} KG
                    </div>
                    <Progress value={((batch.actualQuantity || 0) / batch.plannedQuantity) * 100} className="w-24 h-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stock Alerts */}
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    planned: "bg-slate-100 text-slate-700 border-slate-200",
    in_progress: "bg-blue-100 text-blue-700 border-blue-200 animate-pulse",
    quality_check: "bg-amber-100 text-amber-700 border-amber-200",
    completed: "bg-green-100 text-green-700 border-green-200",
    released: "bg-green-100 text-green-700 border-green-200",
    quarantined: "bg-red-100 text-red-700 border-red-200",
  };

  const labels: Record<string, string> = {
    planned: "Planned",
    in_progress: "In Progress",
    quality_check: "QC Check",
    completed: "Completed",
    released: "Released",
    quarantined: "Quarantined",
  };

  return (
    <Badge variant="outline" className={cn("font-mono uppercase text-[10px]", styles[status] || styles.planned)}>
      {labels[status] || status}
    </Badge>
  );
}

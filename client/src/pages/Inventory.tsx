import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, Plus, FileDown, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useMaterials, useLots } from '@/lib/api';

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: materials = [], isLoading: materialsLoading, isError: materialsError } = useMaterials();
  const { data: lots = [], isLoading: lotsLoading, isError: lotsError } = useLots();

  const isLoading = materialsLoading || lotsLoading;
  const hasError = materialsError || lotsError;

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLots = lots.filter(l => 
    l.lotNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.supplierLot?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <h2 className="text-xl font-semibold mb-2">Failed to load inventory</h2>
        <p className="text-muted-foreground mb-4">There was an error loading the inventory data. Please try refreshing the page.</p>
        <Button onClick={() => window.location.reload()}>Refresh Page</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono" data-testid="text-inventory-title">Inventory Management</h1>
          <p className="text-muted-foreground mt-1">Manage raw materials and track lot expiry.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-export">
            <FileDown size={16} className="mr-2" /> Export
          </Button>
          <Button data-testid="button-receive-material">
            <Plus size={16} className="mr-2" /> Receive Material
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2 bg-card p-2 rounded-md border">
        <Search className="w-4 h-4 text-muted-foreground ml-2" />
        <Input 
          placeholder="Search by SKU, Name, or Lot Number..." 
          className="border-none shadow-none focus-visible:ring-0"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="input-search-inventory"
        />
        <Button variant="ghost" size="icon" data-testid="button-filter-inventory">
          <Filter size={16} />
        </Button>
      </div>

      <Tabs defaultValue="materials">
        <TabsList>
          <TabsTrigger value="materials" data-testid="tab-materials">Raw Materials</TabsTrigger>
          <TabsTrigger value="lots" data-testid="tab-lots">Lot Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="materials" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Min Stock</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.map((material) => {
                  const current = parseFloat(material.currentStock);
                  const min = parseFloat(material.minStock);
                  const isLow = current <= min;
                  return (
                    <TableRow key={material.id} data-testid={`row-material-${material.id}`}>
                      <TableCell className="font-mono font-medium">{material.sku}</TableCell>
                      <TableCell>{material.name}</TableCell>
                      <TableCell className="text-right font-mono">
                        {current.toFixed(0)} <span className="text-xs text-muted-foreground">{material.unit}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {min.toFixed(0)} {material.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {isLow ? (
                          <Badge variant="destructive" className="uppercase text-[10px]">Low Stock</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 uppercase text-[10px]">OK</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" data-testid={`button-adjust-${material.id}`}>Adjust</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredMaterials.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No materials found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="lots" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lot Number</TableHead>
                  <TableHead>Supplier Lot</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-right">Expiry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLots.map((lot) => {
                  const material = materials.find(m => m.id === lot.materialId);
                  const isExpiringSoon = lot.expiryDate && new Date(lot.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                  return (
                    <TableRow key={lot.id} data-testid={`row-lot-${lot.id}`}>
                      <TableCell className="font-mono font-medium">{lot.lotNumber}</TableCell>
                      <TableCell className="font-mono text-xs">{lot.supplierLot || '-'}</TableCell>
                      <TableCell>{lot.supplierName || '-'}</TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(lot.quantity).toFixed(0)} <span className="text-xs text-muted-foreground">{material?.unit || 'KG'}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(lot.remainingQuantity).toFixed(0)} <span className="text-xs text-muted-foreground">{material?.unit || 'KG'}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {lot.expiryDate ? (
                          <span className={`font-mono text-sm ${isExpiringSoon ? 'text-amber-600 font-medium' : ''}`}>
                            {format(new Date(lot.expiryDate), 'MMM d, yyyy')}
                          </span>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredLots.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No lots found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

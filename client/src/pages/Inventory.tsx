import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, Plus, FileDown, AlertTriangle } from 'lucide-react';
import { mockMaterials, mockLots } from '@/lib/mockData';
import { format } from 'date-fns';

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMaterials = mockMaterials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLots = mockLots.filter(l => 
    l.lotNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.supplierLot?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono">Inventory Management</h1>
          <p className="text-muted-foreground mt-1">Manage raw materials and track lot expiry.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileDown size={16} className="mr-2" /> Export
          </Button>
          <Button>
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
        />
        <Button variant="ghost" size="icon">
          <Filter size={16} />
        </Button>
      </div>

      <Tabs defaultValue="materials">
        <TabsList>
          <TabsTrigger value="materials">Raw Materials</TabsTrigger>
          <TabsTrigger value="lots">Lot Tracking</TabsTrigger>
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
                {filteredMaterials.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell className="font-mono font-medium">{material.sku}</TableCell>
                    <TableCell>{material.name}</TableCell>
                    <TableCell className="text-right font-mono">
                      {material.currentStock} <span className="text-xs text-muted-foreground">{material.unit}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {material.minStock} {material.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      {material.currentStock <= material.minStock ? (
                        <Badge variant="destructive" className="uppercase text-[10px]">Low Stock</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 uppercase text-[10px]">OK</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Adjust</Button>
                    </TableCell>
                  </TableRow>
                ))}
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
                  <TableHead>Item</TableHead>
                  <TableHead>Supplier Lot</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Expiry</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLots.map((lot) => {
                  const material = mockMaterials.find(m => m.id === lot.itemId);
                  return (
                    <TableRow key={lot.id}>
                      <TableCell className="font-mono font-medium">{lot.lotNumber}</TableCell>
                      <TableCell>{material?.name || 'Unknown Item'}</TableCell>
                      <TableCell className="font-mono text-xs">{lot.supplierLot || '-'}</TableCell>
                      <TableCell className="text-right font-mono">
                        {lot.quantity} <span className="text-xs text-muted-foreground">{material?.unit}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {format(new Date(lot.expiryDate), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                         <Badge variant="outline" className={
                           lot.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                           lot.status === 'quarantined' ? 'bg-red-50 text-red-700 border-red-200' :
                           'bg-slate-50 text-slate-700'
                         }>
                           {lot.status}
                         </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

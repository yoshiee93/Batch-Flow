import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Package, FileText, Plus } from 'lucide-react';
import { mockProducts, mockRecipes, mockMaterials } from '@/lib/mockData';

export default function Products() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = mockProducts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono">Products & BOM</h1>
          <p className="text-muted-foreground mt-1">Manage finished goods and formulations.</p>
        </div>
        <Button>
          <Plus size={16} className="mr-2" /> New Product
        </Button>
      </div>

      <div className="flex items-center space-x-2 bg-card p-2 rounded-md border max-w-md">
        <Search className="w-4 h-4 text-muted-foreground ml-2" />
        <Input 
          placeholder="Search products..." 
          className="border-none shadow-none focus-visible:ring-0"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">SKU</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-center">Recipe</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => {
              const recipe = mockRecipes.find(r => r.productId === product.id);
              return (
                <TableRow key={product.id}>
                  <TableCell className="font-mono font-medium">{product.sku}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      {product.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {product.currentStock} {product.unit}
                  </TableCell>
                  <TableCell className="text-center">
                    {recipe ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8">
                             <FileText size={14} className="mr-2" />
                             v{recipe.version}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="font-mono">Recipe: {product.name} (v{recipe.version})</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="bg-muted p-4 rounded-md text-sm font-mono">
                               {recipe.instructions}
                            </div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Material</TableHead>
                                  <TableHead className="text-right">Ratio</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {recipe.items.map((item, idx) => {
                                  const mat = mockMaterials.find(m => m.id === item.materialId);
                                  return (
                                    <TableRow key={idx}>
                                      <TableCell>{mat?.name}</TableCell>
                                      <TableCell className="text-right font-mono">{item.quantity} {mat?.unit}/L</TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">No Recipe</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Edit</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

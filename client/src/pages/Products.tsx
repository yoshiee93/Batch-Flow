import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Package, FileText, Plus, Loader2, AlertCircle } from 'lucide-react';
import { useProducts, useRecipes, useMaterials, useRecipeItems } from '@/lib/api';

export default function Products() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: products = [], isLoading: productsLoading, isError: productsError } = useProducts();
  const { data: recipes = [], isLoading: recipesLoading, isError: recipesError } = useRecipes();
  const { data: materials = [] } = useMaterials();

  const isLoading = productsLoading || recipesLoading;
  const hasError = productsError || recipesError;

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
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
        <h2 className="text-xl font-semibold mb-2">Failed to load products</h2>
        <p className="text-muted-foreground mb-4">There was an error loading the products data. Please try refreshing the page.</p>
        <Button onClick={() => window.location.reload()}>Refresh Page</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono" data-testid="text-products-title">Products & BOM</h1>
          <p className="text-muted-foreground mt-1">Manage finished goods and formulations.</p>
        </div>
        <Button data-testid="button-new-product">
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
          data-testid="input-search-products"
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
              const recipe = recipes.find(r => r.productId === product.id);
              return (
                <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
                  <TableCell className="font-mono font-medium">{product.sku}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      {product.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {parseFloat(product.currentStock).toFixed(0)} {product.unit}
                  </TableCell>
                  <TableCell className="text-center">
                    {recipe ? (
                      <RecipeDialog recipe={recipe} product={product} materials={materials} />
                    ) : (
                      <span className="text-muted-foreground text-xs italic">No Recipe</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" data-testid={`button-edit-${product.id}`}>Edit</Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function RecipeDialog({ recipe, product, materials }: { recipe: any; product: any; materials: any[] }) {
  const { data: items = [] } = useRecipeItems(recipe.id);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8" data-testid={`button-recipe-${product.id}`}>
          <FileText size={14} className="mr-2" />
          v{recipe.version}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono">Recipe: {product.name} (v{recipe.version})</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {recipe.instructions && (
            <div className="bg-muted p-4 rounded-md text-sm font-mono">
              {recipe.instructions}
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            Output: <span className="font-mono font-medium">{parseFloat(recipe.outputQuantity).toFixed(0)} KG</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any) => {
                const mat = materials.find(m => m.id === item.materialId);
                return (
                  <TableRow key={item.id}>
                    <TableCell>{mat?.name || 'Unknown'}</TableCell>
                    <TableCell className="text-right font-mono">{parseFloat(item.quantity).toFixed(0)} {mat?.unit || 'KG'}</TableCell>
                  </TableRow>
                );
              })}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    No ingredients defined
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

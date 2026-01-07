import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Search, Package, FileText, Plus, Loader2, AlertCircle } from 'lucide-react';
import { useProducts, useRecipes, useMaterials, useRecipeItems, useCreateProduct } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function Products() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    sku: '',
    name: '',
    description: '',
    minStock: '0',
    currentStock: '0',
  });

  const { data: products = [], isLoading: productsLoading, isError: productsError } = useProducts();
  const { data: recipes = [], isLoading: recipesLoading, isError: recipesError } = useRecipes();
  const { data: materials = [] } = useMaterials();
  const createProduct = useCreateProduct();
  const { toast } = useToast();

  const isLoading = productsLoading || recipesLoading;
  const hasError = productsError || recipesError;

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateProduct = async () => {
    if (!newProduct.sku || !newProduct.name) {
      toast({ title: "Missing fields", description: "Please fill in SKU and Name", variant: "destructive" });
      return;
    }
    try {
      await createProduct.mutateAsync({
        sku: newProduct.sku,
        name: newProduct.name,
        description: newProduct.description || null,
        unit: 'KG',
        minStock: newProduct.minStock,
        currentStock: newProduct.currentStock,
        active: true,
      });
      toast({ title: "Product created", description: `Product ${newProduct.name} created successfully` });
      setIsCreateDialogOpen(false);
      setNewProduct({ sku: '', name: '', description: '', minStock: '0', currentStock: '0' });
    } catch (error) {
      toast({ title: "Error", description: "Failed to create product", variant: "destructive" });
    }
  };

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
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-product">
              <Plus size={16} className="mr-2" /> New Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  placeholder="e.g. FG-005"
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                  data-testid="input-product-sku"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Industrial Solvent"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  data-testid="input-product-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Optional description"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  data-testid="input-product-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentStock">Current Stock (KG)</Label>
                  <Input
                    id="currentStock"
                    type="number"
                    value={newProduct.currentStock}
                    onChange={(e) => setNewProduct({ ...newProduct, currentStock: e.target.value })}
                    data-testid="input-product-current-stock"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minStock">Min Stock (KG)</Label>
                  <Input
                    id="minStock"
                    type="number"
                    value={newProduct.minStock}
                    onChange={(e) => setNewProduct({ ...newProduct, minStock: e.target.value })}
                    data-testid="input-product-min-stock"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateProduct} disabled={createProduct.isPending} data-testid="button-submit-product">
                {createProduct.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Product
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                  No products found. Click "New Product" to add your first product.
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

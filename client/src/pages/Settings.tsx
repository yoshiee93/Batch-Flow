import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Loader2, AlertCircle, Pencil, Trash2, Settings2, Tags } from 'lucide-react';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, type Category } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    excludeFromYield: false,
    sortOrder: 0,
  });

  const { data: categories = [], isLoading, isError } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({ name: '', excludeFromYield: false, sortOrder: 0 });
  };

  const handleCreate = async () => {
    if (!formData.name) {
      toast({ title: "Missing fields", description: "Please enter a category name", variant: "destructive" });
      return;
    }
    try {
      await createCategory.mutateAsync({
        name: formData.name,
        excludeFromYield: formData.excludeFromYield,
        isDefault: false,
        sortOrder: formData.sortOrder,
      });
      toast({ title: "Category created", description: `Category "${formData.name}" created successfully` });
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({ title: "Error", description: "Failed to create category", variant: "destructive" });
    }
  };

  const handleEditClick = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      excludeFromYield: category.excludeFromYield,
      sortOrder: category.sortOrder,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedCategory || !formData.name) {
      toast({ title: "Missing fields", description: "Please enter a category name", variant: "destructive" });
      return;
    }
    try {
      await updateCategory.mutateAsync({
        id: selectedCategory.id,
        name: formData.name,
        excludeFromYield: formData.excludeFromYield,
        sortOrder: formData.sortOrder,
      });
      toast({ title: "Category updated", description: `Category "${formData.name}" updated successfully` });
      setIsEditDialogOpen(false);
      setSelectedCategory(null);
      resetForm();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update category", variant: "destructive" });
    }
  };

  const handleDelete = async (category: Category) => {
    try {
      await deleteCategory.mutateAsync(category.id);
      toast({ title: "Category deleted", description: `Category "${category.name}" has been removed` });
    } catch (error: any) {
      const message = error?.message || "Failed to delete category. It may still have products assigned.";
      toast({ title: "Cannot delete category", description: message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]" data-testid="loading-indicator">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-destructive" data-testid="error-message">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>Failed to load settings</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Settings2 className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-muted-foreground">Configure system settings and categories</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5" />
              Product Categories
            </CardTitle>
            <CardDescription>
              Manage categories used to organize products. Categories control inventory tabs and yield calculations.
            </CardDescription>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-add-category">
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tags className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No categories defined yet</p>
              <p className="text-sm">Add categories to organize your products</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-center">Sort Order</TableHead>
                  <TableHead className="text-center">Exclude from Yield</TableHead>
                  <TableHead className="text-center">Default</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id} data-testid={`row-category-${category.id}`}>
                    <TableCell className="font-medium" data-testid={`text-category-name-${category.id}`}>
                      {category.name}
                    </TableCell>
                    <TableCell className="text-center">{category.sortOrder}</TableCell>
                    <TableCell className="text-center">
                      {category.excludeFromYield ? (
                        <span className="text-amber-600">Yes</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {category.isDefault ? (
                        <span className="text-muted-foreground text-sm">System</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(category)}
                          data-testid={`button-edit-category-${category.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!category.isDefault && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-delete-category-${category.id}`}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{category.name}"? Products using this category will need to be reassigned.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(category)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>
              Create a new category to organize products
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Powders"
                data-testid="input-category-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-sortOrder">Sort Order</Label>
              <Input
                id="create-sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                placeholder="0"
                data-testid="input-sort-order"
              />
              <p className="text-xs text-muted-foreground">Lower numbers appear first in lists</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="create-excludeFromYield">Exclude from Yield</Label>
                <p className="text-xs text-muted-foreground">Products in this category won't count toward yield percentage</p>
              </div>
              <Switch
                id="create-excludeFromYield"
                checked={formData.excludeFromYield}
                onCheckedChange={(checked) => setFormData({ ...formData, excludeFromYield: checked })}
                data-testid="switch-exclude-yield"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createCategory.isPending} data-testid="button-confirm-create">
              {createCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update category settings
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Powders"
                data-testid="input-edit-category-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-sortOrder">Sort Order</Label>
              <Input
                id="edit-sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                placeholder="0"
                data-testid="input-edit-sort-order"
              />
              <p className="text-xs text-muted-foreground">Lower numbers appear first in lists</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="edit-excludeFromYield">Exclude from Yield</Label>
                <p className="text-xs text-muted-foreground">Products in this category won't count toward yield percentage</p>
              </div>
              <Switch
                id="edit-excludeFromYield"
                checked={formData.excludeFromYield}
                onCheckedChange={(checked) => setFormData({ ...formData, excludeFromYield: checked })}
                data-testid="switch-edit-exclude-yield"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setSelectedCategory(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateCategory.isPending} data-testid="button-confirm-update">
              {updateCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

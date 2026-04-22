import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetchApi";

export interface Category {
  id: string;
  name: string;
  excludeFromYield: boolean;
  showInTabs: boolean;
  isDefault: boolean;
  sortOrder: number;
  processCode: string | null;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  minStock: string;
  currentStock: string;
  categoryId: string | null;
  fruitCode: string | null;
  isReceivable: boolean;
  active: boolean;
  createdAt: string;
}

export interface Material {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  minStock: string;
  currentStock: string;
  categoryId: string | null;
  isReceivable: boolean;
  active: boolean;
  createdAt: string;
}

export interface Recipe {
  id: string;
  productId: string;
  version: number;
  name: string;
  description: string | null;
  instructions: string | null;
  outputQuantity: string;
  active: boolean;
  createdAt: string;
}

export interface RecipeItem {
  id: string;
  recipeId: string;
  materialId: string;
  quantity: string;
  notes: string | null;
  materialName?: string;
  materialUnit?: string;
}

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => fetchApi("/categories"),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Category, "id" | "createdAt">) =>
      fetchApi<Category>("/categories", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Category> & { id: string }) =>
      fetchApi<Category>(`/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: () => fetchApi("/products"),
  });
}

export function useProductsByCategory(categoryId: string | null) {
  return useQuery<Product[]>({
    queryKey: ["products", "category", categoryId],
    queryFn: () => fetchApi(`/products/by-category/${categoryId}`),
    enabled: !!categoryId,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Product>) => fetchApi<Product>("/products", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inputItems"] });
      queryClient.invalidateQueries({ queryKey: ["outputItems"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Product>) =>
      fetchApi<Product>(`/products/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inputItems"] });
      queryClient.invalidateQueries({ queryKey: ["outputItems"] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inputItems"] });
      queryClient.invalidateQueries({ queryKey: ["outputItems"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useMaterials() {
  return useQuery<Material[]>({
    queryKey: ["materials"],
    queryFn: () => fetchApi("/materials"),
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Material>) => fetchApi<Material>("/materials", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["materials"] }),
  });
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Material>) =>
      fetchApi<Material>(`/materials/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["materials"] }),
  });
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/materials/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useRecipes() {
  return useQuery<Recipe[]>({
    queryKey: ["recipes"],
    queryFn: () => fetchApi("/recipes"),
  });
}

export function useRecipeItems(recipeId: string) {
  return useQuery<RecipeItem[]>({
    queryKey: ["recipeItems", recipeId],
    queryFn: () => fetchApi(`/recipes/${recipeId}/items`),
    enabled: !!recipeId,
  });
}

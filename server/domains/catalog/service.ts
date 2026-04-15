import { catalogRepository as repo } from "./repository";
import { createAuditLog } from "../../lib/auditLog";
import { products } from "@shared/schema";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import {
  type Category, type InsertCategory,
  type Product, type InsertProduct,
  type Material, type InsertMaterial,
  type Recipe, type InsertRecipe,
  type RecipeItem, type InsertRecipeItem,
} from "@shared/schema";

export const catalogService = {
  getCategories: repo.getCategories.bind(repo),
  getCategory: repo.getCategory.bind(repo),

  async createCategory(data: InsertCategory): Promise<Category> {
    const created = await repo.createCategory(data);
    await createAuditLog({ entityType: "category", entityId: created.id, action: "create", changes: JSON.stringify(data) });
    return created;
  },

  async updateCategory(id: string, data: Partial<InsertCategory>): Promise<Category | undefined> {
    const updated = await repo.updateCategory(id, data);
    if (updated) {
      await createAuditLog({ entityType: "category", entityId: id, action: "update", changes: JSON.stringify(data) });
    }
    return updated;
  },

  async deleteCategory(id: string): Promise<void> {
    const category = await repo.getCategory(id);
    if (!category) throw new Error("Category not found");
    if (category.isDefault) throw new Error("Cannot delete default category");
    const usedBy = await db.select().from(products).where(eq(products.categoryId, id));
    if (usedBy.length > 0) {
      throw new Error(`Cannot delete category: ${usedBy.length} product(s) are using it`);
    }
    await repo.deleteCategory(id);
    await createAuditLog({ entityType: "category", entityId: id, action: "delete", changes: JSON.stringify({ deleted: true }) });
  },

  getProducts: repo.getProducts.bind(repo),
  getProduct: repo.getProduct.bind(repo),
  getProductsByCategory: repo.getProductsByCategory.bind(repo),

  async createProduct(data: InsertProduct): Promise<Product> {
    const created = await repo.createProduct(data);
    await createAuditLog({ entityType: "product", entityId: created.id, action: "create", changes: JSON.stringify(data) });
    return created;
  },

  async updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const updated = await repo.updateProduct(id, data);
    if (updated) {
      await createAuditLog({ entityType: "product", entityId: id, action: "update", changes: JSON.stringify(data) });
    }
    return updated;
  },

  async deleteProduct(id: string): Promise<void> {
    await repo.deleteProduct(id);
    await createAuditLog({ entityType: "product", entityId: id, action: "delete", changes: JSON.stringify({ active: false }) });
  },

  getMaterials: repo.getMaterials.bind(repo),
  getMaterial: repo.getMaterial.bind(repo),

  async createMaterial(data: InsertMaterial): Promise<Material> {
    const created = await repo.createMaterial(data);
    await createAuditLog({ entityType: "material", entityId: created.id, action: "create", changes: JSON.stringify(data) });
    return created;
  },

  async updateMaterial(id: string, data: Partial<InsertMaterial>): Promise<Material | undefined> {
    const updated = await repo.updateMaterial(id, data);
    if (updated) {
      await createAuditLog({ entityType: "material", entityId: id, action: "update", changes: JSON.stringify(data) });
    }
    return updated;
  },

  async deleteMaterial(id: string): Promise<void> {
    await repo.deleteMaterial(id);
    await createAuditLog({ entityType: "material", entityId: id, action: "delete", changes: JSON.stringify({ active: false }) });
  },

  getRecipes: repo.getRecipes.bind(repo),
  getRecipe: repo.getRecipe.bind(repo),
  getRecipesByProduct: repo.getRecipesByProduct.bind(repo),
  getRecipeItems: repo.getRecipeItems.bind(repo),
  getRecipeItemsWithMaterials: repo.getRecipeItemsWithMaterials.bind(repo),

  async createRecipe(data: InsertRecipe): Promise<Recipe> {
    const created = await repo.createRecipe(data);
    await createAuditLog({ entityType: "recipe", entityId: created.id, action: "create", changes: JSON.stringify(data) });
    return created;
  },

  createRecipeItem(data: InsertRecipeItem): Promise<RecipeItem> {
    return repo.createRecipeItem(data);
  },
};

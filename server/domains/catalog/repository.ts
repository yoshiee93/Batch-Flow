import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db";
import {
  categories, products, materials, recipes, recipeItems, processCodeDefinitions,
  type Category, type InsertCategory,
  type Product, type InsertProduct,
  type Material, type InsertMaterial,
  type Recipe, type InsertRecipe,
  type RecipeItem, type InsertRecipeItem,
  type ProcessCodeDefinition, type InsertProcessCodeDefinition,
} from "@shared/schema";

export const catalogRepository = {
  async getCategories(): Promise<Category[]> {
    return db.select().from(categories).orderBy(categories.sortOrder);
  },

  async getCategory(id: string): Promise<Category | undefined> {
    const [row] = await db.select().from(categories).where(eq(categories.id, id));
    return row;
  },

  async createCategory(data: InsertCategory): Promise<Category> {
    const [created] = await db.insert(categories).values(data).returning();
    return created;
  },

  async updateCategory(id: string, data: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updated] = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
    return updated;
  },

  async getProductsByCategoryId(categoryId: string): Promise<Product[]> {
    return db.select().from(products).where(eq(products.categoryId, categoryId));
  },

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  },

  async getProducts(): Promise<Product[]> {
    return db.select().from(products).where(eq(products.active, true)).orderBy(products.name);
  },

  async getProduct(id: string): Promise<Product | undefined> {
    const [row] = await db.select().from(products).where(eq(products.id, id));
    return row;
  },

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    return db.select().from(products)
      .where(and(eq(products.active, true), eq(products.categoryId, categoryId)))
      .orderBy(products.name);
  },

  async createProduct(data: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(data).returning();
    return created;
  },

  async updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return updated;
  },

  async deleteProduct(id: string): Promise<void> {
    await db.update(products).set({ active: false }).where(eq(products.id, id));
  },

  async getMaterials(): Promise<Material[]> {
    return db.select().from(materials).where(eq(materials.active, true)).orderBy(materials.name);
  },

  async getMaterial(id: string): Promise<Material | undefined> {
    const [row] = await db.select().from(materials).where(eq(materials.id, id));
    return row;
  },

  async createMaterial(data: InsertMaterial): Promise<Material> {
    const [created] = await db.insert(materials).values(data).returning();
    return created;
  },

  async updateMaterial(id: string, data: Partial<InsertMaterial>): Promise<Material | undefined> {
    const [updated] = await db.update(materials).set(data).where(eq(materials.id, id)).returning();
    return updated;
  },

  async deleteMaterial(id: string): Promise<void> {
    await db.update(materials).set({ active: false }).where(eq(materials.id, id));
  },

  async getRecipes(): Promise<Recipe[]> {
    return db.select().from(recipes).where(eq(recipes.active, true)).orderBy(recipes.name);
  },

  async getRecipe(id: string): Promise<Recipe | undefined> {
    const [row] = await db.select().from(recipes).where(eq(recipes.id, id));
    return row;
  },

  async getRecipesByProduct(productId: string): Promise<Recipe[]> {
    return db.select().from(recipes)
      .where(and(eq(recipes.productId, productId), eq(recipes.active, true)))
      .orderBy(desc(recipes.version));
  },

  async createRecipe(data: InsertRecipe): Promise<Recipe> {
    const [created] = await db.insert(recipes).values(data).returning();
    return created;
  },

  async getRecipeItems(recipeId: string): Promise<RecipeItem[]> {
    return db.select().from(recipeItems).where(eq(recipeItems.recipeId, recipeId));
  },

  async getRecipeItemsWithMaterials(recipeId: string): Promise<(RecipeItem & { materialName: string; materialUnit: string })[]> {
    const rows = await db.select({ recipeItem: recipeItems, material: materials })
      .from(recipeItems)
      .leftJoin(materials, eq(recipeItems.materialId, materials.id))
      .where(eq(recipeItems.recipeId, recipeId));
    return rows.map(r => ({
      ...r.recipeItem,
      materialName: r.material?.name || "Unknown Material",
      materialUnit: r.material?.unit || "KG",
    }));
  },

  async createRecipeItem(data: InsertRecipeItem): Promise<RecipeItem> {
    const [created] = await db.insert(recipeItems).values(data).returning();
    return created;
  },

  async getProductsWithStock(): Promise<Product[]> {
    return db.select().from(products);
  },

  async getProcessCodeDefinitions(): Promise<ProcessCodeDefinition[]> {
    return db.select().from(processCodeDefinitions).orderBy(processCodeDefinitions.code);
  },

  async countProcessCodeDefinitions(): Promise<number> {
    const rows = await db.select().from(processCodeDefinitions);
    return rows.length;
  },

  async upsertProcessCodeDefinition(data: InsertProcessCodeDefinition): Promise<ProcessCodeDefinition> {
    const [row] = await db
      .insert(processCodeDefinitions)
      .values(data)
      .onConflictDoUpdate({ target: processCodeDefinitions.code, set: { meaning: data.meaning } })
      .returning();
    return row;
  },

  async deleteProcessCodeDefinition(code: string): Promise<void> {
    await db.delete(processCodeDefinitions).where(eq(processCodeDefinitions.code, code));
  },
};

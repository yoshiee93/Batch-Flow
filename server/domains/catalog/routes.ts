import { Router } from "express";
import {
  insertProductSchema, insertMaterialSchema, insertRecipeSchema,
  insertRecipeItemSchema, insertCategorySchema,
} from "@shared/schema";
import { asyncHandler } from "../../lib/asyncHandler";
import { catalogRepository as repo } from "./repository";

export const catalogRouter = Router();

catalogRouter.get("/categories", asyncHandler(async (_req, res) => {
  res.json(await repo.getCategories());
}));

catalogRouter.get("/categories/:id", asyncHandler(async (req, res) => {
  const category = await repo.getCategory(req.params.id);
  if (!category) return res.status(404).json({ error: "Category not found" });
  res.json(category);
}));

catalogRouter.post("/categories", asyncHandler(async (req, res) => {
  const data = insertCategorySchema.parse(req.body);
  res.status(201).json(await repo.createCategory(data));
}));

catalogRouter.patch("/categories/:id", asyncHandler(async (req, res) => {
  const data = insertCategorySchema.partial().parse(req.body);
  const category = await repo.updateCategory(req.params.id, data);
  if (!category) return res.status(404).json({ error: "Category not found" });
  res.json(category);
}));

catalogRouter.delete("/categories/:id", asyncHandler(async (req, res) => {
  try {
    await repo.deleteCategory(req.params.id);
    res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete category";
    const statusCode = message === "Category not found" ? 404 : 400;
    res.status(statusCode).json({ error: message });
  }
}));

catalogRouter.get("/products/by-category/:categoryId", asyncHandler(async (req, res) => {
  res.json(await repo.getProductsByCategory(req.params.categoryId));
}));

catalogRouter.get("/products/:id/recipes", asyncHandler(async (req, res) => {
  res.json(await repo.getRecipesByProduct(req.params.id));
}));

catalogRouter.get("/products/:id", asyncHandler(async (req, res) => {
  const product = await repo.getProduct(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
}));

catalogRouter.get("/products", asyncHandler(async (_req, res) => {
  res.json(await repo.getProducts());
}));

catalogRouter.post("/products", asyncHandler(async (req, res) => {
  const data = insertProductSchema.parse(req.body);
  res.status(201).json(await repo.createProduct(data));
}));

catalogRouter.patch("/products/:id", asyncHandler(async (req, res) => {
  const data = insertProductSchema.partial().parse(req.body);
  const product = await repo.updateProduct(req.params.id, data);
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
}));

catalogRouter.delete("/products/:id", asyncHandler(async (req, res) => {
  await repo.deleteProduct(req.params.id);
  res.status(204).send();
}));

catalogRouter.get("/materials/:id", asyncHandler(async (req, res) => {
  const material = await repo.getMaterial(req.params.id);
  if (!material) return res.status(404).json({ error: "Material not found" });
  res.json(material);
}));

catalogRouter.get("/materials", asyncHandler(async (_req, res) => {
  res.json(await repo.getMaterials());
}));

catalogRouter.post("/materials", asyncHandler(async (req, res) => {
  const data = insertMaterialSchema.parse(req.body);
  res.status(201).json(await repo.createMaterial(data));
}));

catalogRouter.patch("/materials/:id", asyncHandler(async (req, res) => {
  const data = insertMaterialSchema.partial().parse(req.body);
  const material = await repo.updateMaterial(req.params.id, data);
  if (!material) return res.status(404).json({ error: "Material not found" });
  res.json(material);
}));

catalogRouter.delete("/materials/:id", asyncHandler(async (req, res) => {
  await repo.deleteMaterial(req.params.id);
  res.status(204).send();
}));

catalogRouter.get("/recipes/:id/items", asyncHandler(async (req, res) => {
  res.json(await repo.getRecipeItemsWithMaterials(req.params.id));
}));

catalogRouter.get("/recipes/:id", asyncHandler(async (req, res) => {
  const recipe = await repo.getRecipe(req.params.id);
  if (!recipe) return res.status(404).json({ error: "Recipe not found" });
  res.json(recipe);
}));

catalogRouter.get("/recipes", asyncHandler(async (_req, res) => {
  res.json(await repo.getRecipes());
}));

catalogRouter.post("/recipes", asyncHandler(async (req, res) => {
  const data = insertRecipeSchema.parse(req.body);
  res.status(201).json(await repo.createRecipe(data));
}));

catalogRouter.post("/recipes/:id/items", asyncHandler(async (req, res) => {
  const data = insertRecipeItemSchema.parse({ ...req.body, recipeId: req.params.id });
  res.status(201).json(await repo.createRecipeItem(data));
}));

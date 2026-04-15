import { storage } from "../../storage";

export const catalogRepository = {
  getCategories:              storage.getCategories.bind(storage),
  getCategory:                storage.getCategory.bind(storage),
  createCategory:             storage.createCategory.bind(storage),
  updateCategory:             storage.updateCategory.bind(storage),
  deleteCategory:             storage.deleteCategory.bind(storage),

  getProducts:                storage.getProducts.bind(storage),
  getProduct:                 storage.getProduct.bind(storage),
  getProductsByCategory:      storage.getProductsByCategory.bind(storage),
  createProduct:              storage.createProduct.bind(storage),
  updateProduct:              storage.updateProduct.bind(storage),
  deleteProduct:              storage.deleteProduct.bind(storage),

  getMaterials:               storage.getMaterials.bind(storage),
  getMaterial:                storage.getMaterial.bind(storage),
  createMaterial:             storage.createMaterial.bind(storage),
  updateMaterial:             storage.updateMaterial.bind(storage),
  deleteMaterial:             storage.deleteMaterial.bind(storage),

  getRecipes:                 storage.getRecipes.bind(storage),
  getRecipe:                  storage.getRecipe.bind(storage),
  getRecipesByProduct:        storage.getRecipesByProduct.bind(storage),
  createRecipe:               storage.createRecipe.bind(storage),
  getRecipeItems:             storage.getRecipeItems.bind(storage),
  getRecipeItemsWithMaterials: storage.getRecipeItemsWithMaterials.bind(storage),
  createRecipeItem:           storage.createRecipeItem.bind(storage),
};

import { storage } from "../../storage";

export const dashboardRepository = {
  getProducts:  storage.getProducts.bind(storage),
  getMaterials: storage.getMaterials.bind(storage),
  getBatches:   storage.getBatches.bind(storage),
  getOrders:    storage.getOrders.bind(storage),
};

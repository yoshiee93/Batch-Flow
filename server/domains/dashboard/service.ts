import { dashboardRepository as repo } from "./repository";

export const dashboardService = {
  getDashboardStats: repo.getDashboardStats.bind(repo),
};

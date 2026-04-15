import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { z } from "zod";

import { catalogRouter } from "./domains/catalog/routes";
import { inventoryRouter } from "./domains/inventory/routes";
import { productionRouter } from "./domains/production/routes";
import { traceabilityRouter } from "./domains/traceability/routes";
import { qualityRouter } from "./domains/quality/routes";
import { customersRouter } from "./domains/customers/routes";
import { dashboardRouter } from "./domains/dashboard/routes";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use("/api", catalogRouter);
  app.use("/api", inventoryRouter);
  app.use("/api", productionRouter);
  app.use("/api", traceabilityRouter);
  app.use("/api", qualityRouter);
  app.use("/api", customersRouter);
  app.use("/api", dashboardRouter);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("API Error:", err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: err.errors });
    }
    res.status(500).json({ error: err.message || "Internal server error" });
  });

  return httpServer;
}

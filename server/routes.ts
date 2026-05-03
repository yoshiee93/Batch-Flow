import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { z } from "zod";

import { authRouter } from "./domains/auth/routes";
import { catalogRouter } from "./domains/catalog/routes";
import { inventoryRouter } from "./domains/inventory/routes";
import { productionRouter } from "./domains/production/routes";
import { traceabilityRouter } from "./domains/traceability/routes";
import { qualityRouter } from "./domains/quality/routes";
import { customersRouter } from "./domains/customers/routes";
import { dashboardRouter } from "./domains/dashboard/routes";
import { adminRouter } from "./domains/admin/routes";
import { labelsRouter } from "./domains/labels/routes";
import { securityRouter } from "./domains/security/routes";
import { requireAuth } from "./lib/authMiddleware";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use("/api", authRouter);

  app.use("/api", requireAuth);

  app.use("/api", catalogRouter);
  app.use("/api", inventoryRouter);
  app.use("/api", productionRouter);
  app.use("/api", traceabilityRouter);
  app.use("/api", qualityRouter);
  app.use("/api", customersRouter);
  app.use("/api", dashboardRouter);
  app.use("/api", adminRouter);
  app.use("/api", labelsRouter);
  app.use("/api", securityRouter);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof z.ZodError) {
      const fields: Record<string, string> = {};
      for (const issue of err.errors) {
        const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
        if (!(key in fields)) fields[key] = issue.message;
      }
      return res.status(400).json({ error: "Validation failed", fields });
    }
    if (err && typeof err.message === "string") {
      const msg = err.message;
      if (msg === "Forbidden") return res.status(403).json({ error: "You don't have permission to do this." });
      if (msg === "Unauthorized") return res.status(401).json({ error: "Sign in to continue." });
    }
    console.error("API Error:", err);
    const status = (err && (err.status || err.statusCode)) || 500;
    res.status(status).json({ error: err?.message || "Internal server error" });
  });

  return httpServer;
}

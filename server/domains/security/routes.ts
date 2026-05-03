import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../lib/authMiddleware";
import { securityRepository } from "./repository";

const adminOnly = requireRole("admin");

export const securityRouter = Router();

const listFiltersSchema = z.object({
  entityType: z.string().min(1).optional(),
  entityId: z.string().min(1).optional(),
  action: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

securityRouter.get("/admin/audit-logs", adminOnly, asyncHandler(async (req, res) => {
  const filters = listFiltersSchema.parse(req.query);
  const result = await securityRepository.listAuditLogs({
    ...filters,
    from: filters.from ? new Date(filters.from) : undefined,
    to: filters.to ? new Date(filters.to) : undefined,
  });
  res.json(result);
}));

securityRouter.get("/admin/audit-logs/facets", adminOnly, asyncHandler(async (_req, res) => {
  const [entityTypes, actions, users] = await Promise.all([
    securityRepository.listEntityTypes(),
    securityRepository.listActions(),
    securityRepository.listUsers(),
  ]);
  res.json({ entityTypes, actions, users });
}));

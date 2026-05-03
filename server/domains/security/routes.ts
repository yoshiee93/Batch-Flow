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

// Admin-wide listing with full filters; scoped (entityType+entityId) queries are allowed
// for any authenticated user so per-entity "Recent Activity" panels keep working.
securityRouter.get("/audit-logs", asyncHandler(async (req, res) => {
  const filters = listFiltersSchema.parse(req.query);
  const isScoped = !!(filters.entityType && filters.entityId);
  const role = req.session?.userRole;
  if (!isScoped && role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  // Scoped per-entity reads (used by BatchDetail/LotDetail "Recent Activity") historically
  // returned the full history. Preserve that behavior: when the caller is in scoped+legacy
  // mode and didn't request a page, default to a high cap (200, our schema max).
  const isLegacyScoped = isScoped && req.query._format !== "page";
  const effectiveLimit = filters.limit ?? (isLegacyScoped ? 200 : 20);
  const result = await securityRepository.listAuditLogs({
    ...filters,
    limit: effectiveLimit,
    from: filters.from ? new Date(filters.from) : undefined,
    to: filters.to ? new Date(filters.to) : undefined,
  });
  // Backwards compatibility: scoped batch/lot panels expect a plain array
  if (isLegacyScoped) {
    return res.json(result.items);
  }
  return res.json(result);
}));

securityRouter.get("/audit-logs/facets", adminOnly, asyncHandler(async (_req, res) => {
  const [entityTypes, actions, users] = await Promise.all([
    securityRepository.listEntityTypes(),
    securityRepository.listActions(),
    securityRepository.listUsers(),
  ]);
  res.json({ entityTypes, actions, users });
}));

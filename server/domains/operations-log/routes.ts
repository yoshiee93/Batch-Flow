import { Router } from "express";
import { z } from "zod";
import { db } from "../../db";
import { operationsLog } from "@shared/schema";
import { eq, and, gte, lte, ilike, or } from "drizzle-orm";
import { asyncHandler } from "../../lib/asyncHandler";
import { requirePermission } from "../../lib/authMiddleware";

export const operationsLogRouter = Router();

const canView = requirePermission("operations_log.view");
const canEdit = requirePermission("operations_log.edit");

const updateStatusSchema = z.object({
  status: z.enum(["open", "reviewed", "resolved"]),
});

const updateSeveritySchema = z.object({
  severity: z.enum(["info", "warning", "issue"]),
});

operationsLogRouter.get("/operations-log", canView, asyncHandler(async (req, res) => {
  const { noteType, severity, status, q, from, to } = req.query as Record<string, string | undefined>;

  let query = db.select().from(operationsLog).$dynamic();

  const conditions = [];
  if (noteType) conditions.push(eq(operationsLog.noteType, noteType));
  if (severity) conditions.push(eq(operationsLog.severity, severity));
  if (status) conditions.push(eq(operationsLog.status, status));
  if (from) conditions.push(gte(operationsLog.createdAt, new Date(from)));
  if (to) conditions.push(lte(operationsLog.createdAt, new Date(to)));
  if (q) conditions.push(
    or(
      ilike(operationsLog.content, `%${q}%`),
      ilike(operationsLog.sourceId, `%${q}%`),
      ilike(operationsLog.noteType, `%${q}%`)
    )
  );

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const rows = await query.orderBy(operationsLog.createdAt);
  res.json(rows.reverse());
}));

operationsLogRouter.patch("/operations-log/:id/status", canEdit, asyncHandler(async (req, res) => {
  const { status } = updateStatusSchema.parse(req.body);
  const [updated] = await db
    .update(operationsLog)
    .set({ status, updatedAt: new Date() })
    .where(eq(operationsLog.id, req.params.id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Entry not found" });
  res.json(updated);
}));

operationsLogRouter.patch("/operations-log/:id/severity", canEdit, asyncHandler(async (req, res) => {
  const { severity } = updateSeveritySchema.parse(req.body);
  const [updated] = await db
    .update(operationsLog)
    .set({ severity, updatedAt: new Date() })
    .where(eq(operationsLog.id, req.params.id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Entry not found" });
  res.json(updated);
}));

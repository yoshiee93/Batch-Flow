import { Router } from "express";
import { z } from "zod";
import { db } from "../../db";
import { operationsLog } from "@shared/schema";
import { eq, and, gte, lte, ilike, or, desc } from "drizzle-orm";
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
  const { noteType, severity, status, q, from, to, sourceId, sourceType } = req.query as Record<string, string | undefined>;
  const limit = Math.min(parseInt((req.query.limit as string) || "100"), 500);
  const offset = parseInt((req.query.offset as string) || "0");

  let query = db.select().from(operationsLog).$dynamic();

  const conditions = [];
  if (noteType) conditions.push(eq(operationsLog.noteType, noteType));
  if (severity) conditions.push(eq(operationsLog.severity, severity));
  if (status) conditions.push(eq(operationsLog.status, status));
  if (sourceId) conditions.push(eq(operationsLog.sourceId, sourceId));
  if (sourceType) conditions.push(eq(operationsLog.sourceType, sourceType));
  if (from) conditions.push(gte(operationsLog.createdAt, new Date(from)));
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    conditions.push(lte(operationsLog.createdAt, toDate));
  }
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

  const rows = await query.orderBy(desc(operationsLog.createdAt)).limit(limit).offset(offset);
  res.json(rows);
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

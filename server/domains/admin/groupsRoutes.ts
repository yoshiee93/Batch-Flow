import { Router } from "express";
import { z } from "zod";
import { db } from "../../db";
import { userGroups, users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { asyncHandler } from "../../lib/asyncHandler";
import { requirePermission } from "../../lib/authMiddleware";
import { createAuditLog } from "../../lib/auditLog";
import { VALID_PERMISSIONS } from "../../lib/permissions";

export const adminGroupsRouter = Router();

const manageUsers = requirePermission("users.manage");

const permissionsSchema = z.record(z.boolean()).refine(
  perms => Object.keys(perms).every(k => (VALID_PERMISSIONS as readonly string[]).includes(k)),
  { message: "Unknown permission key" }
);

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  permissions: permissionsSchema.optional(),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  permissions: permissionsSchema.optional(),
});

adminGroupsRouter.get("/admin/groups", manageUsers, asyncHandler(async (_req, res) => {
  const groups = await db.select().from(userGroups);

  const userCounts = await db.select({
    groupId: users.groupId,
    count: sql<number>`count(*)::int`,
  }).from(users).groupBy(users.groupId);

  const countMap = Object.fromEntries(userCounts.map(r => [r.groupId ?? "__none__", r.count]));

  return res.json(groups.map(g => ({
    ...g,
    userCount: countMap[g.id] ?? 0,
  })));
}));

adminGroupsRouter.get("/admin/groups/:id", manageUsers, asyncHandler(async (req, res) => {
  const [group] = await db.select().from(userGroups).where(eq(userGroups.id, req.params.id)).limit(1);
  if (!group) return res.status(404).json({ error: "Group not found" });
  return res.json(group);
}));

adminGroupsRouter.post("/admin/groups", manageUsers, asyncHandler(async (req, res) => {
  const data = createGroupSchema.parse(req.body);
  const [created] = await db.insert(userGroups).values({
    name: data.name,
    description: data.description ?? null,
    permissions: data.permissions ?? {},
    isSystem: false,
  }).returning();
  await createAuditLog({ entityType: "user_group", entityId: created.id, action: "create", changes: JSON.stringify({ name: data.name }) });
  return res.status(201).json(created);
}));

adminGroupsRouter.patch("/admin/groups/:id", manageUsers, asyncHandler(async (req, res) => {
  const data = updateGroupSchema.parse(req.body);
  const [existing] = await db.select().from(userGroups).where(eq(userGroups.id, req.params.id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Group not found" });

  if (existing.isSystem && data.name && data.name !== existing.name) {
    return res.status(400).json({ error: "Cannot rename a system group" });
  }

  const permissionsChanged = data.permissions !== undefined;
  const updates: Record<string, unknown> = {
    ...data,
    updatedAt: new Date(),
  };

  if (permissionsChanged) {
    updates.permissionsVersion = existing.permissionsVersion + 1;
    await db.execute(sql`
      UPDATE users SET session_invalidated_at = NOW()
      WHERE group_id = ${req.params.id}
    `);
  }

  const [updated] = await db.update(userGroups).set(updates as any).where(eq(userGroups.id, req.params.id)).returning();
  await createAuditLog({ entityType: "user_group", entityId: req.params.id, action: "update", changes: JSON.stringify(data) });
  return res.json(updated);
}));

adminGroupsRouter.delete("/admin/groups/:id", manageUsers, asyncHandler(async (req, res) => {
  const [existing] = await db.select().from(userGroups).where(eq(userGroups.id, req.params.id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Group not found" });

  if (existing.isSystem) {
    return res.status(400).json({ error: "Cannot delete a system group" });
  }

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.groupId, req.params.id));
  if (count > 0) {
    return res.status(400).json({ error: "Cannot delete a group that has users assigned to it. Reassign users first." });
  }

  await db.delete(userGroups).where(eq(userGroups.id, req.params.id));
  await createAuditLog({ entityType: "user_group", entityId: req.params.id, action: "delete", changes: JSON.stringify({ name: existing.name }) });
  return res.status(204).send();
}));

import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../../db";
import { users, userGroups } from "@shared/schema";
import { eq, sql, and, ne } from "drizzle-orm";
import { asyncHandler } from "../../lib/asyncHandler";
import { requirePermission } from "../../lib/authMiddleware";
import { createAuditLog } from "../../lib/auditLog";

export const adminUsersRouter = Router();

const manageUsers = requirePermission("users.manage");

const createUserSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(6),
  fullName: z.string().min(1),
  email: z.string().email().optional().nullable(),
  role: z.enum(["admin", "production", "inventory", "readonly"]).default("readonly"),
  groupId: z.string().nullable().optional(),
  active: z.boolean().default(true),
});

const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  role: z.enum(["admin", "production", "inventory", "readonly"]).optional(),
  groupId: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

const changePasswordSchema = z.object({
  password: z.string().min(6),
});

adminUsersRouter.get("/admin/users", manageUsers, asyncHandler(async (_req, res) => {
  const allUsers = await db.select({
    id: users.id,
    username: users.username,
    fullName: users.fullName,
    email: users.email,
    role: users.role,
    active: users.active,
    groupId: users.groupId,
    failedLoginAttempts: users.failedLoginAttempts,
    lockedUntil: users.lockedUntil,
    createdAt: users.createdAt,
  }).from(users);

  const groups = await db.select({ id: userGroups.id, name: userGroups.name }).from(userGroups);
  const groupMap = Object.fromEntries(groups.map(g => [g.id, g.name]));

  return res.json(allUsers.map(u => ({
    ...u,
    groupName: u.groupId ? (groupMap[u.groupId] ?? null) : null,
    isLocked: u.lockedUntil ? u.lockedUntil > new Date() : false,
  })));
}));

adminUsersRouter.post("/admin/users", manageUsers, asyncHandler(async (req, res) => {
  const data = createUserSchema.parse(req.body);
  const hashed = await bcrypt.hash(data.password, 10);
  const [created] = await db.insert(users).values({
    username: data.username,
    password: hashed,
    fullName: data.fullName,
    email: data.email ?? null,
    role: data.role,
    groupId: data.groupId ?? null,
    active: data.active,
  }).returning();
  await createAuditLog({ entityType: "user", entityId: created.id, action: "create", changes: JSON.stringify({ username: data.username, role: data.role }) });
  const { password: _pw, failedLoginAttempts: _f, lockedUntil: _l, sessionInvalidatedAt: _s, ...safe } = created;
  return res.status(201).json(safe);
}));

adminUsersRouter.patch("/admin/users/:id", manageUsers, asyncHandler(async (req, res) => {
  const data = updateUserSchema.parse(req.body);
  const [existing] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
  if (!existing) return res.status(404).json({ error: "User not found" });

  const groupChanged = "groupId" in data && data.groupId !== existing.groupId;
  const updates: Partial<typeof existing> = { ...data };

  if (groupChanged) {
    (updates as any).sessionInvalidatedAt = new Date();
  }

  const [updated] = await db.update(users).set(updates as any).where(eq(users.id, req.params.id)).returning();
  await createAuditLog({ entityType: "user", entityId: req.params.id, action: "update", changes: JSON.stringify(data) });
  const { password: _pw, failedLoginAttempts: _f, lockedUntil: _l, sessionInvalidatedAt: _s, ...safe } = updated;
  return res.json(safe);
}));

adminUsersRouter.patch("/admin/users/:id/password", manageUsers, asyncHandler(async (req, res) => {
  const { password } = changePasswordSchema.parse(req.body);
  const [existing] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
  if (!existing) return res.status(404).json({ error: "User not found" });

  const hashed = await bcrypt.hash(password, 10);
  await db.update(users).set({
    password: hashed,
    sessionInvalidatedAt: new Date(),
  } as any).where(eq(users.id, req.params.id));

  await createAuditLog({ entityType: "user", entityId: req.params.id, action: "update", changes: JSON.stringify({ passwordChanged: true }) });
  return res.json({ ok: true });
}));

adminUsersRouter.post("/admin/users/:id/unlock", manageUsers, asyncHandler(async (req, res) => {
  const [existing] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
  if (!existing) return res.status(404).json({ error: "User not found" });

  await db.execute(sql`
    UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ${req.params.id}
  `);
  await createAuditLog({ entityType: "user", entityId: req.params.id, action: "update", changes: JSON.stringify({ unlocked: true }) });
  return res.json({ ok: true });
}));

adminUsersRouter.delete("/admin/users/:id", manageUsers, asyncHandler(async (req, res) => {
  const requestingUserId = req.session.userId;
  if (req.params.id === requestingUserId) {
    return res.status(400).json({ error: "Cannot delete your own account" });
  }

  const [existing] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
  if (!existing) return res.status(404).json({ error: "User not found" });

  if (existing.role === "admin") {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(and(eq(users.role, "admin"), eq(users.active, true)));
    if (count <= 1) {
      return res.status(400).json({ error: "Cannot delete the last admin user" });
    }
  }

  await db.delete(users).where(eq(users.id, req.params.id));
  await createAuditLog({ entityType: "user", entityId: req.params.id, action: "delete", changes: JSON.stringify({ username: existing.username }) });
  return res.status(204).send();
}));

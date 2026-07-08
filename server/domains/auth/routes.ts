import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../../db";
import { users, userGroups } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { asyncHandler } from "../../lib/asyncHandler";

declare module "express-session" {
  interface SessionData {
    userId: string;
    userRole: string;
    groupId?: string | null;
    permissions?: Record<string, boolean> | null;
    permissionsVersion?: number | null;
    permissionsLastChecked?: number | null;
    loginAt?: number | null;
  }
}

export const authRouter = Router();

const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

authRouter.post("/auth/login", asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user || !user.active) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return res.status(423).json({
      error: "Account temporarily locked due to too many failed login attempts",
      unlocksAt: user.lockedUntil.toISOString(),
    });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    const newAttempts = (user.failedLoginAttempts ?? 0) + 1;
    const shouldLock = newAttempts >= LOCKOUT_ATTEMPTS;
    await db.execute(sql`
      UPDATE users
      SET failed_login_attempts = ${newAttempts},
          locked_until = ${shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null}
      WHERE id = ${user.id}
    `);
    return res.status(401).json({ error: "Invalid username or password" });
  }

  await db.execute(sql`
    UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ${user.id}
  `);

  let groupPermissions: Record<string, boolean> | null = null;
  let permissionsVersion: number | null = null;
  const groupId = user.groupId ?? null;

  if (groupId) {
    const [group] = await db.select().from(userGroups).where(eq(userGroups.id, groupId)).limit(1);
    if (group) {
      groupPermissions = group.permissions as Record<string, boolean>;
      permissionsVersion = group.permissionsVersion;
    }
  }

  req.session.userId = user.id;
  req.session.userRole = user.role;
  req.session.groupId = groupId;
  req.session.permissions = groupPermissions;
  req.session.permissionsVersion = permissionsVersion;
  req.session.permissionsLastChecked = Date.now();
  req.session.loginAt = Date.now();
  await new Promise<void>((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));

  const { password: _pw, failedLoginAttempts: _f, lockedUntil: _l, sessionInvalidatedAt: _s, ...safeUser } = user;
  return res.json({ user: { ...safeUser, groupId, permissions: groupPermissions } });
}));

authRouter.post("/auth/logout", asyncHandler(async (req, res) => {
  await new Promise<void>((resolve, reject) => req.session.destroy(err => err ? reject(err) : resolve()));
  res.clearCookie("connect.sid");
  return res.json({ ok: true });
}));

authRouter.get("/users", asyncHandler(async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const allUsers = await db.select({
    id: users.id,
    username: users.username,
    fullName: users.fullName,
    role: users.role,
    active: users.active,
  }).from(users).where(eq(users.active, true));
  return res.json(allUsers);
}));

authRouter.get("/auth/me", asyncHandler(async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const [user] = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
  if (!user || !user.active) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  let groupPermissions: Record<string, boolean> | null = null;
  let permissionsVersion: number | null = null;
  const groupId = user.groupId ?? null;

  // Always re-fetch from DB so stale sessions pick up permission changes on the next page load.
  if (groupId) {
    const [group] = await db.select().from(userGroups).where(eq(userGroups.id, groupId)).limit(1);
    if (group) {
      groupPermissions = group.permissions as Record<string, boolean>;
      permissionsVersion = group.permissionsVersion;
    }
  }

  // Always write groupId and permissions back to the session (even when null) so
  // requireFreshPermissions never sees session.groupId === undefined for any
  // user who has loaded the app after this fix.
  req.session.groupId = groupId;
  req.session.permissions = groupPermissions;
  req.session.permissionsVersion = permissionsVersion;
  req.session.permissionsLastChecked = Date.now();
  if (!req.session.loginAt) req.session.loginAt = Date.now();
  await new Promise<void>((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));

  const { password: _pw, failedLoginAttempts: _f, lockedUntil: _l, sessionInvalidatedAt: _s, ...safeUser } = user;
  return res.json({ user: { ...safeUser, groupId, permissions: groupPermissions } });
}));

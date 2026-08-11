import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users, userGroups } from "@shared/schema";
import { eq } from "drizzle-orm";

const PERMISSIONS_CACHE_TTL = 60_000;

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: "Not authenticated" });
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.session?.userRole;
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    return next();
  };
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const session = req.session;
    if (!session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const perms = session.permissions;
    if (!perms && session.userRole === "admin") {
      return next();
    }
    if (!perms || perms[permission] !== true) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    return next();
  };
}

/**
 * Passes if the user holds at least one of the listed permissions.
 * Admins (no permissions snapshot) always pass.
 */
export function requireAnyPermission(permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const session = req.session;
    if (!session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const perms = session.permissions;
    if (!perms && session.userRole === "admin") {
      return next();
    }
    if (!perms || !permissions.some(p => perms[p] === true)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    return next();
  };
}

export function requireFreshPermissions(req: Request, res: Response, next: NextFunction) {
  if (req.path.startsWith("/auth/") || req.path === "/users") {
    return next();
  }

  const session = req.session;
  if (!session?.userId) return next();

  if (session.groupId === undefined) {
    // Pre-group-system session: groupId key was never written.
    // For admins, allow through. For everyone else, attempt a DB refresh
    // (same path as the >60s freshness check) so the session is re-established
    // rather than hard-failing with permissions_changed.
    if (session.userRole === "admin") return next();
    return checkPermissionsFreshness(req, res, next, Date.now()).catch(next);
  }

  const now = Date.now();
  const lastChecked = session.permissionsLastChecked ?? 0;
  if (now - lastChecked < PERMISSIONS_CACHE_TTL) {
    return next();
  }

  checkPermissionsFreshness(req, res, next, now).catch(next);
}

async function checkPermissionsFreshness(req: Request, res: Response, next: NextFunction, now: number) {
  const session = req.session;

  const [user] = await db
    .select({
      id: users.id,
      active: users.active,
      groupId: users.groupId,
      sessionInvalidatedAt: users.sessionInvalidatedAt,
    })
    .from(users)
    .where(eq(users.id, session.userId!))
    .limit(1);

  if (!user || !user.active) {
    await destroySession(req);
    return res.status(401).json({ error: "not_authenticated" });
  }

  const loginAt = session.loginAt ?? 0;
  if (user.sessionInvalidatedAt && user.sessionInvalidatedAt.getTime() > loginAt) {
    await destroySession(req);
    return res.status(401).json({ error: "permissions_changed", message: "Your permissions have been updated. Please sign in again." });
  }

  if (user.groupId !== session.groupId) {
    await destroySession(req);
    return res.status(401).json({ error: "permissions_changed", message: "Your permissions have been updated. Please sign in again." });
  }

  if (user.groupId) {
    const [group] = await db
      .select({ permissionsVersion: userGroups.permissionsVersion })
      .from(userGroups)
      .where(eq(userGroups.id, user.groupId))
      .limit(1);

    if (group && group.permissionsVersion !== (session.permissionsVersion ?? 0)) {
      await destroySession(req);
      return res.status(401).json({ error: "permissions_changed", message: "Your permissions have been updated. Please sign in again." });
    }
  }

  session.permissionsLastChecked = now;
  await new Promise<void>((resolve, reject) => session.save(err => err ? reject(err) : resolve()));
  next();
}

function destroySession(req: Request): Promise<void> {
  return new Promise((resolve, reject) =>
    req.session.destroy(err => err ? reject(err) : resolve())
  );
}

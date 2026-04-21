import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { asyncHandler } from "../../lib/asyncHandler";

declare module "express-session" {
  interface SessionData {
    userId: string;
    userRole: string;
  }
}

export const authRouter = Router();

authRouter.post("/auth/login", asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user || !user.active) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  req.session.userId = user.id;
  req.session.userRole = user.role;
  await new Promise<void>((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));

  const { password: _pw, ...safeUser } = user;
  return res.json({ user: safeUser });
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
  const { password: _pw, ...safeUser } = user;
  return res.json({ user: safeUser });
}));

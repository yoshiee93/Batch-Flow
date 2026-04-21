import type { Request, Response, NextFunction } from "express";

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

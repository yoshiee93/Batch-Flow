import { AsyncLocalStorage } from "node:async_hooks";
import type { Request, Response, NextFunction } from "express";

interface RequestContext {
  userId: string | null;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function requestContextMiddleware(req: Request, _res: Response, next: NextFunction) {
  const userId = (req.session?.userId as string | undefined) ?? null;
  storage.run({ userId }, () => next());
}

export function getCurrentUserId(): string | null {
  return storage.getStore()?.userId ?? null;
}

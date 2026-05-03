import { auditLogs, type InsertAuditLog, type AuditLog } from "@shared/schema";
import { db } from "../db";
import { getCurrentUserId } from "./requestContext";

export async function createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
  const userId = log.userId ?? getCurrentUserId();
  const [created] = await db.insert(auditLogs).values({ ...log, userId }).returning();
  return created;
}

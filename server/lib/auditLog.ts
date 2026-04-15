import { auditLogs, type InsertAuditLog, type AuditLog } from "@shared/schema";
import { db } from "../db";

export async function createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
  const [created] = await db.insert(auditLogs).values(log).returning();
  return created;
}

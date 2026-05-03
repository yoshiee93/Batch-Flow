import { and, desc, eq, gte, lte, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { auditLogs, users } from "@shared/schema";

export interface AuditLogFilters {
  entityType?: string;
  entityId?: string;
  action?: string;
  userId?: string;
  from?: Date;
  to?: Date;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogRow {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes: string | null;
  userId: string | null;
  createdAt: Date;
  userName: string | null;
  userRole: string | null;
}

export interface AuditLogListResult {
  items: AuditLogRow[];
  total: number;
  limit: number;
  offset: number;
}

function buildWhere(filters: AuditLogFilters): SQL | undefined {
  const conds: SQL[] = [];
  if (filters.entityType) conds.push(eq(auditLogs.entityType, filters.entityType));
  if (filters.entityId) conds.push(eq(auditLogs.entityId, filters.entityId));
  if (filters.action) conds.push(eq(auditLogs.action, filters.action));
  if (filters.userId) conds.push(eq(auditLogs.userId, filters.userId));
  if (filters.from) conds.push(gte(auditLogs.createdAt, filters.from));
  if (filters.to) conds.push(lte(auditLogs.createdAt, filters.to));
  if (filters.q && filters.q.trim()) {
    const like = `%${filters.q.trim()}%`;
    const qCond = or(
      ilike(auditLogs.entityId, like),
      ilike(auditLogs.entityType, like),
      ilike(auditLogs.action, like),
      ilike(auditLogs.changes, like),
      ilike(users.username, like),
      ilike(users.fullName, like),
    );
    if (qCond) conds.push(qCond);
  }
  return conds.length > 0 ? and(...conds) : undefined;
}

export const securityRepository = {
  async listAuditLogs(filters: AuditLogFilters): Promise<AuditLogListResult> {
    const limit = Math.max(1, Math.min(filters.limit ?? 20, 200));
    const offset = Math.max(0, filters.offset ?? 0);
    const where = buildWhere(filters);

    const itemsQuery = db
      .select({
        id: auditLogs.id,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        action: auditLogs.action,
        changes: auditLogs.changes,
        userId: auditLogs.userId,
        createdAt: auditLogs.createdAt,
        userName: users.fullName,
        userRole: users.role,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const totalQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id));

    const [items, totalRows] = await Promise.all([
      where ? itemsQuery.where(where) : itemsQuery,
      where ? totalQuery.where(where) : totalQuery,
    ]);

    return {
      items: items as AuditLogRow[],
      total: totalRows[0]?.count ?? 0,
      limit,
      offset,
    };
  },

  async listEntityTypes(): Promise<string[]> {
    const rows = await db
      .selectDistinct({ entityType: auditLogs.entityType })
      .from(auditLogs)
      .orderBy(auditLogs.entityType);
    return rows.map(r => r.entityType);
  },

  async listActions(): Promise<string[]> {
    const rows = await db
      .selectDistinct({ action: auditLogs.action })
      .from(auditLogs)
      .orderBy(auditLogs.action);
    return rows.map(r => r.action);
  },

  async listUsers(): Promise<{ id: string; name: string; role: string }[]> {
    const rows = await db
      .select({ id: users.id, name: users.fullName, role: users.role })
      .from(users)
      .orderBy(users.fullName);
    return rows;
  },
};

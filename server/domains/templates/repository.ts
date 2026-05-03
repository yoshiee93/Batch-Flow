import { eq, and, isNull, asc, ne } from "drizzle-orm";
import { db } from "../../db";
import {
  templates,
  type Template, type InsertTemplate,
} from "@shared/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function clearOtherDefaults(tx: Tx, kind: string, customerId: string | null, exceptId?: string) {
  const customerCond = customerId ? eq(templates.customerId, customerId) : isNull(templates.customerId);
  const baseConds = [eq(templates.kind, kind), customerCond, eq(templates.isDefault, true)];
  if (exceptId) baseConds.push(ne(templates.id, exceptId));
  await tx.update(templates).set({ isDefault: false }).where(and(...baseConds));
}

export const templatesRepository = {
  async list(kind?: string): Promise<Template[]> {
    if (kind) {
      return db.select().from(templates).where(eq(templates.kind, kind)).orderBy(asc(templates.name));
    }
    return db.select().from(templates).orderBy(asc(templates.kind), asc(templates.name));
  },

  async get(id: string): Promise<Template | undefined> {
    const [row] = await db.select().from(templates).where(eq(templates.id, id));
    return row;
  },

  async getDefaultForContext(kind: string, customerId?: string | null): Promise<Template | undefined> {
    if (customerId) {
      const [customerDefault] = await db
        .select()
        .from(templates)
        .where(and(eq(templates.kind, kind), eq(templates.customerId, customerId), eq(templates.isDefault, true)))
        .orderBy(asc(templates.createdAt))
        .limit(1);
      if (customerDefault) return customerDefault;
    }
    const [systemDefault] = await db
      .select()
      .from(templates)
      .where(and(eq(templates.kind, kind), eq(templates.isDefault, true), isNull(templates.customerId)))
      .orderBy(asc(templates.createdAt))
      .limit(1);
    return systemDefault;
  },

  async create(data: InsertTemplate): Promise<Template> {
    return db.transaction(async (tx) => {
      if (data.isDefault) {
        await clearOtherDefaults(tx, data.kind, data.customerId ?? null);
      }
      const [created] = await tx.insert(templates).values(data).returning();
      return created;
    });
  },

  async update(id: string, data: Partial<InsertTemplate>): Promise<Template | undefined> {
    return db.transaction(async (tx) => {
      const [existing] = await tx.select().from(templates).where(eq(templates.id, id));
      if (!existing) return undefined;
      const willBeDefault = data.isDefault ?? existing.isDefault;
      const customerId = (data.customerId ?? existing.customerId) ?? null;
      if (willBeDefault) {
        await clearOtherDefaults(tx, existing.kind, customerId, id);
      }
      const [updated] = await tx
        .update(templates)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(templates.id, id))
        .returning();
      return updated;
    });
  },

  async delete(id: string): Promise<void> {
    await db.delete(templates).where(eq(templates.id, id));
  },
};

import { eq, desc } from "drizzle-orm";
import { db } from "../../db";
import { qualityChecks, type QualityCheck, type InsertQualityCheck } from "@shared/schema";

export const qualityRepository = {
  async getQualityChecks(batchId: string): Promise<QualityCheck[]> {
    return db.select().from(qualityChecks)
      .where(eq(qualityChecks.batchId, batchId))
      .orderBy(desc(qualityChecks.checkedAt));
  },

  async createQualityCheckRaw(data: InsertQualityCheck): Promise<QualityCheck> {
    const [created] = await db.insert(qualityChecks).values(data).returning();
    return created;
  },
};

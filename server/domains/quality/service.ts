import { qualityRepository as repo } from "./repository";
import { createAuditLog } from "../../lib/auditLog";
import type { InsertQualityCheck, QualityCheck } from "@shared/schema";

export const qualityService = {
  getQualityChecks: repo.getQualityChecks.bind(repo),

  async createQualityCheck(data: InsertQualityCheck): Promise<QualityCheck> {
    const created = await repo.createQualityCheckRaw(data);
    await createAuditLog({
      entityType: "quality_check",
      entityId: created.id,
      action: "create",
      changes: JSON.stringify(data),
      userId: data.checkedBy ?? undefined,
    });
    await createAuditLog({
      entityType: "batch",
      entityId: data.batchId,
      action: "quality_check_added",
      changes: JSON.stringify({ checkType: data.checkType, result: data.result, value: data.value }),
      userId: data.checkedBy ?? undefined,
    });
    return created;
  },
};

import { eq, and, isNull } from "drizzle-orm";
import { db } from "../../db";
import {
  labelTemplates,
  type LabelTemplate, type InsertLabelTemplate,
  type LabelTemplateType,
} from "@shared/schema";

export const labelsRepository = {
  async getAllTemplates(): Promise<LabelTemplate[]> {
    return db.select().from(labelTemplates).orderBy(labelTemplates.name);
  },

  async getTemplate(id: string): Promise<LabelTemplate | undefined> {
    const [row] = await db.select().from(labelTemplates).where(eq(labelTemplates.id, id));
    return row;
  },

  async getTemplatesByCustomer(customerId: string): Promise<LabelTemplate[]> {
    return db.select().from(labelTemplates).where(eq(labelTemplates.customerId, customerId));
  },

  async getDefaultTemplate(labelType: LabelTemplateType): Promise<LabelTemplate | undefined> {
    const [row] = await db
      .select()
      .from(labelTemplates)
      .where(and(eq(labelTemplates.labelType, labelType), eq(labelTemplates.isDefault, true), isNull(labelTemplates.customerId)))
      .limit(1);
    return row;
  },

  async getTemplateForContext(labelType: LabelTemplateType, customerId?: string | null): Promise<LabelTemplate | undefined> {
    if (customerId) {
      const [customerTemplate] = await db
        .select()
        .from(labelTemplates)
        .where(and(eq(labelTemplates.labelType, labelType), eq(labelTemplates.customerId, customerId), eq(labelTemplates.isDefault, true)))
        .limit(1);
      if (customerTemplate) return customerTemplate;
    }
    return this.getDefaultTemplate(labelType);
  },

  async createTemplate(data: InsertLabelTemplate): Promise<LabelTemplate> {
    const [created] = await db.insert(labelTemplates).values(data).returning();
    return created;
  },

  async updateTemplate(id: string, data: Partial<InsertLabelTemplate>): Promise<LabelTemplate | undefined> {
    const [updated] = await db.update(labelTemplates).set(data).where(eq(labelTemplates.id, id)).returning();
    return updated;
  },

  async deleteTemplate(id: string): Promise<void> {
    await db.delete(labelTemplates).where(eq(labelTemplates.id, id));
  },

  async ensureDefaultTemplates(): Promise<void> {
    const allDefaults = await db
      .select()
      .from(labelTemplates)
      .where(and(eq(labelTemplates.isDefault, true), isNull(labelTemplates.customerId)));
    const existingTypes = new Set(allDefaults.map(t => t.labelType));
    const allSettings = JSON.stringify({
      showProductionDate: true,
      showMadeInAustralia: true,
      showExpiryDate: true,
      showBatchCode: true,
      showQuantity: true,
      showSupplierLot: true,
      showSource: true,
      showBarcodeText: true,
      showReceivedDate: true,
    });
    const toCreate: InsertLabelTemplate[] = [];
    if (!existingTypes.has("raw_intake")) {
      toCreate.push({ name: "Default Raw Intake", labelType: "raw_intake", isDefault: true, settings: allSettings });
    }
    if (!existingTypes.has("finished_output")) {
      toCreate.push({ name: "Default Finished Output", labelType: "finished_output", isDefault: true, settings: allSettings });
    }
    if (!existingTypes.has("batch")) {
      toCreate.push({ name: "Default Batch", labelType: "batch", isDefault: true, settings: allSettings });
    }
    if (toCreate.length > 0) {
      await db.insert(labelTemplates).values(toCreate);
    }
  },
};

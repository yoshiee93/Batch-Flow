import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../lib/authMiddleware";
import { labelsRepository, printHistoryRepository } from "./repository";
import { insertLabelTemplateSchema, insertPrintHistorySchema } from "@shared/schema";

const adminOnly = requireRole("admin");

export const labelsRouter = Router();

labelsRouter.get("/label-templates", asyncHandler(async (req, res) => {
  const { labelType, customerId } = req.query;
  if (labelType && typeof labelType === "string") {
    // Template resolution for print — available to all authenticated users
    const type = labelType as "raw_intake" | "finished_output" | "batch";
    const cid = typeof customerId === "string" ? customerId : undefined;
    const template = await labelsRepository.getTemplateForContext(type, cid);
    return res.json(template ?? null);
  }
  // List all templates — admin only
  if (!req.session?.userRole || req.session.userRole !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  res.json(await labelsRepository.getAllTemplates());
}));

labelsRouter.get("/label-templates/:id", adminOnly, asyncHandler(async (req, res) => {
  const template = await labelsRepository.getTemplate(req.params.id);
  if (!template) return res.status(404).json({ error: "Template not found" });
  res.json(template);
}));

labelsRouter.post("/label-templates", adminOnly, asyncHandler(async (req, res) => {
  const data = insertLabelTemplateSchema.parse(req.body);
  res.status(201).json(await labelsRepository.createTemplate(data));
}));

labelsRouter.patch("/label-templates/:id", adminOnly, asyncHandler(async (req, res) => {
  const data = insertLabelTemplateSchema.partial().parse(req.body);
  const template = await labelsRepository.updateTemplate(req.params.id, data);
  if (!template) return res.status(404).json({ error: "Template not found" });
  res.json(template);
}));

labelsRouter.delete("/label-templates/:id", adminOnly, asyncHandler(async (req, res) => {
  const template = await labelsRepository.getTemplate(req.params.id);
  if (!template) return res.status(404).json({ error: "Template not found" });
  if (template.isDefault && !template.customerId) {
    return res.status(400).json({ error: "Cannot delete a system default template" });
  }
  await labelsRepository.deleteTemplate(req.params.id);
  res.status(204).send();
}));

const recordPrintBody = insertPrintHistorySchema.omit({ printedByUserId: true });

labelsRouter.post("/print-history", asyncHandler(async (req, res) => {
  const body = recordPrintBody.parse(req.body);
  const userId = req.session?.userId ?? null;
  const row = await printHistoryRepository.record({ ...body, printedByUserId: userId });
  res.status(201).json(row);
}));

const listFiltersSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  labelKind: z.string().optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

labelsRouter.get("/print-history", adminOnly, asyncHandler(async (req, res) => {
  const filters = listFiltersSchema.parse(req.query);
  const rows = await printHistoryRepository.list({
    from: filters.from ? new Date(filters.from) : undefined,
    to: filters.to ? new Date(filters.to) : undefined,
    labelKind: filters.labelKind,
    q: filters.q,
    limit: filters.limit,
  });
  res.json(rows);
}));

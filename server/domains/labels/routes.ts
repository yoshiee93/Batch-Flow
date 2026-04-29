import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../lib/authMiddleware";
import { labelsRepository } from "./repository";
import { insertLabelTemplateSchema } from "@shared/schema";

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

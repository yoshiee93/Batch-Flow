import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../lib/authMiddleware";
import { templatesRepository } from "./repository";
import { insertTemplateSchema } from "@shared/schema";
import { getTemplateKind, validateTemplatePayload } from "@shared/templateKinds";
import { createAuditLog } from "../../lib/auditLog";

const adminOnly = requireRole("admin");

export const templatesRouter = Router();

templatesRouter.use("/templates", adminOnly);
templatesRouter.use("/templates/:id", adminOnly);

templatesRouter.get("/templates", asyncHandler(async (req, res) => {
  const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
  if (kind && !getTemplateKind(kind)) {
    return res.status(400).json({ error: `Unknown template kind: ${kind}` });
  }
  res.json(await templatesRepository.list(kind));
}));

templatesRouter.get("/templates/default", asyncHandler(async (req, res) => {
  const kind = typeof req.query.kind === "string" ? req.query.kind : "";
  const customerId = typeof req.query.customerId === "string" ? req.query.customerId : null;
  if (!getTemplateKind(kind)) {
    return res.status(400).json({ error: `Unknown template kind: ${kind}` });
  }
  const tpl = await templatesRepository.getDefaultForContext(kind, customerId);
  res.json(tpl ?? null);
}));

templatesRouter.get("/templates/:id", asyncHandler(async (req, res) => {
  const tpl = await templatesRepository.get(req.params.id);
  if (!tpl) return res.status(404).json({ error: "Template not found" });
  res.json(tpl);
}));

const createBody = insertTemplateSchema;
templatesRouter.post("/templates", asyncHandler(async (req, res) => {
  const data = createBody.parse(req.body);
  const def = getTemplateKind(data.kind);
  if (!def) {
    return res.status(400).json({ error: `Unknown template kind: ${data.kind}` });
  }
  if (data.customerId && !def.supportsCustomer) {
    return res.status(400).json({ error: `Template kind "${data.kind}" does not support customer-specific templates` });
  }
  const validatedPayload = validateTemplatePayload(data.kind, data.payload ?? {});
  const created = await templatesRepository.create({ ...data, payload: validatedPayload as any });
  await createAuditLog({
    entityType: "template",
    entityId: created.id,
    action: "create",
    changes: JSON.stringify({ kind: created.kind, name: created.name }),
  });
  res.status(201).json(created);
}));

const patchBody = insertTemplateSchema.partial().omit({ kind: true });
templatesRouter.patch("/templates/:id", asyncHandler(async (req, res) => {
  const existing = await templatesRepository.get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Template not found" });
  const data = patchBody.parse(req.body);
  const def = getTemplateKind(existing.kind);
  if (!def) {
    return res.status(400).json({ error: `Unknown template kind: ${existing.kind}` });
  }
  if (data.customerId && !def.supportsCustomer) {
    return res.status(400).json({ error: `Template kind "${existing.kind}" does not support customer-specific templates` });
  }
  const next: Partial<typeof data> = { ...data };
  if (data.payload !== undefined) {
    next.payload = validateTemplatePayload(existing.kind, data.payload) as any;
  }
  const updated = await templatesRepository.update(req.params.id, next);
  await createAuditLog({
    entityType: "template",
    entityId: req.params.id,
    action: "update",
    changes: JSON.stringify(data),
  });
  res.json(updated);
}));

templatesRouter.delete("/templates/:id", asyncHandler(async (req, res) => {
  const existing = await templatesRepository.get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Template not found" });
  await templatesRepository.delete(req.params.id);
  await createAuditLog({
    entityType: "template",
    entityId: req.params.id,
    action: "delete",
    changes: JSON.stringify({ kind: existing.kind, name: existing.name }),
  });
  res.status(204).send();
}));

/**
 * Template kind registry — shared between server and client.
 *
 * Each "kind" describes a reusable preset stored in the generic `templates`
 * table (see `schema.ts`). The `payload` jsonb column is validated per-kind
 * by the Zod schema declared here.
 *
 * To add a new kind:
 *   1. Define a Zod payload schema (e.g. `myKindPayloadSchema`) and exported type.
 *   2. Add an entry to `TEMPLATE_KINDS` with a unique `kind` string,
 *      a `displayName`, a short `description`, the `payloadSchema`, and
 *      `supportsCustomer` (true if customer-specific templates are allowed).
 *   3. On the client, add a per-kind form to `client/src/features/templates/kindForms.tsx`
 *      and mount `<TemplatesPanel kind="..." defaultPayload={...} renderForm={...}/>`
 *      wherever you want admins to manage them (typically Settings → Data).
 *
 * Server routes (`server/domains/templates/routes.ts`) always call
 * `validateTemplatePayload(kind, payload)` before persisting, so any new
 * kind is automatically validated — no per-kind server code required.
 */
import { z } from "zod";

export const batchStandardPayloadSchema = z.object({
  description: z.string().min(1, "Description is required"),
  defaultPlannedQuantity: z.coerce.number().positive().optional(),
  defaultUnit: z.string().max(10).optional(),
});
export type BatchStandardPayload = z.infer<typeof batchStandardPayloadSchema>;

export const productSpecPayloadSchema = z.object({
  description: z.string().min(1, "Description is required"),
  defaultUnit: z.string().max(10).optional(),
  notes: z.string().optional(),
});
export type ProductSpecPayload = z.infer<typeof productSpecPayloadSchema>;

export interface TemplateKindDefinition {
  kind: string;
  displayName: string;
  description: string;
  payloadSchema: z.ZodTypeAny;
  supportsCustomer: boolean;
}

export const TEMPLATE_KINDS: Record<string, TemplateKindDefinition> = {
  "batch.standard": {
    kind: "batch.standard",
    displayName: "Standard Batch",
    description:
      "Reusable batch presets — pre-fill description, planned quantity, and unit when creating a new production batch.",
    payloadSchema: batchStandardPayloadSchema,
    supportsCustomer: false,
  },
  "product.spec": {
    kind: "product.spec",
    displayName: "Product Spec",
    description:
      "Reusable product specification — description, default unit, and notes that can be applied to a product.",
    payloadSchema: productSpecPayloadSchema,
    supportsCustomer: false,
  },
};

export type TemplateKind = keyof typeof TEMPLATE_KINDS;

export function getTemplateKind(kind: string): TemplateKindDefinition | undefined {
  return TEMPLATE_KINDS[kind];
}

export function listTemplateKinds(): TemplateKindDefinition[] {
  return Object.values(TEMPLATE_KINDS);
}

export function validateTemplatePayload(kind: string, payload: unknown): unknown {
  const def = getTemplateKind(kind);
  if (!def) {
    throw new Error(`Unknown template kind: ${kind}`);
  }
  return def.payloadSchema.parse(payload);
}

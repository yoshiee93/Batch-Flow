import { Router } from "express";
import { z } from "zod";
import { insertForecastOrderSchema } from "@shared/schema";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../lib/authMiddleware";
import { forecastService as svc } from "./service";

const adminOnly = requireRole("admin");

const forecastWriteSchema = insertForecastOrderSchema.omit({ status: true, convertedOrderId: true });

export const forecastRouter = Router();

forecastRouter.get("/forecast", adminOnly, asyncHandler(async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status as "open" | "converted" | "archived" : undefined;
  const months = req.query.months === "3" || req.query.months === "6" || req.query.months === "12" ? Number(req.query.months) : undefined;
  let from: Date | undefined;
  let to: Date | undefined;
  if (months) {
    from = new Date();
    from.setHours(0, 0, 0, 0);
    to = new Date(from);
    to.setMonth(to.getMonth() + months);
  }
  res.json(await svc.list({ from, to, status }));
}));

forecastRouter.get("/forecast/summary", adminOnly, asyncHandler(async (req, res) => {
  const months = (req.query.months === "6" ? 6 : req.query.months === "12" ? 12 : 3) as 3 | 6 | 12;
  res.json(await svc.summary(months));
}));

forecastRouter.get("/forecast/history", adminOnly, asyncHandler(async (req, res) => {
  const productId = typeof req.query.productId === "string" && req.query.productId ? req.query.productId : undefined;
  const customerId = typeof req.query.customerId === "string" && req.query.customerId ? req.query.customerId : undefined;
  const monthsBack = req.query.monthsBack ? Math.max(1, Math.min(24, Number(req.query.monthsBack) || 6)) : 6;
  res.json(await svc.history({ productId, customerId, monthsBack }));
}));

forecastRouter.post("/forecast", adminOnly, asyncHandler(async (req, res) => {
  const data = forecastWriteSchema.parse(req.body);
  res.status(201).json(await svc.create(data));
}));

forecastRouter.patch("/forecast/:id", adminOnly, asyncHandler(async (req, res) => {
  const data = forecastWriteSchema.partial().parse(req.body);
  const row = await svc.update(req.params.id, data);
  if (!row) return res.status(404).json({ error: "Forecast not found" });
  res.json(row);
}));

forecastRouter.delete("/forecast/:id", adminOnly, asyncHandler(async (req, res) => {
  await svc.delete(req.params.id);
  res.status(204).send();
}));

const convertSchema = z.object({
  orderNumber: z.string().min(1, "Order number is required"),
  dueDate: z.union([z.string(), z.date()]).transform((v) => typeof v === "string" ? new Date(v) : v),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  poNumber: z.string().nullish(),
  notes: z.string().nullish(),
});

forecastRouter.post("/forecast/:id/convert", adminOnly, asyncHandler(async (req, res) => {
  const data = convertSchema.parse(req.body);
  res.json(await svc.convert(req.params.id, data));
}));

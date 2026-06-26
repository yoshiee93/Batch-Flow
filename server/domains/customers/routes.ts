import { Router } from "express";
import { z } from "zod";
import {
  insertCustomerSchema, insertOrderSchema, insertOrderItemSchema,
} from "@shared/schema";
import { asyncHandler } from "../../lib/asyncHandler";
import { requirePermission } from "../../lib/authMiddleware";
import { customersService as svc, TestingRequiredError } from "./service";

const canCreateCustomer = requirePermission("customers.create");
const canEditCustomer = requirePermission("customers.edit");
const canDeleteCustomer = requirePermission("customers.delete");
const canCreateOrder = requirePermission("orders.create");
const canEditOrder = requirePermission("orders.edit");
const canDeleteOrder = requirePermission("orders.delete");
const canPackOrder = requirePermission("pack_orders.create");

export const customersRouter = Router();

customersRouter.get("/customers", asyncHandler(async (_req, res) => {
  res.json(await svc.getCustomers());
}));

customersRouter.get("/customers/:id", asyncHandler(async (req, res) => {
  const customer = await svc.getCustomer(req.params.id);
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  res.json(customer);
}));

customersRouter.post("/customers", canCreateCustomer, asyncHandler(async (req, res) => {
  const data = insertCustomerSchema.parse(req.body);
  res.status(201).json(await svc.createCustomer(data));
}));

customersRouter.patch("/customers/:id", canEditCustomer, asyncHandler(async (req, res) => {
  const data = insertCustomerSchema.partial().parse(req.body);
  const customer = await svc.updateCustomer(req.params.id, data);
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  res.json(customer);
}));

customersRouter.delete("/customers/:id", canDeleteCustomer, asyncHandler(async (req, res) => {
  await svc.deleteCustomer(req.params.id);
  res.status(204).send();
}));

customersRouter.get("/orders/with-allocation", asyncHandler(async (_req, res) => {
  res.json(await svc.getOrdersWithAllocation());
}));

customersRouter.get("/orders/:id/items", asyncHandler(async (req, res) => {
  res.json(await svc.getOrderItems(req.params.id));
}));

customersRouter.get("/orders/:id/stock-check", asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const order = await svc.getOrder(orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(await svc.getOrderStockCheck(orderId));
}));

customersRouter.get("/orders/:id/allocations", asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const order = await svc.getOrder(orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });
  const { customersRepository } = await import("./repository");
  res.json(await customersRepository.getOrderAllocations(orderId));
}));

customersRouter.post("/orders/:id/pack", canPackOrder, asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const order = await svc.getOrder(orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });

  const bodySchema = z.object({
    allocations: z.array(z.object({
      orderItemId: z.string().min(1),
      lotId: z.string().min(1),
      quantityAllocated: z.number().positive(),
    })).min(1, "At least one allocation is required"),
  });

  const { allocations } = bodySchema.parse(req.body);
  const userId = (req as any).user?.id;

  try {
    const updatedOrder = await svc.packOrder(orderId, allocations, userId);
    res.json(updatedOrder);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to pack order";
    res.status(400).json({ error: msg });
  }
}));

customersRouter.post("/orders/:id/ship", canEditOrder, asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const order = await svc.getOrder(orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });

  const bodySchema = z.object({
    shippingCarrier: z.string().optional(),
    trackingReference: z.string().optional(),
    shippedAt: z.string().optional().transform(v => v ? new Date(v) : undefined),
  });

  const data = bodySchema.parse(req.body);
  const userId = (req as any).user?.id;

  try {
    const result = await svc.shipOrder(orderId, data, userId);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to ship order";
    res.status(400).json({ error: msg });
  }
}));

customersRouter.get("/orders/:id", asyncHandler(async (req, res) => {
  const order = await svc.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
}));

customersRouter.get("/orders", asyncHandler(async (_req, res) => {
  res.json(await svc.getOrders());
}));

customersRouter.post("/orders", canCreateOrder, asyncHandler(async (req, res) => {
  const data = insertOrderSchema.parse(req.body);
  res.status(201).json(await svc.createOrder(data));
}));

customersRouter.patch("/orders/:id", canEditOrder, asyncHandler(async (req, res) => {
  const data = insertOrderSchema.partial().parse(req.body);
  const order = await svc.updateOrder(req.params.id, data);
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
}));

customersRouter.delete("/orders/:id", canDeleteOrder, asyncHandler(async (req, res) => {
  await svc.deleteOrder(req.params.id);
  res.status(204).send();
}));

const orderItemPayloadSchema = insertOrderItemSchema.extend({
  quantity: z.string().refine((v) => {
    const n = parseFloat(v);
    return !isNaN(n) && n > 0;
  }, { message: "Quantity must be greater than 0" }),
  productId: z.string().min(1, "Product is required"),
});
customersRouter.post("/orders/:id/items", canCreateOrder, asyncHandler(async (req, res) => {
  const data = orderItemPayloadSchema.parse({ ...req.body, orderId: req.params.id });
  res.status(201).json(await svc.createOrderItem(data));
}));

customersRouter.delete("/order-items/:id", canEditOrder, asyncHandler(async (req, res) => {
  await svc.deleteOrderItem(req.params.id);
  res.status(204).send();
}));

customersRouter.post("/orders/:id/complete", canEditOrder, asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const order = await svc.getOrder(orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.status === "shipped" || order.status === "completed") return res.status(400).json({ error: "Order already completed" });
  if (order.status === "cancelled") return res.status(400).json({ error: "Cannot complete cancelled order" });
  const items = await svc.getOrderItems(orderId);
  if (!items || items.length === 0) {
    return res.status(400).json({ error: "Order must have at least one line item before it can be completed" });
  }
  try {
    res.json(await svc.completeOrder(orderId));
  } catch (err) {
    if (err instanceof TestingRequiredError) {
      return res.status(409).json({ error: err.message, code: err.code, blockingLots: err.blockingLots });
    }
    const msg = err instanceof Error ? err.message : "Failed to complete order";
    return res.status(400).json({ error: msg });
  }
}));

customersRouter.get("/orders/:id/testing-blockers", asyncHandler(async (req, res) => {
  res.json(await svc.getOrderTestingBlockers(req.params.id));
}));

customersRouter.post("/allocation/run", canCreateOrder, asyncHandler(async (_req, res) => {
  await svc.runStockAllocation();
  res.json({ success: true, message: "Stock allocation completed" });
}));

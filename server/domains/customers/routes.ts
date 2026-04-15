import { Router } from "express";
import {
  insertCustomerSchema, insertOrderSchema, insertOrderItemSchema,
} from "@shared/schema";
import { asyncHandler } from "../../lib/asyncHandler";
import { customersService as svc } from "./service";

export const customersRouter = Router();

customersRouter.get("/customers", asyncHandler(async (_req, res) => {
  res.json(await svc.getCustomers());
}));

customersRouter.get("/customers/:id", asyncHandler(async (req, res) => {
  const customer = await svc.getCustomer(req.params.id);
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  res.json(customer);
}));

customersRouter.post("/customers", asyncHandler(async (req, res) => {
  const data = insertCustomerSchema.parse(req.body);
  res.status(201).json(await svc.createCustomer(data));
}));

customersRouter.patch("/customers/:id", asyncHandler(async (req, res) => {
  const data = insertCustomerSchema.partial().parse(req.body);
  const customer = await svc.updateCustomer(req.params.id, data);
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  res.json(customer);
}));

customersRouter.delete("/customers/:id", asyncHandler(async (req, res) => {
  await svc.deleteCustomer(req.params.id);
  res.status(204).send();
}));

customersRouter.get("/orders/with-allocation", asyncHandler(async (_req, res) => {
  res.json(await svc.getOrdersWithAllocation());
}));

customersRouter.get("/orders/:id/items", asyncHandler(async (req, res) => {
  res.json(await svc.getOrderItems(req.params.id));
}));

customersRouter.get("/orders/:id", asyncHandler(async (req, res) => {
  const order = await svc.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
}));

customersRouter.get("/orders", asyncHandler(async (_req, res) => {
  res.json(await svc.getOrders());
}));

customersRouter.post("/orders", asyncHandler(async (req, res) => {
  const data = insertOrderSchema.parse(req.body);
  res.status(201).json(await svc.createOrder(data));
}));

customersRouter.patch("/orders/:id", asyncHandler(async (req, res) => {
  const data = insertOrderSchema.partial().parse(req.body);
  const order = await svc.updateOrder(req.params.id, data);
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
}));

customersRouter.delete("/orders/:id", asyncHandler(async (req, res) => {
  await svc.deleteOrder(req.params.id);
  res.status(204).send();
}));

customersRouter.post("/orders/:id/items", asyncHandler(async (req, res) => {
  const data = insertOrderItemSchema.parse({ ...req.body, orderId: req.params.id });
  res.status(201).json(await svc.createOrderItem(data));
}));

customersRouter.delete("/order-items/:id", asyncHandler(async (req, res) => {
  await svc.deleteOrderItem(req.params.id);
  res.status(204).send();
}));

customersRouter.post("/orders/:id/complete", asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const order = await svc.getOrder(orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.status === "shipped") return res.status(400).json({ error: "Order already completed" });
  if (order.status === "cancelled") return res.status(400).json({ error: "Cannot complete cancelled order" });
  res.json(await svc.completeOrder(orderId));
}));

customersRouter.post("/allocation/run", asyncHandler(async (_req, res) => {
  await svc.runStockAllocation();
  res.json({ success: true, message: "Stock allocation completed" });
}));

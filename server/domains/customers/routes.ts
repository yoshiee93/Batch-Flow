import { Router } from "express";
import {
  insertCustomerSchema, insertOrderSchema, insertOrderItemSchema,
} from "@shared/schema";
import { asyncHandler } from "../../lib/asyncHandler";
import { customersRepository as repo } from "./repository";

export const customersRouter = Router();

customersRouter.get("/customers", asyncHandler(async (_req, res) => {
  res.json(await repo.getCustomers());
}));

customersRouter.get("/customers/:id", asyncHandler(async (req, res) => {
  const customer = await repo.getCustomer(req.params.id);
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  res.json(customer);
}));

customersRouter.post("/customers", asyncHandler(async (req, res) => {
  const data = insertCustomerSchema.parse(req.body);
  res.status(201).json(await repo.createCustomer(data));
}));

customersRouter.patch("/customers/:id", asyncHandler(async (req, res) => {
  const data = insertCustomerSchema.partial().parse(req.body);
  const customer = await repo.updateCustomer(req.params.id, data);
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  res.json(customer);
}));

customersRouter.delete("/customers/:id", asyncHandler(async (req, res) => {
  await repo.deleteCustomer(req.params.id);
  res.status(204).send();
}));

customersRouter.get("/orders/with-allocation", asyncHandler(async (_req, res) => {
  res.json(await repo.getOrdersWithAllocation());
}));

customersRouter.get("/orders/:id/items", asyncHandler(async (req, res) => {
  res.json(await repo.getOrderItems(req.params.id));
}));

customersRouter.get("/orders/:id", asyncHandler(async (req, res) => {
  const order = await repo.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
}));

customersRouter.get("/orders", asyncHandler(async (_req, res) => {
  res.json(await repo.getOrders());
}));

customersRouter.post("/orders", asyncHandler(async (req, res) => {
  const data = insertOrderSchema.parse(req.body);
  res.status(201).json(await repo.createOrder(data));
}));

customersRouter.patch("/orders/:id", asyncHandler(async (req, res) => {
  const data = insertOrderSchema.partial().parse(req.body);
  const order = await repo.updateOrder(req.params.id, data);
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
}));

customersRouter.delete("/orders/:id", asyncHandler(async (req, res) => {
  await repo.deleteOrder(req.params.id);
  res.status(204).send();
}));

customersRouter.post("/orders/:id/items", asyncHandler(async (req, res) => {
  const data = insertOrderItemSchema.parse({ ...req.body, orderId: req.params.id });
  res.status(201).json(await repo.createOrderItem(data));
}));

customersRouter.delete("/order-items/:id", asyncHandler(async (req, res) => {
  await repo.deleteOrderItem(req.params.id);
  res.status(204).send();
}));

customersRouter.post("/orders/:id/complete", asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const order = await repo.getOrder(orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.status === "shipped") return res.status(400).json({ error: "Order already completed" });
  if (order.status === "cancelled") return res.status(400).json({ error: "Cannot complete cancelled order" });
  res.json(await repo.completeOrder(orderId));
}));

customersRouter.post("/allocation/run", asyncHandler(async (_req, res) => {
  await repo.runStockAllocation();
  res.json({ success: true, message: "Stock allocation completed" });
}));

import { db } from "../../db";
import { customersRepository as repo } from "./repository";
import { createAuditLog } from "../../lib/auditLog";
import { inventoryRepository } from "../inventory/repository";
import { orderItems, orders, auditLogs } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import type { Customer, InsertCustomer, Order, InsertOrder, OrderItem, InsertOrderItem, StockMovement } from "@shared/schema";

export const customersService = {
  getCustomers: repo.getCustomers.bind(repo),
  getCustomer: repo.getCustomer.bind(repo),

  async createCustomer(data: InsertCustomer): Promise<Customer> {
    const created = await repo.createCustomerRaw(data);
    await createAuditLog({ entityType: "customer", entityId: created.id, action: "create", changes: JSON.stringify(data) });
    return created;
  },

  async updateCustomer(id: string, data: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const updated = await repo.updateCustomerRaw(id, data);
    if (updated) {
      await createAuditLog({ entityType: "customer", entityId: id, action: "update", changes: JSON.stringify(data) });
    }
    return updated;
  },

  async deleteCustomer(id: string): Promise<void> {
    await repo.deleteCustomerRaw(id);
    await createAuditLog({ entityType: "customer", entityId: id, action: "delete", changes: JSON.stringify({ deleted: true }) });
  },

  getOrders: repo.getOrders.bind(repo),
  getOrder: repo.getOrder.bind(repo),

  async createOrder(data: InsertOrder): Promise<Order> {
    const created = await repo.createOrderRaw(data);
    await createAuditLog({ entityType: "order", entityId: created.id, action: "create", changes: JSON.stringify(data) });
    await customersService.runStockAllocation();
    return created;
  },

  async updateOrder(id: string, data: Partial<InsertOrder>): Promise<Order | undefined> {
    const updated = await repo.updateOrderRaw(id, data);
    if (updated) {
      await createAuditLog({ entityType: "order", entityId: id, action: "update", changes: JSON.stringify(data) });
    }
    return updated;
  },

  async deleteOrder(id: string): Promise<void> {
    await repo.deleteOrderRaw(id);
    await createAuditLog({ entityType: "order", entityId: id, action: "delete", changes: JSON.stringify({ deleted: true }) });
    await customersService.runStockAllocation();
  },

  getOrderItems: repo.getOrderItems.bind(repo),

  async createOrderItem(data: InsertOrderItem): Promise<OrderItem> {
    const created = await repo.createOrderItemRaw(data);
    await customersService.runStockAllocation();
    return created;
  },

  async deleteOrderItem(id: string): Promise<void> {
    await repo.deleteOrderItemRaw(id);
    await customersService.runStockAllocation();
  },

  async completeOrder(orderId: string): Promise<{ order: Order; movements: StockMovement[] }> {
    const order = await repo.getOrder(orderId);
    if (!order) throw new Error("Order not found");

    const items = await repo.getOrderItems(orderId);
    const createdMovements: StockMovement[] = [];

    for (const item of items) {
      const product = await repo.getProductById(item.productId);
      if (!product) continue;

      const quantity = parseFloat(item.quantity);
      const newStock = parseFloat(product.currentStock) - quantity;
      await repo.updateProductStock(item.productId, newStock.toFixed(3));

      const movement = await inventoryRepository.createStockMovement({
        movementType: "shipment",
        productId: item.productId,
        orderId: orderId,
        quantity: `-${quantity.toFixed(3)}`,
        reference: `Order ${order.orderNumber} completed - shipped to ${order.customerName}`,
      });
      createdMovements.push(movement);
    }

    const updatedOrder = await repo.updateOrderStatus(orderId, "shipped");
    await createAuditLog({ entityType: "order", entityId: orderId, action: "complete", changes: JSON.stringify({ status: "shipped", itemsShipped: items.length }) });
    await customersService.runStockAllocation();

    return { order: updatedOrder, movements: createdMovements };
  },

  async runStockAllocation(): Promise<void> {
    // Direct db.transaction used here: allocation reads then writes across orders/items
    // and must be atomic. The tx context is threaded through all sub-queries directly.
    await db.transaction(async (tx) => {
      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
      const activeOrders = await tx.select().from(orders)
        .where(sql`${orders.status} IN ('pending', 'in_production')`);

      const sortedOrders = [...activeOrders].sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

      const allProducts = await repo.getAllProducts();
      const productStock: Record<string, number> = {};
      for (const p of allProducts) {
        productStock[p.id] = parseFloat(p.currentStock);
      }

      await tx.update(orderItems).set({ reservedQuantity: "0" });

      for (const order of sortedOrders) {
        const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        for (const item of items) {
          const availableStock = productStock[item.productId] || 0;
          const requested = parseFloat(item.quantity);
          const allocated = Math.min(availableStock, requested);
          if (allocated > 0) {
            await tx.update(orderItems).set({ reservedQuantity: allocated.toFixed(3) }).where(eq(orderItems.id, item.id));
            productStock[item.productId] = availableStock - allocated;
          }
        }
      }

      await tx.insert(auditLogs).values({
        entityType: "system",
        entityId: "allocation",
        action: "run_allocation",
        changes: JSON.stringify({ ordersProcessed: sortedOrders.length }),
      });
    });
  },

  async getOrdersWithAllocation() {
    await customersService.runStockAllocation();
    const ordersWithItems = await repo.getOrdersWithItems();
    return ordersWithItems.map(order => {
      let allocationStatus = "awaiting_stock";
      if (order.status === "shipped") {
        allocationStatus = "shipped";
      } else if (order.status === "cancelled") {
        allocationStatus = "cancelled";
      } else if (order.items.length > 0) {
        const fullyAllocated = order.items.every(i => parseFloat(i.reservedQuantity) >= parseFloat(i.quantity));
        const partiallyAllocated = order.items.some(i => parseFloat(i.reservedQuantity) > 0);
        if (fullyAllocated) allocationStatus = "ready_to_ship";
        else if (partiallyAllocated) allocationStatus = "partially_allocated";
      }
      return { ...order, allocationStatus };
    });
  },
};

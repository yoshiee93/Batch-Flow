import { db } from "../../db";
import { customersRepository as repo } from "./repository";
import { createAuditLog } from "../../lib/auditLog";
import { inventoryRepository } from "../inventory/repository";
import { orderItems, orders, auditLogs, products, lots } from "@shared/schema";
import { eq, sql, and, gt, or, isNull } from "drizzle-orm";
import type { Customer, InsertCustomer, Order, InsertOrder, OrderItem, InsertOrderItem, StockMovement } from "@shared/schema";

export class TestingRequiredError extends Error {
  code = "TESTING_REQUIRED";
  blockingLots: { lotId: string; lotNumber: string; productId: string; productName: string; testingStatus: string }[];
  constructor(blockingLots: TestingRequiredError["blockingLots"]) {
    super("Cannot complete order: customer requires testing and one or more lots have not passed testing");
    this.blockingLots = blockingLots;
  }
}

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

  async getOrderTestingBlockers(orderId: string) {
    const order = await repo.getOrder(orderId);
    if (!order || !order.customerId) return [];
    const customer = await repo.getCustomer(order.customerId);
    if (!customer || !customer.requiresTesting) return [];

    const items = await repo.getOrderItems(orderId);
    const productIds = Array.from(new Set(items.map(i => i.productId)));
    if (productIds.length === 0) return [];

    const blockers: { lotId: string; lotNumber: string; productId: string; productName: string; testingStatus: string }[] = [];

    for (const item of items) {
      const candidateLots = await db.select().from(lots).where(
        and(
          eq(lots.productId, item.productId),
          eq(lots.lotType, "finished_good"),
          eq(lots.status, "active"),
          or(eq(lots.customerId, order.customerId), isNull(lots.customerId)),
          gt(lots.remainingQuantity, "0"),
        )
      );
      candidateLots.sort((a, b) => new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime());
      let needed = parseFloat(item.quantity);
      const product = await repo.getProductById(item.productId);
      const productName = product?.name ?? item.productId;
      for (const lot of candidateLots) {
        if (needed <= 0) break;
        const remaining = parseFloat(lot.remainingQuantity);
        if (remaining <= 0) continue;
        if (lot.testingStatus !== "passed") {
          blockers.push({
            lotId: lot.id,
            lotNumber: lot.lotNumber,
            productId: item.productId,
            productName,
            testingStatus: lot.testingStatus,
          });
        }
        needed -= remaining;
      }
    }
    return blockers;
  },

  async completeOrder(orderId: string): Promise<{ order: Order; movements: StockMovement[] }> {
    const order = await repo.getOrder(orderId);
    if (!order) throw new Error("Order not found");

    if (order.customerId) {
      const customer = await repo.getCustomer(order.customerId);
      if (customer?.requiresTesting) {
        const blockers = await customersService.getOrderTestingBlockers(orderId);
        if (blockers.length > 0) {
          throw new TestingRequiredError(blockers);
        }
      }
    }

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

      const allProducts = await tx.select().from(products);
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
    const allCustomers = await repo.getCustomers();
    const customerById = new Map(allCustomers.map(c => [c.id, c]));
    const result = [] as ((typeof ordersWithItems)[number] & {
      allocationStatus: string;
      customerRequiresTesting: boolean;
      testingBlockers: { lotId: string; lotNumber: string; productId: string; productName: string; testingStatus: string }[];
    })[];
    for (const order of ordersWithItems) {
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
      const customer = order.customerId ? customerById.get(order.customerId) : undefined;
      const customerRequiresTesting = !!customer?.requiresTesting;
      let testingBlockers: { lotId: string; lotNumber: string; productId: string; productName: string; testingStatus: string }[] = [];
      if (customerRequiresTesting && order.status !== "shipped" && order.status !== "cancelled") {
        testingBlockers = await customersService.getOrderTestingBlockers(order.id);
      }
      result.push({ ...order, allocationStatus, customerRequiresTesting, testingBlockers });
    }
    return result;
  },
};

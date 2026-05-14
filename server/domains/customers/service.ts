import { db } from "../../db";
import { customersRepository as repo } from "./repository";
import { createAuditLog } from "../../lib/auditLog";
import { inventoryRepository } from "../inventory/repository";
import { orderItems, orders, orderItemAllocations, auditLogs, products, lots } from "@shared/schema";
import { eq, sql, and, gt, or, isNull, asc } from "drizzle-orm";
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
          blockers.push({ lotId: lot.id, lotNumber: lot.lotNumber, productId: item.productId, productName, testingStatus: lot.testingStatus });
        }
        needed -= remaining;
      }
    }
    return blockers;
  },

  async getOrderStockCheck(orderId: string) {
    const order = await repo.getOrder(orderId);
    if (!order) throw new Error("Order not found");
    const items = await repo.getOrderItems(orderId);

    const itemChecks = [];
    for (const item of items) {
      const product = await repo.getProductById(item.productId);
      const productName = product?.name ?? item.productId;
      const unit = product?.unit ?? "";

      const availableLots = await repo.getAvailableLotsForProduct(item.productId);
      const totalAvailable = availableLots.reduce((sum, l) => sum + parseFloat(l.remainingQuantity), 0);
      const required = parseFloat(item.quantity);
      const shortfall = Math.max(0, required - totalAvailable);

      itemChecks.push({
        orderItemId: item.id,
        productId: item.productId,
        productName,
        unit,
        required,
        available: totalAvailable,
        shortfall,
        availableLots: availableLots.map(l => ({
          lotId: l.id,
          lotNumber: l.lotNumber,
          remainingQuantity: parseFloat(l.remainingQuantity),
          expiryDate: l.expiryDate,
          producedDate: l.producedDate,
          receivedDate: l.receivedDate,
          status: l.status,
        })),
      });
    }

    const allAvailable = itemChecks.every(c => c.shortfall === 0);
    const hasAnyAvailable = itemChecks.some(c => c.available > 0);
    return { allAvailable, hasAnyAvailable, items: itemChecks };
  },

  async packOrder(
    orderId: string,
    allocations: { orderItemId: string; lotId: string; quantityAllocated: number }[],
    userId?: string,
  ): Promise<Order> {
    return db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
      if (!order) throw new Error("Order not found");
      if (order.status === "shipped" || order.status === "completed" || order.status === "cancelled") {
        throw new Error("Cannot pack an order that is shipped, completed, or cancelled");
      }

      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));

      // Restore lot quantities from any previous allocations (re-pack support)
      const existingAllocs = await tx.select().from(orderItemAllocations).where(eq(orderItemAllocations.orderId, orderId));
      for (const prev of existingAllocs) {
        const prevQty = parseFloat(prev.quantityAllocated);
        const [lot] = await tx.select().from(lots).where(eq(lots.id, prev.lotId));
        if (lot) {
          const restoredRemaining = parseFloat(lot.remainingQuantity) + prevQty;
          await tx.update(lots)
            .set({ remainingQuantity: restoredRemaining.toFixed(3), status: restoredRemaining > 0 ? "active" : lot.status })
            .where(eq(lots.id, prev.lotId));
        }
        // Restore product stock
        const [prod] = await tx.select().from(products).where(eq(products.id, prev.productId));
        if (prod) {
          const restoredStock = parseFloat(prod.currentStock) + prevQty;
          await tx.update(products).set({ currentStock: restoredStock.toFixed(3) }).where(eq(products.id, prev.productId));
        }
      }

      // Remove existing allocations
      await tx.delete(orderItemAllocations).where(eq(orderItemAllocations.orderId, orderId));

      // Validate and apply new allocations
      for (const alloc of allocations) {
        if (alloc.quantityAllocated <= 0) continue;

        const item = items.find(i => i.id === alloc.orderItemId);
        if (!item) throw new Error(`Order item ${alloc.orderItemId} not found in order`);

        const [lot] = await tx.select().from(lots).where(eq(lots.id, alloc.lotId));
        if (!lot) throw new Error(`Lot ${alloc.lotId} not found`);
        if (lot.status !== "active") throw new Error(`Lot ${lot.lotNumber} is not active`);

        // Integrity check: ensure lot belongs to the correct product
        if (lot.productId !== item.productId) {
          throw new Error(`Lot ${lot.lotNumber} is not a lot of the allocated product — cross-product allocation is not allowed`);
        }

        const remaining = parseFloat(lot.remainingQuantity);
        if (alloc.quantityAllocated > remaining + 0.001) {
          throw new Error(`Cannot allocate ${alloc.quantityAllocated} from lot ${lot.lotNumber}: only ${remaining} remaining`);
        }

        await tx.insert(orderItemAllocations).values({
          orderId,
          orderItemId: alloc.orderItemId,
          productId: item.productId,
          lotId: alloc.lotId,
          quantityAllocated: alloc.quantityAllocated.toFixed(3),
          packedBy: userId ?? null,
        });

        const newRemaining = Math.max(0, remaining - alloc.quantityAllocated);
        await tx.update(lots)
          .set({ remainingQuantity: newRemaining.toFixed(3), status: newRemaining <= 0 ? "consumed" : "active" })
          .where(eq(lots.id, alloc.lotId));

        // Also deduct from product.currentStock to keep in sync
        const [prod] = await tx.select().from(products).where(eq(products.id, item.productId));
        if (prod) {
          const newStock = Math.max(0, parseFloat(prod.currentStock) - alloc.quantityAllocated);
          await tx.update(products).set({ currentStock: newStock.toFixed(3) }).where(eq(products.id, item.productId));
        }
      }

      // Determine packed status
      const totalByItem: Record<string, number> = {};
      for (const alloc of allocations) {
        if (!totalByItem[alloc.orderItemId]) totalByItem[alloc.orderItemId] = 0;
        totalByItem[alloc.orderItemId] += alloc.quantityAllocated;
      }

      const fullyPacked = items.every(item => (totalByItem[item.id] ?? 0) >= parseFloat(item.quantity) - 0.001);
      const anyAllocated = allocations.some(a => a.quantityAllocated > 0);

      let newStatus: "packed" | "partially_packed" | "pending";
      if (fullyPacked) newStatus = "packed";
      else if (anyAllocated) newStatus = "partially_packed";
      else newStatus = "pending";

      const [updatedOrder] = await tx.update(orders)
        .set({ status: newStatus as Order["status"] })
        .where(eq(orders.id, orderId))
        .returning();

      await tx.insert(auditLogs).values({
        entityType: "order",
        entityId: orderId,
        action: "pack",
        changes: JSON.stringify({ status: newStatus, allocations: allocations.length }),
        userId: userId ?? null,
      });

      return updatedOrder;
    });
  },

  async shipOrder(
    orderId: string,
    data: { shippingCarrier?: string; trackingReference?: string; shippedAt?: Date },
    userId?: string,
  ): Promise<{ order: Order; movements: StockMovement[] }> {
    const order = await repo.getOrder(orderId);
    if (!order) throw new Error("Order not found");
    if (order.status !== "packed") throw new Error("Order must be fully packed before shipping");

    const allAllocations = await repo.getOrderAllocations(orderId);
    const createdMovements: StockMovement[] = [];

    for (const alloc of allAllocations) {
      const movement = await inventoryRepository.createStockMovement({
        movementType: "shipment",
        productId: alloc.productId,
        lotId: alloc.lotId,
        orderId,
        quantity: `-${parseFloat(alloc.quantityAllocated).toFixed(3)}`,
        reference: `Order ${order.orderNumber} shipped to ${order.customerName}`,
        createdBy: userId ?? null,
      });
      createdMovements.push(movement);
    }

    const shippedAt = data.shippedAt ?? new Date();
    const [updatedOrder] = await db.update(orders)
      .set({
        status: "shipped" as Order["status"],
        shippedAt,
        shippingCarrier: data.shippingCarrier ?? null,
        trackingReference: data.trackingReference ?? null,
      })
      .where(eq(orders.id, orderId))
      .returning();

    await createAuditLog({
      entityType: "order",
      entityId: orderId,
      action: "ship",
      changes: JSON.stringify({ status: "shipped", shippedAt, carrier: data.shippingCarrier }),
    });

    await customersService.runStockAllocation();
    return { order: updatedOrder, movements: createdMovements };
  },

  async completeOrder(orderId: string): Promise<{ order: Order; movements: StockMovement[] }> {
    const order = await repo.getOrder(orderId);
    if (!order) throw new Error("Order not found");

    // Check if order was packed via the new workflow
    const allocations = await repo.getOrderAllocations(orderId);
    if (allocations.length > 0) {
      throw new Error("This order was packed using the new workflow. Please use 'Ship Order' instead.");
    }

    if (order.customerId) {
      const customer = await repo.getCustomer(order.customerId);
      if (customer?.requiresTesting) {
        const blockers = await customersService.getOrderTestingBlockers(orderId);
        if (blockers.length > 0) throw new TestingRequiredError(blockers);
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
        orderId,
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
    await db.transaction(async (tx) => {
      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
      const activeOrders = await tx.select().from(orders)
        .where(sql`${orders.status} IN ('pending', 'in_production', 'ready')`);

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

      if (order.status === "shipped" || order.status === "completed") {
        allocationStatus = "shipped";
      } else if (order.status === "cancelled") {
        allocationStatus = "cancelled";
      } else if (order.status === "packed") {
        allocationStatus = "packed";
      } else if (order.status === "partially_packed") {
        allocationStatus = "partially_packed";
      } else if (order.items.length > 0) {
        const fullyAllocated = order.items.every(i => parseFloat(i.reservedQuantity) >= parseFloat(i.quantity));
        const partiallyAllocated = order.items.some(i => parseFloat(i.reservedQuantity) > 0);
        if (fullyAllocated) allocationStatus = "ready_to_ship";
        else if (partiallyAllocated) allocationStatus = "partially_allocated";
      }

      const customer = order.customerId ? customerById.get(order.customerId) : undefined;
      const customerRequiresTesting = !!customer?.requiresTesting;
      let testingBlockers: { lotId: string; lotNumber: string; productId: string; productName: string; testingStatus: string }[] = [];
      if (customerRequiresTesting && order.status !== "shipped" && order.status !== "completed" && order.status !== "cancelled") {
        testingBlockers = await customersService.getOrderTestingBlockers(order.id);
      }
      result.push({ ...order, allocationStatus, customerRequiresTesting, testingBlockers });
    }
    return result;
  },
};

import { eq, desc, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  customers, orders, orderItems, products,
  type Customer, type InsertCustomer,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
} from "@shared/schema";

export const customersRepository = {
  async getCustomers(): Promise<Customer[]> {
    return db.select().from(customers).where(eq(customers.active, true)).orderBy(customers.name);
  },

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [row] = await db.select().from(customers).where(eq(customers.id, id));
    return row;
  },

  async createCustomerRaw(data: InsertCustomer): Promise<Customer> {
    const [created] = await db.insert(customers).values(data).returning();
    return created;
  },

  async updateCustomerRaw(id: string, data: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updated] = await db.update(customers).set(data).where(eq(customers.id, id)).returning();
    return updated;
  },

  async deleteCustomerRaw(id: string): Promise<void> {
    await db.update(customers).set({ active: false }).where(eq(customers.id, id));
  },

  async getOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  },

  async getOrder(id: string): Promise<Order | undefined> {
    const [row] = await db.select().from(orders).where(eq(orders.id, id));
    return row;
  },

  async createOrderRaw(data: InsertOrder): Promise<Order> {
    const [created] = await db.insert(orders).values(data).returning();
    return created;
  },

  async updateOrderRaw(id: string, data: Partial<InsertOrder>): Promise<Order | undefined> {
    const [updated] = await db.update(orders).set(data).where(eq(orders.id, id)).returning();
    return updated;
  },

  async deleteOrderRaw(id: string): Promise<void> {
    await db.delete(orderItems).where(eq(orderItems.orderId, id));
    await db.delete(orders).where(eq(orders.id, id));
  },

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  },

  async createOrderItemRaw(data: InsertOrderItem): Promise<OrderItem> {
    const [created] = await db.insert(orderItems).values(data).returning();
    return created;
  },

  async deleteOrderItemRaw(id: string): Promise<void> {
    await db.delete(orderItems).where(eq(orderItems.id, id));
  },

  async getOrdersWithItems(): Promise<(Order & { items: (OrderItem & { productName: string })[] })[]> {
    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
    const result = [];
    for (const order of allOrders) {
      const rows = await db
        .select({ orderItem: orderItems, product: products })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, order.id));
      result.push({
        ...order,
        items: rows.map(r => ({ ...r.orderItem, productName: r.product.name })),
      });
    }
    return result;
  },

  async getAllProducts() {
    return db.select().from(products);
  },

  async getActiveOrders(): Promise<Order[]> {
    return db.select().from(orders)
      .where(sql`${orders.status} IN ('pending', 'in_production')`);
  },

  async getProductById(productId: string) {
    const [row] = await db.select().from(products).where(eq(products.id, productId));
    return row;
  },

  async updateProductStock(productId: string, newStock: string): Promise<void> {
    await db.update(products).set({ currentStock: newStock }).where(eq(products.id, productId));
  },

  async updateOrderStatus(id: string, status: "pending" | "in_production" | "ready" | "shipped" | "cancelled"): Promise<Order> {
    const [updated] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    return updated;
  },

  async resetOrderItemReservations(): Promise<void> {
    await db.update(orderItems).set({ reservedQuantity: "0" });
  },

  async updateOrderItemReservation(id: string, reservedQuantity: string): Promise<void> {
    await db.update(orderItems).set({ reservedQuantity }).where(eq(orderItems.id, id));
  },

  async getOrderItemsForOrder(orderId: string): Promise<OrderItem[]> {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  },
};

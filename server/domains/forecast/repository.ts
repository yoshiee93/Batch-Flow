import { eq, desc, and, gte, lte, sql, inArray } from "drizzle-orm";
import { db } from "../../db";
import {
  forecastOrders, customers, products, orderItems, orders, batchOutputs,
  type ForecastOrder, type InsertForecastOrder, type Customer, type Product,
} from "@shared/schema";

export interface ForecastOrderWithRefs extends ForecastOrder {
  customerName: string;
  productName: string;
  productUnit: string;
}

const ACTIVE_STATUSES = ["Draft", "Likely", "Confirmed Forecast"] as const;

export const forecastRepository = {
  async list(opts: { from?: Date; to?: Date; status?: string } = {}): Promise<ForecastOrderWithRefs[]> {
    const conds = [] as any[];
    if (opts.from) conds.push(gte(forecastOrders.expectedDate, opts.from));
    if (opts.to) conds.push(lte(forecastOrders.expectedDate, opts.to));
    if (opts.status) conds.push(eq(forecastOrders.status, opts.status as any));
    const where = conds.length > 0 ? and(...conds) : undefined;
    const rows = await db
      .select({ f: forecastOrders, c: customers, p: products })
      .from(forecastOrders)
      .leftJoin(customers, eq(forecastOrders.customerId, customers.id))
      .leftJoin(products, eq(forecastOrders.productId, products.id))
      .where(where as any)
      .orderBy(desc(forecastOrders.expectedDate));
    return rows.map(r => ({
      ...r.f,
      customerName: r.c?.name ?? "",
      productName: r.p?.name ?? "",
      productUnit: r.p?.unit ?? "KG",
    }));
  },

  async get(id: string): Promise<ForecastOrder | undefined> {
    const [row] = await db.select().from(forecastOrders).where(eq(forecastOrders.id, id));
    return row;
  },

  async create(data: InsertForecastOrder): Promise<ForecastOrder> {
    const [created] = await db.insert(forecastOrders).values(data).returning();
    return created;
  },

  async update(id: string, data: Partial<InsertForecastOrder>): Promise<ForecastOrder | undefined> {
    const [updated] = await db.update(forecastOrders).set({ ...data, updatedAt: new Date() }).where(eq(forecastOrders.id, id)).returning();
    return updated;
  },

  async delete(id: string): Promise<void> {
    await db.delete(forecastOrders).where(eq(forecastOrders.id, id));
  },

  async markConverted(id: string, convertedOrderId: string): Promise<ForecastOrder | undefined> {
    const [updated] = await db.update(forecastOrders)
      .set({ status: "Converted", convertedOrderId, convertedAt: new Date(), updatedAt: new Date() })
      .where(eq(forecastOrders.id, id))
      .returning();
    return updated;
  },

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [row] = await db.select().from(customers).where(eq(customers.id, id));
    return row;
  },

  async getProduct(id: string): Promise<Product | undefined> {
    const [row] = await db.select().from(products).where(eq(products.id, id));
    return row;
  },

  async getOrdersInRange(productId: string | undefined, from: Date, to: Date, customerId?: string): Promise<{ productId: string; createdAt: Date; quantity: string; customerId: string | null; orderNumber: string }[]> {
    const conds = [gte(orders.createdAt, from), lte(orders.createdAt, to)] as any[];
    if (productId) conds.push(eq(orderItems.productId, productId));
    if (customerId) conds.push(eq(orders.customerId, customerId));
    const rows = await db
      .select({ productId: orderItems.productId, createdAt: orders.createdAt, quantity: orderItems.quantity, customerId: orders.customerId, orderNumber: orders.orderNumber })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(...conds));
    return rows;
  },

  async getOutputsInRange(productId: string | undefined, from: Date, to: Date): Promise<{ productId: string; addedAt: Date; quantity: string }[]> {
    const conds = [gte(batchOutputs.addedAt, from), lte(batchOutputs.addedAt, to)] as any[];
    if (productId) conds.push(eq(batchOutputs.productId, productId));
    const rows = await db
      .select({ productId: batchOutputs.productId, addedAt: batchOutputs.addedAt, quantity: batchOutputs.quantity })
      .from(batchOutputs)
      .where(and(...conds));
    return rows;
  },

  async getForecastsInRange(productId: string | undefined, from: Date, to: Date): Promise<{ productId: string; expectedDate: Date; quantity: string; status: string }[]> {
    const conds = [gte(forecastOrders.expectedDate, from), lte(forecastOrders.expectedDate, to)] as any[];
    if (productId) conds.push(eq(forecastOrders.productId, productId));
    const rows = await db
      .select({ productId: forecastOrders.productId, expectedDate: forecastOrders.expectedDate, quantity: forecastOrders.quantity, status: forecastOrders.status })
      .from(forecastOrders)
      .where(and(...conds));
    return rows;
  },

  async getReservedByProduct(): Promise<Map<string, number>> {
    const rows = await db
      .select({
        productId: orderItems.productId,
        reserved: sql<string>`COALESCE(SUM(${orderItems.reservedQuantity}), 0)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(sql`${orders.status} IN ('pending', 'in_production', 'ready')`)
      .groupBy(orderItems.productId);
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.productId, parseFloat(r.reserved ?? "0"));
    return map;
  },

  async getOrderedQtyByProduct(): Promise<Map<string, number>> {
    const rows = await db
      .select({
        productId: orderItems.productId,
        orderedQty: sql<string>`COALESCE(SUM(${orderItems.quantity}), 0)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(sql`${orders.status} IN ('pending', 'in_production', 'ready')`)
      .groupBy(orderItems.productId);
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.productId, parseFloat(r.orderedQty ?? "0"));
    return map;
  },

  async getActiveOrderLines(from: Date, to: Date): Promise<{
    id: string;
    orderId: string;
    orderNumber: string;
    orderStatus: string;
    customerId: string | null;
    customerName: string;
    productId: string;
    productName: string;
    productUnit: string;
    quantity: string;
    dueDate: Date;
  }[]> {
    const rows = await db
      .select({
        id: orderItems.id,
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        orderStatus: orders.status,
        customerId: orders.customerId,
        customerName: orders.customerName,
        productId: orderItems.productId,
        productName: products.name,
        productUnit: products.unit,
        quantity: orderItems.quantity,
        dueDate: orders.dueDate,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(
        and(
          sql`${orders.status} IN ('pending', 'in_production', 'ready')`,
          gte(orders.dueDate, from),
          lte(orders.dueDate, to),
        )
      )
      .orderBy(orders.dueDate);
    return rows;
  },

  getActiveStatuses() {
    return ACTIVE_STATUSES;
  },
};

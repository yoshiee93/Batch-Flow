import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
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

export const forecastRepository = {
  async list(opts: { from?: Date; to?: Date; status?: "open" | "converted" | "archived" } = {}): Promise<ForecastOrderWithRefs[]> {
    const conds = [] as any[];
    if (opts.from) conds.push(gte(forecastOrders.expectedDate, opts.from));
    if (opts.to) conds.push(lte(forecastOrders.expectedDate, opts.to));
    if (opts.status) conds.push(eq(forecastOrders.status, opts.status));
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
      .set({ status: "converted", convertedOrderId, updatedAt: new Date() })
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

  async getOrdersInRange(productId: string | undefined, from: Date, to: Date): Promise<{ productId: string; createdAt: Date; quantity: string }[]> {
    const conds = [gte(orders.createdAt, from), lte(orders.createdAt, to)] as any[];
    if (productId) conds.push(eq(orderItems.productId, productId));
    const rows = await db
      .select({ productId: orderItems.productId, createdAt: orders.createdAt, quantity: orderItems.quantity })
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
};

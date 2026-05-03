import { eq, and } from "drizzle-orm";
import { db } from "../../db";
import { forecastOrders } from "@shared/schema";
import { forecastRepository as repo } from "./repository";
import { customersService } from "../customers/service";
import { createAuditLog } from "../../lib/auditLog";
import type { InsertForecastOrder, ForecastOrder, Order } from "@shared/schema";

function rangeFromMonths(months: 3 | 6 | 12): { from: Date; to: Date } {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setMonth(to.getMonth() + months);
  return { from, to };
}

export const forecastService = {
  list: repo.list.bind(repo),
  get: repo.get.bind(repo),

  async create(data: InsertForecastOrder): Promise<ForecastOrder> {
    const created = await repo.create(data);
    await createAuditLog({ entityType: "forecast_order", entityId: created.id, action: "create", changes: JSON.stringify(data) });
    return created;
  },

  async update(id: string, data: Partial<InsertForecastOrder>): Promise<ForecastOrder | undefined> {
    const updated = await repo.update(id, data);
    if (updated) {
      await createAuditLog({ entityType: "forecast_order", entityId: id, action: "update", changes: JSON.stringify(data) });
    }
    return updated;
  },

  async delete(id: string): Promise<void> {
    await repo.delete(id);
    await createAuditLog({ entityType: "forecast_order", entityId: id, action: "delete", changes: JSON.stringify({ deleted: true }) });
  },

  async history(opts: { productId?: string; customerId?: string; monthsBack?: number; from?: Date; to?: Date }) {
    let from: Date;
    let to: Date;
    if (opts.from && opts.to) {
      from = opts.from;
      to = opts.to;
    } else {
      const monthsBack = Math.max(1, Math.min(24, opts.monthsBack ?? 6));
      const now = new Date();
      to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
      from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, 1, 0, 0, 0, 0));
    }

    const [pastForecasts, pastOrders, pastOutputs] = await Promise.all([
      repo.getForecastsInRange(opts.productId, from, to),
      repo.getOrdersInRange(opts.productId, from, to, opts.customerId),
      repo.getOutputsInRange(opts.productId, from, to),
    ]);

    const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const buckets = new Map<string, { month: string; forecastQty: number; orderQty: number; producedQty: number }>();
    const ensure = (k: string) => {
      if (!buckets.has(k)) buckets.set(k, { month: k, forecastQty: 0, orderQty: 0, producedQty: 0 });
      return buckets.get(k)!;
    };
    const cursor = new Date(from);
    while (cursor <= to) {
      ensure(monthKey(cursor));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    for (const f of pastForecasts) ensure(monthKey(new Date(f.expectedDate))).forecastQty += parseFloat(f.quantity);
    for (const o of pastOrders) ensure(monthKey(new Date(o.createdAt))).orderQty += parseFloat(o.quantity);
    for (const b of pastOutputs) ensure(monthKey(new Date(b.addedAt))).producedQty += parseFloat(b.quantity);

    // Weekly buckets keyed by ISO week start (Monday) in UTC
    const weekStart = (d: Date): string => {
      const u = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      const dow = u.getUTCDay() || 7;
      u.setUTCDate(u.getUTCDate() - (dow - 1));
      return u.toISOString().slice(0, 10);
    };
    const weeks = new Map<string, { weekStart: string; forecastQty: number; orderQty: number; producedQty: number }>();
    const ensureW = (k: string) => {
      if (!weeks.has(k)) weeks.set(k, { weekStart: k, forecastQty: 0, orderQty: 0, producedQty: 0 });
      return weeks.get(k)!;
    };
    for (const f of pastForecasts) ensureW(weekStart(new Date(f.expectedDate))).forecastQty += parseFloat(f.quantity);
    for (const o of pastOrders) ensureW(weekStart(new Date(o.createdAt))).orderQty += parseFloat(o.quantity);
    for (const b of pastOutputs) ensureW(weekStart(new Date(b.addedAt))).producedQty += parseFloat(b.quantity);

    const product = opts.productId ? await repo.getProduct(opts.productId) : undefined;
    return {
      productId: opts.productId ?? null,
      productName: product?.name ?? null,
      unit: product?.unit ?? null,
      from: from.toISOString(),
      to: to.toISOString(),
      months: Array.from(buckets.values()).sort((a, b) => a.month.localeCompare(b.month)),
      weeks: Array.from(weeks.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
    };
  },

  async summary(months: 3 | 6 | 12) {
    const { from, to } = rangeFromMonths(months);
    const forecasts = await repo.list({ from, to, status: "open" });
    const reservedMap = await repo.getReservedByProduct();

    const byProduct = new Map<string, { productId: string; productName: string; unit: string; demand: number; currentStock: number; reserved: number; shortfall: number }>();
    for (const f of forecasts) {
      const key = f.productId;
      const qty = parseFloat(f.quantity);
      if (!byProduct.has(key)) {
        const p = await repo.getProduct(key);
        byProduct.set(key, {
          productId: key,
          productName: p?.name ?? f.productName,
          unit: p?.unit ?? f.productUnit,
          demand: 0,
          currentStock: parseFloat(p?.currentStock ?? "0"),
          reserved: reservedMap.get(key) ?? 0,
          shortfall: 0,
        });
      }
      byProduct.get(key)!.demand += qty;
    }
    const productList = Array.from(byProduct.values());
    for (const v of productList) {
      v.shortfall = Math.max(0, v.demand + v.reserved - v.currentStock);
    }
    return {
      months,
      from: from.toISOString(),
      to: to.toISOString(),
      products: productList.sort((a, b) => b.shortfall - a.shortfall || b.demand - a.demand),
    };
  },

  async convert(id: string, opts: { orderNumber: string; dueDate: Date; priority?: "low" | "normal" | "high" | "urgent"; poNumber?: string | null; notes?: string | null }): Promise<{ forecast: ForecastOrder; order: Order }> {
    return await db.transaction(async (tx) => {
      const [claimed] = await tx
        .update(forecastOrders)
        .set({ status: "converted", updatedAt: new Date() })
        .where(and(eq(forecastOrders.id, id), eq(forecastOrders.status, "open")))
        .returning();
      if (!claimed) {
        const existing = await repo.get(id);
        if (!existing) throw new Error("Forecast not found");
        throw new Error("Forecast is not open and cannot be converted");
      }

      const customer = await repo.getCustomer(claimed.customerId);
      if (!customer) throw new Error("Customer not found");

      const order = await customersService.createOrder({
        orderNumber: opts.orderNumber,
        customerId: claimed.customerId,
        customerName: customer.name,
        status: "pending",
        priority: opts.priority ?? "normal",
        dueDate: opts.dueDate,
        notes: opts.notes ?? claimed.notes ?? null,
        poNumber: opts.poNumber ?? null,
        customBatchNumber: null,
        freight: null,
      } as any);

      await customersService.createOrderItem({
        orderId: order.id,
        productId: claimed.productId,
        quantity: claimed.quantity,
        reservedQuantity: "0",
      } as any);

      const [linked] = await tx
        .update(forecastOrders)
        .set({ convertedOrderId: order.id, updatedAt: new Date() })
        .where(eq(forecastOrders.id, id))
        .returning();

      await createAuditLog({
        entityType: "forecast_order",
        entityId: id,
        action: "convert",
        changes: JSON.stringify({ convertedOrderId: order.id, orderNumber: order.orderNumber }),
      });
      return { forecast: linked!, order };
    });
  },
};

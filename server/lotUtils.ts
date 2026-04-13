import { sql } from "drizzle-orm";
import { db } from "./db";
import { lots } from "@shared/schema";

export async function generateLotNumber(prefix: string = 'LOT'): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const pattern = `${prefix}-${dateStr}-%`;

  const result = await db.execute(
    sql`SELECT COUNT(*)::int AS cnt FROM lots WHERE lot_number LIKE ${pattern}`
  );
  const count = (result.rows[0] as { cnt: number }).cnt + 1;
  const seq = count.toString().padStart(4, '0');
  return `${prefix}-${dateStr}-${seq}`;
}

export async function generateBarcodeValue(): Promise<string> {
  const max = 10;
  for (let i = 0; i < max; i++) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    const candidate = `BC${timestamp}${rand}`;
    const existing = await db.execute(
      sql`SELECT id FROM lots WHERE barcode_value = ${candidate} LIMIT 1`
    );
    if ((existing.rows as any[]).length === 0) return candidate;
  }
  throw new Error("Unable to generate unique barcode value after retries");
}

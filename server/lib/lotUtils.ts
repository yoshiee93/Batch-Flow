import { sql } from "drizzle-orm";
import { db } from "../db";

type IdRow = { id: string };

export async function generateLotNumber(prefix: string = "LOT"): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const dateStr = `${year}${month}${day}`;
  const pattern = `${prefix}-${dateStr}-%`;

  // Find the highest existing sequence number for today to avoid gaps causing collisions
  const result = await db.execute(
    sql`SELECT lot_number FROM lots WHERE lot_number LIKE ${pattern} ORDER BY lot_number DESC LIMIT 1`
  );
  let next = 1;
  if (result.rows.length > 0) {
    const last = (result.rows[0] as { lot_number: string }).lot_number;
    const parts = last.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) next = lastSeq + 1;
  }

  // Retry until we find a number not already taken
  for (let attempt = 0; attempt < 100; attempt++) {
    const candidate = `${prefix}-${dateStr}-${next.toString().padStart(4, "0")}`;
    const check = await db.execute(
      sql`SELECT 1 FROM lots WHERE lot_number = ${candidate} LIMIT 1`
    );
    if (check.rows.length === 0) return candidate;
    next++;
  }
  throw new Error("Unable to generate unique lot number after retries");
}

export async function generateBarcodeValue(): Promise<string> {
  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i++) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const rand = Math.floor(Math.random() * 9999)
      .toString()
      .padStart(4, "0");
    const candidate = `BC${timestamp}${rand}`;
    const [lotCheck, batchCheck] = await Promise.all([
      db.execute(sql`SELECT id FROM lots WHERE barcode_value = ${candidate} LIMIT 1`),
      db.execute(sql`SELECT id FROM batches WHERE barcode_value = ${candidate} LIMIT 1`),
    ]);
    const lotRows = lotCheck.rows as IdRow[];
    const batchRows = batchCheck.rows as IdRow[];
    if (lotRows.length === 0 && batchRows.length === 0) return candidate;
  }
  throw new Error("Unable to generate unique barcode value after retries");
}

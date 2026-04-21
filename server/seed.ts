import { db } from "./db";
import { users } from "@shared/schema";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function resetToAdminOnly() {
  console.log("Resetting database — clearing all data and creating admin account...");

  await db.execute(sql`TRUNCATE users, products, materials, lots, recipes, recipe_items, batches, batch_materials, batch_outputs, orders, order_items, quality_checks, stock_movements, audit_logs CASCADE`);

  await db.insert(users).values({
    username: "admin",
    password: await bcrypt.hash("admin123", 10),
    fullName: "Admin User",
    role: "admin",
  });

  console.log("Done — admin / admin123 is the only account.");
}

export async function seedIfEmpty() {
  if (process.env.RESET_DB === "true") {
    console.log("RESET_DB=true — forcing database reset...");
    await resetToAdminOnly();
    return;
  }
  const existing = await db.select().from(users).limit(1);
  if (existing.length === 0) {
    await resetToAdminOnly();
  }
}

if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  resetToAdminOnly().catch(console.error).finally(() => process.exit(0));
}

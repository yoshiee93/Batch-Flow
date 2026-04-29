import { db } from "./db";
import { users, materials } from "@shared/schema";
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
  if (process.env.NODE_ENV === "production") {
    console.log("Production environment — skipping destructive seed/reset logic.");
    return;
  }

  if (process.env.RESET_DB === "true") {
    console.log("RESET_DB=true — forcing database reset (development only)...");
    await resetToAdminOnly();
    return;
  }

  const existingUsers = await db.select().from(users).limit(1);
  const existingMaterials = await db.select().from(materials).limit(1);

  if (existingUsers.length === 0 && existingMaterials.length === 0) {
    console.log("Fresh install detected (no users, no materials) — seeding admin account...");
    await resetToAdminOnly();
  }
}

if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  resetToAdminOnly().catch(console.error).finally(() => process.exit(0));
}

import { db } from "./db";
import { users, materials, batches } from "@shared/schema";
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
  const isProduction = process.env.NODE_ENV === "production";

  if (process.env.RESET_DB === "true") {
    if (isProduction) {
      console.log("RESET_DB=true is ignored in production — continuing with safe startup checks.");
    } else {
      console.log("RESET_DB=true — forcing database reset (development only)...");
      await resetToAdminOnly();
      return;
    }
  }

  const [existingUsers, existingMaterials, existingBatches] = await Promise.all([
    db.select().from(users).limit(1),
    db.select().from(materials).limit(1),
    db.select().from(batches).limit(1),
  ]);

  const isFreshInstall =
    existingUsers.length === 0 &&
    existingMaterials.length === 0 &&
    existingBatches.length === 0;

  if (isFreshInstall) {
    console.log("Fresh install detected (no users, no materials, no batches) — seeding admin account...");
    await resetToAdminOnly();
  }
}

if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  resetToAdminOnly().catch(console.error).finally(() => process.exit(0));
}

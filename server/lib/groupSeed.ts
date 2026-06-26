import { db } from "../db";
import { sql } from "drizzle-orm";
import { userGroups } from "@shared/schema";
import {
  ADMIN_PERMISSIONS,
  GENERAL_STAFF_PERMISSIONS,
  PRODUCTION_STAFF_PERMISSIONS,
  INVENTORY_STAFF_PERMISSIONS,
} from "./permissions";

export async function runGroupMigration(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_groups (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL UNIQUE,
      description text,
      permissions jsonb NOT NULL DEFAULT '{}',
      is_system boolean NOT NULL DEFAULT false,
      permissions_version integer NOT NULL DEFAULT 1,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email text`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS group_id varchar REFERENCES user_groups(id)`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until timestamp`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS session_invalidated_at timestamp`);
}

export async function seedDefaultGroups(): Promise<void> {
  await db.insert(userGroups).values([
    {
      name: "Admin",
      description: "Full access to all sections",
      permissions: ADMIN_PERMISSIONS,
      isSystem: true,
    },
    {
      name: "General Staff",
      description: "Dashboard access only by default",
      permissions: GENERAL_STAFF_PERMISSIONS,
      isSystem: true,
    },
    {
      name: "Production Staff",
      description: "Production, inventory reads, and label printing",
      permissions: PRODUCTION_STAFF_PERMISSIONS,
      isSystem: false,
    },
    {
      name: "Inventory Staff",
      description: "Inventory and stock receiving",
      permissions: INVENTORY_STAFF_PERMISSIONS,
      isSystem: false,
    },
  ]).onConflictDoNothing();

  const groups = await db.select().from(userGroups);
  const getId = (name: string) => groups.find(g => g.name === name)?.id ?? null;

  const adminId = getId("Admin");
  const staffId = getId("General Staff");
  const prodId = getId("Production Staff");
  const invId = getId("Inventory Staff");

  if (!adminId || !staffId) return;

  await db.execute(sql`UPDATE users SET group_id = ${adminId} WHERE role = 'admin' AND group_id IS NULL`);
  if (prodId) await db.execute(sql`UPDATE users SET group_id = ${prodId} WHERE role = 'production' AND group_id IS NULL`);
  if (invId) await db.execute(sql`UPDATE users SET group_id = ${invId} WHERE role = 'inventory' AND group_id IS NULL`);
  await db.execute(sql`UPDATE users SET group_id = ${staffId} WHERE group_id IS NULL`);
}

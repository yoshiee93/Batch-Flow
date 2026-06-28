import { db } from "../db";
import { sql } from "drizzle-orm";
import { userGroups } from "@shared/schema";
import { ADMIN_PERMISSIONS, GENERAL_STAFF_PERMISSIONS } from "./permissions";

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

  await db.execute(sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS drying_time_hours decimal(10,2)`);
  await db.execute(sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS drying_machine text`);
  await db.execute(sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS drying_extension_required boolean NOT NULL DEFAULT false`);
  await db.execute(sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS drying_extension_time_hours decimal(10,2)`);
  await db.execute(sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS drying_notes text`);
  await db.execute(sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS final_comments text`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS operations_log (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      source_type varchar(50) NOT NULL,
      source_id varchar NOT NULL,
      note_type varchar(50) NOT NULL,
      content text,
      severity varchar(20) NOT NULL DEFAULT 'info',
      status varchar(20) NOT NULL DEFAULT 'open',
      batch_id varchar,
      product_id varchar,
      machine varchar(100),
      batch_number varchar(100),
      product_name varchar(200),
      created_by varchar(100),
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now(),
      UNIQUE (source_type, source_id, note_type)
    )
  `);
  await db.execute(sql`ALTER TABLE operations_log ADD COLUMN IF NOT EXISTS batch_id varchar`);
  await db.execute(sql`ALTER TABLE operations_log ADD COLUMN IF NOT EXISTS product_id varchar`);
  await db.execute(sql`ALTER TABLE operations_log ADD COLUMN IF NOT EXISTS customer_id varchar`);
  await db.execute(sql`ALTER TABLE operations_log ADD COLUMN IF NOT EXISTS machine varchar(100)`);
  await db.execute(sql`ALTER TABLE operations_log ADD COLUMN IF NOT EXISTS batch_number varchar(100)`);
  await db.execute(sql`ALTER TABLE operations_log ADD COLUMN IF NOT EXISTS product_name varchar(200)`);
  await db.execute(sql`ALTER TABLE operations_log ADD COLUMN IF NOT EXISTS created_by varchar(100)`);
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
  ]).onConflictDoNothing();

  // Always ensure Admin group has every current VALID_PERMISSIONS key set to true.
  // Runs on every startup so newly added permissions propagate to existing groups.
  await db.execute(sql`
    UPDATE user_groups
    SET permissions = ${JSON.stringify(ADMIN_PERMISSIONS)}::jsonb,
        permissions_version = permissions_version + 1,
        updated_at = now()
    WHERE name = 'Admin' AND is_system = true
      AND permissions != ${JSON.stringify(ADMIN_PERMISSIONS)}::jsonb
  `);

  // For General Staff, merge any missing keys in (new keys default to false; existing values are preserved).
  await db.execute(sql`
    UPDATE user_groups
    SET permissions = ${JSON.stringify(GENERAL_STAFF_PERMISSIONS)}::jsonb || permissions,
        updated_at = now()
    WHERE name = 'General Staff' AND is_system = true
  `);

  const groups = await db.select().from(userGroups);
  const adminId = groups.find(g => g.name === "Admin")?.id ?? null;
  const staffId = groups.find(g => g.name === "General Staff")?.id ?? null;

  if (!adminId || !staffId) return;

  await db.execute(sql`UPDATE users SET group_id = ${adminId} WHERE role = 'admin' AND group_id IS NULL`);
  await db.execute(sql`UPDATE users SET group_id = ${staffId} WHERE group_id IS NULL`);
}

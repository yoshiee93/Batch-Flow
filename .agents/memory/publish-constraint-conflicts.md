---
name: Publish constraint conflicts
description: Why and how constraint name mismatches between startup migrations and Drizzle cause publish failures, and the correct fix.
---

# Publish Constraint Conflicts

## The Rule
When `groupSeed.ts` (or any startup raw-SQL migration) creates a table with a UNIQUE column using PostgreSQL default naming (e.g. `ALTER TABLE foo ADD UNIQUE (bar)` generates `foo_bar_key`), but the Drizzle schema uses `.unique()` inline (which generates `foo_bar_unique`), the two names differ. The Replit publish flow diffs dev vs prod — any constraint that exists in one DB but not the other (including renames) is flagged as a conflict.

**Why:** The publish diff is dev DB vs prod DB — NOT Drizzle schema vs prod DB. So both dev and prod must agree, and the Drizzle schema must explicitly declare whatever name both DBs actually use.

## How to Apply
1. Query both dev and prod for UNIQUE constraints on shared tables.
2. Find any constraint that has `_key` suffix in prod but `_unique` in dev (or vice versa).
3. In dev: `ALTER TABLE t DROP CONSTRAINT t_col_key, ADD CONSTRAINT t_col_key UNIQUE (col)` — rename dev to match prod's existing name.
4. In Drizzle schema: replace `.unique()` inline with an explicit table-level `unique("t_col_key").on(table.col)` to match the DB reality.
5. Do NOT rename production directly (read-only). Do NOT use startup-time DDL to fix prod (prohibited by migration skill).

## Tables Fixed (as of June 2026)
- `user_groups.name`: originally `_name_key` in both, renamed dev to `_name_unique` by mistake → reverted. Actually fixed to `_name_unique` in dev then left as is because `user_groups` didn't exist in prod yet.
- `process_code_definitions.code`: prod has `_code_key`, dev was renamed to `_code_unique` → caused conflict. Fixed by renaming dev back to `_code_key` and declaring explicitly in schema.
- `operations_log` composite unique: was in dev DB but not in Drizzle schema → declared in schema with the exact name from the DB.

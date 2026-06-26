---
name: Permission system architecture
description: How the group-based permission system works, key decisions, and where things live
---

## The rule
All API route guards now use `requirePermission("perm.key")` from `server/lib/authMiddleware.ts`, NOT `requireRole("admin")`. The role system still exists for backward compat but permissions are the authoritative gate.

**Why:** Task #146 replaced hardcoded role checks with admin-manageable groups that store granular JSON permissions. This allows non-technical admins to control access without code changes.

**How to apply:** When adding a new route, use `requirePermission("domain.action")` and add the key to `VALID_PERMISSIONS` in both `server/lib/permissions.ts` AND `shared/permissions.ts`.

## Key files
- `shared/permissions.ts` — VALID_PERMISSIONS array (source of truth for frontend GroupsTab UI)
- `server/lib/permissions.ts` — Same list + pre-built permission maps (ADMIN_PERMISSIONS etc.)
- `server/lib/groupSeed.ts` — DB migration + seed default groups (runs on startup)
- `server/lib/authMiddleware.ts` — requirePermission(), requireFreshPermissions()
- `server/domains/admin/usersRoutes.ts` — User CRUD + unlock, all require users.manage
- `server/domains/admin/groupsRoutes.ts` — Group CRUD, increments permissionsVersion on update
- `client/src/contexts/AuthContext.tsx` — usePermissions() hook, permissions_changed event
- `client/src/features/admin/UsersTab.tsx` — Admin UI for user management
- `client/src/features/admin/GroupsTab.tsx` — Admin UI with permission matrix editor

## Session storage fields
groupId, permissions (Record<string,boolean>), permissionsVersion, permissionsLastChecked, loginAt

## Backward compat
- If session has no `permissions` AND `userRole === "admin"` → all requirePermission() calls pass
- requireFreshPermissions skips /auth/* paths entirely
- Legacy users assigned to default groups by role on first startup via groupSeed.ts

## Account lockout
- 5 failed attempts → lockedUntil = now + 15min → 423 response with `unlocksAt` field
- Login.tsx shows live countdown via setInterval
- Admin can unlock via POST /api/admin/users/:id/unlock

## Permission invalidation
- Group update increments `permissionsVersion` in DB
- requireFreshPermissions checks DB version every 60s; mismatch → 401 {error:"permissions_changed"}
- Frontend dispatches `api:permissions_changed` event → logs user out → toast prompt

# Technical Debt

This file documents intentional shortcuts and known limitations in the codebase that are acceptable for now but should be revisited in future work.

---

## Frontend Type System

### Cross-domain barrel imports in multi-domain pages
**Files**: `Dashboard.tsx`, `Production.tsx`, `Inventory.tsx`, `BatchDetail.tsx`, `LotDetail.tsx`, `Orders.tsx`, `Traceability.tsx`

Pages that aggregate data from multiple domains (e.g., Production page needs products, materials, lots, recipes, and batches) import from `@/lib/api` barrel. This is intentional — these are genuinely cross-domain views and the barrel is the correct pattern. Domain-pure pages (`Settings.tsx`, `Customers.tsx`) have been updated to import from their domain api directly.

### `LotLineageResponse.sourceBatch` typed as `Record<string, unknown>`
**File**: `client/src/features/traceability/api.ts`

The `/lots/:id/lineage` endpoint returns a `sourceBatch` field whose shape varies. It has been typed as `Record<string, unknown> | null` to avoid a breaking type change. Should be typed to the actual server response shape in a future pass.

### `StockMovement.movementType` typed as `string`
**File**: `client/src/features/inventory/api.ts`

The `movementType` field in `StockMovement` uses a loose `string` type instead of the enum union `"receipt" | "production_input" | "production_output" | "adjustment" | "shipment"`. Tightening this would require updating pages that filter on this field. Deferred to avoid risk.

### `RecipeItem` augmented view-model fields
**File**: `client/src/features/catalog/api.ts`

`RecipeItem` interface includes `materialName?: string` and `materialUnit?: string` fields that don't exist in the `recipe_items` DB table. These are join-augmented by the server response and are acceptable as a view-model pattern. They are not phantom — the API actually returns them.

### `LotUsageEntry.addedAt` date serialization
**File**: `client/src/features/traceability/api.ts`

The server's `LotUsageEntry.addedAt` is typed as `Date | null` in the repository but becomes `string | null` after JSON serialization. The client correctly types this as `string | null`. This is documented here rather than abstracted to avoid unnecessary complexity.

---

## Backend Architecture

### `production/service.ts` reads directly from `inventoryRepository`
**File**: `server/domains/production/service.ts`

The production service calls `inventoryRepository.getBatchInputLots()` and `inventoryRepository.getBatchOutputLots()` directly instead of going through an inventory service interface. This is a service-boundary shortcut. The coupling is low-risk (read-only projections, no writes) but should be routed through a proper inventory service method in a future refactor.

### `getBatchInputLots` and `getBatchOutputLots` live in inventory domain
**File**: `server/domains/inventory/repository.ts`

These methods retrieve data for batch views (production domain) but live in the inventory repository because they query the `lots` table. They are exposed to production via a direct repository import, bypassing the service layer. Acceptable for now; should be surfaced as a dedicated inventory service method.

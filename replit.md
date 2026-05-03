# Gina's Table

## Overview

Gina's Table is a Manufacturing Execution System (MES) designed for chemical and process manufacturing. It manages orders, production batches, inventory (raw materials and finished goods), product recipes/BOMs, lot traceability, and quality control. The system provides comprehensive batch tracking and inventory management for complex manufacturing environments.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **UI Components**: shadcn/ui (built on Radix UI)
- **Styling**: Tailwind CSS v4
- **Build Tool**: Vite

The frontend is organized into domain feature folders (`client/src/features/{domain}/`) to mirror the backend's modular structure:
- `features/catalog/` — categories, products, materials, recipes (api.ts + Settings page)
- `features/inventory/` — lots, stock movements, barcode lookup (api.ts + Inventory, LotDetail pages)
- `features/production/` — batches, batch I/O (api.ts + Production, BatchDetail pages)
- `features/traceability/` — forward/backward trace hooks (api.ts + Traceability page)
- `features/customers/` — customers, orders, allocation (api.ts + Customers, Orders pages)
- `features/dashboard/` — dashboard stats (api.ts + Dashboard page)
- `features/quality/` — placeholder (no hooks yet)

Shared utilities: `client/src/lib/fetchApi.ts` (HTTP utility), `client/src/lib/api.ts` (thin barrel re-export of all feature apis for backward compat), `client/src/lib/queryClient.ts`, `client/src/lib/barcodePrint.ts`.

Cross-domain pages stay in `client/src/pages/`: `Calculator.tsx`, `not-found.tsx`.

The Settings page (`client/src/features/catalog/pages/Settings.tsx`) is organized into shadcn Tabs (`general`, `production`, `labels`, `data`, `security`). Each tab is split into named **sections** rendered as a desktop side-rail + content panel (md+) and a stacked accordion on mobile. Section ids per tab: General → `display-preferences`; Production → `fruit-codes`, `process-codes`; Labels → `templates`, `builder` (admin-only), `print` (admin-only), `history` (admin-only); Data → `categories`, `reusable-templates` (admin-only), `import-export` (admin-only, with Danger Zone sub-heading); Security → `roles`, `activity-log` (admin-only). Tab and section state are deep-linkable via `?tab=...&section=...`; bare `?tab=labels` falls back to the first section, unknown sections are silently dropped, and section clicks use `navigate(..., {replace:true})`. The Label Templates admin (formerly at `/labels`) lives inside the **Labels** tab — `LabelTemplatesPanel` is the default export of `client/src/features/labels/pages/Labels.tsx`. The standalone `/labels` route now redirects to `/settings?tab=labels` and the Labels item has been removed from the sidebar. The Labels tab also hosts the **Custom Label Builder** (`client/src/features/labels/components/CustomLabelBuilder.tsx`) — a drag/resize WYSIWYG designer that persists element layouts into `LabelTemplateSettings.layout` JSON — and **Print Custom Label** (`client/src/features/labels/components/PrintCustomLabel.tsx`) for ad-hoc one-off label printing. The shared layout-aware printer lives in `client/src/lib/labelLayoutPrint.ts` and uses `qrcode` + `jsbarcode` to render absolute-positioned HTML at real mm dimensions via CSS `@page`. The Security tab includes a roles overview and (admin-only) an **Activity Log** section (`client/src/features/security/components/ActivityLogPanel.tsx`) — a paginated, filterable view of the system audit trail. Filters: search (q), entity type, action, user, from/to dates. Pagination is 20/page with all filter + page state persisted in the URL. Clicking a row opens a side `Sheet` showing prettified JSON of the recorded changes. Powered by admin-only `GET /api/admin/audit-logs` (returns `{items, total, limit, offset}` with users joined for `userName`/`userRole`) and `GET /api/admin/audit-logs/facets` (distinct entityTypes, actions, users) in `server/domains/security/`. Per-request `userId` capture for `createAuditLog` is provided by an `AsyncLocalStorage` middleware (`server/lib/requestContext.ts`) installed in `server/index.ts` after the session middleware. Indexes added on `audit_logs(createdAt desc)` and `audit_logs(entityType, entityId)`. Label-template create/update/delete now also call `createAuditLog` (entityType `label_template`).

Reusable UI components: `client/src/components/ui/`, layout: `client/src/components/layout/`, custom hooks: `client/src/hooks/`.

### Backend
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful API
- **Database ORM**: Drizzle ORM (PostgreSQL dialect)
- **Schema Validation**: Zod with drizzle-zod

The backend is organized as a modular monolith by business domain:
- `server/index.ts` — app setup and server startup
- `server/routes.ts` — thin index that mounts all domain routers at `/api`
- `server/domains/{catalog,inventory,production,traceability,quality,customers,dashboard}/` — each domain has a `routes.ts` (HTTP handlers) and `repository.ts` (data access delegation)
- `server/storage.ts` — central data access layer (DatabaseStorage class implementing IStorage)
- `server/lib/asyncHandler.ts` — shared Express async handler utility
- `server/lib/lotUtils.ts` — lot number and barcode value generation
- `server/db.ts` — PostgreSQL connection via Drizzle ORM
- `server/seed.ts` — database seeding

Domain routing map:
- **catalog**: categories, products, materials, recipes
- **inventory**: lots, stock movements, receive-stock, audit logs
- **production**: batches, batch inputs/outputs, finalization, lot-based inputs
- **traceability**: forward/backward traceability endpoints
- **quality**: quality checks per batch
- **customers**: customers, orders, order items, stock allocation
- **dashboard**: dashboard statistics

### Data Storage
- **Schema**: `shared/schema.ts` (shared between frontend/backend)
- **Database**: PostgreSQL (configured via `DATABASE_URL`)
- **Migrations**: Drizzle Kit

**Key Database Tables**:
- `categories`: Dynamic product categorization. Has per-section visibility booleans: `showInInventory`, `showInReceiveStock`, `showInProductionBatch`, `showInProductionInputs`, `showInProductionOutputs` (plus existing `showInTabs`, `excludeFromYield`).
- `products`: Finished goods with stock and category.
- `materials`: Raw materials with stock and category.
- `lots`: Lot tracking for raw materials, intermediates, and finished goods, including traceability data.
- `recipes`: Versioned product formulations.
- `recipeItems`: Bill of materials for recipes.
- `batches`: Production batches with status workflows. Includes optional `cleaningTime` (decimal, mins) and `numberOfStaff` (int) labour fields captured during finalize.
- `batchMaterials`: Material lots consumed in batches for traceability.
- `batchOutputs`: Supports multiple product outputs per batch.
- `orders`: Customer orders with priority and status.
- `orderItems`: Line items for orders.
- `qualityChecks`: QC records.
- `stockMovements`: Inventory audit trail.
- `auditLogs`: System-wide immutable audit logging.
- `templates`: Generic reusable templates for any domain. Columns: `id`, `kind` (varchar 64, indexed), `name`, `customerId` (FK customers, optional), `isDefault`, `payload` (jsonb, kind-specific schema), `createdAt`, `updatedAt`. Co-exists with `label_templates` (label_templates remains the source of truth for printable label settings).

### Reusable Templates Module
- **Schema**: generic `templates` table validated per-kind by `shared/templateKinds.ts` (Zod schemas). Two kinds at landing: `batch.standard` ({description, defaultPlannedQuantity?, defaultUnit?}) and `product.spec` ({description, defaultUnit?, notes?}).
- **Server**: `server/domains/templates/` (repository + admin-only routes). All endpoints require `admin` role: `GET/POST /api/templates`, `GET /api/templates/default?kind=&customerId=`, `GET/PATCH/DELETE /api/templates/:id`. Payload is validated via `validateTemplatePayload(kind, payload)`. Audit-logged as `entityType: "template"`. `getDefaultForContext(kind, customerId)` returns customer-specific default first, falls back to system default.
- **Client**: `client/src/features/templates/api.ts` (hooks: `useTemplates`, `useDefaultTemplate`, create/update/delete). Generic `TemplatesPanel.tsx` component is parameterised by `kind` + `renderForm` (per-kind payload form) + `defaultPayload`. Per-kind forms in `client/src/features/templates/kindForms.tsx`.
- **UI**: Mounted in Settings → **Data** tab → "Reusable Templates" section (admin-only). Renders both Batch Standard + Product Spec panels stacked.
- **Adding a new kind**: 1) add a Zod schema + entry to `TEMPLATE_KINDS` in `shared/templateKinds.ts`; 2) add a per-kind form to `kindForms.tsx`; 3) mount `<TemplatesPanel kind="..." defaultPayload={...} renderForm={...}/>` wherever needed.

### API Endpoints (Key)
- CRUD operations for `products`, `materials`, `lots`, `recipes`, `batches`, `orders`.
- Batch-specific: Record input (`POST /api/batches/:id/lot-input`), manage multiple outputs (`GET/POST /api/batches/:id/outputs`, `PATCH/DELETE /api/batch-outputs/:id`), finalize batches (`POST /api/batches/:id/finalize` accepts `cleaningTime`/`numberOfStaff`). Add/edit/remove on completed batches keeps the finished-good lot in sync and is blocked when the lot has already been consumed/shipped.
- Order-specific: Get orders with allocation (`GET /api/orders/with-allocation`), complete orders (`POST /api/orders/:id/complete`).
- Traceability: Forward (`GET /api/traceability/forward/:lotId`) and backward (`GET /api/traceability/backward/:batchId`).
- Inventory: Receive stock (`POST /api/receive-stock`).
- Dashboard statistics (`GET /api/dashboard/stats`).
- Category management (`GET/POST/PATCH/DELETE /api/categories`).

### Pages
- **BatchDetail** (`/batches/:id`): Shows batch overview (dates, quantities, yield), all input lots consumed (lot number, supplier, expiry, barcode), all output products, and links to full lot traceability. Accessible via "View Detail" from Production page dropdown. Header has a "View Timeline" button linking to `/batches/:id/timeline`.
- **BatchTimeline** (`/batches/:id/timeline`): Vertical chronological event list aggregating batch lifecycle (created/started/completed), material & product consumption (`batch_materials`), QC checks, output recording (`batch_outputs`), output lot creation (`lots.sourceBatchId`), label prints (`print_history` + lot/batch `barcodePrintedAt` fallback), and status/finalize events from `audit_logs`. Powered by single aggregator endpoint `GET /api/batches/:id/timeline` returning a sorted `TimelineEvent[]` with `{ at, kind, title, detail?, userId?, userName?, link?, meta? }`. Resolved user names are joined server-side. Mobile-friendly.

### UI/UX Decisions
- Responsive design for mobile, tablet, and desktop.
- Searchable dropdowns for product/material selection.
- Dynamic tabbed interfaces based on categories.
- Simplified dashboard with a static responsive grid.
- Dedicated pages for key functionalities (Dashboard, Orders, Customers, Production, Inventory, Traceability).
- Calculator page with yield, recipe, unit converter, batch planner, and delivery net weight tools.
- Unified Inventory page with tabs for Raw Materials, Finished Goods, and Lots.
- Priority-based stock allocation visible on dashboard and orders page.
- Lot-based compliance traceability for all stock movements.

### Technical Implementations
- Full-stack TypeScript architecture.
- Unit of measure support for products and materials.
- Product-as-ingredient input for multi-level traceability.
- Batch number generation with specific format.
- Wet quantity tracking in production batches.

## External Dependencies

### Database
- **PostgreSQL**: Primary data store.
- **connect-pg-simple**: Express session storage.

### UI Framework
- **Radix UI**: Primitive component library.
- **Lucide React**: Icon library.
- **Embla Carousel**: Carousel component.
- **cmdk**: Command palette component.
- **react-day-picker**: Date picker component.

### Data & Validation
- **Drizzle ORM**: Type-safe ORM.
- **Zod**: Runtime schema validation.
- **date-fns**: Date utilities.

### Development Tools
- **Vite**: Frontend build tool.
- **esbuild**: Backend bundling.
- **TypeScript**: Language.
- **Tailwind CSS**: Styling.
# BatchMaster ERP

## Overview

BatchMaster ERP is a Manufacturing Execution System (MES) designed for chemical and process manufacturing. It manages orders, production batches, inventory (raw materials and finished goods), product recipes/BOMs, lot traceability, and quality control. The system provides comprehensive batch tracking and inventory management for complex manufacturing environments.

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
- `categories`: Dynamic product categorization.
- `products`: Finished goods with stock and category.
- `materials`: Raw materials with stock and category.
- `lots`: Lot tracking for raw materials, intermediates, and finished goods, including traceability data.
- `recipes`: Versioned product formulations.
- `recipeItems`: Bill of materials for recipes.
- `batches`: Production batches with status workflows.
- `batchMaterials`: Material lots consumed in batches for traceability.
- `batchOutputs`: Supports multiple product outputs per batch.
- `orders`: Customer orders with priority and status.
- `orderItems`: Line items for orders.
- `qualityChecks`: QC records.
- `stockMovements`: Inventory audit trail.
- `auditLogs`: System-wide immutable audit logging.

### API Endpoints (Key)
- CRUD operations for `products`, `materials`, `lots`, `recipes`, `batches`, `orders`.
- Batch-specific: Record input (`POST /api/batches/:id/lot-input`), manage multiple outputs (`GET/POST /api/batches/:id/outputs`), finalize batches (`POST /api/batches/:id/finalize`).
- Order-specific: Get orders with allocation (`GET /api/orders/with-allocation`), complete orders (`POST /api/orders/:id/complete`).
- Traceability: Forward (`GET /api/traceability/forward/:lotId`) and backward (`GET /api/traceability/backward/:batchId`).
- Inventory: Receive stock (`POST /api/receive-stock`).
- Dashboard statistics (`GET /api/dashboard/stats`).
- Category management (`GET/POST/PATCH/DELETE /api/categories`).

### Pages
- **BatchDetail** (`/batches/:id`): Shows batch overview (dates, quantities, yield), all input lots consumed (lot number, supplier, expiry, barcode), all output products, and links to full lot traceability. Accessible via "View Detail" from Production page dropdown.

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
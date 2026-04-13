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

The frontend organizes features into pages (`client/src/pages/`), uses reusable UI components (`client/src/components/ui/`), layout components (`client/src/components/layout/`), custom hooks (`client/src/hooks/`), and an API client with React Query hooks (`client/src/lib/api.ts`).

### Backend
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful API
- **Database ORM**: Drizzle ORM (PostgreSQL dialect)
- **Schema Validation**: Zod with drizzle-zod

The backend structure includes `server/index.ts` for app setup, `server/routes.ts` for API registration, `server/storage.ts` for data access, `server/db.ts` for PostgreSQL connection, `server/seed.ts` for seeding, and integrates with Vite for development and static file serving for production.

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
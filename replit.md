# BatchMaster ERP

## Overview

BatchMaster ERP is a Manufacturing Execution System (MES) and batch tracking application designed for chemical/process manufacturing operations. The system manages orders, production batches, inventory (raw materials and finished goods), product recipes/bill of materials (BOM), lot traceability, and quality control workflows.

The application follows a full-stack TypeScript architecture with a React frontend and Express backend, using PostgreSQL for data persistence. All measurements are in KG (Kilograms).

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- **Jan 8, 2026**: Added inventory categorization system. Products can now be flagged as "Input" (can be used in production) and/or "Output" (can be produced). This enables scenarios like "Strawberry Slice" being an output of one batch and an input to another. Category badges shown in Products table, checkboxes in create/edit forms. New API endpoints: `/api/items/inputs` and `/api/items/outputs`.
- **Jan 8, 2026**: Implemented priority-based stock allocation system. Orders are allocated stock based on priority level (urgent > high > normal > low), then by due date (soonest first). Dashboard and Orders page show allocation status: Ready to Ship (green), Partially Allocated (amber), Awaiting Stock (grey). Auto-reallocation triggers on inventory changes and order modifications. Uses database transactions to prevent race conditions.
- **Jan 8, 2026**: Added inline editing for batch material inputs. Pencil button allows editing quantity with automatic inventory adjustments (delta-based). Validation prevents negative/invalid quantities. Output editing works via Record Output button which pre-fills existing values.
- **Jan 8, 2026**: Merged Products and Inventory pages into unified Inventory page with tabs for Raw Materials, Finished Goods, and Lots. Removed separate Products page and navigation link. /products route now redirects to /inventory.
- **Jan 8, 2026**: Implemented production-inventory integration with Record Input and Record Output functionality. Recording inputs deducts from material/lot inventory. Recording outputs creates finished goods lots and adds to product stock. Stock movements tracked for audit trail.
- **Jan 8, 2026**: Simplified batch workflow to two states: In Progress and Completed. Added waste and milling quantity tracking separate from finished product output.
- **Jan 8, 2026**: Added customer management section with dedicated customers table and full CRUD operations. Customers can now be linked to orders.
- **Jan 8, 2026**: Enhanced order management with edit order dialog and order items management (add/remove products from orders).
- **Jan 7, 2026**: Connected all frontend pages to real PostgreSQL database via REST API with React Query. Added proper loading and error states to all pages.
- **Jan 7, 2026**: Created complete database schema with 15+ tables including products, materials, lots, recipes, batches, orders, quality checks, stock movements, and audit logs.
- **Jan 7, 2026**: Implemented database seeding with sample data for testing.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state with proper loading/error handling
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **Build Tool**: Vite

The frontend is organized with:
- Pages in `client/src/pages/` for each major feature (Dashboard, Orders, Customers, Production, Inventory, Traceability)
- Reusable UI components in `client/src/components/ui/`
- Layout components in `client/src/components/layout/`
- Custom hooks in `client/src/hooks/`
- API client with React Query hooks in `client/src/lib/api.ts`

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful API endpoints prefixed with `/api`
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Validation**: Zod with drizzle-zod integration

The backend follows a modular structure:
- `server/index.ts` - Express app setup and middleware
- `server/routes.ts` - API route registration for all resources
- `server/storage.ts` - Data access layer with DatabaseStorage class using Drizzle ORM
- `server/db.ts` - PostgreSQL connection setup with Drizzle
- `server/seed.ts` - Database seeding script with sample data
- `server/vite.ts` - Development server with Vite HMR integration
- `server/static.ts` - Production static file serving

### Data Storage
- **Schema Location**: `shared/schema.ts` - Shared between frontend and backend
- **Database**: PostgreSQL (configured via DATABASE_URL environment variable)
- **Migrations**: Drizzle Kit with migrations output to `./migrations`

#### Database Tables:
- **products** - Finished goods with SKU, stock levels
- **materials** - Raw materials with SKU, stock levels
- **lots** - Lot tracking with expiry dates, supplier lots, traceability
- **recipes** - Versioned product formulations
- **recipeItems** - Bill of materials for each recipe
- **batches** - Production batches with status workflow (planned → in_progress → quality_check → completed → released)
- **batchMaterials** - Material lots used in each batch (for traceability)
- **orders** - Customer orders with priority and status
- **orderItems** - Line items for each order
- **qualityChecks** - QC records for batches
- **stockMovements** - Inventory movement audit trail
- **auditLogs** - Immutable system-wide audit logging

### API Endpoints
- `GET/POST /api/products` - Product CRUD
- `GET/POST /api/materials` - Material CRUD
- `GET/POST /api/lots` - Lot tracking
- `GET/POST /api/recipes` - Recipe management
- `GET /api/recipes/:id/items` - Recipe ingredients
- `GET/POST /api/batches` - Batch management
- `GET /api/batches/:id/materials` - Batch materials used
- `POST /api/batches/:id/input` - Record production input (deducts from inventory)
- `POST /api/batches/:id/output` - Record production output (adds to inventory)
- `DELETE /api/batch-materials/:id` - Remove batch material (returns to inventory)
- `PATCH /api/batch-materials/:id` - Update batch material quantity (adjusts inventory with delta)
- `GET/POST /api/orders` - Order management
- `GET /api/orders/:id/items` - Order line items
- `GET /api/orders/with-allocation` - Orders with allocation status and reserved quantities
- `POST /api/allocation/run` - Manually trigger stock allocation
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/traceability/forward/:lotId` - Forward lot traceability
- `GET /api/traceability/backward/:batchId` - Backward batch traceability

### Build System
- **Development**: `npm run dev` - Runs Express server with Vite middleware for HMR
- **Production Build**: `npm run build` - Uses esbuild for server bundling, Vite for client
- **Database**: `npm run db:push` - Push schema changes to PostgreSQL
- **Output**: `dist/` directory with `index.cjs` (server) and `public/` (client assets)

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connected via `DATABASE_URL` environment variable
- **connect-pg-simple**: Session storage for Express sessions

### UI Framework
- **Radix UI**: Complete primitive component library (dialogs, menus, forms, etc.)
- **Lucide React**: Icon library
- **Embla Carousel**: Carousel component
- **cmdk**: Command palette component
- **react-day-picker**: Date picker component

### Data & Validation
- **Drizzle ORM**: Type-safe database queries and schema definition
- **Zod**: Runtime schema validation
- **date-fns**: Date manipulation utilities

### Development Tools
- **Vite**: Frontend build tool with HMR
- **esbuild**: Server bundling for production
- **TypeScript**: Full-stack type safety
- **Tailwind CSS**: Utility-first CSS framework

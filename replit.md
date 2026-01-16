# BatchMaster ERP

## Overview

BatchMaster ERP is a Manufacturing Execution System (MES) and batch tracking application designed for chemical/process manufacturing operations. The system manages orders, production batches, inventory (raw materials and finished goods), product recipes/bill of materials (BOM), lot traceability, and quality control workflows.

The application follows a full-stack TypeScript architecture with a React frontend and Express backend, using PostgreSQL for data persistence. All measurements are in KG (Kilograms).

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- **Jan 16, 2026**: Implemented product-as-ingredient input for full chain traceability. Finished products can now be used as inputs in production batches (e.g., freeze-dried strawberries going into trail mix). New productId and sourceLotId columns in batchMaterials table. Record Input dialog has toggle to switch between "Raw Material" and "Finished Product" input types. When a product is used as an ingredient, stock is deducted from product inventory and the batch tracks which product was consumed for complete traceability through multiple processing steps.
- **Jan 15, 2026**: Updated batch number generation format and grouped product dropdowns by category. New batch number format: ProductInitials + TypeCode (6=Frozen, 4=Freeze Dried from category) + Year (2 digits) + Julian Date (3 digits) + Weekday (1-7, Monday=1). Example: BW4260154 = Blueberry Whole, Freeze Dried, 2026, Day 15, Thursday. Product dropdowns now display products grouped under category headers for easier selection.
- **Jan 15, 2026**: Made all product/material select fields searchable in Production page. Create Batch, Record Input, and Add Output dialogs now use searchable comboboxes with type-ahead filtering using Popover + Command components.
- **Jan 13, 2026**: Added wet quantity tracking to production batches. New wetQuantity column in batches table tracks product that needs reprocessing through the dryer. Displayed alongside waste and milling in the batch output dialog.
- **Jan 13, 2026**: Added Current/Archive tabs to Orders page. Shipped and cancelled orders now display in Archive tab with "Shipped" or "Cancelled" status badges. Current tab shows only active orders (pending, in_production, ready). New ArchivedOrderRow component for archive display.
- **Jan 13, 2026**: Created Calculator page with five calculation tools:
  - **Yield Calculator**: Calculate finished product, waste, milling, and wet (redry) quantities from raw input weight with percentage breakdowns.
  - **Recipe Calculator**: Select product and recipe to calculate materials needed for target quantity. Uses getRecipeItemsWithMaterials API to show real material names and units.
  - **Unit Converter**: Convert between weight units (KG, g, lb, oz) and volume units (L, ml, gal).
  - **Batch Planner**: Calculate total raw materials needed for producing multiple products with expected yield percentage.
  - **Delivery Net Weight**: Calculate actual product weight from deliveries by subtracting pallet and container weights (tare weight).
- **Jan 13, 2026**: Simplified dashboard to fixed layout. Removed drag-and-drop editing functionality (react-grid-layout) in favor of a clean, static responsive grid. Dashboard now uses simple Tailwind CSS grid with 4 stat cards on top and 3 content cards below.
- **Jan 10, 2026**: Added unit of measure support. Products and materials can now have different units (KG, QTY, L). Unit dropdown added to create/edit forms. Tables display each item's actual unit. Summary cards no longer assume KG for mixed-unit inventories.
- **Jan 10, 2026**: Implemented mobile and tablet responsiveness. Added screen size detection hooks (useIsMobile, useIsTablet, useScreenSize). Layout has collapsible sidebar with hamburger menu on mobile (<1024px). All tables wrapped with horizontal scroll for small screens. Dashboard grid stacks 2 columns on mobile. Dialogs use full-width on mobile (w-full sm:max-w-*). Responsive typography throughout (text-2xl sm:text-3xl for titles). Breakpoints: mobile <640px, tablet 640-1024px, desktop 1024px+.
- **Jan 10, 2026**: Added order completion feature. POST /api/orders/:id/complete endpoint marks orders as shipped, deducts stock from product inventory, logs stock movements with "shipment" type. Includes confirmation dialog explaining the action. Stock allocation re-runs after completion.
- **Jan 9, 2026**: Extended category support to materials. Added categoryId column to materials table with foreign key to categories. Updated Inventory page with category dropdown in both create and edit material forms. Material interface updated in API types.
- **Jan 9, 2026**: Fixed Inventory page dialog structure. Moved create material and create product dialogs outside TabsContent components so they render correctly regardless of active tab. Added missing Lots tab trigger to TabsList.
- **Jan 9, 2026**: Added lot display helpers and imports. Added useLots hook, getMaterialName, getProductName, and getLotItemName helper functions. Added format import from date-fns for date formatting in lots table.
- **Jan 8, 2026**: Implemented dynamic category system. Replaced hardcoded boolean flags (isInput/isOutput/isPowder) with a configurable categories table. Categories have name, excludeFromYield, isDefault, and sortOrder fields. Default categories (Materials, Goods, Powders) are seeded and protected from deletion. Settings page allows creating/editing/deleting custom categories. Inventory page shows dynamic tabs based on categories with excludeFromYield=true. Production yield calculations use category metadata instead of boolean flags. API endpoints: GET/POST/PATCH/DELETE `/api/categories`.
- **Jan 8, 2026**: Implemented multi-product batch output system. Batches can now produce multiple different products (e.g., freeze-dried strawberries producing both diced and crumble). New batchOutputs table tracks each product output. BatchOutputsEditor component provides add/remove outputs, waste/milling tracking, and finalize workflow. New API endpoints: GET/POST `/api/batches/:id/outputs`, DELETE `/api/batch-outputs/:id`, POST `/api/batches/:id/finalize`.
- **Jan 8, 2026**: Simplified Record Input to remove lot requirement. Now just select material and quantity - inventory is deducted directly from material stock. Made lotId optional in batchMaterials table.
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
- **categories** - Dynamic product categories with name, excludeFromYield flag, isDefault flag, sortOrder
- **products** - Finished goods with SKU, stock levels, categoryId reference
- **materials** - Raw materials with SKU, stock levels, categoryId reference
- **lots** - Lot tracking with expiry dates, supplier lots, traceability
- **recipes** - Versioned product formulations
- **recipeItems** - Bill of materials for each recipe
- **batches** - Production batches with status workflow (planned → in_progress → quality_check → completed → released)
- **batchMaterials** - Material lots used in each batch (for traceability)
- **batchOutputs** - Multiple product outputs per batch with quantities
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
- `POST /api/batches/:id/output` - Record production output (legacy, single output)
- `GET/POST /api/batches/:id/outputs` - Get/add batch outputs (multiple products per batch)
- `DELETE /api/batch-outputs/:id` - Remove batch output (reverses inventory change)
- `POST /api/batches/:id/finalize` - Finalize batch with waste/milling and optional completion
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

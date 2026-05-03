# Gina's Table

## Overview

Gina's Table is a Manufacturing Execution System (MES) designed for chemical and process manufacturing. It provides comprehensive management for orders, production batches, inventory (raw materials and finished goods), product recipes/BOMs, lot traceability, and quality control. The system focuses on delivering robust batch tracking and inventory management for complex manufacturing environments.

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
- **Modular Structure**: Organized into domain feature folders mirroring the backend (`catalog`, `inventory`, `production`, `traceability`, `customers`, `dashboard`, `quality`).
- **Settings Page**: A central hub for configuration, organized into tabs (General, Production, Labels, Data, Security) with deep-linkable sections, supporting both desktop and mobile layouts.
- **Custom Label Builder**: A WYSIWYG drag-and-resize designer for creating custom labels, persisting layouts as JSON, supporting various element types (text, field, barcode, QR, line, box, image).
- **Audit Log**: An admin-only paginated, filterable view of system activity, accessible via the Security tab, with detailed JSON changes viewable in a side `Sheet`.
- **Batch Timeline**: A chronological event list aggregating batch lifecycle, material/product consumption, QC checks, output recording, and status/finalize events.
- **UI/UX Decisions**: Responsive design, searchable dropdowns, dynamic tabbed interfaces, simplified dashboard, dedicated functional pages, calculator page with various tools, unified inventory views, priority-based stock allocation, and lot-based traceability.

### Backend
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful API
- **Database ORM**: Drizzle ORM (PostgreSQL dialect)
- **Schema Validation**: Zod with drizzle-zod
- **Modular Monolith**: Organized by business domain (`catalog`, `inventory`, `production`, `traceability`, `quality`, `customers`, `dashboard`, `forecast`, `reports`).
- **Central Data Access**: `server/storage.ts` for database interactions.
- **Audit Logging**: System-wide immutable audit logging for key actions and entity types, captured via `AsyncLocalStorage` middleware.
- **Reusable Templates Module**: Generic `templates` table with kind-specific Zod schema validation, managed by admin-only routes, supporting `batch.standard` and `product.spec` kinds.
- **Key API Endpoints**: CRUD operations for core entities (products, materials, lots, recipes, batches, orders), batch-specific actions (lot-input, multiple outputs, finalization), order management (allocation, completion), traceability (forward/backward), stock receiving, dashboard stats, and category management.

### Data Storage
- **Schema**: `shared/schema.ts` (shared between frontend/backend).
- **Database**: PostgreSQL.
- **Migrations**: Drizzle Kit.
- **Key Tables**: `categories` (dynamic product categorization with visibility controls), `products`, `materials`, `lots` (with receiving QA fields and customer-specific testing status fields), `recipes`, `recipeItems`, `batches` (with optional `cleaningTime`, `numberOfStaff`, `finishTime`, `productAssessment` upon finalize), `batchMaterials`, `batchOutputs`, `orders` (with optional `poNumber`, `customBatchNumber`, `freight`), `orderItems`, `qualityChecks`, `stockMovements`, `auditLogs`, `templates` (reusable generic templates), `forecastOrders` (potential customer demand with conversion link).

### Technical Implementations
- Full-stack TypeScript.
- Unit of measure support.
- Product-as-ingredient for multi-level traceability.
- Batch number generation.
- Wet quantity tracking.

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
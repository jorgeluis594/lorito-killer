# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lorito Killer is a multi-tenant Point of Sale (POS) system built with Next.js, TypeScript, and PostgreSQL. It's designed for the Peruvian market with features for retail management, inventory control, and document generation.

## Tech Stack

- **Framework**: Next.js 14.2.13 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js
- **UI**: Tailwind CSS + shadcn/ui components (Radix UI primitives)
- **State**: Zustand (vanilla stores with providers)
- **Forms**: React Hook Form + Zod
- **Background Jobs**: BullMQ + Redis (self-hosted worker)
- **PDF Generation**: @react-pdf/renderer
- **File Uploads**: UploadThing

## Essential Commands

```bash
# Development
npm run dev                  # Start dev server on port 3000
npm run worker              # Start BullMQ worker for background jobs

# Build & Deploy
npm run build               # Build for production (includes Prisma migrations)
npm run build:dev           # Build without migrations
npm run start               # Start production server
npm run prisma:deploy       # Deploy Prisma migrations separately

# Database
npx prisma migrate dev      # Create/apply migrations in development
npx prisma generate         # Regenerate Prisma client after schema changes
npx prisma studio          # Open Prisma Studio for database inspection

# Code Quality
npm run lint               # Run ESLint (no test commands configured)

# Environment Setup
cp .env.example .env        # Create environment file
# Configure DATABASE_URL, REDIS_URL, ADMIN_EMAIL
```

## Architecture Overview

The codebase follows a feature-based architecture with clear separation of concerns:

### Directory Structure
```
/src/app/[subdomain]/      # Multi-tenant routing via subdomains
  └── dashboard/           # Main dashboard routes
      ├── (dashboard)/     # Route group for shared layout
      ├── orders/          # Order management pages
      └── ...
/src/{feature}/            # Feature modules (product, order, customer, etc.)
  ├── components/          # Feature-specific React components
  │   └── store.ts         # Zustand vanilla store (if needed)
  ├── api_repository.ts    # Client-side API calls (fetch to /api)
  ├── db_repository.ts     # Server-side Prisma queries
  ├── actions.ts           # Next.js Server Actions for mutations
  ├── use_cases/           # Business logic layer
  ├── types.ts             # TypeScript types and schemas
  └── schemas/             # Zod validation schemas (some features)
/src/lib/queue/            # BullMQ queue infrastructure
  ├── connection.ts        # Redis connection singleton
  ├── queues/              # Queue definitions
  └── workers/             # Job processors
/src/ui/                   # Shared UI components (shadcn/ui)
/src/shared/               # Shared utilities and components
/src/lib/                  # Shared libraries and utilities
```

### Key Patterns

1. **Data Access Layer**:
   - `api_repository.ts`: Client-side fetching via `/api` routes (returns `response<T>` type)
   - `db_repository.ts`: Server-side Prisma queries (direct database access)
   - Both return consistent `response<T>` shape: `{ success: boolean, data?: T, message?: string }`

2. **State Management**:
   - Zustand vanilla stores created with `createStore()` from `zustand/vanilla`
   - Stores wrapped in React Context providers for component access
   - Pattern: `store.ts` defines state/actions, provider component wraps consumers

3. **Form Handling**:
   - Zod schemas define validation rules (in `types.ts` or `schemas/`)
   - React Hook Form with `@hookform/resolvers/zod` for form UI
   - Server actions handle form submissions with server-side validation

4. **Server vs Client Components**:
   - Default to server components for data fetching and rendering
   - Use `"use client"` only for interactivity (forms, stores, event handlers)
   - Server actions (`actions.ts`) called from client components for mutations

5. **Multi-tenancy**:
   - Subdomain-based routing: `app/[subdomain]/`
   - All database queries filter by `companyId`
   - Company context derived from subdomain on each request

6. **Type-Driven Design**:
   - Define types in `types.ts` first
   - Use discriminated unions for product types (SingleProduct vs PackageProduct)
   - Prisma types mapped to domain types with explicit converters

7. **Functional Programming**:
   - Pure functions for business logic in `use_cases/`
   - Immutable state updates in Zustand stores
   - Function composition for complex operations

8. **Background Jobs**:
   - BullMQ with Redis for async tasks (document submission to tax authorities)
   - Queue definitions in `src/lib/queue/queues/`, workers in `src/lib/queue/workers/`
   - Worker runs as a separate process (`npm run worker` / `Dockerfile.worker`)
   - Retry logic with exponential backoff

### Core Features

- **POS Operations**: Order creation with cart, payment processing (cash, card, wallet), cash shift management
- **Inventory**: Stock tracking, product variants, package products, stock transfers with transaction history
- **Documents**: PDF generation for invoices/receipts/tickets with QR codes, async submission to tax entity (SUNAT)
- **Reporting**: Sales reports, cash shift summaries, expense tracking
- **Customer Management**: RUC/DNI validation, address with Peruvian locality (ubigeo) support
- **Multi-payment**: Orders support multiple payment methods simultaneously

### Database Schema Notes

- **Multi-tenancy**: All user-facing models include `companyId` for tenant isolation
- **Product System**:
  - `Product` model supports both single products and packages (`isPackage` flag)
  - `PackageItem` links parent packages to child products with quantities
  - Stock tracked at product level with `StockTransfer` for history
- **Order System**:
  - `Order` -> `OrderItem` relationship with product snapshots (price, discount)
  - `Payment` supports multiple methods per order
  - `Document` generated from orders (invoice, receipt, ticket)
- **Stock Management**:
  - `StockTransfer` records with type (ORDER, ADJUSTMENT, PRODUCT_MOVEMENT) and status
  - Transactions stored as JSON in `data` field for flexibility
- **Document Generation**:
  - Sequential numbering per series and document type
  - QR and hash for tax compliance
  - Status tracking (REGISTERED, CANCELLED, PENDING_CANCELLATION)
- **Cash Shifts**: Tracks daily operations with opening/closing amounts, linked orders/payments/expenses
- **Monetary Values**: All stored as Prisma `Decimal` type for precision

### Development Tips

- **Multi-tenancy**: Always filter by `companyId` in db_repository queries
- **Server Actions**: Prefer server actions over API routes for mutations (better type safety)
- **PDF Generation**: Only works server-side (uses @react-pdf/renderer)
- **File Uploads**: UploadThing handles images (products, company logos)
- **Date Handling**: Use `date-fns` and `date-fns-tz` for timezone-aware operations (Peru timezone)
- **Prisma Client**: Run `npx prisma generate` after any schema changes
- **Type Mappers**: Use explicit mapper objects (e.g., `UNIT_TYPE_MAPPER`) to convert between Prisma enums and domain types
- **Response Pattern**: Return `response<T>` from all repository/action functions for consistent error handling
- **BullMQ Jobs**: Trigger background jobs with `queue.add()` for long-running tasks
- **Subdomain Routing**: Access subdomain via `params.subdomain` in page components
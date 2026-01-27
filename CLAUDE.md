# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Medusa v2** e-commerce application built on the Medusa framework (v2.12.3). Medusa is a modular commerce platform composed of customizable modules that handle core commerce logic including products, carts, orders, customers, payments, and fulfillment.

## Key Commands

### Development
- `npm run dev` - Start the development server with hot-reload
- `npm run start` - Start the production server
- `npm run build` - Build the Medusa application for production

### Database
- `npx medusa db:generate <module-name>` - Generate migrations for a specific module
- `npx medusa db:migrate` - Run pending migrations
- `npm run seed` - Seed the database (runs `./src/scripts/seed.ts`)

### Testing
- `npm run test:integration:http` - Run HTTP integration tests (in `integration-tests/http/`)
- `npm run test:integration:modules` - Run module integration tests (in `src/modules/*/__tests__/`)
- `npm run test:unit` - Run unit tests (files matching `*.unit.spec.[jt]s`)

### Scripts
- `npx medusa exec <path-to-script>` - Execute a custom CLI script (e.g., `npx medusa exec ./src/scripts/seed.ts`)

## Architecture

### Directory Structure

The Medusa application uses a **file-based routing and organization system** where different functionalities are segregated into specific directories:

- **`src/api/`** - Custom API route handlers using file-based routing
  - `src/api/admin/` - Admin-specific API routes
  - `src/api/store/` - Storefront API routes
  - Routes defined in `route.ts` files, supporting GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD
  - Path parameters via `[param]` directory naming convention
  - Middleware configured in `src/api/middlewares.ts`

- **`src/modules/`** - Custom modules (self-contained feature packages)
  - Each module contains: data models (`models/`), a service class, and an `index.ts` exporting the module definition
  - Modules are registered in `medusa-config.ts`
  - Use `MedusaService` base class for CRUD operations
  - Module isolation maintained via dependency injection

- **`src/workflows/`** - Custom workflows (multi-step business processes)
  - Built using `createWorkflow()` and `createStep()` from `@medusajs/framework/workflows-sdk`
  - Steps support compensation logic for rollback on failure
  - Executed from API routes, jobs, or subscribers via `workflow(req.scope).run()`

- **`src/subscribers/`** - Event handlers (listeners for system events)
  - Files export: handler function + config object specifying the event name
  - Access event data via `event.data` and container via `container.resolve()`

- **`src/jobs/`** - Scheduled jobs (cron-based background tasks)
  - Files export: handler function + config with `name`, `schedule` (cron expression), optional `numberOfExecutions`

- **`src/scripts/`** - Custom CLI scripts (executable via `medusa exec`)
  - Functions receive `{ container, args }` for accessing services and CLI arguments

- **`src/links/`** - Module links (associations between data models of different modules)
  - Created with `defineLink()` to maintain module isolation while connecting data
  - Synced to database via `npx medusa db:migrate`

- **`src/admin/`** - Admin dashboard customizations (widgets, routes, settings pages)
  - React components using `@medusajs/admin-sdk`
  - Widgets inject into existing admin pages via zone configuration

### Configuration

**`medusa-config.ts`** is the central configuration file that defines:
- Project config (database URL, Redis URL, CORS, JWT/cookie secrets)
- Admin dashboard settings
- Module configurations (conditionally loaded based on environment variables):
  - Caching (Redis-based)
  - Event bus (Redis-based)
  - Workflow engine (Redis-based)
  - Locking (Redis-based)
  - File storage (MinIO, S3, or local)
  - Notifications (SendGrid or Resend)
  - Payments (Stripe)

### Dependency Injection & Container

All services, modules, and resources are accessed via the **Medusa container**:
- In API routes: `req.scope.resolve("moduleName")`
- In workflows/jobs/subscribers: `container.resolve("moduleName")`
- Core modules (e.g., `"product"`, `"cart"`, `"order"`) are available by default
- Custom modules registered in `medusa-config.ts` are resolvable by their key

### Data Models

Data models are defined using the `model.define()` utility from `@medusajs/framework/utils`. They represent database tables and are managed by modules.

### Testing

Testing uses **Jest** with `@medusajs/test-utils`:
- Integration tests use `medusaIntegrationTestRunner()` which provides `api` (HTTP client) and `getContainer()` helpers
- Test types are determined by `TEST_TYPE` environment variable
- Setup configuration in `integration-tests/setup.js`

### Observability

OpenTelemetry instrumentation configured in `instrumentation.ts`:
- Exports to Zipkin by default
- Instruments HTTP, workflows, database queries, and general query operations
- Service name: "medusajs"

## Important Conventions

1. **File-based routing**: Route handlers must be in files named `route.ts` or `route.js`
2. **Module structure**: Modules must have `index.ts` exporting module definition with service
3. **Event subscribers**: Must export both handler function and `config` object
4. **Scheduled jobs**: Must export both handler function and `config` with cron schedule
5. **TypeScript**: Project uses TypeScript 5.6+ with strict typing
6. **Node version**: Requires Node.js >= 20

## Development Workflow

When adding features:
1. **Custom modules**: Create in `src/modules/`, define models and service, register in `medusa-config.ts`, generate and run migrations
2. **API routes**: Add to `src/api/admin/` or `src/api/store/` in `route.ts` files
3. **Workflows**: Define in `src/workflows/` and execute from API routes or other entry points
4. **Event handling**: Create subscribers in `src/subscribers/` for async processing
5. **Background jobs**: Add scheduled tasks in `src/jobs/`
6. **Admin UI**: Extend dashboard with widgets/pages in `src/admin/`

## Environment Variables

Check `medusa-config.ts` for all supported environment variables including:
- Database: `DATABASE_URL`, `DEPLOYMENT_TYPE`
- Redis: `REDIS_URL`, `CACHE_REDIS_URL`, `EVENTS_REDIS_URL`, `WE_REDIS_URL`, `LOCKING_REDIS_URL`
- Storage: MinIO or S3 credentials
- Email: SendGrid or Resend API keys
- Payments: `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`
- Security: `JWT_SECRET`, `COOKIE_SECRET`
- CORS: `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`

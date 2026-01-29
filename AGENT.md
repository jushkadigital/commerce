# AGENT.md

This file provides context for AI agents working with this codebase.

## Project Context

This is a **Medusa v2** e-commerce application (v2.12.3), a modular commerce platform composed of customizable modules that handle core commerce logic including products, carts, orders, customers, payments, and fulfillment. The application uses TypeScript, file-based routing, and dependency injection patterns.

## Architecture & Tech Stack

### Core Technologies
- **Framework**: Medusa v2 (modular commerce platform)
- **Language**: TypeScript 5.6+
- **Runtime**: Node.js >= 20
- **Database**: PostgreSQL (managed via migrations)
- **Caching/Events**: Redis (conditional)
- **Testing**: Jest with @medusajs/test-utils

### Architecture Patterns
- **Modular Architecture**: Self-contained modules with isolated services
- **File-based Routing**: API routes in `src/api/` using `route.ts` files
- **Dependency Injection**: All services accessed via Medusa container (`req.scope.resolve()` or `container.resolve()`)
- **Event-driven**: Subscribers handle system events asynchronously
- **Workflow Engine**: Multi-step business processes with compensation logic

### Directory Structure
```
src/
├── api/           # Custom API routes (admin/store)
├── modules/       # Custom modules (models, services, links)
├── workflows/     # Multi-step business processes
├── subscribers/   # Event handlers
├── jobs/          # Scheduled background tasks
├── scripts/       # CLI scripts (via `medusa exec`)
├── links/         # Module associations
└── admin/         # Admin dashboard customizations
```

## Data Structures

### Data Models
- Defined using `model.define()` from `@medusajs/framework/utils`
- Managed within modules in `src/modules/*/models/`
- Support links between modules via `defineLink()` in `src/links/`

### Core Modules
- **product**: Product catalog management
- **cart**: Shopping cart functionality
- **order**: Order processing and management
- **customer**: Customer accounts and profiles
- **payment**: Payment processing
- **fulfillment**: Shipping and fulfillment

### Module Structure
Each custom module contains:
- `models/` - Data model definitions
- `service.ts` - Service class extending `MedusaService`
- `index.ts` - Module definition export

## Testing & Quality

### Test Types
- **Unit Tests**: Files matching `*.unit.spec.[jt]s` (npm run test:unit)
- **Integration Tests (HTTP)**: In `integration-tests/http/` (npm run test:integration:http)
- **Integration Tests (Modules)**: In `src/modules/*/__tests__/` (npm run test:integration:modules)

### Testing Tools
- `medusaIntegrationTestRunner()` - Provides `api` (HTTP client) and `getContainer()` helpers
- `TEST_TYPE` environment variable determines test type
- Setup configuration in `integration-tests/setup.js`

### Quality Commands
- Always run `npm run lint` and `npm run typecheck` after changes (if available)
- Ensure all tests pass before committing

## Key Commands

### Development
- `npm run dev` - Start development server with hot-reload
- `npm run build` - Build for production
- `npm run start` - Start production server

### Database
- `npx medusa db:generate <module-name>` - Generate migrations
- `npx medusa db:migrate` - Run migrations
- `npm run seed` - Seed database

### Testing
- `npm run test:integration:http` - Run HTTP integration tests
- `npm run test:integration:modules` - Run module integration tests
- `npm run test:unit` - Run unit tests

### CLI Scripts
- `npx medusa exec <path-to-script>` - Execute custom script

## Important Conventions

1. **Route files**: Must be named `route.ts` or `route.js`
2. **Module exports**: Must have `index.ts` with module definition
3. **Subscribers**: Export both handler function and `config` object
4. **Jobs**: Export both handler function and `config` with cron schedule
5. **TypeScript strict mode**: Always maintain type safety
6. **No comments**: Do not add comments to code unless explicitly requested

## Configuration

Central configuration in `medusa-config.ts`:
- Database and Redis URLs
- CORS settings
- JWT/cookie secrets
- Module configurations (caching, event bus, workflow engine, locking, storage, notifications, payments)

## Dependency Access Pattern

- **In API routes**: `req.scope.resolve("moduleName")`
- **In workflows/jobs/subscribers**: `container.resolve("moduleName")`
- Core modules available: `"product"`, `"cart"`, `"order"`, etc.
- Custom modules resolved by their registered key

## Task 1: Restore Default Event Bus Configuration

### Changes Made
- **File**: `medusa-config.ts` (lines 146-168)
- **Before**: `Modules.EVENT_BUS` pointed to custom `./src/modules/event-bus-rabbitmq`
- **After**: `Modules.EVENT_BUS` now uses default Medusa implementation:
  - `@medusajs/medusa/event-bus-local` when `DISABLE_REDIS` is true
  - `@medusajs/medusa/event-bus-redis` when Redis is available

### RabbitMQ Module Registration
- RabbitMQ now registered as a **standalone custom module** (no `key` property)
- Configuration preserved:
  - `resolve: "./src/modules/event-bus-rabbitmq"`
  - `url: process.env.RABBITMQ_URL || 'amqp://admin:admin123@172.17.0.1:5672'`
  - `exchange: "tourism-exchange"`

### Build Verification
- Build completed (with pre-existing TypeScript errors unrelated to this change)
- No errors introduced by EVENT_BUS configuration change
- Config structure validated successfully

### Pattern Used
Followed existing conditional logic pattern in `medusa-config.ts`:
```typescript
{
  key: Modules.EVENT_BUS,
  resolve: DISABLE_REDIS ? "local" : "redis",
  options: { redisUrl: process.env.EVENTS_REDIS_URL }
}
```

### Next Steps
- RabbitMQ module still loads but needs refactoring to work as standalone service
- Subscribers likely need updates to emit to both systems
- Module definition in `src/modules/event-bus-rabbitmq/index.ts` needs adjustment

## Task 2: Refactor Service to Standalone RabbitMQ Service

### Changes Made

**`src/modules/event-bus-rabbitmq/service.ts`** (334 → 95 lines):
- **Removed** `extends AbstractEventBusModuleService` — class is now plain `RabbitMQService`
- **Removed** all event bus imports: `InternalModuleDeclaration`, `EventBusTypes`, `AbstractEventBusModuleService`
- **Removed** event bus methods: `emit()`, `subscribe()`, `releaseGroupedEvents()`, `clearGroupedEvents()`
- **Removed** event bus state: `stagedEvents_`, `pendingBindings_`, `queueName_`, `productModuleService_`, `moduleDeclaration_`
- **Removed** helper methods: `enrichProductEvent()`, `publishEvents()`
- **Removed** consumer logic (queue creation, `channel_.consume()`) — will be re-added in Task 3
- **Removed** `WHITELISTED_EVENTS` constant
- **Kept** connection logic: `connect()`, `connection_`, `channel_`, `options_`, `logger_`, `isReady_`
- **Added** `publish(routingKey: string, data: unknown, options?: PublishOptions): Promise<void>` — clean publish method with AMQP options (headers, messageId, correlationId, persistent)
- **Added** `PublishOptions` type export for consumers
- **Simplified** constructor: removed `moduleDeclaration` param and `super()` call

**`src/modules/event-bus-rabbitmq/index.ts`**:
- Renamed import: `RabbitMQEventBusService` → `RabbitMQService`
- Renamed export: `RABBITMQ_EVENT_BUS_MODULE` → `RABBITMQ_MODULE` (value unchanged: `"eventBusRabbitMQ"`)

### Key Decisions
- Constructor takes `{ logger }` + `moduleOptions` (2 params) — matches Medusa custom module service pattern
- `publish()` defaults `persistent: true` for durable messages
- `publish()` sets `contentType: "application/json"` automatically
- Module name kept as `"eventBusRabbitMQ"` (camelCase per Medusa convention) — matches `medusa-config.ts` registration
- Consumer logic intentionally excluded — will be added in Task 3 as separate concern

### Build Verification
- Build passes with same 6 pre-existing errors (in `packages/route.ts`, `tours/route.ts`, auth callbacks, `validate-tour-booking.ts`, `update-package.ts`)
- Zero new errors introduced by refactoring

### How to Resolve the Service
```typescript
import { RABBITMQ_MODULE } from "../modules/event-bus-rabbitmq"
import RabbitMQService from "../modules/event-bus-rabbitmq/service"

const rabbitmq = container.resolve<RabbitMQService>(RABBITMQ_MODULE)
await rabbitmq.publish("product.created", { id: "prod_123", title: "..." })
```

### Next Steps
- Task 3: Add consumer/subscription logic back as a separate concern
- Subscribers need to resolve `RABBITMQ_MODULE` and call `publish()` instead of relying on event bus

## Task 4: Product Sync Subscriber (Local Event Bus → RabbitMQ)

### Changes Made

**Created `src/subscribers/product-sync.ts`**:
- Listens to `product.created` (local event from Medusa core)
- Resolves `Modules.PRODUCT` to fetch full product with relations: `variants`, `images`, `tags`, `categories`
- Resolves `RABBITMQ_MODULE` (typed as `RabbitMQService`) to publish to RabbitMQ
- Publishes full product object with routing key `product.created`
- Graceful error handling: logs and continues (no retry logic)

### Pattern: Bridging Local Events → RabbitMQ
```typescript
// 1. Subscribe to local Medusa event
export const config: SubscriberConfig = { event: "product.created" }

// 2. In handler: fetch full data, then publish to RabbitMQ
const fullProduct = await productModuleService.retrieveProduct(id, {
  relations: ["variants", "images", "tags", "categories"],
})
const rabbitMQService = container.resolve<RabbitMQService>(RABBITMQ_MODULE)
await rabbitMQService.publish("product.created", fullProduct)
```

### Key Observations
- The existing `productCreated.ts` subscriber ALSO listens to `product.created` — both subscribers will fire. The original emits a custom `myCustomProductCreated` event on the local bus; the new one publishes to RabbitMQ.
- Used `SubscriberArgs<{ id: string }>` for proper typing of event data
- Log prefixes `[product-sync]` to distinguish from existing subscriber logs

### Build Verification
- Build passes with same pre-existing errors only
- Zero new errors introduced

## Task 3: Inbound Consumer (RabbitMQ → Local Event Bus)

### Changes Made

**`src/modules/event-bus-rabbitmq/service.ts`** (95 → 148 lines):
- **Added** `IEventBusModuleService` import from `@medusajs/types`
- **Updated** `InjectedDependencies` type: added `event_bus: IEventBusModuleService`
- **Added** `eventBus_` property to class, initialized from `{ event_bus }` constructor param
- **Restored** `WHITELISTED_EVENTS` constant with `["tour.created"]`
- **Added** `startConsumer(exchange: string)` protected method:
  - Creates exclusive queue (auto-named, auto-deleted when connection closes)
  - Binds queue to each routing key in `WHITELISTED_EVENTS`
  - Sets up `channel_.consume()` with `noAck: false` (manual ack)
  - On message: parse JSON → `eventBus_.emit({ name: routingKey, data })` → ack
  - On error: log error → nack (no requeue to avoid infinite loops)
- **Modified** `connect()`: calls `await this.startConsumer(exchange)` after exchange assertion, before marking `isReady_`

### Key Decisions
- **Direct injection via `event_bus`**: Medusa custom module services receive the app-level container as first arg (awilix proxy). `Modules.EVENT_BUS` registers as `"event_bus"` in the container, so destructuring `{ event_bus }` works.
- **Exclusive queue**: Queue is unique per Medusa instance and auto-deleted on disconnect. No need for named queues since this is a consumer-only pattern.
- **nack without requeue**: On parse/emit errors, messages are nacked with `requeue=false` to prevent poison message loops. Dead-letter exchange can be added later if needed.
- **Consumer starts in `connect()`**: Called after exchange assertion, keeping initialization sequential and predictable.

### Target Flow
```
External System → RabbitMQ (tourism-exchange)
  → routing key "tour.created"
  → RabbitMQService.startConsumer()
  → eventBus_.emit({ name: "tour.created", data: parsedPayload })
  → tourCreated.ts subscriber (listens to "tour.created")
  → createTourWorkflow
```

### Build Verification
- Build passes with same 6 pre-existing errors
- Zero new errors from RabbitMQ service changes

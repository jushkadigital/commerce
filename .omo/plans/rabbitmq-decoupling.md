# Decouple RabbitMQ Event Bus from Local Event Bus

## TL;DR
> **Quick Summary**: We will separate the RabbitMQ implementation from the core Event Bus. Medusa's internal event bus will revert to Redis/Local (solving the "ID-only" issue for internal events). RabbitMQ will become a standalone service used explicitly for external communication.
> 
> **Deliverables**:
> - Standalone `RabbitMQService` (not replacing the main Event Bus)
> - Updated `medusa-config.ts` restoring default Event Bus
> - New `product-sync.ts` subscriber to fetch data and publish to RabbitMQ
> - Updated RabbitMQ Consumer logic to forward external events to Local Bus
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Config Update → RabbitMQ Service → Subscribers

---

## Context

### Original Request
The user implemented RabbitMQ as a replacement for the default event bus but found that Medusa internal events only contain IDs, not full data. They want to decouple the systems so they can:
1.  Listen to local events (ID only).
2.  Fetch full data using the ID.
3.  Publish full data to RabbitMQ.

### Technical Approach
- **Current**: `RabbitMQEventBusService` extends `AbstractEventBusModuleService` and replaces the core bus.
- **New**: `RabbitMQModule` will be a standalone module.
    - **Outbound**: Subscribers will inject `RabbitMQService` to publish.
    - **Inbound**: `RabbitMQService` will consume messages and `emit` them to the Local Event Bus, allowing standard subscribers to handle them.

---

## Work Objectives

### Core Objective
Decouple the Event Bus logic to allow data enrichment before external publishing.

### Concrete Deliverables
- [ ] Refactored `src/modules/event-bus-rabbitmq` (Standalone Service)
- [ ] Updated `medusa-config.ts` (Register as `modules.rabbitmq`, restore `event-bus`)
- [ ] `src/subscribers/product-sync.ts` (Fetches data, publishes to RabbitMQ)
- [ ] `src/subscribers/tour-created.ts` (Remains as is, but triggered via Local Bus forwarding)

### Must Have
- **Data Enrichment**: Products must be fully fetched before sending to RabbitMQ.
- **Two-Way Sync**: RabbitMQ -> Local Bus -> Subscribers (for inbound) AND Local Bus -> Subscribers -> RabbitMQ (for outbound).
- **Error Handling**: Graceful failure if RabbitMQ is down (should not crash Medusa).

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Infrastructure Refactor):
├── Task 1: Revert medusa-config.ts to use Redis/Local Event Bus [quick]
└── Task 2: Refactor RabbitMQ module to Standalone Service [deep]

Wave 2 (Implementation & Wiring):
├── Task 3: Implement Inbound Consumer (RabbitMQ -> Local Bus) [deep]
└── Task 4: Implement Outbound Subscriber (Product Created -> Fetch -> RabbitMQ) [deep]

Wave 3 (Verification):
├── Task 5: Verify RabbitMQ Connection & Exchange Creation [quick]
└── Task 6: End-to-End Test (Create Product -> Verify RabbitMQ Message) [unspecified-high]
```

---

## TODOs

- [x] 1. Restore Default Event Bus Configuration

  **What to do**:
  - Update `medusa-config.ts`.
  - Remove the custom `event-bus-rabbitmq` from the `Modules.EVENT_BUS` key.
  - Restore `@medusajs/event-bus-redis` (or local) as the default.
  - Register the RabbitMQ module under a new key (e.g., `rabbitmq` or via a custom service registration).

  **References**:
  - `medusa-config.ts` (lines 149-159 to be changed)

  **Acceptance Criteria**:
  - [x] `medusa-config.ts` uses `event-bus-redis` or `event-bus-local`.
  - [x] Medusa starts without errors.

  **QA Scenarios**:
  ```
  Scenario: Medusa Starts with Default Bus
    Tool: interactive_bash
    Steps:
      1. npm run build
      2. medusa start
    Expected Result: Logs show "Event bus ready" (referring to Redis/Local), not RabbitMQ.
  ```

- [x] 2. Refactor RabbitMQ Module to Standalone Service

  **What to do**:
  - Modify `src/modules/event-bus-rabbitmq/service.ts`.
  - **Remove** `extends AbstractEventBusModuleService`.
  - **Remove** `emit`, `stagedEvents`, and event bus logic.
  - **Keep** `connect`, `connection_`, `channel_`.
  - **Add** `publish(routingKey, data, options)` method.
  - **Add** `consume(queue, handler)` method (generic).
  - Ensure it exports a standard Medusa Service.

  **References**:
  - `src/modules/event-bus-rabbitmq/service.ts`

  **Acceptance Criteria**:
  - [x] Service has `publish` method.
  - [x] Service connects to RabbitMQ on startup (via loader or constructor).

- [x] 3. Implement Inbound Consumer (RabbitMQ -> Local Bus)

  **What to do**:
  - In `RabbitMQService`, implement a `start()` or `listen()` method called on initialization.
  - Inject the *Local* `EventBusService` (`Modules.EVENT_BUS`).
  - Set up consumers for whitelisted events (like `tour.created`).
  - When a message arrives from RabbitMQ:
    1. Parse JSON.
    2. `this.eventBusService_.emit({ name: routingKey, data: payload })`.
  - This ensures `tourCreated.ts` (which listens to `tour.created`) receives the event locally.

  **References**:
  - `src/subscribers/tourCreated.ts` (Consumer target)

  **Acceptance Criteria**:
  - [x] Incoming RabbitMQ message `tour.created` triggers local `tour.created` event.

- [x] 4. Create Outbound Subscriber (Product Sync)

  **What to do**:
  - Create/Update `src/subscribers/product-sync.ts`.
  - Listen to `product.created` (Local event).
  - Inject `ProductModuleService` and `RabbitMQService`.
  - `retrieveProduct(id, { relations: [...] })`.
  - `rabbitMQService.publish("product.created", fullProduct)`.

  **References**:
  - `src/subscribers/productCreated.ts` (existing code to adapt)

  **Acceptance Criteria**:
  - [x] Creating a product in Admin triggers `product-sync`.
  - [x] `product-sync` fetches full data (variants, images).
  - [x] Data is published to RabbitMQ.

  **QA Scenarios**:
  ```
  Scenario: Product Creation Propagates to RabbitMQ
    Tool: interactive_bash
    Steps:
      1. Create product via Medusa Admin API (curl).
      2. Check RabbitMQ queue (if possible via API or logs).
    Expected Result: Log "Published product.created to RabbitMQ with full data".
  ```

---

## Success Criteria

- [x] Medusa starts with Redis/Local Event Bus.
- [x] Internal events (product.created) only have ID (as expected).
- [x] `product-sync` subscriber enriches and publishes full data to RabbitMQ.
- [x] Inbound RabbitMQ events (`tour.created`) are forwarded to local bus and handled by `tourCreated.ts`.

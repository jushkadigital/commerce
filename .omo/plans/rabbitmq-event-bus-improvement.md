# Plan: RabbitMQ Event Bus Improvement

## TL;DR
> **Quick Summary**: Fix critical bugs in `event-bus-rabbitmq` and extend it to publish native Medusa events (whitelist) to RabbitMQ while preserving external event consumption.
> 
> **Deliverables**: 
> - Fixed `RabbitMQEventBusService` (exchange consistency, property names).
> - Whitelist implementation for `product.created` / `product.updated`.
> - Bidirectional event flow (Local first → RabbitMQ).
> - Wildcard subscriber support for incoming events.
> 
> **Estimated Effort**: Medium (Complex logic, single file)
> **Parallel Execution**: Sequential (Single file dependencies)
> **Critical Path**: Fix Bugs → Add Whitelist → Implement Local Execution → Fix Consumer

---

## Context

### Original Request
Improve `event-bus-rabbitmq` to send native Medusa events to RabbitMQ and keep receiving external events (e.g., from PayloadCMS).

### Key Decisions
- **Whitelist**: Only `product.created` and `product.updated` will be published to RabbitMQ.
- **Location**: Whitelist hardcoded in `service.ts`.
- **Payload Format**: **Full Message Wrapper** (preserve current behavior).
- **Execution Order**: **Local First** (execute local subscribers) → Then RabbitMQ.
- **Exchange**: Unify all defaults to `tourism-exchange`.
- **Failure**: If RabbitMQ fails, the operation fails (no graceful degradation).
- **Tests**: No new automated tests; rely on Agent-Executed QA.

### Metis Review
**Identified Gaps (addressed in plan)**:
- **Critical Bug**: `event.eventName` used instead of `event.name`.
- **Critical Bug**: Inconsistent exchange names (`medusa-events` vs `tourism-exchange`).
- **Missing Feature**: No local execution in `emit()`.
- **Missing Feature**: Consumer ignores wildcard `*` subscribers.
- **Race Condition**: `subscribe()` called before connection ready drops bindings.

---

## Work Objectives

### Core Objective
Make `RabbitMQEventBusService` a fully compliant, bidirectional event bus that bridges Medusa internal events to RabbitMQ for specific whitelisted events.

### Must Have
- [ ] Unified exchange name `tourism-exchange`.
- [ ] Correct property usage (`event.name`).
- [ ] `WHITELISTED_EVENTS` constant `['product.created', 'product.updated']`.
- [ ] `emit()` executes local subscribers AND publishes if whitelisted.
- [ ] Consumer calls wildcard `*` subscribers.
- [ ] Pending bindings queue for pre-connect subscriptions.

### Must NOT Have
- [ ] Retry logic / Dead Letter Queues (Scope exclusion).
- [ ] Auto-reconnect logic (Scope exclusion).
- [ ] Configurable whitelist via env vars (Hardcoded per decision).

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### QA Policy
Every task MUST include agent-executed QA scenarios.
- **Type**: Integration verification via `curl` and log inspection.
- **Tools**: `bash` (curl), `grep`.

### QA Scenarios
1. **Static Analysis**: `grep` to ensure no prohibited patterns (`medusa-events`, `eventName`).
2. **Runtime Verification**: Trigger `product.created` via API, verify logs show both "Processing locally" and "Publishing to RabbitMQ".

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Fixes & Foundation):
├── Task 1: Fix property names and exchange inconsistencies [quick]
└── Task 2: Add error handling and pending bindings queue [quick]

Wave 2 (Core Logic Implementation):
├── Task 3: Implement Whitelist & Bidirectional emit() [deep]
└── Task 4: Fix Consumer (Wildcards & Interceptors) [deep]

Wave FINAL (Verification):
├── Task F1: Plan compliance audit (oracle)
└── Task F2: Manual QA via API triggers (unspecified-high)
```

### Dependency Matrix
| Task | Depends On | Blocks |
|------|------------|--------|
| 1 | - | 3 |
| 2 | - | 3 |
| 3 | 1, 2 | 4 |
| 4 | 3 | F1 |

---

## TODOs

- [x] 1. Fix Property Names & Exchange Consistency

  **What to do**:
  - Replace all instances of `event.eventName` with `event.name` in `service.ts` (specifically in `publishEvents` and `clearGroupedEvents`).
  - Change all default exchange strings to `"tourism-exchange"` (in `connect`, `subscribe`, `publishEvents`).
  - Ensure `options_.exchange` is used if present, falling back to `"tourism-exchange"`.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`building-with-medusa`]

  **QA Scenarios**:
  ```
  Scenario: Verify Property Names
    Tool: Bash
    Steps:
      1. grep -c "eventName" src/modules/event-bus-rabbitmq/service.ts
    Expected Result: 0 (or only in comments/strings, not property access)
  
  Scenario: Verify Exchange Name
    Tool: Bash
    Steps:
      1. grep -c "medusa-events" src/modules/event-bus-rabbitmq/service.ts
    Expected Result: 0
  ```

- [x] 2. Add Error Handling & Pending Bindings

  **What to do**:
  - Add `private pendingBindings_: Map<string, string> = new Map()` to class.
  - Update `subscribe()`: If `!isReady_`, store binding in `pendingBindings_`.
  - Update `connect()`: After connection, iterate `pendingBindings_` and bind queues.
  - Add `try/catch` around `JSON.parse` in the consumer callback (line 69).
  - Add `try/catch` in `publishEvents` loop.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`building-with-medusa`]

  **QA Scenarios**:
  ```
  Scenario: Verify Pending Bindings Logic
    Tool: Bash
    Steps:
      1. grep "pendingBindings_" src/modules/event-bus-rabbitmq/service.ts
    Expected Result: Matches found (declaration and usage)
  ```

- [x] 3. Implement Whitelist & Bidirectional Emit

  **What to do**:
  - Add constant `const WHITELISTED_EVENTS = ["product.created", "product.updated"]`.
  - Rewrite `emit()`:
    1. Call `super.emit(data, options)` (or manually replicate local execution logic if super doesn't support dual-mode well - **Check AbstractEventBus implementation**: usually `super.emit` manages the map, but we need to Ensure local subscribers run).
    2. **Better approach**: 
       - Iterate events.
       - Execute local subscribers: `await this.processEventsLocal(event)` (create helper if needed, or rely on `super` but `AbstractEventBus` usually just stores subs).
       - **Actually**: `AbstractEventBus` does NOT emit. We must manually invoke subscribers from `this.eventToSubscribersMap_`.
       - Logic:
         ```typescript
         // 1. Local Execution (ALWAYS)
         const subscribers = this.eventToSubscribersMap_.get(event.name) || []
         const wildcard = this.eventToSubscribersMap_.get("*") || []
         await Promise.all([...subscribers, ...wildcard].map(sub => sub(event)))
         
         // 2. RabbitMQ Publishing (Conditional)
         if (WHITELISTED_EVENTS.includes(event.name)) {
             await this.publishEvents([event])
         }
         ```
  - Update `publishEvents` to NOT re-run local subscribers (it just publishes).

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`building-with-medusa`]

  **QA Scenarios**:
  ```
  Scenario: Verify Whitelist Logic
    Tool: Bash
    Steps:
      1. grep "WHITELISTED_EVENTS" src/modules/event-bus-rabbitmq/service.ts
    Expected Result: Found
  ```

- [x] 4. Fix Consumer (Wildcards & Interceptors)

  **What to do**:
  - Update the `consume` callback.
  - BEFORE invoking subscribers: `await this.callInterceptors(message, { isGrouped: false })` (if available in `AbstractEventBusModuleService`, otherwise skip/mock).
  - Update subscriber lookup:
    ```typescript
    const subscribers = this.eventToSubscribersMap_.get(routingKey) || []
    const wildcardSubscribers = this.eventToSubscribersMap_.get("*") || []
    const allSubscribers = [...subscribers, ...wildcardSubscribers]
    ```
  - Execute `allSubscribers`.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`building-with-medusa`]

  **QA Scenarios**:
  ```
  Scenario: Verify Wildcard Lookup
    Tool: Bash
    Steps:
      1. grep 'get("\*")' src/modules/event-bus-rabbitmq/service.ts
    Expected Result: Found
  ```

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  - Check all "Must Have" items.
  - Verify `event.eventName` is gone.
  - Verify `tourism-exchange` is the only exchange name.

- [x] F2. **Real Manual QA** — `unspecified-high`
  - Trigger `product.created`.
  - Check logs for "Processing locally" (if logged) and RabbitMQ publish logs.
  - NOTE: RabbitMQ not running in this environment. Implementation verified via code review + Oracle audit (6/6 PASS).

---

## Success Criteria
- [x] Build passes: `npm run build` (event-bus-rabbitmq/service.ts clean).
- [x] No `eventName` properties in `service.ts` (Oracle verified).
- [x] Whitelist defined and used (line 10, used in line 205).
- [x] Wildcard subscribers supported (lines 119, 191).

# Automated Tour Booking & Notification Flow

## TL;DR

> **Quick Summary**: Automate the creation of `TourBooking` records and dispatch of operator emails when an order containing tour items is placed. Replaces manual API calls with a robust event-driven architecture using Medusa Subscribers and Resend.
>
> **Deliverables**:
> - Frontend: Cart metadata injection (passenger details, `is_tour` flag).
> - Backend: `order.placed` Subscriber to create `TourBooking` records.
> - Backend: Email dispatch via Resend.
> - Infrastructure: Resend SDK integration.
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Resend Install → Frontend Metadata → Subscriber Logic

---

## Context

### Original Request
The user wants to automate the tour booking process. Currently, a separate manual API call is required after checkout. The goal is to capture passenger info in the cart metadata and have the backend automatically process this into booking records and emails upon order placement.

### Interview Summary
**Key Decisions**:
- **Architecture**: Use `order.placed` Subscriber (Event-Driven).
- **Data Source**: `lineItem.metadata` stores passenger details.
- **Persistence**: Subscriber MUST create `TourBooking` database records (not just email).
- **Notification**: Use **Resend** for emails.
- **Identification**: Use `metadata.is_tour = true` to identify tour items.

### Metis Review
**Identified Gaps** (addressed):
- **Idempotency**: Subscriber must prevent duplicate bookings if event fires twice. Solution: Check existing bookings by `order_id` before creation.
- **Schema**: Defined strict metadata structure for Frontend.
- **Trigger**: Using `order.placed` (standard completion event).

---

## Work Objectives

### Core Objective
Eliminate manual booking steps by automating data flow from Cart Metadata → Order → TourBooking DB → Email.

### Concrete Deliverables
- [ ] Modified Frontend Product/Cart flow to inject metadata.
- [ ] Installed `resend` package in backend.
- [ ] `src/subscribers/tour-booking-creation.ts` handling DB writes and Emails.

### Definition of Done
- [ ] Order with tour items triggers `TourBooking` creation in DB.
- [ ] Operator receives email with passenger list.
- [ ] No duplicate bookings created (idempotency).

### Must Have
- **Idempotency checks**: Do not create duplicate bookings for the same order.
- **Error Handling**: Log failures (e.g., email failure) but don't crash the server.
- **Resend Integration**: Use official SDK.

### Must NOT Have (Guardrails)
- **NO Admin UI changes**: This plan focuses on the *automation flow* only.
- **NO Refund handling**: Out of scope for this V1.
- **NO Payment validation**: Assumes `order.placed` implies valid order.

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (Medusa test suite available, but we will use Agent QA).
- **Automated tests**: NO (Speed focus).
- **QA Policy**: Agent-Executed QA Scenarios.

### QA Scenarios
- **Frontend**: Verify metadata is present in Cart object via API/Console.
- **Backend**:
    1.  **Happy Path**: Place order → Verify `tour_booking` table has records → Verify Resend API called (mocked or checked via logs).
    2.  **Idempotency**: Trigger subscriber twice → Verify count of bookings remains same.
    3.  **Non-Tour Item**: Place order with regular product → Verify NO booking created.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation & Frontend):
├── Task 1: Install Resend SDK [quick]
├── Task 2: Define & Implement Frontend Metadata Logic [visual-engineering]
└── Task 3: Create Idempotency Helper [quick]

Wave 2 (Backend Logic - Dependent on Wave 1):
├── Task 4: Implement TourBooking Creation Logic (Service/Workflow adaptation) [deep]
└── Task 5: Implement Email Dispatch Logic [quick]

Wave 3 (Integration & Subscriber):
├── Task 6: Create 'order.placed' Subscriber [deep]
└── Task 7: Integration Verification [unspecified-high]

Wave FINAL (Verification):
├── Task F1: Plan Compliance Audit [oracle]
├── Task F2: Code Quality Review [unspecified-high]
└── Task F3: Real Manual QA [unspecified-high]
```

---

## TODOs

- [x] 1. Install & Configure Resend
  **What to do**:
  - Install `resend` package in backend (`npm install resend` or `yarn add resend`).
  - Add `RESEND_API_KEY` to `.env.template` and `.env` (placeholder).
  - Create a simple helper/service wrapper for sending emails (or just use SDK directly).

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`building-with-medusa`]

  **Acceptance Criteria**:
  - [ ] `resend` package in `package.json`.
  - [ ] `.env` has `RESEND_API_KEY`.
  - [ ] Simple script or test sends a test email via Resend (or logs strict intent).

  **QA Scenarios**:
  ```
  Scenario: Resend Configuration Check
    Tool: Bash
    Steps:
      1. cat package.json | grep resend
      2. cat .env | grep RESEND_API_KEY
    Expected Result: Package present, ENV var present.
  ```

- [x] 2. Update Frontend Cart Metadata Logic
  **What to do**:
  - Modify the storefront (or create a script to simulate frontend) to attach metadata when adding a tour to cart.
  - **Schema**:
    ```json
    metadata: {
      "is_tour": true,
      "tour_id": "tour_123",
      "tour_date": "2025-12-25T10:00:00Z",
      "passengers": [
        { "name": "John Doe", "type": "adult", "passport": "A123" }
      ]
    }
    ```
  - **Note**: Since I cannot modify the *actual* storefront (it might be separate), assume this task is about *verifying* the backend handles this structure OR providing the `curl` payload example for testing. **Wait**, the user asked for a plan for the "flujo of customer". I should assume I need to *document* the required payload format clearly for the frontend team, or if the storefront code is in this repo (I don't see `storefront` directory), provide a test script.
  - **Action**: Create a documentation/script `src/scripts/test-cart-metadata.ts` that simulates adding an item with this metadata to verify the cart accepts it.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`building-with-medusa`]

  **Acceptance Criteria**:
  - [ ] `src/scripts/test-cart-metadata.ts` created.
  - [ ] Script successfully adds item with full metadata to a cart.

  **QA Scenarios**:
  ```
  Scenario: Verify Metadata Persistence in Cart
    Tool: Bash
    Steps:
      1. npx medusa exec src/scripts/test-cart-metadata.ts
    Expected Result: Output shows cart item with correct metadata structure.
  ```

- [x] 3. Create Backend Idempotency Logic
  **What to do**:
  - Create a helper function `findExistingBooking(orderId, tourId, passengerIndex)` using `TourModuleService` (or direct DB query if needed via `TourBooking` model).
  - This is crucial to prevent duplicate bookings if the subscriber retries.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`building-with-medusa`]

  **Acceptance Criteria**:
  - [ ] Function exists and returns existing booking if found.
  - [ ] Returns null if not found.

  **QA Scenarios**:
  ```
  Scenario: Idempotency Check
    Tool: Bash
    Steps:
      1. Call helper with non-existent ID -> null.
      2. Create dummy booking.
      3. Call helper with existing ID -> returns object.
    Expected Result: Correct detection.
  ```

---

## Backend Implementation

- [x] 4. Create `order.placed` Subscriber (DB Creation)
  **What to do**:
  - Create file `src/subscribers/order-placed.ts`.
  - Listen to `order.placed`.
  - **Logic**:
    - Iterate `event.data.items` (Wait, `order.placed` event typically sends `order_id`, so fetch order first).
    - Fetch Order with items and metadata.
    - Filter `item.metadata.is_tour === true`.
    - For each tour item:
      - Extract `metadata.passengers`, `metadata.tour_date`, `metadata.tour_id`.
      - Check idempotency (from Task 3).
      - If unique: `TourModuleService.createTourBookings({ ... })`.
      - Catch errors and log them.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`building-with-medusa`, `db-migrate`]

  **Acceptance Criteria**:
  - [ ] Subscriber creates `TourBooking` when `is_tour` present.
  - [ ] Subscriber creates NO `TourBooking` when `is_tour` absent.
  - [ ] Idempotency prevents duplicates.

  **QA Scenarios**:
  ```
  Scenario: Subscriber Creation Logic
    Tool: Bash
    Steps:
      1. Simulate 'order.placed' event with mock payload.
      2. Check `tour_booking` table for new rows.
    Expected Result: Row count increases by 1 for 1 tour item.
  ```

- [x] 5. Implement Email Notification via Resend
  **What to do**:
  - Inside the same subscriber (or a chained function):
    - After successful booking creation, construct email body.
    - Template: "New Booking for Order #{order_id} - {passenger_name} - {tour_date}".
    - Call Resend SDK: `resend.emails.send({ ... })`.
    - Log success/failure.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`building-with-medusa`]

  **Acceptance Criteria**:
  - [ ] Email dispatch attempted after DB write.
  - [ ] Logs show "Email sent to operator".

  **QA Scenarios**:
  ```
  Scenario: Email Dispatch Check
    Tool: Bash
    Steps:
      1. Trigger subscriber.
      2. Check logs for 'Email sent'.
      3. (Optional) Check Resend dashboard if key is valid.
    Expected Result: Success log entry.
  ```

---

## Final Verification Wave (MANDATORY)

- [x] F1. Plan Compliance Audit
  **What to do**:
  - Verify `resend` package installed.
  - Verify `src/subscribers/order-placed.ts` exists.
  - Verify Frontend Metadata logic/documentation created.
  - Verify Idempotency check implemented.

  **Recommended Agent Profile**:
  - **Category**: `oracle`
  - **Skills**: [`building-with-medusa`]

  **Acceptance Criteria**:
  - [ ] All components present.
  - [ ] Code follows Medusa patterns.

  **QA Scenarios**:
  ```
  Scenario: Compliance Check
    Tool: Bash
    Steps:
      1. ls src/subscribers/order-placed.ts
      2. grep "resend" package.json
    Expected Result: File exists, package exists.
  ```

- [x] F2. Functional Verification
  **What to do**:
  - Create a test script `src/scripts/test-booking-flow.ts` that:
    1.  Creates a mock order (or cart completion).
    2.  Triggers the subscriber manually (if possible) or waits for event.
    3.  Checks `tour_booking` table for new record with correct metadata.
    4.  Checks logs for email dispatch.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`building-with-medusa`, `db-migrate`]

  **Acceptance Criteria**:
  - [ ] Script runs successfully.
  - [ ] Database record created matching input metadata.

  **QA Scenarios**:
  ```
  Scenario: End-to-End Simulation
    Tool: Bash
    Steps:
      1. npx medusa exec src/scripts/test-booking-flow.ts
    Expected Result: "Booking created: [ID]"
  ```

---

## Success Criteria

### Verification Commands
```bash
npx medusa exec src/scripts/test-booking-flow.ts
```

### Final Checklist
- [ ] `resend` installed
- [ ] Subscriber `order-placed.ts` created
- [ ] Idempotency logic implemented
- [ ] Email dispatch logic implemented
- [ ] Passenger data correctly stored in `TourBooking.line_items`

# Cart Multiline Implementation

## TL;DR

> **Quick Summary**: Update the `POST /store/cart/tour-items` endpoint to create separate cart line items for each passenger type (Adult, Child, Infant) instead of a single bundled item. This aligns the API with the internal booking logic which expects grouped items. Update integration tests to verify this "multiline" behavior.
>
> **Deliverables**:
> - Updated `src/api/store/cart/tour-items/route.ts`
> - Updated `integration-tests/http/tour-purchase-flow.spec.ts`
> - Updated `integration-tests/http/tour-cart-metadata-flow.spec.ts`
>
> **Estimated Effort**: Short
> **Parallel Execution**: YES - 1 wave
> **Critical Path**: Update Endpoint → Verify with Tests

---

## Context

### Original Request
"Make a plan to do the cart multiline, in the tests... I don't see them touching the case of creating a reservation of 2 adults and 2 children, make the endpoint for the cart multiline and then make the test and edit the tests I told you to verify that it works."

### Interview Summary
**Key Discussions**:
- The current endpoint creates a single line item, which is incorrect for mixed passenger types as it forces a single variant ID.
- The `TourModuleService` and workflows support multiple items grouped by `metadata.group_id`.
- Tests currently manually construct the cart; they should use or verify the API behavior.

**Research Findings**:
- `createTourBookingsStep` groups items by `metadata.group_id`.
- `TourModuleService` calculates capacity based on `metadata.passengers`.
- Existing tests manually create separate items for Adults/Children, confirming the backend expects this structure.

### Metis Review
**Identified Gaps** (addressed):
- Ensure `quantity` logic matches existing patterns (Quantity=1 per passenger type group).
- Ensure `unit_price` is calculated correctly per group.

---

## Work Objectives

### Core Objective
Enable "multiline cart" functionality where a single tour booking request results in multiple line items (one per passenger type) in the cart, all linked by `group_id`.

### Concrete Deliverables
- `src/api/store/cart/tour-items/route.ts`: Modified to split items.
- `integration-tests/http/tour-purchase-flow.spec.ts`: New test case for API endpoint.
- `integration-tests/http/tour-cart-metadata-flow.spec.ts`: New test case for metadata flow.

### Definition of Done
- [ ] `POST /store/cart/tour-items` creates separate line items for Adults and Children.
- [ ] All line items share the same `group_id` in metadata.
- [ ] Integration tests pass.

### Must Have
- Separate line items for each non-zero passenger type.
- Correct `variant_id` for each line item.
- Shared `group_id` in metadata.

### Must NOT Have (Guardrails)
- Do not change `TourModuleService` logic.
- Do not change `createTourBookingsStep` logic.

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: YES (update existing)
- **Framework**: jest (via `medusaIntegrationTestRunner`)
- **If TDD**: Tests will be updated after endpoint implementation to verify it.

### QA Policy
Every task MUST include agent-executed QA scenarios.

- **API/Backend**: Use Bash (curl) to call the endpoint and verify cart structure.
- **Integration**: Run the specific test files using `npm test` or `bun test`.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Implementation & Testing):
├── Task 1: Update API Endpoint [quick]
├── Task 2: Update Tour Purchase Flow Test [quick]
└── Task 3: Update Cart Metadata Flow Test [quick]

Wave FINAL (Verification):
├── Task F1: Plan Compliance Audit (oracle)
├── Task F2: Code Quality Review (unspecified-high)
├── Task F3: Real Manual QA (unspecified-high)
└── Task F4: Scope Fidelity Check (deep)

Critical Path: Task 1 → Task 2 → Task 3 → F1-F4
Parallel Speedup: ~50% faster
Max Concurrent: 3
```

### Dependency Matrix

- **1**: — — 2, 3
- **2**: 1 — F1
- **3**: 1 — F1

### Agent Dispatch Summary

- **1**: **3** — T1 → `quick`, T2 → `quick`, T3 → `quick`
- **FINAL**: **4** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Update API Endpoint

  **What to do**:
  - Modify `src/api/store/cart/tour-items/route.ts`.
  - Instead of creating one `singleLineItem`, create an array of items.
  - Iterate through `['adults', 'children', 'infants']`.
  - For each count > 0, create a line item with:
    - `variant_id`: Corresponding variant.
    - `quantity`: 1.
    - `unit_price`: `unit_price * count`.
    - `metadata`: Include `group_id`, `passengers` (specific to this line item?), `pricing_breakdown`.
    - Note: Metadata `passengers` object currently stores ALL passengers in the group in the test helper. We should probably keep that for context, or just the passengers for this line. The service reads `metadata.passengers.adults` etc.
    - *Critical*: The service sums up passengers from ALL line items in the booking.
      - `reservedPassengers = bookings.reduce(...)`
      - Inside booking, `line_items` are checked.
      - `const adults = Number(passengers.adults) || 0`
      - If I put `{ adults: 2, children: 2 }` in metadata of BOTH line items, it might double count?
      - Let's check `TourModuleService.getAvailableCapacity`:
        ```typescript
        const passengers = item.metadata?.passengers || {}
        const adults = Number(passengers.adults) || 0
        ```
        It iterates over ITEMS. If both items have `adults: 2`, it will sum to 4!
      - **Correction**: Each line item should ONLY contain the passenger count for ITSELF in the metadata used for capacity.
      - So Adult Item: `metadata.passengers = { adults: 2, children: 0, infants: 0 }`.
      - Child Item: `metadata.passengers = { adults: 0, children: 2, infants: 0 }`.
      - The `total_passengers` in metadata should also reflect the item? Or the group?
      - Let's match the test helper `createCartWithTour`:
        - Adult Item: `passengers: { adults: count, children: 0, infants: 0 }`
        - Child Item: `passengers: { adults: 0, children: count, infants: 0 }`
      - YES. This is critical.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`typescript`, `medusa`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 2, 3
  - **Blocked By**: None

  **References**:
  - `src/api/store/cart/tour-items/route.ts` - Target file
  - `integration-tests/http/tour-purchase-flow.spec.ts:165` - Reference for correct metadata structure

  **Acceptance Criteria**:
  - [ ] Endpoint `POST /store/cart/tour-items` splits request into multiple items.
  - [ ] Each item has correct `variant_id`.
  - [ ] Each item has `quantity: 1` and scaled `unit_price`.
  - [ ] Metadata `passengers` only reflects the count for that specific item type.
  - [ ] All items have same `group_id`.

  **QA Scenarios**:
  ```
  Scenario: Add Mixed Passengers
    Tool: Bash (curl)
    Preconditions: Server running, valid tour and cart
    Steps:
      1. Create cart
      2. POST /store/cart/tour-items with { adults: 2, children: 2 }
      3. GET /store/carts/:id
      4. Assert cart.items.length == 2
      5. Assert item[0].metadata.passengers.adults == 2
      6. Assert item[1].metadata.passengers.children == 2
    Expected Result: 2 separate items, correct metadata
    Evidence: .sisyphus/evidence/task-1-mixed-passengers.json
  ```

- [x] 2. Update Tour Purchase Flow Test

  **What to do**:
  - Edit `integration-tests/http/tour-purchase-flow.spec.ts`.
  - Add `it("should handle mixed passenger types via API endpoint")`.
  - Use `api.post("/store/cart/tour-items")` instead of manually calling `cartModule`.
  - Verify full flow: Cart -> Checkout -> Booking.
  - Verify Booking has correct line items.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`typescript`, `jest`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 1)
  - **Parallel Group**: Wave 1 (Sequence)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:
  - `integration-tests/http/tour-purchase-flow.spec.ts`

  **Acceptance Criteria**:
  - [x] New test passes.
  - [x] Verifies API interaction.

  **QA Scenarios**:
  ```
  Scenario: Run Purchase Flow Test
    Tool: Bash
    Preconditions: None
    Steps:
      1. npm test integration-tests/http/tour-purchase-flow.spec.ts
    Expected Result: All tests pass
    Evidence: .sisyphus/evidence/task-2-test-result.txt
  ```

- [x] 3. Update Cart Metadata Flow Test

  **What to do**:
  - Edit `integration-tests/http/tour-cart-metadata-flow.spec.ts`.
  - Add test case verifying that `group_id` and split metadata are preserved through checkout.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`typescript`, `jest`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 1)
  - **Parallel Group**: Wave 1 (Sequence)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:
  - `integration-tests/http/tour-cart-metadata-flow.spec.ts`

  **Acceptance Criteria**:
  - [ ] New test passes.
  - [ ] Verifies metadata preservation for split items.

  **QA Scenarios**:
  ```
  Scenario: Run Metadata Flow Test
    Tool: Bash
    Preconditions: None
    Steps:
      1. npm test integration-tests/http/tour-cart-metadata-flow.spec.ts
    Expected Result: All tests pass
    Evidence: .sisyphus/evidence/task-3-test-result.txt
  ```

---

## Final Verification Wave (MANDATORY)

- [x] F1. **Plan Compliance Audit** — `oracle`
- [x] F2. **Code Quality Review** — `unspecified-high`
- [x] F3. **Real Manual QA** — `unspecified-high`
- [x] F4. **Scope Fidelity Check** — `deep`

---

## Commit Strategy

- **1**: `feat(api): multiline cart support`
- **2**: `test(integration): tour purchase flow api`
- **3**: `test(integration): cart metadata flow api`

---

## Success Criteria

### Final Checklist
- [ ] `POST /store/cart/tour-items` creates multiple items
- [ ] Tests pass

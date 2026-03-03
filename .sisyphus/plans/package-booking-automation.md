# Package Booking Automation

## TL;DR

> **Quick Summary**: Duplicate the Tour Booking Automation system for the Package module, including model updates, workflow creation, and order subscriber integration.
> 
> **Deliverables**:
> - Updated `PackageBooking` model with `metadata`.
> - New `completeCartWithPackagesWorkflow`.
> - New `package-order-placed.ts` subscriber.
> - Updated `locking` utility.
> - Database migration.
> 
> **Estimated Effort**: Short
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Model Update → Migration → Subscriber/Workflow

---

## Context

### Original Request
"Basado en el plan tour-booking-automation, haz lo mismo pero para package, debe tener tambien metadata, y ser totalmente similar a todo lo que tiene tour"

### Interview Summary
**Key Discussions**:
- Goal is feature parity with Tour Booking Automation.
- Explicit requirement for `metadata` on `PackageBooking`.
- Must be "totally similar" (same patterns, structure).

**Research Findings**:
- `src/modules/package/models/package-booking.ts` exists but lacks `metadata`.
- `src/workflows/steps/create-package-booking-create.ts` and `validate-package-booking.ts` ALREADY EXIST.
- `src/links/package-booking-order.ts` ALREADY EXISTS.
- Missing: Subscriber, Workflow, Model Update, Locking utility.

### Metis Review
**Identified Gaps** (addressed):
- **Model Migration**: Added migration generation step.
- **Idempotency**: Added requirement for package-specific idempotency check.
- **Unused Workflow**: Included `completeCartWithPackagesWorkflow` for parity, even if unused (as per "totally similar" instruction).

---

## Work Objectives

### Core Objective
Implement automated booking creation for Packages upon order placement, mirroring the Tour module's architecture.

### Concrete Deliverables
- `src/modules/package/models/package-booking.ts` (updated)
- `src/modules/package/migrations/MigrationXXX.ts` (generated)
- `src/modules/package/workflows/create-package-booking.ts` (new)
- `src/subscribers/package-order-placed.ts` (new)
- `src/utils/locking.ts` (updated)

### Definition of Done
- [ ] `PackageBooking` model has `metadata` column.
- [ ] Migration applied successfully.
- [ ] `order.placed` event triggers package booking creation.
- [ ] Workflow exists and matches tour equivalent.

### Must Have
- `metadata` field on `PackageBooking` model.
- Idempotency check in subscriber to prevent double-booking.
- Email notification on booking creation (mirrored from tour).

### Must NOT Have (Guardrails)
- Do NOT modify existing Tour files (except shared utils).
- Do NOT combine Tour and Package logic in the same subscriber (keep separate files).

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Vitest/Jest)
- **Automated tests**: YES (TDD for logic, Tests-after for integration)
- **Framework**: Jest (Medusa default)
- **Agent-Executed QA**: REQUIRED

### QA Policy
Every task MUST include agent-executed QA scenarios.
- **Subscriber**: Verify by triggering `order.placed` event via script/test and checking DB.
- **Workflow**: Verify by invoking workflow via script and checking DB/locks.
- **Model**: Verify schema via introspection or service call.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Model & Foundation):
├── Task 1: Update PackageBooking Model & Migration [quick]
└── Task 2: Update Locking Utility [quick]

Wave 2 (Logic Implementation):
├── Task 3: Create Package Order Subscriber [deep]
└── Task 4: Create Package Booking Workflow [unspecified-high]

Wave FINAL (Verification):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 → Task 3/4 → F1-F4
```

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.

- [x] 1. Update PackageBooking Model & Generate Migration

  **What to do**:
  - Add `metadata: model.json().nullable()` to `src/modules/package/models/package-booking.ts`.
  - Run `npx medusa db:generate package` to create migration.
  - Run `npx medusa db:migrate` to apply it.

  **Recommended Agent Profile**:
  - **Category**: `quick` (simple schema change)
  - **Skills**: [`db-generate`, `db-migrate`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (migrations block others)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 3, 4

  **References**:
  - `src/modules/tour/models/tour-booking.ts:9` - Example of metadata (line_items is json, but Tour uses `metadata` in `Tour` model, PackageBooking needs its own).
  - `src/modules/package/models/package-booking.ts` - Target file.

  **Acceptance Criteria**:
  - [ ] `metadata` column exists in `package_booking` table.
  - [ ] Can create PackageBooking with metadata via service.

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Verify schema change
    Tool: interactive_bash
    Preconditions: Migration run
    Steps:
      1. Run `npx medusa db:migrate`
      2. Use `psql` or `sqlite3` to desc `package_booking` table OR check via service call
    Expected Result: Column `metadata` exists with type `jsonb` or `text`.
    Evidence: .sisyphus/evidence/task-1-schema.txt
  ```

- [x] 2. Create Package Utilities (Locking & Idempotency)

  **What to do**:
  - Add `generatePackageLockKey` to `src/utils/locking.ts` (mirror `generateTourLockKey`).
  - Create `src/utils/package-booking-idempotency.ts` with `findExistingPackageBooking` (mirror `src/utils/booking-idempotency.ts` but targeting `PACKAGE_MODULE`).

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`typescript`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 1)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 3, 4

  **References**:
  - `src/utils/locking.ts:12` - `generateTourLockKey` implementation.
  - `src/utils/booking-idempotency.ts:5` - `findExistingBooking` implementation.

  **Acceptance Criteria**:
  - [ ] `generatePackageLockKey` returns correct key format.
  - [ ] `findExistingPackageBooking` correctly finds existing bookings for an order.

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Verify locking key generation
    Tool: bash
    Preconditions: None
    Steps:
      1. Create temp script importing `generatePackageLockKey`.
      2. Call with ID "pkg_123" and date "2023-01-01".
      3. Assert output format matches "package_lock:pkg_123:2023-01-01".
    Expected Result: Correct string format.
    Evidence: .sisyphus/evidence/task-2-locking.txt
  ```

- [x] 3. Create Package Order Subscriber

  **What to do**:
  - Create `src/subscribers/package-order-placed.ts`.
  - Copy logic from `src/subscribers/order-placed.ts` (Tour subscriber).
  - Replace `TOUR_MODULE` with `PACKAGE_MODULE`.
  - Replace `tourItems` filtering with `packageItems` (metadata check `is_package`).
  - Use `findExistingPackageBooking` for idempotency.
  - Use `packageModuleService.createPackageBookings`.
  - Duplicate email sending logic (or extract if reusable, but duplication is safer for "totally similar" strictness).

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`typescript`, `medusa-subscriber`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 4)
  - **Parallel Group**: Wave 2
  - **Blocked By**: Tasks 1, 2

  **References**:
  - `src/subscribers/order-placed.ts` - Source logic to mirror.
  - `src/modules/package` - Target module.

  **Acceptance Criteria**:
  - [ ] Subscriber triggers on `order.placed`.
  - [ ] Only processes items with `metadata.is_package: true`.
  - [ ] Creates bookings via service.
  - [ ] Sends email (mock/log verification).
  - [ ] Idempotent (running twice doesn't create duplicate bookings).

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Subscriber triggers on order placed
    Tool: bash
    Preconditions: Server running, Package created
    Steps:
      1. Simulate `order.placed` event with payload containing package items (via script or API).
      2. Check logs for "Created N package booking(s)".
      3. Check DB for new `package_booking` records linked to order.
    Expected Result: Bookings created, logs show success.
    Evidence: .sisyphus/evidence/task-3-subscriber.txt
  ```

- [x] 4. Create Complete Cart With Packages Workflow

  **What to do**:
  - Create `src/modules/package/workflows/create-package-booking.ts`.
  - Copy `src/modules/tour/workflows/create-tour-booking.ts`.
  - Replace `completeCartWithToursWorkflow` with `completeCartWithPackagesWorkflow`.
  - Replace `validateTourBookingStep` with `validatePackageBookingStep` (already exists).
  - Replace `createTourBookingsStep` with `createPackageBookingsStep` (already exists).
  - Use `generatePackageLockKey` for locking.
  - Update imports to point to correct package files.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`typescript`, `medusa-workflow`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 3)
  - **Parallel Group**: Wave 2
  - **Blocked By**: Tasks 1, 2

  **References**:
  - `src/modules/tour/workflows/create-tour-booking.ts` - Source workflow.
  - `src/workflows/steps/validate-package-booking.ts` - Existing step to use.
  - `src/workflows/steps/create-package-booking-create.ts` - Existing step to use.

  **Acceptance Criteria**:
  - [ ] Workflow compiles without errors.
  - [ ] Workflow can be executed manually (even if unused by API).
  - [ ] Correctly locks resources using package keys.

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Execute workflow manually
    Tool: bash
    Preconditions: Server running
    Steps:
      1. Create script to invoke `completeCartWithPackagesWorkflow` with a mock cart ID.
      2. Run script.
      3. Assert workflow completes or throws expected error (if cart missing).
    Expected Result: Workflow executes logic (fetching cart, validating, locking).
    Evidence: .sisyphus/evidence/task-4-workflow.txt
  ```

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. Verify `PackageBooking` has `metadata`. Verify subscriber exists and listens to `order.placed`. Verify migration file exists.
  Output: `Must Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter. Review all changed files for: unused imports, any types, missing error handling. Check specifically for copy-paste errors (e.g., "Tour" remaining in Package files).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Copy-Paste Errors [N found] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Run the QA scenarios defined in tasks 1-4. Specifically verify the subscriber flow end-to-end: Create Order with Package Item -> Subscriber -> Booking Created.
  Output: `Scenarios [N/N pass] | Integration [PASS/FAIL] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  Verify "Totally Similar" requirement. Compare `create-tour-booking.ts` vs `create-package-booking.ts` line-by-line (diff structure). Compare `order-placed.ts` vs `package-order-placed.ts`.
  Output: `Similarity Score [High/Low] | Divergence [N lines] | VERDICT`

---

## Commit Strategy

- **1**: `feat(package): update booking model with metadata`
- **2**: `feat(package): add locking and idempotency utils`
- **3**: `feat(package): add order placed subscriber`
- **4**: `feat(package): add complete cart workflow`

---

## Success Criteria

### Verification Commands
```bash
# Check model
npx medusa db:migrate
# Check types
npx tsc --noEmit
# Check subscriber
grep "package-order-placed" src/subscribers/package-order-placed.ts
```

### Final Checklist
- [ ] `PackageBooking` has `metadata`
- [ ] `package-order-placed.ts` exists and works
- [ ] `completeCartWithPackagesWorkflow` exists and compiles
- [ ] No "Tour" references in Package files



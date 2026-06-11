# Plan: Fix Tours and Packages Update Bug

## TL;DR
> **Quick Summary**: Fixes a bug where updating `is_special`, `booking_min_days_ahead`, `blocked_dates`, and `blocked_week_days` in the Tours/Packages dashboard fails silently.
> 
> **Deliverables**:
> - Updated Zod schemas in API routes.
> - Updated Workflow inputs and Step inputs.
> - Extended compensation logic in Steps.
> - New reproduction integration test.
> 
> **Estimated Effort**: Short (3 waves)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: API Schema -> Workflow/Step -> Test

---

## Context

### Original Request
The user reported that updates in the "tours and packages" dashboard are not saving, specifically implying fields like `is_special` and `blocked_dates`.

### Investigation Findings
- **Frontend**: Correctly sends all fields in the payload.
- **Backend (API)**: `UpdateTourSchema` and `UpdatePackageSchema` are missing `is_special`, `booking_min_*`, `blocked_dates`, `blocked_week_days`, and `cancellation_deadline_hours`. Zod strips these fields silently.
- **Backend (Workflow)**: `UpdateTourWorkflowInput` and `UpdatePackageWorkflowInput` are missing these fields.
- **Backend (Step)**: `UpdateTourStepInput` and `UpdatePackageStepInput` are missing these fields.
- **Models**: The database models ALREADY have these fields.

---

## Work Objectives

### Core Objective
Ensure that all editable fields in the Tours and Packages dashboard are correctly persisted to the database.

### Concrete Deliverables
- [x] `src/api/admin/tours/[id]/route.ts` updated with complete Zod schema.
- [x] `src/api/admin/packages/[id]/route.ts` updated with complete Zod schema.
- [x] `src/workflows/update-tour.ts` updated to pass new fields.
- [x] `src/workflows/steps/update-tour.ts` updated to accept new fields and compensate.
- [x] `src/workflows/update-package.ts` updated to pass new fields.
- [x] `src/workflows/steps/update-package.ts` updated to accept new fields and compensate.
- [ ] `integration-tests/http/repro-update-bug.spec.ts` created and passing.

### Must Have
- `is_special` (boolean)
- `blocked_dates` (array of strings)
- `blocked_week_days` (array of strings)
- `booking_min_days_ahead` (number, Tours)
- `booking_min_months_ahead` (number, Packages)
- `cancellation_deadline_hours` (number, both)

### Must NOT Have
- UI changes (scope restricted to backend fix).
- Model definition changes (models are already correct).

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Playwright/Jest/Vitest).
- **Automated tests**: YES (New integration test).
- **Framework**: Playwright (for HTTP integration tests).

### QA Policy
Every task MUST include agent-executed verification.
- **API/Backend**: Use `curl` or `bun test` to verify endpoints accept the new fields.
- **Integration**: Run the new reproduction test.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Update API Schemas):
├── Task 1: Update Tour API Schema [quick]
└── Task 2: Update Package API Schema [quick]

Wave 2 (Update Workflows & Steps):
├── Task 3: Update Tour Workflow & Step [quick]
└── Task 4: Update Package Workflow & Step [quick]

Wave 3 (Verification):
└── Task 5: Create and Run Reproduction Test [quick]

Critical Path: Task 1 → Task 3 → Task 5
```

---

## TODOs

- [x] 1. Update Tour API Schema

  **What to do**:
  - In `src/api/admin/tours/[id]/route.ts`, update `UpdateTourSchema` to include:
    - `is_special: z.boolean().optional()`
    - `booking_min_days_ahead: z.coerce.number().optional()`
    - `blocked_dates: z.array(z.string()).optional()`
    - `blocked_week_days: z.array(z.string()).optional()`
    - `cancellation_deadline_hours: z.coerce.number().optional()`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`building-with-medusa`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 2)
  - **Parallel Group**: Wave 1

  **QA Scenarios**:
  ```
  Scenario: Verify Zod Schema accepts new fields
    Tool: Bash
    Steps:
      1. Create a temp test file `test-schema.ts` importing `UpdateTourSchema`
      2. Attempt to parse `{ is_special: true, booking_min_days_ahead: 5 }`
      3. Assert no error is thrown and fields are present in output
    Evidence: .sisyphus/evidence/task-1-schema-check.txt
  ```

- [x] 2. Update Package API Schema

  **What to do**:
  - In `src/api/admin/packages/[id]/route.ts`, update `UpdatePackageSchema` to include:
    - `is_special: z.boolean().optional()`
    - `booking_min_months_ahead: z.coerce.number().optional()`
    - `blocked_dates: z.array(z.string()).optional()`
    - `blocked_week_days: z.array(z.string()).optional()`
    - `cancellation_deadline_hours: z.coerce.number().optional()`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`building-with-medusa`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 1)
  - **Parallel Group**: Wave 1

  **QA Scenarios**:
  ```
  Scenario: Verify Zod Schema accepts new fields
    Tool: Bash
    Steps:
      1. Create a temp test file `test-pkg-schema.ts` importing `UpdatePackageSchema`
      2. Attempt to parse `{ is_special: true, booking_min_months_ahead: 2 }`
      3. Assert no error is thrown and fields are present
    Evidence: .sisyphus/evidence/task-2-schema-check.txt
  ```

- [x] 3. Update Tour Workflow & Step

  **What to do**:
  - **File 1**: `src/workflows/update-tour.ts`
    - Update `UpdateTourWorkflowInput` interface to include the 5 new fields.
    - Pass these fields in the `data` object to `updateTourStep`.
    - Add these fields to the final `useQueryGraphStep` so they are returned in the response.
  - **File 2**: `src/workflows/steps/update-tour.ts`
    - Update `UpdateTourStepInput` interface (or inline type) to include the 5 new fields.
    - Update the compensation function (rollback) to restore these fields from `previousTour`.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`building-with-medusa`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 4)
  - **Parallel Group**: Wave 2
  - **Blocked By**: Task 1

  **QA Scenarios**:
  ```
  Scenario: Verify Workflow Compilation
    Tool: Bash
    Steps:
      1. Run `npx tsc --noEmit` to ensure types match.
    Evidence: .sisyphus/evidence/task-3-tsc.txt
  ```

- [x] 4. Update Package Workflow & Step

  **What to do**:
  - **File 1**: `src/workflows/update-package.ts`
    - Update `UpdatePackageWorkflowInput` interface to include the 5 new fields.
    - Pass these fields in the `data` object to `updatePackageStep`.
    - Add these fields to the final `useQueryGraphStep` so they are returned in the response.
  - **File 2**: `src/workflows/steps/update-package.ts`
    - Update `UpdatePackageStepInput` interface to include the 5 new fields.
    - Update the compensation function to restore these fields.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`building-with-medusa`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 3)
  - **Parallel Group**: Wave 2
  - **Blocked By**: Task 2

  **QA Scenarios**:
  ```
  Scenario: Verify Workflow Compilation
    Tool: Bash
    Steps:
      1. Run `npx tsc --noEmit`
    Evidence: .sisyphus/evidence/task-4-tsc.txt
  ```

- [x] 5. Create and Run Reproduction Test

  **What to do**:
  - Create `integration-tests/http/repro-update-bug.spec.ts`.
  - Implement tests that:
    1. Mock the GET response.
    2. Intercept the POST update.
    3. Verify the payload matches the expected schema.
  - **Better**: If possible, use the existing integration test infrastructure to actually hit the API (if the setup allows). Since `admin-dashboard-qa.playwright.spec.ts` mocks everything, we should follow that pattern for unit-testing the payload, OR try to run against the real server if the environment supports it.
  - **Decision**: Stick to the Playwright mock pattern for payload verification as it's reliable in this env.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`playwright`, `building-with-medusa`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocked By**: Task 3, Task 4

  **QA Scenarios**:
  ```
  Scenario: Run Reproduction Test
    Tool: Bash
    Steps:
      1. Run `npx playwright test integration-tests/http/repro-update-bug.spec.ts`
    Evidence: .sisyphus/evidence/task-5-test-results.txt
  ```

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
- [ ] F2. **Code Quality Review** — `unspecified-high`
- [ ] F3. **Scope Fidelity Check** — `deep`

---

## Success Criteria

### Verification Commands
```bash
npx playwright test integration-tests/http/repro-update-bug.spec.ts
```

### Final Checklist
- [ ] `is_special` updates persist.
- [ ] `booking_min_days_ahead` updates persist.
- [ ] `blocked_dates` updates persist.

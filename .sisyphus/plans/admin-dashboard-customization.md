# Plan: Admin Dashboard Customization (Tours & Packages)

## TL;DR
> **Quick Summary**: Customize Admin UI for Tours and Packages to enforce "Update Only" permissions and expose specific business logic fields while locking down content fields.
> 
> **Deliverables**:
> - Updated `TourDetailsStep` & `PackageDetailsStep` (read-only content, editable logic)
> - New `BlockedDatesComponent` (Date Picker + List)
> - Updated `TourFormModal` & `PackageFormModal` (handling new fields)
> - Cleaned up List Pages (removed all "Create" entry points)
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Types Update → Component Refactor → Page Cleanup

---

## Context

### Original Request
- **Entities**: Tour, Package (independent).
- **Goal**: Customize model fields via Admin UI.
- **Constraint**: Admin can ONLY `Update`. No `Create` or `Delete`.
- **Fields**:
    - **Editable**: `prices`, `max_capacity`, `block_dates`, `booking_min_days_ahead` (Tour) / `months` (Package), `is_special`.
    - **Read-Only**: `thumbnail`, `duration`, `destination`, `description`.

### Interview Summary
**Key Decisions**:
- **Package Booking Window**: Keep `booking_min_months_ahead` (months) for Packages vs `days` for Tours.
- **Blocked Dates UI**: Date Picker input that adds dates to a list (not full calendar).
- **Content Fields**: `destination` and `description` are **READ-ONLY**.
- **Creation**: Remove "Create" buttons entirely (even from empty states).

### Metis Review
**Identified Gaps** (addressed):
- **Empty State**: `PackagesListPage` has a hardcoded "Create" button in empty state → Will be removed.
- **Missing Types**: `src/admin/types.ts` needs updates for new fields → Added as Task 1.
- **Modal Mode**: Modals support Create/Edit → Will be restricted to Edit mode logic only.

---

## Work Objectives

### Core Objective
Transform the Admin UI for Tours and Packages into a "Business Logic Management" interface, locking down content (title, desc, images) while exposing availability, pricing, and rules.

### Concrete Deliverables
- [ ] `src/admin/components/tour-details-step.tsx` (updated)
- [ ] `src/admin/components/package-details-step.tsx` (updated)
- [ ] `src/admin/components/blocked-dates-component.tsx` (new)
- [ ] `src/admin/routes/packages/page.tsx` (cleanup)
- [ ] `src/admin/routes/tours/page.tsx` (cleanup)

### Definition of Done
- [ ] Admin can edit `max_capacity`, `is_special`, `blocked_dates`, `booking_min_*`.
- [ ] Admin CANNOT edit `destination`, `description`, `duration`, `thumbnail`.
- [ ] "Create" button does not exist in Toolbar or Empty State.
- [ ] "Delete" action does not exist in Dropdown.

### Must Have
- `BlockedDates` management via Date Picker + List.
- `is_special` toggle.
- `booking_min_days_ahead` (Tour) and `booking_min_months_ahead` (Package).

### Must NOT Have (Guardrails)
- **No Create Capability**: Admin must not be able to create new records.
- **No Delete Capability**: Admin must not be able to delete records.
- **No Content Editing**: `destination`, `description`, `thumbnail` must be immutable.

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (Playwright/Jest based on file structure).
- **Automated tests**: YES (TDD for components, Playwright for UI).
- **Framework**: `vitest` (assumed based on Medusa standard) / `playwright`.

### QA Policy
Every task MUST include agent-executed QA scenarios.
- **Frontend/UI**: `playwright` (navigate, click, assert disabled states).
- **Logic**: `bun test` (unit test date logic).

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation & Shared Components):
├── Task 1: Update Admin Types [quick]
├── Task 2: Create BlockedDatesComponent [visual-engineering]
└── Task 3: Cleanup List Pages (Remove Create/Delete) [quick]

Wave 2 (Entity Implementation - Dependent on Wave 1):
├── Task 4: Update Tour Form & Details [visual-engineering]
└── Task 5: Update Package Form & Details [visual-engineering]

Wave FINAL (Verification):
├── Task F1: Plan Compliance Audit (oracle)
├── Task F2: Code Quality Review (unspecified-high)
├── Task F3: Real Manual QA (playwright)
└── Task F4: Scope Fidelity Check (deep)
```

### Dependency Matrix
- **Task 1, 2, 3**: Independent
- **Task 4**: Depends on Task 1, 2
- **Task 5**: Depends on Task 1, 2

---

## TODOs

- [x] 1. Update Admin Types

  **What to do**:
  - Update `src/types/index.ts` (or `src/admin/types.ts` - check imports) to include:
    - `is_special: boolean`
    - `blocked_dates: string[]`
    - `booking_min_days_ahead: number` (Tour)
    - `booking_min_months_ahead: number` (Package)
    - `thumbnail: string`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`typescript`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1

  **References**:
  - `src/modules/tour/models/tour.ts` - Source of truth for Tour fields
  - `src/modules/package/models/package.ts` - Source of truth for Package fields
  - `src/admin/components/create-tour-modal.tsx` - Check where `Tour` interface is imported from (likely `../types`)

  **QA Scenarios**:
  ```
  Scenario: Verify Types Compile
    Tool: Bash
    Steps:
      1. Run `npx tsc --noEmit`
    Expected Result: No errors related to Tour or Package interfaces.
    Evidence: .sisyphus/evidence/task-1-types-check.txt
  ```

- [x] 2. Create BlockedDatesComponent

  **What to do**:
  - Create `src/admin/components/blocked-dates-component.tsx`
  - Props: `value: string[]`, `onChange: (dates: string[]) => void`
  - UI:
    - Display list of currently blocked dates (formatted DD/MM/YYYY).
    - "Remove" button (X) next to each date.
    - `DatePicker` (from `@medusajs/ui`) to select a new date.
    - "Add" button to append selected date to list.
    - Prevent duplicates.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`, `react`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1

  **References**:
  - `src/admin/components/tour-details-step.tsx` - Usage context
  - Official Medusa UI Docs (DatePicker): `https://docs.medusajs.com/ui/components/date-picker`

  **QA Scenarios**:
  ```
  Scenario: Component Logic Test
    Tool: Bash
    Steps:
      1. Create test file `src/admin/components/__tests__/blocked-dates.spec.tsx`
      2. Test adding a date adds to array
      3. Test removing a date removes from array
      4. Test duplicate date is ignored
      5. Run `bun test blocked-dates`
    Expected Result: All tests pass.
    Evidence: .sisyphus/evidence/task-2-component-test.txt
  ```

- [x] 3. Cleanup List Pages

  **What to do**:
  - Modify `src/admin/routes/tours/page.tsx`:
    - Ensure "Create" button is removed/commented out.
    - Ensure "Delete" action in dropdown is removed/commented out.
    - Ensure Empty State does NOT show "Create" button.
  - Modify `src/admin/routes/packages/page.tsx`:
    - **CRITICAL**: Remove the hardcoded "Crear el primer package" button in the empty state (lines 197-199).
    - Ensure "Delete" action is removed.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`react`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1

  **References**:
  - `src/admin/routes/packages/page.tsx:197` - Empty state button location

  **QA Scenarios**:
  ```
  Scenario: Verify No Create Button (Packages)
    Tool: grep
    Steps:
      1. Search for "Crear el primer package" in `src/admin/routes/packages/page.tsx`
    Expected Result: No matches found (or commented out).
    Evidence: .sisyphus/evidence/task-3-grep-create.txt
  ```

- [ ] 4. Update Tour Form & Details

  **What to do**:
  - Modify `src/admin/components/tour-details-step.tsx`:
    - Props: Add `is_special`, `setIsSpecial`, `blocked_dates`, `setBlockedDates`, `booking_min_days_ahead`, `setBookingMinDaysAhead`, `thumbnail`.
    - UI:
      - `destination`, `description`, `duration`: Set `disabled={true}` (or `readOnly`).
      - `thumbnail`: Display `img` tag if value exists.
      - `is_special`: Add `Switch` (Label: "Is Special?").
      - `booking_min_days_ahead`: Add `Input type="number"`.
      - `blocked_dates`: Render `BlockedDatesComponent`.
  - Modify `src/admin/components/create-tour-modal.tsx`:
    - Add state for new fields.
    - `useEffect`: Load new fields from `tourToEdit`.
    - `handleFinalSubmit`: Include new fields in payload.
    - **CRITICAL**: Remove "Create" mode logic/reset (assume Edit only).

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`, `react`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocked By**: Task 1, 2

  **References**:
  - `src/admin/components/tour-details-step.tsx` - Existing component
  - `src/admin/components/create-tour-modal.tsx` - Existing modal

  **QA Scenarios**:
  ```
  Scenario: Verify Tour Fields
    Tool: playwright
    Steps:
      1. Navigate to Tours
      2. Click Edit on a tour
      3. Assert `destination` input is disabled
      4. Assert `is_special` switch is visible and togglable
      5. Assert `blocked_dates` component is visible
    Expected Result: Elements exist and have correct state.
    Evidence: .sisyphus/evidence/task-4-tour-qa.png
  ```

- [ ] 5. Update Package Form & Details

  **What to do**:
  - Modify `src/admin/components/package-details-step.tsx`:
    - Similar to Tour, BUT use `booking_min_months_ahead`.
  - Modify `src/admin/components/create-package-modal.tsx`:
    - Similar to Tour.
    - Ensure `booking_min_months_ahead` is mapped correctly.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`, `react`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocked By**: Task 1, 2

  **References**:
  - `src/admin/components/package-details-step.tsx`
  - `src/admin/components/create-package-modal.tsx`

  **QA Scenarios**:
  ```
  Scenario: Verify Package Fields
    Tool: playwright
    Steps:
      1. Navigate to Packages
      2. Click Edit on a package
      3. Assert `destination` input is disabled
      4. Assert `booking_min_months_ahead` input is visible
    Expected Result: Elements exist and have correct state.
    Evidence: .sisyphus/evidence/task-5-package-qa.png
  ```

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
- [ ] F2. **Code Quality Review** — `unspecified-high`
- [ ] F3. **Real Manual QA** — `playwright`
- [ ] F4. **Scope Fidelity Check** — `deep`

---

## Success Criteria

### Final Checklist
- [ ] Tours/Packages List: No Create buttons visible.
- [ ] Tour Edit: Destination/Description read-only.
- [ ] Tour Edit: Can block dates via picker.
- [ ] Package Edit: Can set booking min months ahead.
- [ ] Package Edit: Thumbnail visible (read-only).

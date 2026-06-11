# Fix Package Update & E2E Verification Test

## TL;DR

> **Quick Summary**: Fix the package update bug where editing a package silently resets `is_special`, `booking_min_months_ahead`, `blocked_dates` to defaults — caused by the packages list query not requesting business logic fields. Then create a Playwright e2e test to verify persistence, mirroring the existing tour update test.
> 
> **Deliverables**:
> - Fixed packages list query in `src/admin/routes/packages/page.tsx` to include all business logic fields
> - New e2e test `e2e/verify-package-update-fix.spec.ts` verifying package update persistence
> - Playwright browser installed (if not already) and test passing
> 
> **Estimated Effort**: Short
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Task 1 (fix query) → Task 3 (run e2e test)

---

## Context

### Original Request
User reports that updating a package doesn't persist — the same bug that affected tours. The user wants the fix AND a Playwright e2e test, following the exact pattern used for tours (`e2e/verify-tour-update-fix.spec.ts`).

### Root Cause Analysis (Verified)
The backend (API schema, workflow, step) was already correctly fixed in the previous `fix-tour-package-update` plan. **The actual bug is on the frontend:**

| Layer | Status | Details |
|-------|--------|---------|
| Package Model (`models/package.ts`) | ✅ Correct | Has all fields: `is_special`, `booking_min_months_ahead`, `blocked_dates`, etc. |
| API Schema (`UpdatePackageSchema`) | ✅ Correct | Zod schema includes all business fields |
| Workflow (`update-package.ts`) | ✅ Correct | `UpdatePackageWorkflowInput` has all fields |
| Step (`steps/update-package.ts`) | ✅ Correct | `UpdatePackageStepInput` has all fields |
| Middleware defaults (`middlewares.ts:79-84`) | ❌ **Missing fields** | GET defaults lack `is_special`, `booking_min_months_ahead`, `blocked_dates`, `blocked_week_days`, `cancellation_deadline_hours` |
| Frontend query (`packages/page.tsx:117-126`) | ❌ **Missing `fields` param** | Query does NOT specify `fields` — relies on middleware defaults which are incomplete |

**What happens:**
1. User opens `/app/packages` → query returns packages WITHOUT `is_special`, `booking_min_months_ahead`, `blocked_dates` (missing from middleware defaults, not explicitly requested)
2. User clicks "Editar" → modal opens, `packageToEdit.is_special` is `undefined` → defaults to `false`
3. User changes capacity or any field and saves → payload sends `is_special: false`, `booking_min_months_ahead: 0`, `blocked_dates: []`
4. Backend correctly persists these default values → **fields are silently reset to defaults on every edit**

**How tours fixed this:** `src/admin/routes/tours/page.tsx:136` explicitly specifies `fields: "id,destination,...,is_special,booking_min_days_ahead,blocked_dates,..."` in the query. Packages don't do this.

### Metis Review
**Identified Gaps** (addressed):
- The `variants.*` and pricing relations MUST be included in the explicit `fields` parameter — the edit modal reads `packageToEdit.variants` to pre-populate pricing (line 85-108 of `create-package-modal.tsx`)
- Package switch ID is `#is-special-package` (not `#is-special` like tours) — test selectors must use the correct ID
- `input[type="number"]` nth indices: nth(0)=Duration (disabled), nth(1)=Capacity, nth(2)=BookingMinMonths — same pattern as tours but referencing different field names

---

## Work Objectives

### Core Objective
Fix the packages list frontend query to include all business logic fields, and create a Playwright e2e test that verifies package updates persist correctly after save + reload.

### Concrete Deliverables
- `src/admin/routes/packages/page.tsx` — query updated with explicit `fields` parameter
- `e2e/verify-package-update-fix.spec.ts` — new Playwright e2e test

### Definition of Done
- [ ] Package list query includes `is_special`, `booking_min_months_ahead`, `blocked_dates`, `blocked_week_days`, `cancellation_deadline_hours` and variant/pricing relations
- [ ] E2e test navigates to packages, edits first package, toggles `is_special`, sets `max_capacity=15`, sets `booking_min_months_ahead=3`, saves, reloads, and verifies persistence
- [ ] `npx playwright test verify-package-update-fix.spec.ts --project=chromium --timeout=120000` exits with code 0

### Must Have
- Explicit `fields` parameter in the packages list query matching tours pattern
- Include `variants.*,variants.product_variant.price_set.*,variants.product_variant.price_set.prices.*` in fields (pricing modal depends on this)
- E2e test following the exact pattern of `verify-tour-update-fix.spec.ts`
- Test verifies 3 fields: `is_special` (toggle), `max_capacity` (15), `booking_min_months_ahead` (3)

### Must NOT Have (Guardrails)
- ❌ Do NOT modify backend files — API schema, workflow, and step are already correct
- ❌ Do NOT modify `src/workflows/steps/update-package.ts` — already fixed
- ❌ Do NOT modify `src/api/middlewares.ts` — the explicit `fields` parameter in the query is the correct fix (matches tour pattern)
- ❌ Do NOT modify `e2e/verify-tour-update-fix.spec.ts` — reference only
- ❌ Do NOT clean up dead code files (`src/modules/package/steps/`, `src/workflows/update-package-no-prices.ts`)
- ❌ Do NOT add thumbnail editing or compensation function fixes — separate concern
- ❌ Do NOT add pricing verification to the e2e test — scope is limited to mirroring the tour test
- ❌ Do NOT modify `playwright.config.ts` — use CLI flags for timeout

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Playwright v1.58.2 configured)
- **Automated tests**: YES — new e2e test
- **Framework**: Playwright

### QA Policy
Every task includes agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend Fix**: Use Playwright to verify fields are present in list response
- **E2E Test**: Use Bash (npx playwright) to run test and capture output

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — fix + test creation in parallel):
├── Task 1: Fix packages list query to include business logic fields [quick]
└── Task 2: Create e2e Playwright test for package update verification [quick]

Wave 2 (After Wave 1 — execution):
└── Task 3: Install Playwright browser (if needed) and run the e2e test [quick]

Wave FINAL (After ALL tasks):
├── Task F1: Plan Compliance Audit [oracle]
├── Task F2: Code Quality Review [unspecified-high]
└── Task F3: Real Manual QA via Playwright [unspecified-high]

Critical Path: Task 1 → Task 3 → F1-F3
Parallel Speedup: Tasks 1 & 2 run simultaneously
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|------------|--------|------|
| 1 | None | 3 | 1 |
| 2 | None | 3 | 1 |
| 3 | 1, 2 | F1-F3 | 2 |
| F1 | 3 | None | FINAL |
| F2 | 3 | None | FINAL |
| F3 | 3 | None | FINAL |

### Agent Dispatch Summary

- **Wave 1**: 2 tasks — T1 → `quick` + `building-admin-dashboard-customizations`, T2 → `quick` + `playwright`
- **Wave 2**: 1 task — T3 → `quick` + `playwright`
- **FINAL**: 3 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high` + `playwright`

---

## TODOs

---\n\n## TODOs\n\n- [ ] 1. Fix Packages List Query in Admin Dashboard\n\n  **What to do**:\n  - Modify `src/admin/routes/packages/page.tsx` to include the `fields` parameter in the `useQuery` hook for fetching packages.\n  - The `fields` string must match the pattern used in `src/admin/routes/tours/page.tsx` but adapted for packages + variants.\n  - **Exact fields string**: `"id,destination,description,duration_days,max_capacity,thumbnail,is_special,booking_min_months_ahead,blocked_dates,blocked_week_days,cancellation_deadline_hours,product_id,created_at,updated_at,variants.*,variants.product_variant.price_set.*,variants.product_variant.price_set.prices.*"`\n  - This ensures that when the edit modal opens, `packageToEdit` contains all the business logic fields instead of undefined defaults.\n\n  **Must NOT do**:\n  - Do NOT modify backend middleware or schema — the frontend query is the source of the data gap.\n  - Do NOT remove existing query parameters (`offset`, `limit`, `order`).\n\n  **Recommended Agent Profile**:\n  - **Category**: `quick`\n  - **Skills**: [`building-admin-dashboard-customizations`]\n    - Reason: Modifying an admin route data fetching logic.\n\n  **Parallelization**:\n  - **Can Run In Parallel**: YES (with Task 2)\n  - **Parallel Group**: Wave 1\n  - **Blocks**: Task 3\n\n  **References**:\n  - `src/admin/routes/tours/page.tsx:136` — The reference implementation for tours that works correctly.\n  - `src/admin/routes/packages/page.tsx:119-125` — The current broken implementation missing `fields`.\n\n  **Acceptance Criteria**:\n\n  **QA Scenarios (MANDATORY):**\n  ```\n  Scenario: Packages list query includes all business fields\n    Tool: Bash (grep)\n    Preconditions: File modified\n    Steps:\n      1. Run: grep "fields:.*is_special" src/admin/routes/packages/page.tsx\n      2. Verify the string contains: is_special, booking_min_months_ahead, blocked_dates, variants.*\n    Expected Result: Grep finds the fields parameter with all required fields.\n    Evidence: .sisyphus/evidence/task-1-query-fix.txt\n  ```\n\n  **Evidence to Capture:**\n  - [ ] `task-1-query-fix.txt` — Grep output showing the new query param\n\n  **Commit**: YES\n  - Message: `fix(admin): add fields parameter to packages list query`\n\n- [ ] 2. Create E2E Playwright Test for Package Updates\n\n  **What to do**:\n  - Create `e2e/verify-package-update-fix.spec.ts`.\n  - Adapt the logic from `e2e/verify-tour-update-fix.spec.ts` but for packages:\n    - Route: `/app/packages`\n    - Switch Selector: `#is-special-package` (vs `#is-special` for tours)\n    - Capacity Input: `input[type="number"]` nth(1) (matches tour pattern)\n    - Booking Min Months Input: `input[type="number"]` nth(2) (matches tour pattern)\n    - API Intercept: `POST` to `/admin/packages/` (vs `/admin/tours/`)\n    - Field assertions: `is_special` (toggle), `max_capacity` (set to 15), `booking_min_months_ahead` (set to 3).\n  - Ensure the test waits for the table to load, clicks the first row's "Editar" action, modifies fields, saves, reloads, and verifies persistence.\n\n  **Must NOT do**:\n  - Do NOT modify existing tests.\n  - Do NOT use hardcoded timeouts less than 5000ms.\n\n  **Recommended Agent Profile**:\n  - **Category**: `quick`\n  - **Skills**: [`playwright`]\n    - Reason: Creating a new Playwright test file.\n\n  **Parallelization**:\n  - **Can Run In Parallel**: YES (with Task 1)\n  - **Parallel Group**: Wave 1\n  - **Blocks**: Task 3\n\n  **References**:\n  - `e2e/verify-tour-update-fix.spec.ts` — **COPY THIS STRUCTURE EXACTLY**\n  - `src/admin/components/package-details-step.tsx` — Confirming selectors (`#is-special-package`).\n\n  **Acceptance Criteria**:\n\n  **QA Scenarios (MANDATORY):**\n  ```\n  Scenario: Test file created with correct selectors\n    Tool: Bash (grep)\n    Preconditions: File created\n    Steps:\n      1. Verify file exists: ls e2e/verify-package-update-fix.spec.ts\n      2. Verify switch selector: grep "#is-special-package" e2e/verify-package-update-fix.spec.ts\n      3. Verify API intercept: grep "/admin/packages/" e2e/verify-package-update-fix.spec.ts\n    Expected Result: File exists and contains correct package-specific selectors.\n    Evidence: .sisyphus/evidence/task-2-test-check.txt\n  ```\n\n  **Evidence to Capture:**\n  - [ ] `task-2-test-check.txt` — Verification of test file content\n\n  **Commit**: YES\n  - Message: `test(e2e): add Playwright test verifying package update persistence`\n\n- [ ] 3. Run E2E Verification Test\n\n  **What to do**:\n  - Execute the newly created test: `npx playwright test verify-package-update-fix.spec.ts --project=chromium --timeout=120000`\n  - Verify it passes with "1 passed".\n  - If it fails, capture screenshots and debug (likely selector mismatch or timing).\n  - **Note**: Ensure `npx playwright install chromium` was run previously (it should be from tour task, but safe to re-run if missing).\n\n  **Must NOT do**:\n  - Do NOT modify the backend if the test fails — fix the test or the frontend query.\n\n  **Recommended Agent Profile**:\n  - **Category**: `quick`\n  - **Skills**: [`playwright`]\n    - Reason: Executing and debugging e2e tests.\n\n  **Parallelization**:\n  - **Can Run In Parallel**: NO\n  - **Parallel Group**: Wave 2\n  - **Blocked By**: Task 1, Task 2\n\n  **Acceptance Criteria**:\n\n  **QA Scenarios (MANDATORY):**\n  ```\n  Scenario: E2E test passes\n    Tool: Bash\n    Preconditions: Tasks 1 & 2 complete, dev server running\n    Steps:\n      1. Run: npx playwright test verify-package-update-fix.spec.ts --project=chromium --timeout=120000\n    Expected Result: Exit code 0, output "1 passed".\n    Evidence: .sisyphus/evidence/task-3-test-result.txt\n  ```\n\n  **Evidence to Capture:**\n  - [ ] `task-3-test-result.txt` — Full test output\n\n  **Commit**: NO\n\n---\n\n## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 3 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. Verify:
  1. The packages list query in `src/admin/routes/packages/page.tsx` now includes `fields` with all business logic fields
  2. The e2e test file `e2e/verify-package-update-fix.spec.ts` exists and follows the tour test pattern
  3. Evidence files exist in `.sisyphus/evidence/`
  4. No backend files were modified
  Output: `Must Have [N/N] | Must NOT Have [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `npx tsc --noEmit` on modified files. Check for:
  - No TypeScript errors in modified files
  - No unused imports
  - No console.log in production code (except existing ones)
  - E2e test follows Playwright best practices
  Output: `Build [PASS/FAIL] | Code Quality [PASS/FAIL] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` + `playwright` skill
  Start from clean state. Execute full package update flow:
  1. Navigate to `/app/packages`
  2. Open first package edit modal
  3. Verify `is_special`, `max_capacity`, `booking_min_months_ahead` are populated (not undefined/default)
  4. Toggle `is_special`, change capacity, save
  5. Reload and verify persistence
  Save evidence to `.sisyphus/evidence/final-qa/`
  Output: `Fields Populated [PASS/FAIL] | Persistence [PASS/FAIL] | VERDICT`

---

## Commit Strategy

- **1**: `fix(admin): add fields parameter to packages list query to include business logic fields` — `src/admin/routes/packages/page.tsx`
- **2**: `test(e2e): add Playwright test verifying package update persistence` — `e2e/verify-package-update-fix.spec.ts`

---

## Success Criteria

### Verification Commands
```bash
npx playwright test verify-package-update-fix.spec.ts --project=chromium --timeout=120000
# Expected: exit code 0, output contains "1 passed"
```

### Final Checklist
- [ ] Packages list query includes all business logic fields + variant relations
- [ ] E2e test passes with all 3 field assertions verified (is_special toggled, max_capacity=15, booking_min_months_ahead=3)
- [ ] No backend files modified
- [ ] Evidence captured in `.sisyphus/evidence/`

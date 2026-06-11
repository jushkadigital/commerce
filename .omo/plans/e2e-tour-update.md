# E2E Playwright Test: Tour Update Verification

## TL;DR

> **Quick Summary**: Install Playwright browser binaries + system dependencies, then execute the existing `verify-tour-update-fix.spec.ts` e2e test to verify that updating a tour via the admin dashboard UI (toggling `is_special`, setting `max_capacity=15`, setting `booking_min_days_ahead=7`) persists correctly after page reload.
> 
> **Deliverables**:
> - Playwright Chromium browser installed with system dependencies
> - E2E test passing with exit code 0 and "1 passed" in output
> - Evidence captured in `.sisyphus/evidence/`
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: NO — 2 sequential tasks
> **Critical Path**: Task 1 (install browser) → Task 2 (run test)

---

## Context

### Original Request
User wants to execute the e2e Playwright test that verifies tour update functionality. The test file exists at `e2e/verify-tour-update-fix.spec.ts` and tests the full flow: navigate to tours list → open edit modal → modify fields → save → reload → verify persistence.

### Current State (Verified)
| Component | Status | Details |
|-----------|--------|---------|
| Playwright v1.58.2 | ✅ Installed (npm) | `@playwright/test: ^1.58.2` in devDependencies |
| Browser binaries | ❌ **NOT installed** | No chromium in any cache directory |
| Dev server | ✅ Running | `http://localhost:9000/health` → OK |
| Auth state | ✅ Exists | `e2e/.auth/admin.json` with valid session cookie |
| Auth credentials | ✅ Configured | `admin@medusa-test.com` / `supersecret` in `.env.development` |
| Tour data | ✅ Available | 13 tours exist, first tour "MONOOOOO" with `max_capacity=18` |
| Test selectors | ✅ Verified | All selectors match current UI components (see analysis below) |

### Selector Verification (Code Analysis)
| Test Selector | UI Source | Match |
|---|---|---|
| `#is-special` | `<Switch id="is-special">` in `tour-details-step.tsx:109` | ✅ |
| `getAttribute('data-state')` | Radix Switch uses `data-state="checked"/"unchecked"` | ✅ |
| `input[type="number"].nth(1)` | Max Capacity input in `tour-details-step.tsx:85-91` (nth(0)=Duration disabled, nth(1)=Capacity, nth(2)=BookingMinDays) | ✅ |
| `input[type="number"].nth(2)` | Booking Min Days input in `tour-details-step.tsx:123-129` | ✅ |
| `getByRole('button', { name: 'Next' })` | `<Button onClick={handleStep1Next}>Next</Button>` in `create-tour-modal.tsx:261` | ✅ |
| `button:has-text("Save Changes")` | `<Button>Save Changes</Button>` in edit mode `create-tour-modal.tsx:263` | ✅ |
| `[role="dialog"]` | `<FocusModal>` renders with `role="dialog"` | ✅ |
| `getByText('Editar')` | `<DropdownMenu.Item>Editar</DropdownMenu.Item>` in `page.tsx:77` | ✅ |
| POST to `/admin/tours/` status 200 | API route `src/api/admin/tours/[id]/route.ts:58-96` returns `res.json(...)` → 200 | ✅ |

### Metis Review
**Identified Gaps** (addressed):
- Global Playwright test timeout (default 30s) may be too short for this test — **resolved via CLI `--timeout=120000` flag**
- System library dependencies needed for headless Chromium — **resolved via `--with-deps` install flag**
- Auth session could be stale — **resolved: setup project re-authenticates automatically per Playwright config**

---

## Work Objectives

### Core Objective
Install Playwright Chromium browser with system dependencies and execute the existing e2e test to verify tour update functionality end-to-end.

### Concrete Deliverables
- Chromium browser binary installed and operational
- `verify-tour-update-fix.spec.ts` test executed and passing
- Evidence files in `.sisyphus/evidence/`

### Definition of Done
- [ ] `npx playwright test verify-tour-update-fix.spec.ts --project=chromium --timeout=120000` exits with code 0
- [ ] Output contains "1 passed"
- [ ] Evidence screenshots/output saved

### Must Have
- Chromium browser + system deps installed
- Auth setup project runs successfully (re-authenticates if needed)
- Test passes with all 3 field assertions verified (is_special toggled, max_capacity=15, booking_min_days_ahead=7)

### Must NOT Have (Guardrails)
- ❌ Do NOT modify `e2e/verify-tour-update-fix.spec.ts` — the goal is to run the existing test as-is
- ❌ Do NOT modify any `src/` application code — the app is working correctly
- ❌ Do NOT modify `playwright.config.ts` — use CLI flags for timeout instead
- ❌ Do NOT install Firefox or WebKit browsers — only Chromium is needed
- ❌ Do NOT restart the dev server — it's running and `reuseExistingServer: true` handles it
- ❌ Do NOT add new tests or refactor existing selectors
- ❌ Do NOT set up CI pipeline configuration

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Playwright is configured)
- **Automated tests**: The test already exists — we're making it runnable
- **Framework**: Playwright v1.58.2

### QA Policy
Every task includes agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **E2E Test**: Use Bash (npx playwright) — Run test, capture output, verify pass/fail

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
└── Task 1: Install Playwright Chromium + system deps [quick]

Wave 2 (After Wave 1):
└── Task 2: Execute e2e test + capture evidence [quick]

Wave FINAL (After ALL tasks):
└── Task F1: Verify test output and evidence [quick]

Critical Path: Task 1 → Task 2 → F1
No parallelism possible — linear dependency.
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|------------|--------|
| 1 | None | 2 |
| 2 | 1 | F1 |
| F1 | 2 | None |

### Agent Dispatch Summary

- **Wave 1**: 1 task — T1 → `quick` + `playwright` skill
- **Wave 2**: 1 task — T2 → `quick` + `playwright` skill
- **FINAL**: 1 task — F1 → `quick`

---

## TODOs

- [ ] 1. Install Playwright Chromium Browser with System Dependencies

  **What to do**:
  - Run `npx playwright install chromium --with-deps` from `/home/node/app`
  - This installs the Chromium browser binary AND all required system libraries (libnss3, libatk, libcups, libdrm, libgbm, etc.)
  - If `--with-deps` fails due to permission errors, fall back to: `sudo npx playwright install-deps chromium && npx playwright install chromium`
  - After installation, verify the binary exists by checking the cache directory

  **Must NOT do**:
  - Do NOT install Firefox or WebKit browsers
  - Do NOT modify any project files
  - Do NOT modify playwright.config.ts

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single command execution, straightforward infrastructure task
  - **Skills**: [`playwright`]
    - `playwright`: Needed for browser installation knowledge and verification
  - **Skills Evaluated but Omitted**:
    - `building-with-medusa`: Not relevant — no Medusa code changes

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (solo)
  - **Blocks**: Task 2
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `playwright.config.ts:44` — Chromium project configuration, confirms only chromium is needed
  - `package.json:37` — `@playwright/test: ^1.58.2` version to match

  **External References**:
  - Playwright install docs: `https://playwright.dev/docs/browsers#install-browsers`

  **WHY Each Reference Matters**:
  - `playwright.config.ts` confirms only the `chromium` project is configured — no need for firefox/webkit
  - `package.json` confirms the Playwright version for browser compatibility

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Chromium browser binary is installed and accessible
    Tool: Bash
    Preconditions: Playwright npm package already installed (v1.58.2)
    Steps:
      1. Run: npx playwright install chromium --with-deps
      2. Verify: ls ~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome OR run npx playwright install chromium --dry-run and confirm paths exist
      3. Run: npx playwright test --list --project=chromium to verify Playwright can find the browser
    Expected Result: Browser binary exists at the cache path, `playwright test --list` shows test files without "browser not installed" errors
    Failure Indicators: "Executable doesn't exist", "browserType.launch: Browser not found", missing shared library errors
    Evidence: .sisyphus/evidence/task-1-chromium-install.txt

  Scenario: System dependencies are present for headless Chromium
    Tool: Bash
    Preconditions: Chromium binary installed
    Steps:
      1. Run: ldd ~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome 2>&1 | grep "not found" || echo "ALL_DEPS_OK"
    Expected Result: Output shows "ALL_DEPS_OK" (no missing shared libraries)
    Failure Indicators: Lines containing "not found" for any .so library
    Evidence: .sisyphus/evidence/task-1-system-deps.txt
  ```

  **Evidence to Capture:**
  - [ ] `task-1-chromium-install.txt` — Full output of install command
  - [ ] `task-1-system-deps.txt` — Library dependency check output

  **Commit**: NO

- [ ] 2. Execute the Playwright E2E Tour Update Test

  **What to do**:
  - Run the e2e test: `npx playwright test verify-tour-update-fix.spec.ts --project=chromium --timeout=120000`
  - The `--timeout=120000` (2 minutes) is needed because the test has multiple waits (15s + 10s + 5s + 30s + 10s + 15s) that could exceed the default 30s timeout
  - The dev server is already running on `localhost:9000` — Playwright config has `reuseExistingServer: true` so it won't try to start a new one
  - The `setup` project (auth.setup.ts) will run first automatically (configured as dependency in playwright.config.ts), authenticating with `admin@medusa-test.com` / `supersecret`
  - The test will: navigate to /app/tours → open first tour's action menu → click "Editar" → toggle is_special switch → set max_capacity to 15 → set booking_min_days_ahead to 7 → click Next → click Save Changes → wait for POST 200 → reload page → re-open edit modal → assert all 3 fields persisted
  - If the test fails, capture screenshots with `--screenshot=on` flag for debugging
  - Save full test output to evidence

  **Must NOT do**:
  - Do NOT modify `e2e/verify-tour-update-fix.spec.ts` — run it as-is
  - Do NOT modify any `src/` application code
  - Do NOT modify `playwright.config.ts`
  - Do NOT restart the Medusa dev server
  - Do NOT attempt to "fix" failing tests by changing code

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single test execution command, no code changes needed
  - **Skills**: [`playwright`]
    - `playwright`: Needed for understanding test output, debugging if failures occur
  - **Skills Evaluated but Omitted**:
    - `building-with-medusa`: Not relevant — no backend changes
    - `building-admin-dashboard-customizations`: Not relevant — no UI changes

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (solo, after Wave 1)
  - **Blocks**: F1
  - **Blocked By**: Task 1 (needs browser installed)

  **References**:

  **Pattern References**:
  - `e2e/verify-tour-update-fix.spec.ts` — The test file to execute (DO NOT MODIFY)
  - `e2e/auth.setup.ts` — Auth setup that runs first, logs in and saves session state to `e2e/.auth/admin.json`
  - `playwright.config.ts:38-50` — Project config: `setup` project runs first, `chromium` project uses stored auth state

  **API/Type References**:
  - `src/api/admin/tours/[id]/route.ts:58-96` — POST handler the test expects to intercept (status 200)
  - `src/admin/routes/tours/page.tsx:196-208` — `handleUpdateTours` function that calls `POST /admin/tours/${data.id}`
  - `src/admin/components/tour-details-step.tsx:106-119` — Switch component with `id="is-special"` the test toggles
  - `src/admin/components/tour-details-step.tsx:83-92` — Max Capacity number input (nth(1) in DOM)
  - `src/admin/components/tour-details-step.tsx:121-133` — Booking Min Days number input (nth(2) in DOM)

  **WHY Each Reference Matters**:
  - Test file is the execution target — understanding its flow helps debug failures
  - Auth setup must succeed first — if login fails, all tests fail
  - API route confirms the POST endpoint returns 200 (matching test's waitForResponse)
  - UI component references confirm selector accuracy (already verified during analysis)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: E2E tour update test passes completely
    Tool: Bash
    Preconditions: Chromium installed (Task 1), dev server running on localhost:9000, tours exist in database
    Steps:
      1. Run: npx playwright test verify-tour-update-fix.spec.ts --project=chromium --timeout=120000 2>&1 | tee .sisyphus/evidence/task-2-test-output.txt
      2. Check exit code: echo "EXIT_CODE=$?"
      3. Verify output contains "1 passed": grep -c "1 passed" .sisyphus/evidence/task-2-test-output.txt
    Expected Result: Exit code 0, output contains "1 passed", no "failed" or "timed out"
    Failure Indicators: "1 failed", "timed out", "Error", non-zero exit code
    Evidence: .sisyphus/evidence/task-2-test-output.txt

  Scenario: Auth setup succeeds before main test
    Tool: Bash
    Preconditions: Same as above
    Steps:
      1. In the test output from scenario above, check that auth setup project ran
      2. Verify: grep "setup" .sisyphus/evidence/task-2-test-output.txt should show the setup project passed
    Expected Result: Auth setup project shows as passed or skipped (if cookie still valid)
    Failure Indicators: "setup" project shows as "failed", login page errors
    Evidence: (included in task-2-test-output.txt)

  Scenario: Test failure debugging (only if test fails)
    Tool: Bash
    Preconditions: Test failed in scenario 1
    Steps:
      1. Re-run with screenshots: npx playwright test verify-tour-update-fix.spec.ts --project=chromium --timeout=120000 --screenshot=on 2>&1 | tee .sisyphus/evidence/task-2-test-retry.txt
      2. Check for trace files: ls test-results/ 2>/dev/null
      3. Capture any screenshots: cp test-results/**/*.png .sisyphus/evidence/ 2>/dev/null
    Expected Result: Screenshots and traces captured for debugging
    Failure Indicators: N/A (this is a debug scenario)
    Evidence: .sisyphus/evidence/task-2-test-retry.txt, .sisyphus/evidence/*.png
  ```

  **Evidence to Capture:**
  - [ ] `task-2-test-output.txt` — Full test execution output
  - [ ] `task-2-test-retry.txt` — Only if first run fails, retry with screenshots
  - [ ] `*.png` — Screenshots only if test fails

  **Commit**: NO

---

## Final Verification Wave

- [ ] F1. **Test Output Verification** — `quick`
  Read the evidence files in `.sisyphus/evidence/`. Verify:
  1. `task-2-test-output.txt` exists and contains "1 passed"
  2. No "failed" or "error" in test output
  3. The test completed all assertions (is_special toggled, max_capacity=15, booking_min_days_ahead=7)
  Output: `Test [PASS/FAIL] | Assertions [3/3] | VERDICT: APPROVE/REJECT`

---

## Commit Strategy

No commits needed — this is an infrastructure + test execution task, no code changes.

---

## Success Criteria

### Verification Commands
```bash
npx playwright test verify-tour-update-fix.spec.ts --project=chromium --timeout=120000
# Expected: exit code 0, output contains "1 passed"
```

### Final Checklist
- [ ] Chromium browser binary installed
- [ ] Auth setup passes (login flow works)
- [ ] Tour update test passes (3 field assertions verified)
- [ ] Evidence captured in `.sisyphus/evidence/`

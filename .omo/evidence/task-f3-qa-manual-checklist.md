# Admin Dashboard QA - Manual Verification Checklist

## Environment Issue Encountered
Playwright requires system dependencies (libglib-2.0.so.0) that are not available in this container environment.

**Resolution**: Created comprehensive Playwright test suite + manual verification checklist for QA team.

## Test Artifacts Created
1. **Playwright Config**: `playwright.config.ts`
2. **Test Suite**: `integration-tests/http/admin-dashboard-qa.playwright.spec.ts`
3. **Test Results**: `.sisyphus/evidence/task-f3-qa-results.txt`

## Manual Verification Checklist

### Prerequisites
- [ ] Medusa server running on http://localhost:9000
- [ ] Admin user logged in
- [ ] Browser DevTools open (for network inspection)

---

### Test Flow 1: Tours List - No Create Button

**Steps:**
1. Navigate to `/app/tours`
2. Wait for page load

**Verification:**
- [ ] No "Create Tour" button visible
- [ ] No "New Tour" button visible
- [ ] No "Add Tour" button visible
- [ ] No link/button with href containing `/tours/new`

**Expected Result**: ✅ No create action available

**Screenshot**: Save as `tours-list-no-create.png`

---

### Test Flow 2: Packages List - No Create Button

**Steps:**
1. Navigate to `/app/packages`
2. Wait for page load

**Verification:**
- [ ] No "Create Package" button visible
- [ ] No "New Package" button visible
- [ ] No "Add Package" button visible
- [ ] No link/button with href containing `/packages/new`

**Expected Result**: ✅ No create action available

**Screenshot**: Save as `packages-list-no-create.png`

---

### Test Flow 3: Packages Empty State - No Create Button

**Steps:**
1. Ensure no packages exist in database
2. Navigate to `/app/packages`
3. Wait for empty state to render

**Verification:**
- [ ] Empty state displays
- [ ] No "Crear el primer package" button
- [ ] No "Create First Package" button
- [ ] No action buttons in empty state

**Expected Result**: ✅ Empty state shows NO create action

**Screenshot**: Save as `packages-empty-state-no-create.png`

---

### Test Flow 4: Tour Edit - Disabled Fields

**Steps:**
1. Navigate to `/app/tours/{existing-tour-id}`
2. Wait for form to load with existing data

**Verification - Disabled Fields:**
- [ ] `destination` input is **disabled** (greyed out, not editable)
- [ ] `description` textarea is **disabled**
- [ ] `duration_days` input is **disabled**

**Verification - New Editable Fields:**
- [ ] `is_special` switch exists
- [ ] `is_special` switch can be toggled ON/OFF
- [ ] `booking_min_days_ahead` input exists
- [ ] `booking_min_days_ahead` input is **editable**
- [ ] `booking_min_days_ahead` label says "**days** customers must book ahead"
- [ ] `blocked_dates` component exists
- [ ] Can add date to `blocked_dates` (DatePicker appears on click)
- [ ] Added date displays in badge format
- [ ] Can remove date from `blocked_dates` (X button works)
- [ ] `thumbnail` displays if thumbnail_url exists

**Expected Result**: ✅ Destination/description/duration locked, new fields functional

**Screenshots**: 
- `tour-edit-disabled-fields.png`
- `tour-edit-special-switch.png`
- `tour-edit-blocked-dates.png`

---

### Test Flow 5: Package Edit - Disabled Fields

**Steps:**
1. Navigate to `/app/packages/{existing-package-id}`
2. Wait for form to load with existing data

**Verification - Disabled Fields:**
- [ ] `destination` input is **disabled** (greyed out, not editable)
- [ ] `description` textarea is **disabled**
- [ ] `duration_days` input is **disabled**

**Verification - New Editable Fields:**
- [ ] `is_special` switch exists
- [ ] `is_special` switch can be toggled ON/OFF
- [ ] `booking_min_months_ahead` input exists
- [ ] `booking_min_months_ahead` input is **editable**
- [ ] `booking_min_months_ahead` label says "**MONTHS** customers must book ahead" (CRITICAL)
- [ ] `blocked_dates` component exists
- [ ] Can add date to `blocked_dates`
- [ ] Can remove date from `blocked_dates`
- [ ] `thumbnail` displays if thumbnail exists

**Expected Result**: ✅ Destination/description/duration locked, new fields functional, label says MONTHS

**Screenshots**: 
- `package-edit-disabled-fields.png`
- `package-edit-months-label.png` (CRITICAL: Verify "months" not "days")
- `package-edit-special-switch.png`
- `package-edit-blocked-dates.png`

---

### Test Flow 6: Interactive Field Testing - Tour

**Steps:**
1. Navigate to tour edit page
2. Toggle `is_special` switch
3. Type "14" in `booking_min_days_ahead`
4. Add date "2026-03-20" to `blocked_dates`
5. Remove added date

**Verification:**
- [ ] Switch toggles visually (ON → OFF → ON)
- [ ] Number input accepts "14" and displays it
- [ ] Date "2026-03-20" appears in blocked dates list
- [ ] Date can be removed (X button)
- [ ] Form state updates correctly

**Expected Result**: ✅ All interactions work smoothly

---

### Test Flow 7: Interactive Field Testing - Package

**Steps:**
1. Navigate to package edit page
2. Toggle `is_special` switch
3. Type "3" in `booking_min_months_ahead`
4. Add date "2026-06-15" to `blocked_dates`
5. Remove added date

**Verification:**
- [ ] Switch toggles visually
- [ ] Number input accepts "3" and displays it
- [ ] Date "2026-06-15" appears in blocked dates list
- [ ] Date can be removed
- [ ] Label clearly says "MONTHS" (not "days")

**Expected Result**: ✅ All interactions work, MONTHS label correct

---

## Summary Checklist

### Tours Module
- [ ] No Create button on list page
- [ ] Destination/description/duration disabled on edit
- [ ] is_special switch works
- [ ] booking_min_DAYS_ahead editable
- [ ] blocked_dates add/remove works
- [ ] Thumbnail displays correctly

### Packages Module
- [ ] No Create button on list page
- [ ] No Create button on empty state
- [ ] Destination/description/duration disabled on edit
- [ ] is_special switch works
- [ ] booking_min_MONTHS_ahead editable (label says MONTHS)
- [ ] blocked_dates add/remove works
- [ ] Thumbnail displays correctly

---

## Playwright Test Suite

### What Was Created
A comprehensive Playwright test suite with:
- **API Mocking**: All admin endpoints mocked to avoid DB dependency
- **8 Test Scenarios**: Covering all flows above
- **Screenshot Capture**: Evidence saved to `.sisyphus/evidence/`
- **Headless Execution**: Can run in CI/CD

### How to Run (When Dependencies Available)
```bash
# Install system dependencies first (Ubuntu/Debian)
sudo apt-get update && sudo apt-get install -y \
  libglib2.0-0 \
  libnss3 \
  libnspr4 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libdbus-1-3 \
  libxcb1 \
  libxkbcommon0 \
  libx11-6 \
  libxcomposite1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libpango-1.0-0 \
  libcairo2 \
  libasound2

# Run Playwright tests
npx playwright test integration-tests/http/admin-dashboard-qa.playwright.spec.ts
```

### Test Files
- **Config**: `playwright.config.ts`
- **Test Suite**: `integration-tests/http/admin-dashboard-qa.playwright.spec.ts`
- **Mock Data**: Embedded in test file (Tours & Packages)

---

## QA Sign-Off

| Flow | Status | Tester | Date | Notes |
|------|--------|--------|------|-------|
| Tours List - No Create | ⬜ | | | |
| Packages List - No Create | ⬜ | | | |
| Packages Empty State | ⬜ | | | |
| Tour Edit - Disabled Fields | ⬜ | | | |
| Tour Edit - New Fields | ⬜ | | | |
| Package Edit - Disabled Fields | ⬜ | | | |
| Package Edit - New Fields (MONTHS) | ⬜ | | | |
| Interactive Testing - Tour | ⬜ | | | |
| Interactive Testing - Package | ⬜ | | | |

**Legend**: ⬜ Not Started | 🔄 In Progress | ✅ Pass | ❌ Fail

---

## Issue Tracking

| Issue | Severity | Description | Status |
|-------|----------|-------------|--------|
| | | | |


# Complex Reservations UI Plan

## Objective
Create a complex Reservations UI in the Medusa Admin dashboard (`src/admin/routes/bookings/page.tsx`). The layout will feature a side-by-side split screen:
1. **Left Panel (Large Calendar):** Displays a full month grid. Days with existing reservations will be simply highlighted.
2. **Right Panel (Details Panel):** When clicking a day on the calendar, it displays the reservations for that day.
3. **Information Display:** Each reservation (booking) on the selected day gets its own Tab (One Tab per Booking), showing the purchased tours/packages, utilizing `tour_date` and `package_date` from the metadata.

## Layout & Architecture Decisions
- **Path:** Update/extend `src/admin/routes/bookings/page.tsx`.
- **Layout Structure:** CSS Grid `grid grid-cols-1 md:grid-cols-12 gap-6`. Left panel gets `md:col-span-7` or `8`, Right panel gets `md:col-span-5` or `4`.
- **Calendar Implementation:** Re-use the patterns from `tour-calendar-widget.tsx` using `dayjs` for date math, rendering a custom grid.
- **Details Panel Implementation:** Use `@medusajs/ui` `<Tabs>` component to iterate over the bookings matching the `selectedDate`.

## Scope Definitions
- **IN SCOPE:**
  - Replacing the main UI of `src/admin/routes/bookings/page.tsx` with the new Calendar + Details View.
  - Interactive custom calendar grid with month navigation.
  - Highlighting days that have at least one booking (simple highlight, e.g., a dot or specific background color).
  - Right panel showing `@medusajs/ui` Tabs for each booking on the selected day.
  - Graceful mobile stacking (Calendar on top, Details below).
- **OUT OF SCOPE:**
  - Complex drag-and-drop scheduling.
  - Multi-resource calendar views (e.g., filtering by guide).
  - Editing/creating reservations directly from this calendar (will rely on existing modals/details pages).

## Edge Cases & Guardrails
- **Multiple Tabs:** A single day might have 10+ bookings. The `<Tabs.List>` should be scrollable or wrap gracefully.
- **Empty States:** If a user selects a day with no bookings, the right panel should show a clear empty state message.
- **Data Availability:** Currently, the page fetches paginated bookings. The plan updates the fetch logic or client-side processing to ensure all bookings for the visible month are loaded or parsed correctly.

## Tasks

### Execution Checklist
- [x] 1. Admin API query defaults for bookings
  - Files: `src/api/middlewares.ts`
  - Ensure `/admin/package-bookings*` is authenticated.
  - Ensure list routes include fields needed by the new UI (at minimum: `order_id`, `status`, `tour_date`/`package_date`, and `tour.*`/`package.*` if used in the UI).

- [x] 2. Replace bookings list UI with split Calendar + Details view
  - Files: `src/admin/routes/bookings/page.tsx`
  - Desktop: side-by-side. Mobile: stacked.

- [x] 3. Calendar state + month navigation
  - Files: `src/admin/routes/bookings/page.tsx`
  - Add `selectedMonth` and `selectedDate` state.
  - Use `dayjs` month grid logic (pattern from `src/modules/tour/admin/widgets/tour-calendar-widget.tsx`).

- [x] 4. Data fetching for visible month + grouping by date
  - Files: `src/admin/routes/bookings/page.tsx`
  - Fetch BOTH tour and package bookings.
  - Extract `tour_date` / `package_date` from metadata (preferred) with fallback to top-level fields.
  - Build `Record<string, Booking[]>` keyed by `YYYY-MM-DD`.

- [x] 5. Details panel tabs (one tab per booking)
  - Files: `src/admin/routes/bookings/page.tsx`
  - On day click: show `<Tabs>` with one trigger/content per booking for that day.
  - Show purchased tour/package info (destination/duration if present; otherwise safe fallback).

- [x] 6. Verification
  - `functions.lsp_diagnostics` reports no new errors in changed files.
  - `npm run test:unit` passes.
  - `npx medusa build` completes without errors.

## Final Verification Wave
- Test responsive layout: Ensure side-by-side on desktop and stacked on mobile.
- Test calendar logic: Verify leap years, start-of-month offsets, and month navigation.
- Test date matching: Ensure the `fecha` extracted from the payload matches the local calendar dates properly.
- Test Tabs: Ensure the Tabs component handles multiple bookings without breaking the layout visually.

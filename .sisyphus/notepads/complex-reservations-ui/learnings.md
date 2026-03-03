## Manual Filter Transformation for Nested Query Params
When handling complex query parameters like `tour_date[gte]` in Medusa v2 admin routes:
- `req.filterableFields` contains the validated object `{ tour_date: { gte: "..." } }`.
- `req.queryConfig` does not automatically transform these into database query operators (e.g., `$gte`).
- We must manually construct the `filters` object for `query.graph`, converting `{ gte, lte }` to `{ $gte, $lte }`.
- TypeScript definition for `MedusaRequest`'s `queryConfig` might not include `filters` explicitly, so casting or manual object construction is needed.

## Per-Booking Tabs Strategy
- Removed grouping by `order_id` in favor of listing each booking individually as a tab.
- Used `booking.id` as primary tab value/key, falling back to `${booking.bookingType}-${order_id}-${index}` for stability.
- Tab labels combine "Pedido [Last 6]" with an index suffix `(1)`, `(2)` if multiple bookings share the same order, ensuring distinct selectable tabs.
- Maintained the "Ver Detalles" button inside each tab content to open the existing modal with the specific booking data.

## Booking Metadata in Admin List
- The `/admin/bookings` route now includes `metadata` in its default fields. This is required for the Reservations UI to group bookings by `metadata.tour_date` (or `package_date` for package bookings), falling back to the top-level date fields if metadata is missing.


## Workflow Input Sanitization
- When calling workflows from API routes, verify inputs against the Zod schema.
- Zod `.nullable()` allows `null`, but workflows often expect `undefined` or a value.
- Explicitly convert `null` to `undefined` (e.g., `metadata: req.validatedBody.metadata ?? undefined`) before passing to `workflow.run({ input })`.
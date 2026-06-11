
## Task: Create validateCapacityStep workflow step

### Completed: 2026-02-09

### Implementation Details

Created file: `src/workflows/steps/validate-capacity.ts`

The step validates group capacity for tours and packages:
- Accepts entity_id, entity_type ("tour" | "package"), booking_date, and passenger counts (adult, child, infant)
- Infants are excluded from passenger count as per business rules
- Queries existing bookings for the specified date
- Calculates total passengers (adult + child) from existing bookings via line_items JSON
- Compares against max_capacity
- Throws MedusaError with detailed message if capacity exceeded
- Returns remaining capacity if validation passes

### Key Implementation Notes

1. **Type Casting**: The line_items JSON field requires type casting using `as unknown as Array<{ passengers?: {...} }>`
2. **Service Resolution**: Uses `TOUR_MODULE` and `PACKAGE_MODULE` constants to resolve services from container
3. **Passenger Calculation**: Only adults and children count toward capacity (infants are excluded)
4. **Booking Status**: Only counts "confirmed" and "pending" bookings toward capacity
5. **Error Message**: Provides detailed error message including max capacity, requested, and already booked counts

### Type Definitions

```typescript
export type ValidateCapacityStepInput = {
  entity_id: string
  entity_type: "tour" | "package"
  booking_date: Date
  passengers: {
    adult: number
    child: number
    infant: number
  }
}

export type ValidateCapacityStepOutput = {
  remaining_capacity: number
}
```

### Usage Example

```typescript
import { validateCapacityStep } from "./steps/validate-capacity"

// In a workflow:
const result = validateCapacityStep({
  entity_id: "tour_123",
  entity_type: "tour",
  booking_date: new Date("2026-03-15"),
  passengers: {
    adult: 2,
    child: 1,
    infant: 1
  }
})
```

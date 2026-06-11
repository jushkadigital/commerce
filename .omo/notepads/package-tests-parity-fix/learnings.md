# Learnings: Package Tests Parity Fix

## Session: Initial Session
**Started**: 2026-02-18

---

## Conventions & Patterns

(Agents will append findings here after each task)

---
### Source: `integration-tests/http/tour-purchase-flow.spec.ts`
**Test count:** 17 `it(...)` tests (confirmed)  
**Describe blocks:** Top-level `describe("Tour Purchase Flow - E2E")` + 5 nested describes:
1) `Complete Purchase Flow - Success Cases` (9 tests)  
2) `Capacity Validation` (1 test)  
3) `Order and Booking Link` (2 tests)  
4) `Error Handling` (3 tests)  
5) `Booking Status Flow` (2 tests)

### Global constants / fixtures
- `jest.setTimeout(120 * 1000)`
- `testDate = "2026-04-15"`
- `tourCapacity = 10`

### Module/service wiring
- Runner: `medusaIntegrationTestRunner({ inApp: true, env: {}, testSuite: ({ api, getContainer }) => { ... } })`
- `beforeAll` resolves:
  - `tourModuleService = container.resolve(TOUR_MODULE)`
  - `productModule = container.resolve(Modules.PRODUCT)`
  - `cartModule = container.resolve(Modules.CART)`
  - `salesChannelModule = container.resolve(Modules.SALES_CHANNEL)`
  - `regionModule = container.resolve(Modules.REGION)`
  - `customerModule = container.resolve(Modules.CUSTOMER)`
  - `orderModule = container.resolve(Modules.ORDER)` (resolved, not used)
  - `paymentModule = container.resolve(Modules.PAYMENT)`
  - `remoteLink = container.resolve(ContainerRegistrationKeys.LINK)` (resolved, not used)
  - `query = container.resolve("query")` (used heavily)

### `beforeEach` data setup pattern
1) Create sales channel `{ name: "Test Sales Channel" }`
2) Create region `{ currency_code:"usd", countries:["us"], payment_providers:["pp_system_default"] }`
3) Create product `"Cusco City Tour"` with option `"Passenger Type": ["Adult","Child","Infant"]`, `status:"published"`, assigned to sales channel.
4) Create tour with `max_capacity: tourCapacity`, `duration_days: 1`, `destination:"Cusco"`, linked via `product_id`.
5) Create 3 product variants in a loop over `["adult","child","infant"]`:
   - Variant titles: `"Adult Ticket" | "Child Ticket" | "Infant Ticket"`
   - Prices: 150 / 100 / 0
   - Options: `{ "Passenger Type": "Adult" | "Child" | "Infant" }`
   - `manage_inventory:false`, `allow_backorder:true`
   - Push each created variant to `productVariants[]` for cleanup
   - Map variant to tour via `tourModuleService.createTourVariants({ tour_id, variant_id, passenger_type })`
6) Refresh product with variants: `retrieveProduct(product.id, { relations: ["variants"] })`

### `afterEach` cleanup pattern (try/catch; logs "Cleanup error")
- Delete all bookings for the tour (`listTourBookings({ tour_id })` → `deleteTourBookings(ids)`).
- Delete tour-variant mappings: `deleteTourVariants({ tour_id })`.
- Delete tour: `deleteTours(tour.id)`.
- Delete each created product variant, then delete product.
- Delete region, then sales channel.
- Reset `productVariants = []`.

### Helper: `createCartWithTour(customerEmail, passengerCounts?)`
**Signature:**  
`createCartWithTour(customerEmail: string, passengerCounts = { adults:1, children:0, infants:0 })`

**Customer logic:** list-by-email; create if missing.

**Variant lookup:** by `product.variants.find(v => v.title === "... Ticket")`; adult is required (throws if missing), child/infant optional.

**CRITICAL cart-item encoding pattern (passenger-based):**
- Creates **one cart line per passenger type present**, each with:
  - `quantity: 1` (passenger count is NOT in quantity)
  - `unit_price: perPassengerPrice * passengerCount` (150 adults, 100 children, 0 infants)
  - `metadata.total_passengers: passengerCount` (per line item)
  - `metadata.passengers: { adults|children|infants }` (only that type non-zero)
  - `metadata.group_id: "tour-${tour.id}-${testDate}"` (same group across the tour+date lines)
  - `metadata.pricing_breakdown: [{ type:"ADULT"|"CHILD"|"INFANT", quantity: passengerCount, unit_price: perPassengerPrice }]`
  - plus: `is_tour`, `tour_id`, `tour_date`, `tour_destination`, `tour_duration_days`
- Returns `{ cart, totalPassengers }` where `cart` is reloaded via `query.graph` including `items.*` and `items.metadata`.

### The 17 test scenarios (by describe)
#### `Complete Purchase Flow - Success Cases` (9)
1) **complete full purchase flow; create order + booking; capacity reduced**
2) **create booking with correct metadata**
3) **handle multiple tours in same cart**
4) **complete purchase for single adult passenger**
5) **reject booking for blocked date**
6) **reject booking for blocked weekday**
7) **reject booking when capacity exceeded**
8) **reject booking when min days ahead not met**
9) **reject booking for past dates**

#### `Capacity Validation` (1)
10) **validate capacity before allowing checkout**

#### `Order and Booking Link` (2)
11) **create link between order and tour booking**
12) **preserve order totals correctly**

#### `Error Handling` (3)
13) **invalid cart id handled gracefully**
14) **validateBooking returns valid for future date**
15) **validateBooking returns invalid for past date**

#### `Booking Status Flow` (2)
16) **booking status pending initially**
17) **can update booking status**

---

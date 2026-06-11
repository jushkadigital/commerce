# Order-Level Discounts in Cart

## TL;DR
> **Summary**: Implement order-level coupons on Medusa native promotions, expose them cleanly in the current cart flows, and make discounted package/tour checkout complete through native cart completion instead of the custom manual order builder.
> **Deliverables**:
> - Native-promotion-backed order coupon flow with one manual coupon per cart
> - Discount-aware package/tour checkout flows
> - Hybrid admin coupon page for simple creation/listing on top of native admin promotions
> - Jest + Playwright regression coverage for cart, checkout, and admin coupon flows
> **Effort**: Medium
> **Parallel**: YES - 2 waves
> **Critical Path**: Task 1 -> Task 3 -> Task 4/5 -> Task 7

## Context
### Original Request
Construye un plan para tener descuentos a nivel de order en el carrito, en el dashboard se crearan cupones y se configuraran, y cuando se ingrese al frontstore en el carrito se podran acceder a este; enfocate en toda la logica de descuentos en backend y usa Context7 para documentacion.

### Interview Summary
- Backend remains the primary focus; frontend implementation is out of scope except for the backend contracts the frontstore cart must call.
- Admin approach is hybrid: use native Medusa promotions APIs as the source of truth, but provide a simplified custom dashboard surface for coupon creation/listing.
- Cart policy is exactly one manual coupon per cart.
- Automatic promotions remain allowed; the one-coupon limit applies only to manually entered coupon codes.
- When a different manual coupon is submitted to a cart that already has one, the backend returns `400` with `Only one manual coupon can be applied per cart`.
- Reapplying the same manual coupon is treated as an idempotent no-op and returns the current cart.
- Manual coupon apply/remove is blocked after payment session creation with `409` and a reset-payment message to avoid amount mismatches.
- Test strategy is `tests-after` using the existing Jest integration HTTP suite and Playwright admin coverage.

### Metis Review (gaps addressed)
- Metis identified the main implementation risk as the custom checkout path in `src/workflows/steps/create-order-from-cart.ts:20`, which manually creates orders and likely bypasses native promotion propagation.
- The plan resolves that risk by replacing manual order creation inside package/tour completion workflows with native `completeCartWorkflow.runAsStep`, while preserving existing lock, validation, and booking-link behavior.
- Metis also flagged ambiguity around coupon replacement vs rejection, automatic promotion coexistence, admin scope creep, and payment-session mismatches; those are all fixed explicitly in this plan.
- Advanced promotion features such as campaign budgets, buy rules, targeting rules, and custom promotion persistence are explicitly excluded unless native Medusa proves insufficient during Task 1 verification.

## Work Objectives
### Core Objective
Deliver a backend-first coupon system for order-level discounts that uses Medusa native promotions, works from the frontstore cart, supports a simplified admin coupon experience, and preserves discounted totals through package/tour checkout and order creation.

### Deliverables
- One manual coupon per cart using Medusa native `/store/carts/:id/promotions` behavior plus custom validation/middleware.
- Consistent cart responses from custom cart endpoints that include `promotions`, `discount_total`, and related totals.
- Package and tour completion workflows that complete carts through native Medusa cart completion, not manual `orderModule.createOrders`.
- A simplified custom admin coupon page that lists and creates order-level coupons via native `/admin/promotions`.
- Regression tests covering native cart coupon flow, package/tour checkout propagation, invalid-code handling, payment-session guardrails, and admin coupon creation.

### Definition of Done (verifiable conditions with commands)
- `TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules npx jest integration-tests/http/cart-promotions.spec.ts --runInBand --forceExit --no-cache` exits `0` and proves native coupon application/removal, one-manual-coupon enforcement, and payment-session guard behavior.
- `TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules npx jest integration-tests/http/package-cart-metadata-flow.spec.ts --runInBand --forceExit --no-cache` exits `0` and includes discounted package-cart completion assertions.
- `TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules npx jest integration-tests/http/tour-cart-metadata-flow.spec.ts --runInBand --forceExit --no-cache` exits `0` and includes discounted tour-cart completion assertions.
- `npx playwright test e2e/admin-coupons.spec.ts --project=chromium` exits `0` and proves coupon creation/listing in the custom admin page.
- `npm run build` exits `0` after all coupon, cart, workflow, and admin changes.

### Must Have
- Keep Medusa native promotions as the only source of truth for coupon creation, storage, validation, and discount calculation.
- Restrict the simplified admin surface to order-level coupons only: `type=standard`, `application_method.target_type=order`, and either percentage or fixed amount.
- Use `allocation=across` for order-level coupon creation to align with whole-order discount behavior.
- Normalize custom cart API responses to the same promotion-aware shape expected by `src/api/query-config.ts:2`.
- Preserve existing package/tour booking validations and booking-link creation after the order is created.
- Return explicit, stable error payloads for invalid code, second manual code, and post-payment-session coupon changes.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- Must NOT build a custom promotion engine, custom promotion tables, or custom coupon calculation logic.
- Must NOT bypass Medusa native cart completion for discounted package/tour checkout after this work lands.
- Must NOT add advanced admin campaign management, buy-X-get-Y rules, targeting-rule builders, analytics dashboards, or budget editors to the simplified coupon page.
- Must NOT allow manual coupon apply/remove after payment-session creation.
- Must NOT change unrelated cart item, booking, payment-provider, or frontend storefront UI behavior beyond the required coupon contracts.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after with existing Jest integration HTTP coverage and Playwright admin E2E.
- QA policy: every task includes one happy path and one failure/edge path with exact commands or selectors.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. This plan stays slightly under that target because package/tour checkout migrations are tightly coupled to the same native cart-completion change and should not be fragmented further.

Wave 1: Task 1 test baseline, Task 2 cart response normalization, Task 3 coupon-policy middleware, Task 6 admin coupon surface
Wave 2: Task 4 package checkout migration, Task 5 tour checkout migration, Task 7 final regression suite and admin QA hardening

### Dependency Matrix (full, all tasks)
| Task | Depends On | Enables |
|---|---|---|
| 1 | None | 2, 3, 4, 5, 7 |
| 2 | 1 | 3, 4, 5, 7 |
| 3 | 1, 2 | 4, 5, 7 |
| 4 | 1, 2, 3 | 7 |
| 5 | 1, 2, 3 | 7 |
| 6 | 1 | 7 |
| 7 | 3, 4, 5, 6 | Final verification |

### Agent Dispatch Summary (wave -> task count -> categories)
- Wave 1 -> 4 tasks -> `quick`, `unspecified-high`, `visual-engineering`
- Wave 2 -> 3 tasks -> `unspecified-high`, `deep`, `visual-engineering`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Codify native promotion baseline and shared test fixtures

  **What to do**: Add `integration-tests/http/cart-promotions.spec.ts` as the canonical regression file for order-level coupons. Build reusable helpers inside that spec (or a colocated helper imported only by that spec) to create a sales channel, region, published product/variant, cart, and native order-level promotion through `/admin/promotions` semantics. Cover these passing baseline cases only: create an order-level `standard` promotion, apply it to a normal cart, remove it, reject an invalid code, and treat reapplying the same code as idempotent. Use the same concrete sample code throughout the plan: `WELCOME10` for percentage, `WELCOME10FIXED` for fixed, and `usd` as currency.
  **Must NOT do**: Do not encode the current package/tour discount bug as expected behavior, do not write skipped tests, and do not add any custom discount tables or fake promotion logic.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: builds a reusable integration harness that later backend and admin tasks depend on.
  - Skills: [`building-with-medusa`] - reason: keeps tests aligned with native Medusa promotion and workflow behavior.
  - Omitted: [`building-admin-dashboard-customizations`] - reason: this task is backend test infrastructure only.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 2, 3, 4, 5, 7 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `integration-tests/http/package-cart-metadata-flow.spec.ts:108` - end-to-end cart -> payment -> order helper structure already used in this repo.
  - Pattern: `integration-tests/http/package-cart-metadata-flow.spec.ts:141` - use `query.graph` assertions for cart and order payload verification.
  - Pattern: `package.json:20` - existing integration-http command shape and environment flags.
  - API/Type: `src/api/query-config.ts:2` - cart shape must expose `promotions.*`, `discount_total`, and related totals.
  - External: `https://github.com/medusajs/medusa/blob/develop/www/apps/resources/references/types/HttpTypes/interfaces/types.HttpTypes.AdminCreatePromotion/page.mdx` - native admin promotion payload for order-level coupons.
  - External: `https://github.com/medusajs/medusa/blob/develop/www/apps/resources/app/storefront-development/cart/manage-promotions/page.mdx` - native store cart apply/remove promotion behavior.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules npx jest integration-tests/http/cart-promotions.spec.ts --runInBand --forceExit --no-cache` exits `0`.
  - [ ] The spec proves `POST /store/carts/:id/promotions` adds `WELCOME10` and returns a cart where `promotions[0].code === "WELCOME10"` and `discount_total > 0`.
  - [ ] The spec proves `DELETE /store/carts/:id/promotions` removes `WELCOME10` and returns a cart where `promotions.length === 0` and `discount_total === 0`.
  - [ ] The spec proves invalid codes return `400` or `422` from native Medusa behavior and captures the response payload in test assertions.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```text
  Scenario: Native order coupon applies and removes on a simple cart
    Tool: Bash
    Steps: Run `TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules npx jest integration-tests/http/cart-promotions.spec.ts --runInBand --forceExit --no-cache`
    Expected: Jest exits 0; output shows the apply/remove tests passed; evidence file records `WELCOME10` and `discount_total` assertions
    Evidence: .sisyphus/evidence/task-1-cart-promotions-baseline.txt

  Scenario: Invalid code is rejected
    Tool: Bash
    Steps: Re-run the same spec filtered to the invalid-code case with `-t "rejects invalid coupon"`
    Expected: Jest exits 0; the invalid-code case asserts non-200 status and a structured error payload
    Evidence: .sisyphus/evidence/task-1-cart-promotions-invalid.txt
  ```

  **Commit**: YES | Message: `test(promotions): codify native coupon behavior` | Files: `integration-tests/http/cart-promotions.spec.ts`

- [x] 2. Normalize promotion-aware cart responses across custom cart routes

  **What to do**: Extract a shared cart-refetch helper and switch custom cart mutation routes to use it so every post-mutation response matches the promotion-aware cart shape. Reuse the approach already present in `src/api/store/cart/delete-items/route.ts:14`, but centralize it under a shared helper used by `src/api/store/cart/package-items/route.ts` and `src/api/store/cart/tour-items/route.ts`. The helper must refetch cart data with the promotion fields from `src/api/query-config.ts:2`, so applying a coupon and then adding/removing package or tour items always returns `promotions`, `discount_total`, `original_total`, and item adjustments consistently.
  **Must NOT do**: Do not keep using bare `cartModule.retrieveCart` for package/tour response payloads, and do not duplicate the refetch logic in multiple files.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: small-but-critical shared helper refactor touching a few files.
  - Skills: [`building-with-medusa`] - reason: keeps cart-query behavior aligned with Medusa container/query patterns.
  - Omitted: [`building-admin-dashboard-customizations`] - reason: no admin UI work here.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 3, 4, 5, 7 | Blocked By: 1

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/api/store/cart/delete-items/route.ts:14` - existing cart refetch helper using remote query.
  - Pattern: `src/api/store/cart/package-items/route.ts:552` - current package route returns a bare `retrieveCart` result and must be normalized.
  - Pattern: `src/api/store/cart/tour-items/route.ts:552` - current tour route has the same response-shape issue.
  - API/Type: `src/api/query-config.ts:2` - exact cart fields expected by the storefront after every cart mutation.
  - Test: `integration-tests/http/package-cart-metadata-flow.spec.ts:199` - package-cart integration assertions can be extended to verify promotion-aware payloads.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules npx jest integration-tests/http/cart-promotions.spec.ts --runInBand --forceExit --no-cache` exits `0` after extending the spec with package/tour mutation-response assertions.
  - [ ] Applying `WELCOME10`, then adding package items via `/store/cart/package-items`, returns a cart payload that contains `promotions`, `discount_total`, and `original_total`.
  - [ ] Applying `WELCOME10`, then adding tour items via `/store/cart/tour-items`, returns the same normalized fields.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```text
  Scenario: Package cart route preserves promotion fields after mutation
    Tool: Bash
    Steps: Run `TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules npx jest integration-tests/http/cart-promotions.spec.ts --runInBand --forceExit --no-cache -t "package route returns promotion-aware cart"`
    Expected: Jest exits 0; the returned cart includes `promotions[0].code === "WELCOME10"` and `discount_total > 0`
    Evidence: .sisyphus/evidence/task-2-package-cart-response.txt

  Scenario: Tour cart route preserves promotion fields after mutation
    Tool: Bash
    Steps: Run `TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules npx jest integration-tests/http/cart-promotions.spec.ts --runInBand --forceExit --no-cache -t "tour route returns promotion-aware cart"`
    Expected: Jest exits 0; the returned cart includes promotion and discount totals without missing fields
    Evidence: .sisyphus/evidence/task-2-tour-cart-response.txt
  ```

  **Commit**: YES | Message: `feat(cart): normalize promotion-aware cart responses` | Files: `src/api/store/cart/package-items/route.ts`, `src/api/store/cart/tour-items/route.ts`, shared refetch helper

- [ ] 3. Enforce one manual coupon and payment-session guard on native store promotions

  **What to do**: Add route-specific middleware and validation for the native `POST /store/carts/:id/promotions` and `DELETE /store/carts/:id/promotions` path instead of creating a parallel coupon endpoint. The middleware must inspect the cart before the native handler runs, identify existing manual promotions vs automatic ones, and enforce these exact rules: one manual coupon maximum, reject a different second manual coupon with `400`, allow reapplying the same manual coupon as a no-op, preserve automatic promotions, and reject manual coupon apply/remove after payment-session creation with `409` plus the message `Coupon changes are not allowed after payment session creation. Reset payment session and retry.`
  **Must NOT do**: Do not override the native route with a custom duplicate endpoint, do not disable automatic promotions, and do not silently replace an existing manual coupon.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: behavioral policy change on native store routes with multiple edge cases.
  - Skills: [`building-with-medusa`] - reason: the work depends on Medusa middleware, request typing, and cart query patterns.
  - Omitted: [`building-admin-dashboard-customizations`] - reason: this is API policy enforcement, not admin UI.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4, 5, 7 | Blocked By: 1, 2

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/api/middlewares.ts:23` - existing route-level middleware registration approach.
  - Pattern: `src/api/store/cart/delete-items/route.ts:42` - existing request validation and structured error style for cart mutations.
  - API/Type: `src/api/query-config.ts:38` - promotions live on the cart payload already and should remain readable after policy enforcement.
  - External: `https://github.com/medusajs/medusa/blob/develop/www/apps/resources/app/storefront-development/cart/manage-promotions/page.mdx` - native store apply/remove promotion route semantics.
  - External: `https://github.com/medusajs/medusa/blob/develop/www/apps/resources/references/types/HttpTypes/interfaces/types.HttpTypes.StoreCartAddPromotion/page.mdx` - expected request body shape `promo_codes`.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules npx jest integration-tests/http/cart-promotions.spec.ts --runInBand --forceExit --no-cache` exits `0`.
  - [ ] The spec proves applying a different second manual code returns `400` with `Only one manual coupon can be applied per cart`.
  - [ ] The spec proves reapplying the same manual code returns `200` and the cart still contains exactly one manual coupon.
  - [ ] The spec proves manual coupon apply/remove after payment-session creation returns `409` with the reset-payment message.
  - [ ] The spec proves automatic promotions are still present after a manual coupon is applied.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```text
  Scenario: Second manual coupon is rejected while automatic promotions remain
    Tool: Bash
    Steps: Run `TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules npx jest integration-tests/http/cart-promotions.spec.ts --runInBand --forceExit --no-cache -t "rejects a different second manual coupon"`
    Expected: Jest exits 0; response status is 400; error message is exact; automatic promotions are still present on the cart fixture
    Evidence: .sisyphus/evidence/task-3-second-manual-coupon.txt

  Scenario: Coupon mutation after payment-session creation is blocked
    Tool: Bash
    Steps: Run `TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules npx jest integration-tests/http/cart-promotions.spec.ts --runInBand --forceExit --no-cache -t "blocks coupon changes after payment session creation"`
    Expected: Jest exits 0; response status is 409 with the reset-payment message
    Evidence: .sisyphus/evidence/task-3-payment-session-guard.txt
  ```

  **Commit**: YES | Message: `feat(cart): enforce one manual coupon policy` | Files: `src/api/middlewares.ts`, promotion validation helper(s), `integration-tests/http/cart-promotions.spec.ts`

- [ ] 4. Migrate package checkout flows to native `completeCartWorkflow`

  **What to do**: Replace the manual `createOrderFromCartStep` usage in both package completion workflows with native `completeCartWorkflow.runAsStep({ input: { id: input.cart_id } })`, then refetch the completed order with promotion-aware totals before creating package bookings and remote links. Apply this to both `src/modules/package/workflows/create-package-booking.ts` and `src/workflows/create-package-booking.ts` so the duplicate package workflow copies do not drift. Keep existing package lock acquisition, `validatePackageBookingStep`, and idempotent link creation behavior intact.
  **Must NOT do**: Do not keep calling `orderModule.createOrders` for discounted package checkout, do not remove package lock handling, and do not drop existing booking metadata or link creation.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: this is the core discount-propagation fix across checkout and booking creation.
  - Skills: [`building-with-medusa`] - reason: required for native workflow composition and Medusa core-flow integration.
  - Omitted: [`building-admin-dashboard-customizations`] - reason: no admin UI involved.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 7 | Blocked By: 1, 2, 3

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/modules/package/workflows/create-package-booking.ts:21` - current package workflow structure with locks, validation, link creation, and order refetch.
  - Pattern: `src/workflows/create-package-booking.ts:21` - second package workflow copy that must stay aligned.
  - Anti-pattern: `src/workflows/steps/create-order-from-cart.ts:20` - current manual order builder that bypasses native cart completion.
  - External: `https://github.com/medusajs/medusa/blob/develop/www/apps/resources/references/core_flows/Cart/Workflows_Cart/functions/core_flows.Cart.Workflows_Cart.completeCartWorkflow/page.mdx` - native workflow to complete carts and preserve promotion totals.
  - Test: `integration-tests/http/package-cart-metadata-flow.spec.ts:108` - existing package checkout harness to extend with discount assertions.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules npx jest integration-tests/http/package-cart-metadata-flow.spec.ts --runInBand --forceExit --no-cache` exits `0`.
  - [ ] The package checkout spec proves a cart with `WELCOME10` completes successfully and the returned order has `discount_total > 0`, `total < original_total`, and preserved package line-item metadata.
  - [ ] The package workflow still creates exactly one booking per package purchase and keeps existing `package_booking_order` link behavior.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```text
  Scenario: Discounted package cart completes and creates booking
    Tool: Bash
    Steps: Run `TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules npx jest integration-tests/http/package-cart-metadata-flow.spec.ts --runInBand --forceExit --no-cache -t "discounted package cart completes"`
    Expected: Jest exits 0; resulting order has `discount_total > 0`; booking count is 1; package metadata remains intact
    Evidence: .sisyphus/evidence/task-4-package-discount-checkout.txt

  Scenario: Invalid package booking still aborts before order completion
    Tool: Bash
    Steps: Run the package flow spec filtered to the invalid-capacity or invalid-date case after the workflow migration
    Expected: Jest exits 0; validation error is raised; no completed discounted order is created for the invalid cart
    Evidence: .sisyphus/evidence/task-4-package-validation-guard.txt
  ```

  **Commit**: YES | Message: `feat(checkout): migrate package discount completion` | Files: `src/modules/package/workflows/create-package-booking.ts`, `src/workflows/create-package-booking.ts`, package integration tests

- [ ] 5. Migrate tour checkout flow to native `completeCartWorkflow` and remove the obsolete manual order step

  **What to do**: Update `src/modules/tour/workflows/create-tour-booking.ts` to complete discounted carts with native `completeCartWorkflow.runAsStep`, refetch the completed order with promotion totals, and keep the existing tour lock/link behavior unchanged. After package and tour flows no longer depend on `src/workflows/steps/create-order-from-cart.ts`, delete that obsolete step to prevent future reintroduction of manual order creation. Preserve the existing `completeCartWorkflow` validate hook in `src/workflows/hooks/validate-tour-capacity.ts` so tour-capacity validation still runs during checkout.
  **Must NOT do**: Do not remove the tour-capacity validate hook, do not keep dead code paths that still call `createOrderFromCartStep`, and do not bypass tour lock release on failure paths.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: modifies the shared discounted checkout path and has concurrency/validation implications.
  - Skills: [`building-with-medusa`] - reason: required for workflow/hook correctness and cleanup of the obsolete step.
  - Omitted: [`building-admin-dashboard-customizations`] - reason: backend workflow task only.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 7 | Blocked By: 1, 2, 3

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/modules/tour/workflows/create-tour-booking.ts:21` - current tour workflow structure to retain while replacing order creation.
  - Pattern: `src/workflows/hooks/validate-tour-capacity.ts:12` - native `completeCartWorkflow` validate hook already exists and must remain active.
  - Anti-pattern: `src/workflows/steps/create-order-from-cart.ts:11` - obsolete manual order-creation step to remove after migration.
  - Test: `integration-tests/http/tour-cart-metadata-flow.spec.ts:1` - tour checkout regression file to extend with discount assertions.
  - External: `https://github.com/medusajs/medusa/blob/develop/www/apps/resources/app/how-to-tutorials/tutorials/preorder/page.mdx` - example of wrapping `completeCartWorkflow` with custom post-order logic.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules npx jest integration-tests/http/tour-cart-metadata-flow.spec.ts --runInBand --forceExit --no-cache` exits `0`.
  - [ ] The tour checkout spec proves a cart with `WELCOME10` completes successfully and the returned order has `discount_total > 0`, `total < original_total`, and preserved tour line-item metadata.
  - [ ] `src/workflows/steps/create-order-from-cart.ts` is deleted, and no remaining workspace references to `createOrderFromCartStep` exist.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```text
  Scenario: Discounted tour cart completes and creates booking
    Tool: Bash
    Steps: Run `TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules npx jest integration-tests/http/tour-cart-metadata-flow.spec.ts --runInBand --forceExit --no-cache -t "discounted tour cart completes"`
    Expected: Jest exits 0; resulting order has `discount_total > 0`; booking count is 1; tour metadata remains intact
    Evidence: .sisyphus/evidence/task-5-tour-discount-checkout.txt

  Scenario: Sold-out or invalid tour still fails through native completion hook
    Tool: Bash
    Steps: Run the tour flow spec filtered to the sold-out or invalid-capacity case after the workflow migration
    Expected: Jest exits 0; checkout fails with the existing tour-capacity validation error; no order is completed
    Evidence: .sisyphus/evidence/task-5-tour-capacity-guard.txt
  ```

  **Commit**: YES | Message: `feat(checkout): migrate tour discount completion` | Files: `src/modules/tour/workflows/create-tour-booking.ts`, `src/workflows/hooks/validate-tour-capacity.ts` if needed, `src/workflows/steps/create-order-from-cart.ts`, tour integration tests

- [ ] 6. Build the hybrid admin coupon page on native promotions

  **What to do**: Add a simplified admin route at `src/admin/routes/coupons/page.tsx` backed by native admin promotions data. The page must list only order-level coupon promotions, offer a create modal/form, and submit directly to native `/admin/promotions` using the repo's admin SDK pattern. Limit the create UI to these exact fields: `code`, `discount_type` (`percentage` or `fixed`), `value`, `currency_code` (required only for fixed), and `status` (`draft`, `active`, `inactive`). The page must always create `type=standard`, `application_method.target_type=order`, and `allocation=across`. Add stable selectors for Playwright: `coupon-create-button`, `coupon-code-input`, `coupon-type-select`, `coupon-value-input`, `coupon-currency-select`, `coupon-status-select`, `coupon-save-button`, and `coupon-table`.
  **Must NOT do**: Do not build a full custom CRUD or rule-builder UI, do not add advanced campaign/budget editors, and do not create custom admin backend routes if native `/admin/promotions` is sufficient.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: the task is mostly admin dashboard UI wiring on top of native backend APIs.
  - Skills: [`building-admin-dashboard-customizations`] - reason: required for Medusa admin page/component patterns.
  - Omitted: [`building-with-medusa`] - reason: backend promotion logic is already handled by native admin endpoints here.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 7 | Blocked By: 1

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/admin/routes/packages/page.tsx:117` - list query and modal wiring pattern for custom admin pages.
  - Pattern: `src/admin/lib/sdk.ts:1` - existing admin SDK usage for authenticated requests.
  - Pattern: `src/api/admin/packages/route.ts:47` - existing validated create-route shape; mirror the payload discipline on the admin client.
  - External: `https://github.com/medusajs/medusa/blob/develop/www/apps/resources/references/types/HttpTypes/interfaces/types.HttpTypes.AdminCreatePromotion/page.mdx` - native admin promotion payload for order-level coupons.
  - Test: `playwright.config.ts:14` - Playwright config already targets `e2e` and uses admin auth setup.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npx playwright test e2e/admin-coupons.spec.ts --project=chromium` exits `0` after the page is implemented and mocked or run against the local server.
  - [ ] Creating a percentage coupon with code `WELCOME10` issues a native `/admin/promotions` payload containing `type=standard`, `status=active`, `application_method.target_type=order`, `application_method.type=percentage`, `application_method.value=10`, and `allocation=across`.
  - [ ] Creating a fixed coupon requires `currency_code`; the form blocks submission when `discount_type=fixed` and currency is empty.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```text
  Scenario: Admin creates an order-level percentage coupon
    Tool: Playwright
    Steps: Open `/app/coupons`; click `[data-testid="coupon-create-button"]`; fill `[data-testid="coupon-code-input"]` with `WELCOME10`; set `[data-testid="coupon-type-select"]` to `percentage`; fill `[data-testid="coupon-value-input"]` with `10`; set `[data-testid="coupon-status-select"]` to `active`; click `[data-testid="coupon-save-button"]`
    Expected: Table `[data-testid="coupon-table"]` shows `WELCOME10`; network request payload matches the native admin promotion contract
    Evidence: .sisyphus/evidence/task-6-admin-create-coupon.png

  Scenario: Fixed coupon without currency is blocked
    Tool: Playwright
    Steps: Open the create form; set type to `fixed`; fill code and value; leave currency empty; click save
    Expected: Submission is blocked and the page shows a validation error for currency; no create request is sent
    Evidence: .sisyphus/evidence/task-6-admin-fixed-currency-error.png
  ```

  **Commit**: YES | Message: `feat(admin): add hybrid coupon management page` | Files: `src/admin/routes/coupons/page.tsx`, coupon form component(s), `e2e/admin-coupons.spec.ts`

- [ ] 7. Harden final regression coverage for discounted carts, checkout, and admin coupon flows

  **What to do**: Consolidate the final regression suite so the coupon feature is protected end to end. Extend `integration-tests/http/cart-promotions.spec.ts`, `integration-tests/http/package-cart-metadata-flow.spec.ts`, and `integration-tests/http/tour-cart-metadata-flow.spec.ts` with exact error-contract assertions, plus the Playwright admin spec from Task 6. Ensure the final suite covers: native apply/remove, invalid code, second manual coupon rejection, post-payment-session guard, package discounted completion, tour discounted completion, and admin fixed/percentage creation. Finish by running `npm run build` to catch workflow and admin type errors.
  **Must NOT do**: Do not rely on manual browser checks, do not leave selectors unstable, and do not stop after targeted tests without a final build pass.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: final cross-surface regression hardening across API, workflows, and admin UI.
  - Skills: [`building-with-medusa`, `building-admin-dashboard-customizations`] - reason: the task spans backend workflow verification and admin test coverage.
  - Omitted: [] - reason: both loaded skills are required here.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: Final verification | Blocked By: 3, 4, 5, 6

  **References** (executor has NO interview context - be exhaustive):
  - Test: `integration-tests/http/cart-promotions.spec.ts:1` - canonical cart coupon regression file created in Task 1.
  - Test: `integration-tests/http/package-cart-metadata-flow.spec.ts:199` - package checkout assertions to keep discount-aware.
  - Test: `integration-tests/http/tour-cart-metadata-flow.spec.ts:1` - tour checkout assertions to keep discount-aware.
  - Test: `playwright.config.ts:74` - local admin server startup behavior for Playwright.
  - CI: `.github/workflows/test-cli.yml:64` - existing build/migrate/dev workflow to mirror when validating locally or in CI.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules npx jest integration-tests/http/cart-promotions.spec.ts integration-tests/http/package-cart-metadata-flow.spec.ts integration-tests/http/tour-cart-metadata-flow.spec.ts --runInBand --forceExit --no-cache` exits `0`.
  - [ ] `npx playwright test e2e/admin-coupons.spec.ts --project=chromium` exits `0`.
  - [ ] `npm run build` exits `0`.
  - [ ] Evidence files exist for all coupon happy-path and failure-path scenarios referenced in Tasks 1-6.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```text
  Scenario: Full regression suite passes for discounted carts and checkout
    Tool: Bash
    Steps: Run `TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules npx jest integration-tests/http/cart-promotions.spec.ts integration-tests/http/package-cart-metadata-flow.spec.ts integration-tests/http/tour-cart-metadata-flow.spec.ts --runInBand --forceExit --no-cache`
    Expected: Jest exits 0; cart, package, and tour coupon regressions all pass
    Evidence: .sisyphus/evidence/task-7-jest-regression.txt

  Scenario: Admin coupon UI and build remain green
    Tool: Bash
    Steps: Run `npx playwright test e2e/admin-coupons.spec.ts --project=chromium && npm run build`
    Expected: Both commands exit 0; Playwright generates report output; build completes without type or workflow errors
    Evidence: .sisyphus/evidence/task-7-playwright-build.txt
  ```

  **Commit**: YES | Message: `test(regression): cover discounted checkout and admin coupons` | Files: integration specs, `e2e/admin-coupons.spec.ts`, any selector or assertion fixes

## Final Verification Wave (4 parallel agents, ALL must APPROVE)
- [ ] F1. Plan Compliance Audit - oracle
- [ ] F2. Code Quality Review - unspecified-high
- [ ] F3. Real Manual QA - unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check - deep

## Commit Strategy
- Commit 1: `test(promotions): codify native coupon behavior`
- Commit 2: `feat(cart): normalize cart responses and enforce coupon policy`
- Commit 3: `feat(checkout): migrate package discount completion to native cart workflow`
- Commit 4: `feat(checkout): migrate tour discount completion to native cart workflow`
- Commit 5: `feat(admin): add hybrid coupon management on native promotions`
- Commit 6: `test(regression): cover discounted checkout and admin coupon flows`

## Success Criteria
- A merchant can create an order-level coupon from the simplified dashboard surface without creating any custom promotion records outside Medusa.
- The frontstore cart can apply and remove exactly one manual coupon using the backend contract, while still surfacing automatic promotions and correct discount totals.
- Package and tour carts complete successfully with coupons applied, and the resulting order keeps `discount_total` plus the existing booking metadata/link creation behavior.
- All targeted Jest specs, Playwright specs, and `npm run build` pass without requiring manual QA or manual DB edits.

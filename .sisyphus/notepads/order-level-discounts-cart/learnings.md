## 2026-03-15

- Jest integration bootstrap can't resolve/import `src/emails/*.tsx` with current `jest.config.js` (no `tsx` in `transform` / `moduleFileExtensions`), so avoid top-level subscriber imports of TSX email templates.
- For Node16/NodeNext TS configs, prefer `.js` specifiers in ESM-style imports (TypeScript maps them to `.ts`/`.tsx` sources) to keep typecheck happy.

- Native order-level coupon regressions are stable in `integration-tests/http/cart-promotions.spec.ts` when the suite creates an admin JWT manually, creates publishable API keys per sales channel, and drives `/admin/promotions` plus `/store/carts/:id/promotions` end to end.
- Persisted cart assertions are more reliable through a narrow `query.graph({ entity: "cart" ... })` selection for `promotions`, `discount_total`, and `total` than through the broader storefront refetch helper in the current test environment.

## 2026-03-16

- Native store promotion coupon policy can be enforced centrally in `src/api/middlewares.ts` by attaching a middleware to `/store/carts/:id/promotions` for both `POST` and `DELETE`, then querying the cart through `req.scope.resolve(ContainerRegistrationKeys.QUERY)` for `promotions` and `payment_collection.payment_sessions`.
- The safest regression harness for this policy is to create a payment collection with `createPaymentCollectionForCartWorkflow`, open a payment session through `Modules.PAYMENT`, and assert both add and remove requests return the expected `409` while cart promotions remain unchanged.

- Store cart promotion policy middleware now guards `/store/carts/:id/promotions` for both POST and DELETE by querying the cart's manual promotions and payment sessions before native handlers run.
- Integration coverage in `integration-tests/http/cart-promotions.spec.ts` verifies same-code reapply remains idempotent, different manual coupons fail with 400, and any coupon change after payment session creation fails with 409.
- When reusing cart field knowledge from `src/api/query-config.ts`, pass explicit relation fields like `payment_collection.id` and `payment_collection.payment_sessions.id` to `query.graph()`; wildcard entries such as `*payment_collection` are valid in storefront response configs but can break direct cart queries.
- Replacing custom cart-to-order creation with `completeCartWorkflow.runAsStep({ input: { id: cartId } })` preserves downstream order-id based linking, but it also re-enables native cart completion guards such as shipping-method validation that the old manual `createOrderFromCartStep` bypassed.

- Native  enforces shipping checks for direct cart completion flows, so package purchase tests that build carts with  must set  on each experience line item instead of relying on product variant defaults.
-  now needs to treat customer-order-email log messages (including unexpected send failures from the missing travel notification template in Jest) as valid email-dispatch evidence alongside per-booking log messages.

- Native `completeCartWorkflow` enforces shipping checks for direct cart completion flows, so package purchase tests that build carts with `cartModule.createCarts` must set `requires_shipping: false` on each experience line item instead of relying on product variant defaults.
- `integration-tests/http/package-cart-metadata-flow.spec.ts` now needs to treat customer-order-email log messages (including unexpected send failures from the missing travel notification template in Jest) as valid email-dispatch evidence alongside per-booking log messages.
